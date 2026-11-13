import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updatePassword,
  ActionCodeSettings
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
 * Helper to safely extract environment variables across both Vite client (`import.meta.env`)
 * and Node/test environments (`process.env`). Supports both VITE_ prefixed and legacy non-prefixed variables.
 */
const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.env) {
      const val = import.meta.env[key];
      if (val !== undefined && val !== null && String(val).trim()) {
        return String(val).trim();
      }
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process?.env) {
      const val = process.env[key];
      if (val !== undefined && val !== null && String(val).trim()) {
        return String(val).trim();
      }
    }
  } catch {}
  return undefined;
};

/**
 * STRICT SINGLE-USER ACCESS CONFIGURATION
 * Checks VITE_ADMIN_EMAIL, ADMIN_EMAIL, and falls back to domnicsanjay2009@gmail.com.
 * Checks VITE_ADMIN_PASSWORD, ADMIN_PASSWORD, and falls back to sanjay0920.
 * All other logins, registrations, and account creations are prohibited.
 */
export const ENFORCED_ADMIN_EMAIL =
  getEnvVar('VITE_ADMIN_EMAIL') ||
  getEnvVar('ADMIN_EMAIL') ||
  getEnvVar('ADMIN EMAIL') ||
  'domnicsanjay2009@gmail.com';

export const ENFORCED_ADMIN_PASSWORD =
  getEnvVar('VITE_ADMIN_PASSWORD') ||
  getEnvVar('ADMIN_PASSWORD') ||
  getEnvVar('ADMIN PASSWORD') ||
  'sanjay0920';

export const ALLOW_ADMIN_REGISTRATION = false;

/**
 * In-session cache for newly updated administrator passwords (e.g. after a password reset).
 * Ensures immediate login and subsequent session consistency.
 */
let runtimeAdminPasswordOverride: string | null = null;

export function setRuntimeAdminPassword(newPassword: string): void {
  runtimeAdminPasswordOverride = newPassword;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('psm_admin_pwd_override', newPassword);
    }
  } catch {}
}

export function getEffectiveAdminPassword(): string {
  if (runtimeAdminPasswordOverride) return runtimeAdminPasswordOverride;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem('psm_admin_pwd_override');
      if (stored) return stored;
    }
  } catch {}
  return ENFORCED_ADMIN_PASSWORD;
}

/**
 * Checks whether a Firebase User is the strictly authorized platform administrator.
 * Only the single authorized admin email is allowed. All other users are denied.
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
 * Enforces strict single-user credentials (matches ENFORCED_ADMIN_EMAIL).
 * Rejects all unauthorized users immediately.
 * Supports credentials updated via Forgot Password or environment variables.
 */
export async function loginAdmin(email: string, pass: string): Promise<{
  success: boolean;
  admin?: AdminUser;
  error?: string;
}> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const targetEmail = ENFORCED_ADMIN_EMAIL.toLowerCase();

  // 1. Strict single-user check: Reject ANY email other than the enforced default admin
  if (normalizedEmail !== targetEmail) {
    return {
      success: false,
      error: `Access denied: Only the designated platform administrator (${ENFORCED_ADMIN_EMAIL}) is permitted to access this panel.`
    };
  }

  const effectivePassword = getEffectiveAdminPassword();

  try {
    let cred;
    try {
      // First attempt: try authenticating with the entered password directly in Firebase Auth
      cred = await signInWithEmailAndPassword(auth, ENFORCED_ADMIN_EMAIL, pass);
    } catch (authErr: any) {
      const isAuthFail =
        authErr.code === 'auth/invalid-credential' ||
        authErr.code === 'auth/wrong-password' ||
        authErr.code === 'auth/user-not-found';

      if (isAuthFail) {
        // If user account is not found in Firebase Auth yet, auto-initialize if entered password matches configured password
        if (authErr.code === 'auth/user-not-found') {
          if (pass === effectivePassword || pass === ENFORCED_ADMIN_PASSWORD || pass === 'sanjay0920') {
            try {
              cred = await createUserWithEmailAndPassword(auth, ENFORCED_ADMIN_EMAIL, pass);
            } catch {
              throw authErr;
            }
          } else {
            return {
              success: false,
              error: 'Invalid administrator credentials. Access restricted.'
            };
          }
        } else if (pass === effectivePassword || pass === ENFORCED_ADMIN_PASSWORD) {
          // If pass matches the configured environment password, but Firebase Auth has an older seed password (e.g. sanjay0920):
          // Sign in with the seed password and synchronize Firebase Auth to the configured password
          if (pass !== 'sanjay0920') {
            try {
              const fallbackCred = await signInWithEmailAndPassword(auth, ENFORCED_ADMIN_EMAIL, 'sanjay0920');
              await updatePassword(fallbackCred.user, pass);
              cred = fallbackCred;
            } catch {
              throw authErr;
            }
          } else {
            throw authErr;
          }
        } else {
          return {
            success: false,
            error: 'Invalid administrator credentials. Access restricted.'
          };
        }
      } else {
        throw authErr;
      }
    }

    if (!cred) {
      return {
        success: false,
        error: 'Invalid administrator credentials. Access restricted.'
      };
    }

    const isAdmin = await verifyAdminStatus(cred.user);
    if (!isAdmin) {
      await signOut(auth);
      return {
        success: false,
        error: `Access denied: Account is not authorized as the single platform administrator.`
      };
    }

    // Keep effective password in sync
    setRuntimeAdminPassword(pass);

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
    if (
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/user-not-found'
    ) {
      msg = 'Invalid administrator credentials.';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Too many failed login attempts. Please wait a few moments and try again.';
    }
    return { success: false, error: msg };
  }
}

/**
 * FORGOT PASSWORD WORKFLOW
 * Sends a password reset email strictly to the single authorized administrator (ENFORCED_ADMIN_EMAIL).
 */
export async function sendAdminPasswordReset(email?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const targetEmail = (email || ENFORCED_ADMIN_EMAIL).trim();

  // Strict Single-User Check: Only the enforced admin email is allowed
  if (targetEmail.toLowerCase() !== ENFORCED_ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: `Password reset is restricted. Only the designated platform administrator (${ENFORCED_ADMIN_EMAIL}) can request a reset link.`
    };
  }

  try {
    const returnUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'http://localhost:5174';

    const actionCodeSettings: ActionCodeSettings = {
      url: returnUrl,
      handleCodeInApp: true,
    };

    try {
      await sendPasswordResetEmail(auth, ENFORCED_ADMIN_EMAIL, actionCodeSettings);
    } catch (sendErr: any) {
      // If user does not exist in Firebase Auth yet, initialize the user first and retry
      if (sendErr.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, ENFORCED_ADMIN_EMAIL, ENFORCED_ADMIN_PASSWORD);
          await sendPasswordResetEmail(auth, ENFORCED_ADMIN_EMAIL, actionCodeSettings);
        } catch {
          throw sendErr;
        }
      } else {
        throw sendErr;
      }
    }

    return {
      success: true,
      message: `Password reset link sent to ${ENFORCED_ADMIN_EMAIL}. Please check your inbox and click the link to reset your password.`
    };
  } catch (err: any) {
    console.error('Password reset email error:', err);
    let msg = 'Failed to send password reset email. Please try again.';
    if (err.code === 'auth/too-many-requests') {
      msg = 'Too many reset requests. Please wait a few moments before requesting another link.';
    } else if (err.code === 'auth/network-request-failed') {
      msg = 'Network connection error. Please check your internet connection.';
    }
    return {
      success: false,
      error: msg
    };
  }
}

/**
 * Verifies a password reset code (oobCode) returned by the Firebase Auth action link.
 * Ensures the code is valid, unexpired, and issued strictly to ENFORCED_ADMIN_EMAIL.
 */
export async function verifyAdminPasswordResetCode(oobCode: string): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  if (!oobCode || !oobCode.trim()) {
    return { success: false, error: 'Invalid or missing password reset code.' };
  }

  try {
    const email = await verifyPasswordResetCode(auth, oobCode.trim());
    if (email.toLowerCase() !== ENFORCED_ADMIN_EMAIL.toLowerCase()) {
      return {
        success: false,
        error: `Security violation: This reset link was issued for an unauthorized address (${email}). Only ${ENFORCED_ADMIN_EMAIL} is permitted.`
      };
    }
    return { success: true, email };
  } catch (err: any) {
    console.error('Error verifying reset code:', err);
    let msg = 'The password reset link is invalid or has expired. Please request a new reset link.';
    if (err.code === 'auth/expired-action-code') {
      msg = 'The password reset link has expired. Please request a new link.';
    } else if (err.code === 'auth/invalid-action-code') {
      msg = 'The password reset link is invalid or has already been used.';
    }
    return { success: false, error: msg };
  }
}

/**
 * Confirms the password reset in Firebase Auth and immediately logs in with the updated credentials.
 */
export async function confirmAdminPasswordResetAndLogin(
  oobCode: string,
  newPassword: string
): Promise<{
  success: boolean;
  admin?: AdminUser;
  error?: string;
}> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters in length.' };
  }

  try {
    // 1. Confirm the password reset in Firebase Auth using the oobCode
    await confirmPasswordReset(auth, oobCode.trim(), newPassword);

    // 2. Set the runtime effective password so future calls immediately recognize it
    setRuntimeAdminPassword(newPassword);

    // 3. Immediately log in with the updated credentials!
    const loginRes = await loginAdmin(ENFORCED_ADMIN_EMAIL, newPassword);
    if (!loginRes.success) {
      return {
        success: false,
        error: loginRes.error || 'Password was reset, but automatic login failed. Please sign in with your new password.'
      };
    }

    return {
      success: true,
      admin: loginRes.admin
    };
  } catch (err: any) {
    console.error('Confirm password reset error:', err);
    let msg = 'Failed to reset password. The link may have expired.';
    if (err.code === 'auth/expired-action-code') {
      msg = 'This reset code has expired. Please request a new password reset link.';
    } else if (err.code === 'auth/invalid-action-code') {
      msg = 'This reset code is invalid or has already been used.';
    } else if (err.code === 'auth/weak-password') {
      msg = 'Password is too weak. Please use a stronger password (minimum 6 characters).';
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
