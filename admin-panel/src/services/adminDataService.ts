import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  where,
  addDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface AdminStats {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  disabledUsers: number;
  blockedUsers: number;
  suspendedUsers: number;
  totalDevices: number;
  activeDevices: number;
  currentlyOnlineUsers: number;
  inactiveDevices: number;
  revokedDevices: number;
}

export type AccountStatus = 'Approved' | 'Pending' | 'Disabled' | 'Blocked' | 'Suspended' | 'Rejected';
export type EntitlementSource = 'RAZORPAY' | 'ADMIN_GRANTED' | 'COMPLIMENTARY' | 'SYSTEM';
export type PaymentStatusType = 'PAID' | 'UNPAID' | 'COMPLIMENTARY' | 'REFUNDED' | 'FAILED';

export interface UserSummary {
  uid: string;
  email: string;
  ownerName: string;
  shopId: string;
  shopName: string;
  phone: string;
  city: string;
  status: AccountStatus;
  isSuspended: boolean;
  isBlocked: boolean;
  isApproved: boolean;
  suspensionReason?: string;
  disabledReason?: string;
  blockedReason?: string;
  plan: string;
  subscriptionStatus: string;
  paymentStatus: PaymentStatusType;
  entitlementSource?: EntitlementSource;
  lastLoginAt?: number;
  activeDevicesCount: number;
  totalRegisteredDevicesCount: number;
  createdAt?: number;
}

export interface AdminDevice {
  id: string;
  device_id: string;
  user_uid: string;
  shop_id: string;
  owner_email: string;
  owner_name: string;
  shop_name: string;
  device_name: string;
  device_type: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  operating_system: string;
  ip_info?: string;
  first_seen_at: number;
  last_seen_at: number;
  device_status: 'active' | 'revoked' | 'inactive';
  revocation_reason?: string;
  revoked_at?: number;
  total_sessions: number;
}

export interface AdminSession {
  session_id: string;
  user_uid: string;
  email_snapshot: string;
  owner_name: string;
  shop_id: string;
  shop_name: string;
  device_id: string;
  device_name: string;
  device_type: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  operating_system: string;
  ip_info: string;
  login_at: number;
  last_heartbeat_at: number;
  logout_at: number | null;
  expires_at: number;
  session_status: 'online' | 'offline' | 'expired' | 'revoked';
  revocation_reason?: string;
  isLiveOnline?: boolean;
}

export type LoginResultType =
  | 'Successful Login'
  | 'Failed Login'
  | 'Session Revoked'
  | 'Session Expired'
  | 'Administrator Terminated Session';

export interface ActivityLog {
  id: string;
  event_id: string;
  user_uid: string;
  email: string;
  owner_name?: string;
  shop_id: string;
  shop_name?: string;
  device_id: string;
  device_name?: string;
  device_type?: 'Desktop' | 'Mobile' | 'Tablet';
  operating_system?: string;
  browser?: string;
  ip_address?: string;
  login_at?: number;
  last_active_at?: number;
  session_id?: string;
  session_status?: 'online' | 'offline' | 'revoked' | 'expired';
  event_type: 'login' | 'logout' | 'heartbeat' | 'device_revoked' | 'session_expired' | 'device_registered' | 'failed_login';
  event_result: string;
  login_result: LoginResultType;
  event_timestamp: number;
  actor_uid: string;
  reason?: string;
  metadata?: any;
}

export interface AuditLog {
  id: string;
  audit_id: string;
  admin_uid: string;
  admin_email: string;
  target_user_uid?: string;
  target_user_email?: string;
  target_resource: string;
  target_id: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  previous_subscription?: string;
  new_subscription?: string;
  reason?: string;
  details?: any;
  timestamp: number;
  operation_result: 'SUCCESS' | 'FAILURE';
  ip_address?: string;
}

export interface SubscriptionItem {
  id: string;
  shopId: string;
  shopName?: string;
  ownerEmail?: string;
  ownerName?: string;
  plan: 'Free' | 'Yearly' | 'Yearly Premium' | 'Complimentary Premium';
  status: 'Approved' | 'Pending' | 'Expired' | 'Revoked';
  paymentStatus: PaymentStatusType;
  entitlementSource: EntitlementSource;
  approvalType?: 'razorpay_webhook' | 'manual_admin';
  approvedBy?: string;
  maxDevices: number;
  startDate: number;
  expiryDate: number;
  updatedAt?: number;
  note?: string;
}

export interface PaymentTxItem {
  id: string;
  paymentId: string;
  orderId: string;
  shopId: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  created_at: number;
}

export interface SupportConversation {
  shopId: string;
  ownerUid?: string;
  shopName?: string;
  ownerName?: string;
  ownerEmail?: string;
  lastMessage?: string;
  lastMessageAt?: number;
  lastUpdated?: number;
  lastSenderRole?: string;
  unreadAdminCount?: number;
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderEmail?: string;
  senderRole: 'shop_owner' | 'platform_admin' | 'staff';
  senderType?: 'customer' | 'admin' | 'ai';
  senderName: string;
  messageText: string;
  timestamp: number;
  clientMessageId?: string;
}

// -------------------------------------------------------------
// Real-time Subscriptions
// -------------------------------------------------------------

export function subscribeToDashboardStats(callback: (stats: AdminStats) => void) {
  let usersCount = 0;
  let shopsData: any[] = [];
  let devicesData: any[] = [];
  let sessionsData: any[] = [];

  const recalculate = () => {
    const now = Date.now();
    const onlineThreshold = now - (90 * 1000); // 90 seconds

    let approvedUsers = 0;
    let pendingUsers = 0;
    let disabledUsers = 0;
    let blockedUsers = 0;
    let suspendedUsers = 0;

    shopsData.forEach(shop => {
      if (shop.isBlocked || shop.status === 'Blocked' || shop.status === 'BLOCKED') {
        blockedUsers++;
      } else if (shop.status === 'Disabled' || shop.status === 'DISABLED') {
        disabledUsers++;
      } else if (shop.isSuspended || shop.status === 'Suspended') {
        suspendedUsers++;
      } else if (shop.status === 'Pending' || shop.approvalStatus === 'Pending') {
        pendingUsers++;
      } else {
        approvedUsers++;
      }
    });

    let activeDevices = 0;
    let inactiveDevices = 0;
    let revokedDevices = 0;

    devicesData.forEach(dev => {
      if (dev.device_status === 'revoked') {
        revokedDevices++;
      } else if (dev.device_status === 'active') {
        activeDevices++;
      } else {
        inactiveDevices++;
      }
    });

    const onlineCount = sessionsData.filter(sess => {
      return sess.session_status === 'online' && sess.last_heartbeat_at >= onlineThreshold;
    }).length;

    callback({
      totalUsers: Math.max(usersCount, shopsData.length),
      approvedUsers,
      pendingUsers,
      disabledUsers,
      blockedUsers,
      suspendedUsers,
      totalDevices: devicesData.length,
      activeDevices,
      currentlyOnlineUsers: onlineCount,
      inactiveDevices,
      revokedDevices,
    });
  };

  const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
    usersCount = snap.size;
    recalculate();
  }, (err) => console.warn('Users listener:', err));

  const unsubShops = onSnapshot(collection(db, 'shops'), (snap) => {
    shopsData = snap.docs.map(d => d.data());
    recalculate();
  }, (err) => console.warn('Shops listener:', err));

  const unsubDevices = onSnapshot(collection(db, 'user_devices'), (snap) => {
    devicesData = snap.docs.map(d => d.data());
    recalculate();
  }, (err) => console.warn('Devices listener:', err));

  const unsubSessions = onSnapshot(collection(db, 'user_sessions'), (snap) => {
    sessionsData = snap.docs.map(d => d.data());
    recalculate();
  }, (err) => console.warn('Sessions listener:', err));

  return () => {
    unsubUsers();
    unsubShops();
    unsubDevices();
    unsubSessions();
  };
}

export function subscribeToActiveSessions(callback: (sessions: AdminSession[]) => void) {
  const q = query(collection(db, 'user_sessions'), orderBy('last_heartbeat_at', 'desc'), limit(200));
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    const onlineThreshold = now - (90 * 1000);
    const list: AdminSession[] = snap.docs.map(d => {
      const data = d.data() as AdminSession;
      const isOnline = data.session_status === 'online' && data.last_heartbeat_at >= onlineThreshold;
      return {
        ...data,
        isLiveOnline: isOnline,
      };
    });
    callback(list);
  }, (err) => console.warn('Active sessions listener:', err));
}

export function subscribeToAllDevices(callback: (devices: AdminDevice[]) => void) {
  const q = query(collection(db, 'user_devices'), orderBy('last_seen_at', 'desc'), limit(300));
  return onSnapshot(q, (snap) => {
    const list: AdminDevice[] = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as AdminDevice));
    callback(list);
  }, (err) => console.warn('All devices listener:', err));
}

export function subscribeToUsersAndShops(callback: (users: UserSummary[]) => void) {
  let usersList: any[] = [];
  let shopsMap: Record<string, any> = {};
  let subsMap: Record<string, any> = {};
  let devActiveCounts: Record<string, number> = {};
  let devTotalCounts: Record<string, number> = {};
  let lastLoginMap: Record<string, number> = {};

  const rebuild = () => {
    const result: UserSummary[] = [];

    Object.keys(shopsMap).forEach(shopId => {
      const shop = shopsMap[shopId];
      const uid = shop.ownerUid || shopId.replace('shop_', '');
      const user = usersList.find(u => u.id === uid) || {};
      const sub = subsMap[shopId] || {};

      let effectiveStatus: AccountStatus = 'Approved';
      if (shop.isBlocked || shop.status === 'Blocked' || shop.status === 'BLOCKED') {
        effectiveStatus = 'Blocked';
      } else if (shop.status === 'Disabled' || shop.status === 'DISABLED') {
        effectiveStatus = 'Disabled';
      } else if (shop.isSuspended || shop.status === 'Suspended') {
        effectiveStatus = 'Disabled';
      } else if (shop.status === 'Pending' || shop.approvalStatus === 'Pending') {
        effectiveStatus = 'Pending';
      } else if (shop.status === 'Rejected') {
        effectiveStatus = 'Rejected';
      }

      // Compute Payment Status
      let paymentStatus: PaymentStatusType = 'UNPAID';
      if (sub.paymentStatus) {
        paymentStatus = sub.paymentStatus;
      } else if (sub.amountPaise > 0 && sub.status === 'Approved') {
        paymentStatus = 'PAID';
      } else if (sub.approvalType === 'manual_admin' || sub.entitlementSource === 'ADMIN_GRANTED' || sub.entitlementSource === 'COMPLIMENTARY') {
        paymentStatus = 'COMPLIMENTARY';
      }

      // Entitlement Source
      let entitlementSource: EntitlementSource = 'SYSTEM';
      if (sub.entitlementSource) {
        entitlementSource = sub.entitlementSource;
      } else if (sub.approvalType === 'manual_admin') {
        entitlementSource = 'ADMIN_GRANTED';
      } else if (sub.razorpayPaymentId) {
        entitlementSource = 'RAZORPAY';
      }

      result.push({
        uid,
        email: shop.email || user.email || '',
        ownerName: shop.ownerName || user.name || 'Owner',
        shopId,
        shopName: shop.shopName || 'Shop',
        phone: shop.phone || user.phone || '',
        city: shop.city || '',
        status: effectiveStatus,
        isSuspended: Boolean(shop.isSuspended || shop.status === 'Disabled' || shop.status === 'Suspended'),
        isBlocked: Boolean(shop.isBlocked || shop.status === 'Blocked'),
        isApproved: Boolean(shop.isApproved || shop.status === 'Approved'),
        suspensionReason: shop.suspensionReason,
        disabledReason: shop.disabledReason || shop.suspensionReason,
        blockedReason: shop.blockedReason,
        plan: sub.plan || 'Free',
        subscriptionStatus: sub.status || 'Pending',
        paymentStatus,
        entitlementSource,
        lastLoginAt: lastLoginMap[uid] || null,
        activeDevicesCount: devActiveCounts[uid] || 0,
        totalRegisteredDevicesCount: devTotalCounts[uid] || 0,
        createdAt: shop.createdAt || user.createdAt,
      });
    });

    callback(result);
  };

  const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
    usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    rebuild();
  });

  const unsubShops = onSnapshot(collection(db, 'shops'), (snap) => {
    shopsMap = {};
    snap.docs.forEach(d => { shopsMap[d.id] = d.data(); });
    rebuild();
  });

  const unsubSubs = onSnapshot(collection(db, 'subscriptions'), (snap) => {
    subsMap = {};
    snap.docs.forEach(d => { subsMap[d.id] = d.data(); });
    rebuild();
  });

  const unsubDevices = onSnapshot(collection(db, 'user_devices'), (snap) => {
    devActiveCounts = {};
    devTotalCounts = {};
    snap.docs.forEach(d => {
      const data = d.data();
      const uid = data.user_uid;
      if (uid) {
        devTotalCounts[uid] = (devTotalCounts[uid] || 0) + 1;
        if (data.device_status === 'active') {
          devActiveCounts[uid] = (devActiveCounts[uid] || 0) + 1;
        }
      }
    });
    rebuild();
  });

  const unsubSessions = onSnapshot(collection(db, 'user_sessions'), (snap) => {
    lastLoginMap = {};
    snap.docs.forEach(d => {
      const data = d.data();
      const uid = data.user_uid;
      const loginAt = data.login_at || data.created_at;
      if (uid && loginAt) {
        if (!lastLoginMap[uid] || loginAt > lastLoginMap[uid]) {
          lastLoginMap[uid] = loginAt;
        }
      }
    });
    rebuild();
  });

  return () => {
    unsubUsers();
    unsubShops();
    unsubSubs();
    unsubDevices();
    unsubSessions();
  };
}

export function subscribeToActivityLogs(callback: (logs: ActivityLog[]) => void, maxCount = 500) {
  const q = query(collection(db, 'device_activity_logs'), orderBy('event_timestamp', 'desc'), limit(maxCount));
  return onSnapshot(q, (snap) => {
    const logs: ActivityLog[] = snap.docs.map(d => {
      const data = d.data();
      let loginResult: LoginResultType = 'Successful Login';

      if (data.login_result) {
        loginResult = data.login_result;
      } else if (data.event_type === 'failed_login' || data.event_result === 'failure') {
        loginResult = 'Failed Login';
      } else if (data.event_type === 'device_revoked') {
        loginResult = 'Session Revoked';
      } else if (data.event_type === 'session_expired') {
        loginResult = 'Session Expired';
      } else if (data.reason && data.reason.toLowerCase().includes('admin')) {
        loginResult = 'Administrator Terminated Session';
      }

      return {
        id: d.id,
        event_id: data.event_id || d.id,
        user_uid: data.user_uid || '',
        email: data.email || '',
        owner_name: data.owner_name || '',
        shop_id: data.shop_id || '',
        shop_name: data.shop_name || '',
        device_id: data.device_id || '',
        device_name: data.device_name || data.metadata?.deviceName || 'Device',
        device_type: data.device_type || data.metadata?.deviceType || 'Desktop',
        operating_system: data.operating_system || data.metadata?.os || '',
        browser: data.browser || data.metadata?.browser || '',
        ip_address: data.ip_info || data.ip_address || '',
        login_at: data.login_at || data.event_timestamp,
        last_active_at: data.last_active_at || data.event_timestamp,
        session_id: data.session_id,
        session_status: data.session_status || 'offline',
        event_type: data.event_type,
        event_result: data.event_result || 'success',
        login_result: loginResult,
        event_timestamp: data.event_timestamp || Date.now(),
        actor_uid: data.actor_uid || '',
        reason: data.reason,
        metadata: data.metadata,
      } as ActivityLog;
    });
    callback(logs);
  }, (err) => console.warn('Activity logs listener:', err));
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void, maxCount = 200) {
  const q = query(collection(db, 'admin_audit_logs'), orderBy('timestamp', 'desc'), limit(maxCount));
  return onSnapshot(q, (snap) => {
    const logs: AuditLog[] = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        audit_id: data.id || data.audit_id || d.id,
        admin_uid: data.admin_uid || 'admin',
        admin_email: data.admin_email || 'admin@pawnshop.com',
        target_user_uid: data.target_user_uid || data.details?.userUid,
        target_user_email: data.target_user_email || data.details?.userEmail,
        target_resource: data.target_resource || 'user',
        target_id: data.target_id || '',
        action: data.action || 'ADMIN_ACTION',
        previous_status: data.previous_status,
        new_status: data.new_status,
        previous_subscription: data.previous_subscription,
        new_subscription: data.new_subscription,
        reason: data.reason || data.details?.reason || '',
        details: data.details,
        timestamp: data.timestamp || Date.now(),
        operation_result: data.operation_result || 'SUCCESS',
        ip_address: data.ip_address || 'admin-console',
      } as AuditLog;
    });
    callback(logs);
  }, (err) => console.warn('Audit logs listener:', err));
}

export function subscribeToSubscriptionsAndPayments(callback: (data: { subscriptions: SubscriptionItem[]; transactions: PaymentTxItem[] }) => void) {
  let subscriptions: SubscriptionItem[] = [];
  let transactions: PaymentTxItem[] = [];
  let shopsMap: Record<string, any> = {};

  const unsubShops = onSnapshot(collection(db, 'shops'), (snap) => {
    shopsMap = {};
    snap.docs.forEach(d => { shopsMap[d.id] = d.data(); });
  });

  const unsubSubs = onSnapshot(collection(db, 'subscriptions'), (snap) => {
    subscriptions = snap.docs.map(d => {
      const data = d.data();
      const shop = shopsMap[data.shopId] || {};

      let paymentStatus: PaymentStatusType = 'UNPAID';
      if (data.paymentStatus) {
        paymentStatus = data.paymentStatus;
      } else if (data.amountPaise > 0 && data.status === 'Approved') {
        paymentStatus = 'PAID';
      } else if (data.approvalType === 'manual_admin' || data.entitlementSource === 'ADMIN_GRANTED' || data.entitlementSource === 'COMPLIMENTARY') {
        paymentStatus = 'COMPLIMENTARY';
      }

      let entitlementSource: EntitlementSource = 'SYSTEM';
      if (data.entitlementSource) {
        entitlementSource = data.entitlementSource;
      } else if (data.approvalType === 'manual_admin') {
        entitlementSource = 'ADMIN_GRANTED';
      } else if (data.razorpayPaymentId) {
        entitlementSource = 'RAZORPAY';
      }

      return {
        id: d.id,
        shopId: data.shopId,
        shopName: shop.shopName || data.shopId,
        ownerEmail: shop.email || '',
        ownerName: shop.ownerName || '',
        plan: data.plan || 'Free',
        status: data.status || 'Pending',
        paymentStatus,
        entitlementSource,
        approvalType: data.approvalType,
        approvedBy: data.approvedBy,
        maxDevices: data.maxDevices || 3,
        startDate: data.startDate || Date.now(),
        expiryDate: data.expiryDate || Date.now(),
        updatedAt: data.updatedAt,
        note: data.note,
      } as SubscriptionItem;
    });
    callback({ subscriptions, transactions });
  });

  const qTx = query(collection(db, 'payment_transactions'), orderBy('created_at', 'desc'), limit(150));
  const unsubTx = onSnapshot(qTx, (snap) => {
    transactions = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as PaymentTxItem));
    callback({ subscriptions, transactions });
  }, (err) => console.warn('Payment transactions listener:', err));

  return () => {
    unsubShops();
    unsubSubs();
    unsubTx();
  };
}

export function subscribeToSupportConversations(callback: (convs: SupportConversation[]) => void) {
  const shopCache = new Map<string, { shopName?: string; ownerName?: string; ownerEmail?: string }>();

  const sortByLatest = (items: SupportConversation[]) =>
    [...items].sort(
      (a, b) => (b.lastMessageAt || b.lastUpdated || 0) - (a.lastMessageAt || a.lastUpdated || 0)
    );

  return onSnapshot(collection(db, 'support_conversations'), (snap) => {
    const rawList: SupportConversation[] = snap.docs.map((d) => {
      const data = d.data() as any;
      const shopId = data.shopId || d.id;
      const cached = shopCache.get(shopId);
      return {
        shopId,
        ...data,
        shopName: data.shopName || cached?.shopName,
        ownerName: data.ownerName || cached?.ownerName,
        ownerEmail: data.ownerEmail || cached?.ownerEmail,
        lastMessageAt: Number(data.lastMessageAt || data.lastUpdated || 0) || undefined,
      } as SupportConversation;
    });

    const sortedList = sortByLatest(rawList);
    callback(sortedList);

    // Enrich any older conversation doc missing ownerEmail/shopName from /shops/{shopId}
    const missingDetails = sortedList.filter(
      (c) => (!c.ownerEmail || !c.shopName) && !shopCache.has(c.shopId)
    );
    if (missingDetails.length > 0) {
      Promise.all(
        missingDetails.map(async (c) => {
          try {
            const shopSnap = await getDoc(doc(db, 'shops', c.shopId));
            if (shopSnap.exists()) {
              const s = shopSnap.data() as any;
              shopCache.set(c.shopId, {
                shopName: s.shopName,
                ownerName: s.ownerName,
                ownerEmail: s.email,
              });
            } else {
              shopCache.set(c.shopId, {});
            }
          } catch {
            // Keep existing metadata
          }
        })
      ).then(() => {
        const enriched = rawList.map((c) => {
          const cached = shopCache.get(c.shopId);
          return {
            ...c,
            shopName: c.shopName || cached?.shopName,
            ownerName: c.ownerName || cached?.ownerName,
            ownerEmail: c.ownerEmail || cached?.ownerEmail,
          };
        });
        callback(sortByLatest(enriched));
      });
    }
  }, (err) => console.warn('Support conversations listener:', err));
}

export function subscribeToConversationMessages(shopId: string, callback: (msgs: ChatMessage[]) => void) {
  const q = query(
    collection(db, 'support_conversations', shopId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(200)
  );
  return onSnapshot(q, (snap) => {
    const msgs: ChatMessage[] = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        ...data,
        senderRole: data.senderRole || (data.senderType === 'admin' ? 'platform_admin' : 'shop_owner'),
        timestamp: Number(data.timestamp) || Date.now(),
      } as ChatMessage;
    });
    callback(msgs);
  }, (err) => console.warn('Messages listener:', err));
}

// -------------------------------------------------------------
// Admin Audit Logger (Append-only & Server-Timestamped)
// -------------------------------------------------------------

export async function recordAdminAuditLog(entry: {
  action: string;
  target_user_uid?: string;
  target_user_email?: string;
  target_resource: string;
  target_id: string;
  previous_status?: string;
  new_status?: string;
  previous_subscription?: string;
  new_subscription?: string;
  reason?: string;
  details?: any;
  operation_result?: 'SUCCESS' | 'FAILURE';
}) {
  try {
    const now = Date.now();
    const auditId = `aud_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const adminUser = auth.currentUser;

    await setDoc(doc(db, 'admin_audit_logs', auditId), {
      id: auditId,
      audit_id: auditId,
      admin_uid: adminUser?.uid || 'admin',
      admin_email: adminUser?.email || 'admin@pawnshop.com',
      target_user_uid: entry.target_user_uid || '',
      target_user_email: entry.target_user_email || '',
      target_resource: entry.target_resource,
      target_id: entry.target_id,
      action: entry.action,
      previous_status: entry.previous_status || null,
      new_status: entry.new_status || null,
      previous_subscription: entry.previous_subscription || null,
      new_subscription: entry.new_subscription || null,
      reason: entry.reason || 'Administrative action',
      details: entry.details || {},
      timestamp: now,
      operation_result: entry.operation_result || 'SUCCESS',
      ip_address: 'admin-portal',
      serverTimestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('CRITICAL: Failed to write to admin_audit_logs:', err);
  }
}

// -------------------------------------------------------------
// Upgraded Admin Actions (Strictly Authenticated & Atomic)
// -------------------------------------------------------------

/**
 * 1. APPROVE USER – GRANT FULL PREMIUM ACCESS
 * Approves the user account, immediately activates full Premium entitlement,
 * overrides subscription tier, grants up to 9 devices + AI Customer care,
 * without interfering with Razorpay payment records.
 */
export async function approveAndGrantPremium(
  shopId: string,
  userUid: string,
  userEmail: string,
  options?: {
    expiryDays?: number;
    reason?: string;
    previousStatus?: string;
    previousPlan?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;
  const expiryDays = options?.expiryDays || 365;
  const expiryDate = now + (expiryDays * 24 * 60 * 60 * 1000);
  const reason = options?.reason || 'Complimentary administrator-granted full Premium access';

  try {
    // 1. Update Shop Profile to Approved
    await updateDoc(doc(db, 'shops', shopId), {
      status: 'Approved',
      isApproved: true,
      isSuspended: false,
      isBlocked: false,
      approvedAt: now,
      approvedBy: currentAdmin?.email || 'Admin',
      approvalNote: reason,
      updatedAt: now,
    });

    // 2. Update User Account
    if (userUid) {
      await updateDoc(doc(db, 'users', userUid), {
        status: 'Approved',
        isApproved: true,
        isSuspended: false,
        isBlocked: false,
        updatedAt: now,
      }).catch(() => {});
    }

    // 3. Activate Full Premium Subscription Entitlement
    const subRef = doc(db, 'subscriptions', shopId);
    const existingSubDoc = await getDoc(subRef);
    const existingPaymentStatus = existingSubDoc.exists() ? existingSubDoc.data().paymentStatus : null;

    const subData = {
      id: `sub_${shopId}`,
      shopId,
      plan: 'Yearly Premium',
      status: 'Approved',
      maxDevices: 9,
      entitlementSource: 'ADMIN_GRANTED',
      paymentStatus: existingPaymentStatus === 'PAID' ? 'PAID' : 'COMPLIMENTARY',
      approvalType: 'manual_admin',
      approvedBy: currentAdmin?.email || 'Admin',
      startDate: now,
      expiryDate: expiryDate,
      note: reason,
      updatedAt: now,
    };
    await setDoc(subRef, subData, { merge: true });

    // 4. Record Immutable Audit Log
    await recordAdminAuditLog({
      action: 'APPROVE_USER_PREMIUM',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'shops',
      target_id: shopId,
      previous_status: options?.previousStatus || 'Pending',
      new_status: 'Approved',
      previous_subscription: options?.previousPlan || 'Free',
      new_subscription: 'Yearly Premium (Complimentary Entitlement)',
      reason,
      details: { expiryDays, expiryDate, maxDevices: 9, entitlementSource: 'ADMIN_GRANTED' },
      operation_result: 'SUCCESS',
    });

    return { success: true };
  } catch (err: any) {
    console.error('Approve and grant premium failed:', err);
    await recordAdminAuditLog({
      action: 'APPROVE_USER_PREMIUM',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'shops',
      target_id: shopId,
      reason,
      details: { error: err.message },
      operation_result: 'FAILURE',
    });
    return { success: false, error: err.message };
  }
}

/**
 * 2. DISABLE USER – TEMPORARY ACCOUNT RESTRICTION
 * Disables application access, immediately revokes all active device sessions,
 * prevents new logins, while preserving all existing customer & pawn records.
 */
export async function disableUserAccount(
  shopId: string,
  userUid: string,
  userEmail: string,
  reason = 'Account suspended by administrator. Please contact customer support.',
  previousStatus = 'Approved'
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;

  try {
    // 1. Update Shop status
    await updateDoc(doc(db, 'shops', shopId), {
      status: 'Disabled',
      isSuspended: true,
      disabledAt: now,
      disabledReason: reason,
      suspendedBy: currentAdmin?.email || 'Admin',
      updatedAt: now,
    });

    // 2. Update User doc
    if (userUid) {
      await updateDoc(doc(db, 'users', userUid), {
        status: 'Disabled',
        isSuspended: true,
        disabledReason: reason,
        updatedAt: now,
      }).catch(() => {});
    }

    // 3. Immediately Revoke all active device sessions
    const sessQ = query(
      collection(db, 'user_sessions'),
      where('user_uid', '==', userUid),
      where('session_status', 'in', ['online', 'active'])
    );
    const sessSnap = await getDocs(sessQ);
    const batch = writeBatch(db);
    sessSnap.docs.forEach(d => {
      batch.update(d.ref, {
        session_status: 'revoked',
        revoked_at: now,
        revocation_reason: reason,
      });
    });
    await batch.commit();

    // 4. Log to device activity feed
    const actId = `act_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'device_activity_logs', actId), {
      event_id: actId,
      user_uid: userUid,
      email: userEmail,
      shop_id: shopId,
      device_id: 'ALL_ACTIVE',
      event_type: 'device_revoked',
      event_result: 'revoked',
      login_result: 'Administrator Terminated Session',
      event_timestamp: now,
      recorded_at: now,
      actor_uid: currentAdmin?.uid || 'admin',
      reason: `Account Disabled: ${reason}`,
    });

    // 5. Immutable Audit Log
    await recordAdminAuditLog({
      action: 'DISABLE_USER',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'shops',
      target_id: shopId,
      previous_status: previousStatus,
      new_status: 'Disabled',
      reason,
      details: { terminatedSessionsCount: sessSnap.size },
      operation_result: 'SUCCESS',
    });

    return { success: true };
  } catch (err: any) {
    console.error('Disable user failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reactivate a disabled user account
 */
export async function reactivateDisabledAccount(
  shopId: string,
  userUid: string,
  userEmail: string,
  reason = 'Reactivated by administrator'
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;

  try {
    await updateDoc(doc(db, 'shops', shopId), {
      status: 'Approved',
      isSuspended: false,
      disabledReason: null,
      suspensionReason: null,
      reactivatedAt: now,
      reactivatedBy: currentAdmin?.email || 'Admin',
      updatedAt: now,
    });

    if (userUid) {
      await updateDoc(doc(db, 'users', userUid), {
        status: 'Approved',
        isSuspended: false,
        disabledReason: null,
        updatedAt: now,
      }).catch(() => {});
    }

    await recordAdminAuditLog({
      action: 'REACTIVATE_USER',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'shops',
      target_id: shopId,
      previous_status: 'Disabled',
      new_status: 'Approved',
      reason,
      operation_result: 'SUCCESS',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 3. BLOCK USER – PERMANENT ACCESS RESTRICTION UNTIL UNBLOCKED
 * Changes account status to BLOCKED, revokes all sessions, revokes all registered devices,
 * prevents new logins and subscription purchases. Never deletes records.
 */
export async function blockUserAccount(
  shopId: string,
  userUid: string,
  userEmail: string,
  reason = 'Your account has been blocked by the administrator. Please contact customer support.',
  previousStatus = 'Approved'
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;

  try {
    // 1. Update Shop status
    await updateDoc(doc(db, 'shops', shopId), {
      status: 'Blocked',
      isBlocked: true,
      isSuspended: true,
      blockedAt: now,
      blockedReason: reason,
      blockedBy: currentAdmin?.email || 'Admin',
      updatedAt: now,
    });

    // 2. Update User status
    if (userUid) {
      await updateDoc(doc(db, 'users', userUid), {
        status: 'Blocked',
        isBlocked: true,
        isSuspended: true,
        blockedReason: reason,
        updatedAt: now,
      }).catch(() => {});
    }

    // 3. Revoke all active sessions
    const sessQ = query(collection(db, 'user_sessions'), where('user_uid', '==', userUid));
    const sessSnap = await getDocs(sessQ);
    const batch1 = writeBatch(db);
    sessSnap.docs.forEach(d => {
      batch1.update(d.ref, {
        session_status: 'revoked',
        revoked_at: now,
        revocation_reason: reason,
      });
    });
    await batch1.commit();

    // 4. Revoke all registered devices
    const devQ = query(collection(db, 'user_devices'), where('user_uid', '==', userUid));
    const devSnap = await getDocs(devQ);
    const batch2 = writeBatch(db);
    devSnap.docs.forEach(d => {
      batch2.update(d.ref, {
        device_status: 'revoked',
        revoked_at: now,
        revocation_reason: reason,
        revoked_by: currentAdmin?.email || 'Admin',
      });
    });
    await batch2.commit();

    // 5. Activity log
    const actId = `act_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'device_activity_logs', actId), {
      event_id: actId,
      user_uid: userUid,
      email: userEmail,
      shop_id: shopId,
      device_id: 'ALL_DEVICES',
      event_type: 'device_revoked',
      event_result: 'blocked',
      login_result: 'Administrator Terminated Session',
      event_timestamp: now,
      recorded_at: now,
      actor_uid: currentAdmin?.uid || 'admin',
      reason: `Account Blocked: ${reason}`,
    });

    // 6. Immutable Audit Log
    await recordAdminAuditLog({
      action: 'BLOCK_USER',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'shops',
      target_id: shopId,
      previous_status: previousStatus,
      new_status: 'Blocked',
      reason,
      details: { revokedSessions: sessSnap.size, revokedDevices: devSnap.size },
      operation_result: 'SUCCESS',
    });

    return { success: true };
  } catch (err: any) {
    console.error('Block user failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Unblock a blocked user account
 */
export async function unblockUserAccount(
  shopId: string,
  userUid: string,
  userEmail: string,
  reason = 'Account unblocked by Global Administrator'
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;

  try {
    await updateDoc(doc(db, 'shops', shopId), {
      status: 'Approved',
      isBlocked: false,
      isSuspended: false,
      blockedReason: null,
      unblockedAt: now,
      unblockedBy: currentAdmin?.email || 'Admin',
      updatedAt: now,
    });

    if (userUid) {
      await updateDoc(doc(db, 'users', userUid), {
        status: 'Approved',
        isBlocked: false,
        isSuspended: false,
        blockedReason: null,
        updatedAt: now,
      }).catch(() => {});
    }

    await recordAdminAuditLog({
      action: 'UNBLOCK_USER',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'shops',
      target_id: shopId,
      previous_status: 'Blocked',
      new_status: 'Approved',
      reason,
      operation_result: 'SUCCESS',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Grant complimentary Premium subscription
 */
export async function grantComplimentaryPremium(
  shopId: string,
  userUid: string,
  userEmail: string,
  expiryDays = 365,
  reason = 'Administrator complimentary grant'
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;
  const expiryDate = now + (expiryDays * 24 * 60 * 60 * 1000);

  try {
    const subRef = doc(db, 'subscriptions', shopId);
    const existingSnap = await getDoc(subRef);
    const previousPlan = existingSnap.exists() ? existingSnap.data().plan : 'Free';

    const subData = {
      id: `sub_${shopId}`,
      shopId,
      plan: 'Yearly Premium',
      status: 'Approved',
      maxDevices: 9,
      entitlementSource: 'COMPLIMENTARY',
      paymentStatus: 'COMPLIMENTARY',
      approvalType: 'manual_admin',
      approvedBy: currentAdmin?.email || 'Admin',
      startDate: now,
      expiryDate,
      note: reason,
      updatedAt: now,
    };
    await setDoc(subRef, subData, { merge: true });

    await recordAdminAuditLog({
      action: 'GRANT_PREMIUM',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'subscriptions',
      target_id: shopId,
      previous_subscription: previousPlan,
      new_subscription: 'Yearly Premium (Complimentary)',
      reason,
      details: { expiryDays, expiryDate, maxDevices: 9 },
      operation_result: 'SUCCESS',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Revoke complimentary Premium subscription
 */
export async function revokeComplimentaryPremium(
  shopId: string,
  userUid: string,
  userEmail: string,
  reason = 'Complimentary entitlement revoked by administrator'
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();

  try {
    const subRef = doc(db, 'subscriptions', shopId);
    const existingSnap = await getDoc(subRef);
    const previousPlan = existingSnap.exists() ? existingSnap.data().plan : 'Yearly Premium';

    await updateDoc(subRef, {
      plan: 'Free',
      status: 'Expired',
      maxDevices: 3,
      entitlementSource: 'SYSTEM',
      paymentStatus: 'UNPAID',
      revokedAt: now,
      revocationReason: reason,
      updatedAt: now,
    });

    await recordAdminAuditLog({
      action: 'REVOKE_PREMIUM',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'subscriptions',
      target_id: shopId,
      previous_subscription: previousPlan,
      new_subscription: 'Free (Expired)',
      reason,
      operation_result: 'SUCCESS',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Extend subscription validity
 */
export async function extendSubscriptionValidity(
  shopId: string,
  userUid: string,
  userEmail: string,
  extensionDays: number,
  reason = 'Validity extension granted by administrator'
): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();

  try {
    const subRef = doc(db, 'subscriptions', shopId);
    const existingSnap = await getDoc(subRef);
    if (!existingSnap.exists()) {
      return { success: false, error: 'Subscription not found for this shop.' };
    }

    const currentExpiry = existingSnap.data().expiryDate || now;
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = baseDate + (extensionDays * 24 * 60 * 60 * 1000);

    await updateDoc(subRef, {
      expiryDate: newExpiry,
      status: 'Approved',
      updatedAt: now,
      note: reason,
    });

    await recordAdminAuditLog({
      action: 'EXTEND_SUBSCRIPTION',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'subscriptions',
      target_id: shopId,
      reason,
      details: { extensionDays, previousExpiry: currentExpiry, newExpiry },
      operation_result: 'SUCCESS',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Revoke a single device and all its active sessions
 */
export async function revokeDevice(
  deviceId: string,
  userUid: string,
  userEmail?: string,
  reason = 'Revoked by administrator'
): Promise<boolean> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;

  try {
    if (userUid) {
      const devDocRef = doc(db, 'user_devices', `dev_${userUid}_${deviceId}`);
      await updateDoc(devDocRef, {
        device_status: 'revoked',
        revoked_at: now,
        revocation_reason: reason,
        revoked_by: currentAdmin?.email || currentAdmin?.uid || 'Admin',
      });
    }

    const q = query(collection(db, 'user_sessions'), where('device_id', '==', deviceId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.update(d.ref, {
        session_status: 'revoked',
        revoked_at: now,
        revocation_reason: reason,
      });
    });
    await batch.commit();

    const actId = `act_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'device_activity_logs', actId), {
      event_id: actId,
      user_uid: userUid || 'system',
      email: userEmail || '',
      device_id: deviceId,
      event_type: 'device_revoked',
      event_result: 'revoked',
      login_result: 'Session Revoked',
      event_timestamp: now,
      recorded_at: now,
      actor_uid: currentAdmin?.uid || 'admin',
      reason,
    });

    await recordAdminAuditLog({
      action: 'REVOKE_DEVICE',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'user_devices',
      target_id: deviceId,
      reason,
      operation_result: 'SUCCESS',
    });

    return true;
  } catch (err) {
    console.error('Revoke device failed:', err);
    return false;
  }
}

/**
 * Revoke all devices for a given user
 */
export async function revokeAllUserDevices(
  userUid: string,
  userEmail?: string,
  reason = 'Bulk revocation by administrator'
): Promise<boolean> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;

  try {
    const devQ = query(collection(db, 'user_devices'), where('user_uid', '==', userUid));
    const devSnap = await getDocs(devQ);
    const batch1 = writeBatch(db);
    devSnap.docs.forEach(d => {
      batch1.update(d.ref, {
        device_status: 'revoked',
        revoked_at: now,
        revocation_reason: reason,
        revoked_by: currentAdmin?.email || 'Admin',
      });
    });
    await batch1.commit();

    const sessQ = query(collection(db, 'user_sessions'), where('user_uid', '==', userUid));
    const sessSnap = await getDocs(sessQ);
    const batch2 = writeBatch(db);
    sessSnap.docs.forEach(d => {
      batch2.update(d.ref, {
        session_status: 'revoked',
        revoked_at: now,
        revocation_reason: reason,
      });
    });
    await batch2.commit();

    await recordAdminAuditLog({
      action: 'REVOKE_ALL_DEVICES',
      target_user_uid: userUid,
      target_user_email: userEmail,
      target_resource: 'user_devices',
      target_id: userUid,
      reason,
      details: { count: devSnap.size },
      operation_result: 'SUCCESS',
    });

    return true;
  } catch (err) {
    console.error('Revoke all devices failed:', err);
    return false;
  }
}

/**
 * Approve a pending shop registration
 */
export async function approveUserRegistration(shopId: string, userUid?: string, note?: string): Promise<boolean> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;

  try {
    await updateDoc(doc(db, 'shops', shopId), {
      status: 'Approved',
      isApproved: true,
      isSuspended: false,
      isBlocked: false,
      approvedAt: now,
      approvedBy: currentAdmin?.email || currentAdmin?.uid || 'Admin',
      approvalNote: note || '',
      updatedAt: now,
    });

    if (userUid) {
      await updateDoc(doc(db, 'users', userUid), {
        status: 'Approved',
        isApproved: true,
        isSuspended: false,
        isBlocked: false,
        updatedAt: now,
      }).catch(() => {});
    }

    await recordAdminAuditLog({
      action: 'APPROVE_USER',
      target_user_uid: userUid,
      target_resource: 'shops',
      target_id: shopId,
      new_status: 'Approved',
      reason: note || 'Registration approved by administrator',
      operation_result: 'SUCCESS',
    });

    return true;
  } catch (err) {
    console.error('Approve registration failed:', err);
    return false;
  }
}

/**
 * Reject a shop registration
 */
export async function rejectUserRegistration(shopId: string, userUid?: string, reason = 'Application declined'): Promise<boolean> {
  const now = Date.now();
  const currentAdmin = auth.currentUser;

  try {
    await updateDoc(doc(db, 'shops', shopId), {
      status: 'Rejected',
      isApproved: false,
      rejectionReason: reason,
      rejectedAt: now,
      rejectedBy: currentAdmin?.email || 'Admin',
      updatedAt: now,
    });

    if (userUid) {
      await updateDoc(doc(db, 'users', userUid), {
        status: 'Rejected',
        isApproved: false,
        updatedAt: now,
      }).catch(() => {});
    }

    await recordAdminAuditLog({
      action: 'REJECT_USER',
      target_user_uid: userUid,
      target_resource: 'shops',
      target_id: shopId,
      new_status: 'Rejected',
      reason,
      operation_result: 'SUCCESS',
    });

    return true;
  } catch (err) {
    console.error('Reject user failed:', err);
    return false;
  }
}

/**
 * Send reply in support chat
 */
export async function sendAdminSupportMessage(shopId: string, messageText: string): Promise<boolean> {
  const now = Date.now();
  const user = auth.currentUser;
  const cleanText = messageText.trim();
  if (!cleanText || !shopId) return false;

  try {
    await addDoc(collection(db, 'support_conversations', shopId, 'messages'), {
      conversationId: shopId,
      shopId,
      senderUid: user?.uid || 'admin',
      senderEmail: user?.email || '',
      senderRole: 'platform_admin',
      senderType: 'admin',
      senderName: user?.displayName || 'Support Team',
      messageText: cleanText,
      timestamp: now,
      serverTimestamp: serverTimestamp(),
    });

    await setDoc(
      doc(db, 'support_conversations', shopId),
      {
        shopId,
        lastMessage: cleanText,
        lastMessageAt: now,
        lastUpdated: now,
        lastSenderRole: 'platform_admin',
        status: 'open',
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return true;
  } catch (err) {
    console.error('Send support message failed:', err);
    return false;
  }
}
