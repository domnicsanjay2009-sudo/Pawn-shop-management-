import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getClientDeviceMetadata } from './deviceService';
import { UserSession } from '../types';

const SESSION_STORAGE_KEY = 'psm_active_session_id';
const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 seconds

let heartbeatTimer: any = null;
let sessionUnsubscribe: (() => void) | null = null;
let shopUnsubscribe: (() => void) | null = null;

export interface SessionCallbacks {
  onRevoked?: (reason?: string) => void;
  onSuspended?: (reason?: string) => void;
  onBlocked?: (reason?: string) => void;
}

/**
 * Initializes device session upon login and starts periodic heartbeat
 */
export async function startDeviceSession(
  userUid: string,
  email: string,
  ownerName: string,
  shopId: string,
  shopName: string,
  callbacks?: SessionCallbacks
): Promise<string> {
  await stopDeviceSession(false); // Clear any previous timers/listeners without recording false logout

  const metadata = getClientDeviceMetadata();
  const sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);

  const backendUrl = import.meta.env.VITE_BACKEND_API_URL;
  let backendSessionStarted = false;

  // 1. Try to record session through secure backend API
  if (backendUrl) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/device/session-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sessionId,
          ...metadata,
          userUid,
          email,
          ownerName,
          shopId,
          shopName,
        })
      });
      if (res.ok) {
        backendSessionStarted = true;
      }
    } catch (e) {
      console.warn('Backend session-start failed, falling back to direct Firestore:', e);
    }
  }

  // 2. Direct Firestore fallback (Guarantees Spark plan compatibility)
  if (!backendSessionStarted) {
    try {
      const now = Date.now();
      const sessionDocRef = doc(db, 'user_sessions', sessionId);
      const deviceDocRef = doc(db, 'user_devices', `dev_${userUid}_${metadata.deviceId}`);

      // Record Session
      await setDoc(sessionDocRef, {
        session_id: sessionId,
        user_uid: userUid,
        email_snapshot: email,
        owner_name: ownerName,
        shop_id: shopId,
        shop_name: shopName,
        device_id: metadata.deviceId,
        device_name: metadata.deviceName,
        device_type: metadata.deviceType,
        browser: metadata.browser,
        operating_system: metadata.operatingSystem,
        ip_info: 'Local Client',
        login_at: now,
        last_heartbeat_at: now,
        logout_at: null,
        expires_at: now + (24 * 60 * 60 * 1000), // 24 hours
        session_status: 'online',
        created_at: now,
        serverCreatedAt: serverTimestamp(),
      }, { merge: true });

      // Upsert Device Record
      await setDoc(deviceDocRef, {
        id: `dev_${userUid}_${metadata.deviceId}`,
        device_id: metadata.deviceId,
        user_uid: userUid,
        shop_id: shopId,
        owner_email: email,
        owner_name: ownerName,
        shop_name: shopName,
        device_name: metadata.deviceName,
        device_type: metadata.deviceType,
        browser: metadata.browser,
        operating_system: metadata.operatingSystem,
        first_seen_at: now,
        last_seen_at: now,
        device_status: 'active',
        total_sessions: 1,
        schema_version: 1,
        serverUpdatedAt: serverTimestamp(),
      }, { merge: true });

      // Log Login Event
      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'device_activity_logs', actId), {
        event_id: actId,
        user_uid: userUid,
        email,
        owner_name: ownerName,
        shop_id: shopId,
        shop_name: shopName,
        device_id: metadata.deviceId,
        device_name: metadata.deviceName,
        device_type: metadata.deviceType,
        browser: metadata.browser,
        operating_system: metadata.operatingSystem,
        ip_address: 'Local Client',
        login_at: now,
        last_active_at: now,
        session_id: sessionId,
        session_status: 'online',
        event_type: 'login',
        event_result: 'success',
        login_result: 'Successful Login',
        event_timestamp: now,
        recorded_at: now,
        actor_uid: userUid,
        metadata: {
          deviceName: metadata.deviceName,
          browser: metadata.browser,
          os: metadata.operatingSystem,
        }
      });
    } catch (err) {
      console.error('Failed to create direct Firestore session:', err);
    }
  }

  // 3. Listen to Real-Time Session Status (Remote Revocation Kill-Switch)
  try {
    const sessionDocRef = doc(db, 'user_sessions', sessionId);
    sessionUnsubscribe = onSnapshot(sessionDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserSession;
        if (data.session_status === 'revoked') {
          console.warn('Session has been revoked remotely by administrator.');
          callbacks?.onRevoked?.('This device session has been revoked by an administrator.');
        }
      }
    });
  } catch (err) {
    console.warn('Could not attach session revocation listener:', err);
  }

  // 4. Listen to Real-Time Shop Status (Shop Block / Disable / Suspension Lockout)
  if (shopId) {
    try {
      const shopDocRef = doc(db, 'shops', shopId);
      shopUnsubscribe = onSnapshot(shopDocRef, (snap) => {
        if (snap.exists()) {
          const shop = snap.data();
          if (shop.isBlocked || shop.status === 'Blocked' || shop.status === 'BLOCKED') {
            console.warn('Shop has been blocked by administrator.');
            callbacks?.onBlocked?.('Your account has been blocked by the administrator. Please contact customer support.');
          } else if (shop.isSuspended || shop.status === 'Suspended' || shop.status === 'Disabled' || shop.status === 'DISABLED') {
            console.warn('Shop has been suspended/disabled by administrator.');
            callbacks?.onSuspended?.(shop.disabledReason || shop.suspensionReason || 'Your account access has been suspended by the administrator. Please contact customer support.');
          }
        }
      });
    } catch (err) {
      console.warn('Could not attach shop suspension listener:', err);
    }
  }

  // 5. Start Periodic Heartbeat Timer
  heartbeatTimer = setInterval(async () => {
    // Only send heartbeat if page is active/visible
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }
    await sendHeartbeat(sessionId, metadata.deviceId, userUid, callbacks);
  }, HEARTBEAT_INTERVAL_MS);

  return sessionId;
}

/**
 * Sends a single heartbeat update
 */
export async function sendHeartbeat(
  sessionId: string,
  deviceId: string,
  userUid?: string,
  callbacks?: SessionCallbacks
): Promise<void> {
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL;
  let backendHeartbeatHandled = false;

  if (backendUrl) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/device/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ sessionId, deviceId })
      });
      if (res.ok) {
        backendHeartbeatHandled = true;
        const data = await res.json();
        if (data.status === 'revoked') {
          callbacks?.onRevoked?.('Session revoked by administrator.');
        }
      }
    } catch (e) {
      // Degrade to Firestore silently
    }
  }

  if (!backendHeartbeatHandled) {
    try {
      const now = Date.now();
      const sessionDocRef = doc(db, 'user_sessions', sessionId);
      await updateDoc(sessionDocRef, {
        last_heartbeat_at: now,
        session_status: 'online',
      });

      if (userUid) {
        const deviceDocRef = doc(db, 'user_devices', `dev_${userUid}_${deviceId}`);
        await updateDoc(deviceDocRef, {
          last_seen_at: now,
          device_status: 'active',
        });
      }
    } catch (err) {
      // Offline-safe: Failures are ignored when device is temporarily offline
    }
  }
}

/**
 * Clears timers and snapshot listeners, and optionally marks the session ended in Firestore.
 * During React StrictMode remounts or navigation unmounts, markEnded=false avoids prematurely
 * terminating an active session.
 */
export async function stopDeviceSession(markEnded = true): Promise<void> {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (sessionUnsubscribe) {
    sessionUnsubscribe();
    sessionUnsubscribe = null;
  }
  if (shopUnsubscribe) {
    shopUnsubscribe();
    shopUnsubscribe = null;
  }

  if (!markEnded) {
    return;
  }

  const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionId) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);

    const backendUrl = import.meta.env.VITE_BACKEND_API_URL;
    if (backendUrl) {
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch(`${backendUrl.replace(/\/+$/, '')}/api/device/session-end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ sessionId })
        });
      } catch (e) {
        // Fallback
      }
    }

    try {
      const sessionDocRef = doc(db, 'user_sessions', sessionId);
      await updateDoc(sessionDocRef, {
        logout_at: Date.now(),
        session_status: 'offline',
      });
    } catch (e) {
      // Offline-safe
    }
  }
}

/**
 * Securely records a failed login attempt without storing passwords or tokens
 */
export async function recordFailedLoginAttempt(email: string, userUid?: string, reason = 'Invalid credentials'): Promise<void> {
  try {
    const now = Date.now();
    const metadata = getClientDeviceMetadata();
    const actId = `act_fail_${now}_${Math.random().toString(36).substring(2, 6)}`;

    await setDoc(doc(db, 'device_activity_logs', actId), {
      event_id: actId,
      user_uid: userUid || 'unknown_uid',
      email: email.trim().toLowerCase(),
      device_id: metadata.deviceId,
      device_name: metadata.deviceName,
      device_type: metadata.deviceType,
      browser: metadata.browser,
      operating_system: metadata.operatingSystem,
      ip_address: 'Local Client',
      session_status: 'offline',
      event_type: 'failed_login',
      event_result: 'failure',
      login_result: 'Failed Login',
      event_timestamp: now,
      recorded_at: now,
      actor_uid: userUid || 'unknown',
      reason,
      metadata: {
        deviceName: metadata.deviceName,
        browser: metadata.browser,
        os: metadata.operatingSystem,
      }
    });
  } catch (err) {
    console.warn('Failed to record failed login event:', err);
  }
}
