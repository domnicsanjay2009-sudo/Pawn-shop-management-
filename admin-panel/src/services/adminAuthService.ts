import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'global_admin';
  token?: string;
}

/**
 * STRICT SINGLE-USER ACCESS CONFIGURATION
 * Only this exact email and password combination is permitted.
 * All other logins, registrations, and account creations are prohibited.
 */
export const ENFORCED_ADMIN_EMAIL = 'domnicsanjay2009@gmail.com';
export const ENFORCED_ADMIN_PASSWORD = 'sanjay0920';
export const ALLOW_ADMIN_REGISTRATION = false;

/**
 * Checks whether a Firebase User is the strictly authorized platform administrator.
 * Only 'domnicsanjay2009@gmail.com' is allowed. All other users are denied.
 */
export async function verifyAdminStatus(user: User): Promise<boolean> {
  try {
    // 1. Strict Single-User Check: Only the designated email address is allowed
    const userEmail = (user.email || '').trim().toLowerCase();
    if (userEmail !== ENFORCED_ADMIN_EMAIL.toLowerCase()) {
      console.warn(`[Security Alert] Access denied for ${user.email}: Only ${ENFORCED_ADMIN_EMAIL} is authorized.`);
      return false;
    }

    // 2. Ensure platform_admins record exists in Firestore for RBAC consistency
    try {
      const adminDocRef = doc(db, 'platform_admins', user.uid);
      const adminDocSnap = await getDoc(adminDocRef);
      if (!adminDocSnap.exists()) {
        await setDoc(adminDocRef, {
          admin_id: user.uid,
          email: ENFORCED_ADMIN_EMAIL,
          role: 'global_admin',
          displayName: 'Platform Administrator',
          created_at: Date.now(),
          single_admin_enforced: true
        }, { merge: true });
      }
    } catch (fsErr) {
      // Non-blocking Firestore warning if already recognized by email
      console.warn('Firestore platform_admins sync warning:', fsErr);
    }

    return true;
  } catch (err) {
    console.error('Error verifying admin status:', err);
    return (user.email || '').trim().toLowerCase() === ENFORCED_ADMIN_EMAIL.toLowerCase();
  }
}

/**
 * Log into the companion Admin Panel.
 * Enforces strict single-user credentials (domnicsanjay2009@gmail.com / sanjay0920).
 * Rejects all other credentials immediately.
 */
export async function loginAdmin(email: string, pass: string): Promise<{
  success: boolean;
  admin?: AdminUser;
  error?: string;
}> {
  const normalizedEmail = (email || '').trim().toLowerCase();

  // 1. Strict single-user check: Reject ANY email other than the enforced default admin
  if (normalizedEmail !== ENFORCED_ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: `Access denied: Only the designated platform administrator (${ENFORCED_ADMIN_EMAIL}) is permitted to access this panel.`
    };
  }

  // 2. Strict password validation for the single default admin
  if (pass !== ENFORCED_ADMIN_PASSWORD) {
    return {
      success: false,
      error: 'Invalid administrator credentials. Access restricted.'
    };
  }

  try {
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, ENFORCED_ADMIN_EMAIL, ENFORCED_ADMIN_PASSWORD);
    } catch (authErr: any) {
      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
        // Auto-initialize the default admin account in Firebase Auth if needed
        try {
          cred = await createUserWithEmailAndPassword(auth, ENFORCED_ADMIN_EMAIL, ENFORCED_ADMIN_PASSWORD);
        } catch {
          throw authErr;
        }
      } else {
        throw authErr;
      }
    }

    const isAdmin = await verifyAdminStatus(cred.user);
    if (!isAdmin) {
      await signOut(auth);
      return {
        success: false,
        error: `Access denied: Account is not authorized as the single platform administrator.`
      };
    }

    const token = await cred.user.getIdToken();
    const adminUser: AdminUser = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName || 'Platform Administrator',
      role: 'global_admin',
      token,
    };

    return { success: true, admin: adminUser };
  } catch (err: any) {
    console.error('Admin login error:', err);
    let msg = 'Authentication failed. Please verify your credentials.';
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      msg = 'Invalid administrator credentials.';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Too many failed login attempts. Please wait a few moments and try again.';
    }
    return { success: false, error: msg };
  }
}

/**
 * Strict prohibition of new user registrations or account creation within the admin panel.
 */
export async function registerAdminUser(): Promise<never> {
  throw new Error('Prohibited: The Admin Panel enforces strict single-user access. User registration and account creation are disabled.');
}

/**
 * Log out of Admin Panel
 */
export async function logoutAdmin(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribe to Admin Auth State.
 * Ensures that if any non-admin account is currently authenticated, it is immediately signed out.
 */
export function onAdminAuthStateChanged(callback: (admin: AdminUser | null, loading: boolean) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, false);
      return;
    }

    // Strict single-user check: immediately evict any user other than the single enforced admin
    const userEmail = (user.email || '').trim().toLowerCase();
    if (userEmail !== ENFORCED_ADMIN_EMAIL.toLowerCase()) {
      console.warn(`[Security Alert] Non-admin session detected (${user.email}). Forcing sign-out.`);
      await signOut(auth);
      callback(null, false);
      return;
    }

    const isAdmin = await verifyAdminStatus(user);
    if (!isAdmin) {
      await signOut(auth);
      callback(null, false);
      return;
    }

    const token = await user.getIdToken();
    callback({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Platform Administrator',
      role: 'global_admin',
      token,
    }, false);
  });
}
