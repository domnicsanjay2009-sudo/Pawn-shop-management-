import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  reload,
  applyActionCode,
  ActionCodeSettings,
  User
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, authPersistenceReady } from './firebase';
import { clearAppLockActiveState } from './appLockService';
import { ShopProfile, AppSettings } from '../types';

const SESSION_KEY = 'psm_auth_session_timestamp';
const SESSION_UID_KEY = 'psm_auth_session_uid';
const PENDING_VERIFICATION_UID_KEY = 'psm_pending_verification_uid';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUTH_REQUEST_TIMEOUT_MS = 15000;

let registrationInProgress = false;
let loginInProgress = false;

export function isAuthOperationInProgress(): boolean {
  return registrationInProgress || loginInProgress;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
  isExpired?: boolean;
  isUnverified?: boolean;
}

export interface RegisterResult {
  success: boolean;
  user?: User;
  email?: string;
  verificationSent?: boolean;
  verificationError?: string;
  error?: string;
}

export interface VerificationCheckResult {
  verified: boolean;
  email?: string;
  noSession?: boolean;
  error?: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeoutErr: any = new Error(message);
      timeoutErr.code = 'auth/timeout';
      reject(timeoutErr);
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Maps raw Firebase Auth error codes into clear, actionable messages
 */
export function formatAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not yet activated in your Firebase Console. Please go to Firebase Console > Build > Authentication, click "Get Started", and enable the Email/Password provider.';
    case 'auth/user-not-found':
      return 'This mail ID was not found. Please create an account first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or click Forgot Password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials or click Forgot Password.';
    case 'auth/email-already-in-use':
      return 'An account with this email ID already exists. Please login instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';
    case 'auth/expired-action-code':
      return 'This verification link has expired. Please request a new verification email.';
    case 'auth/invalid-action-code':
      return 'This verification link is invalid or has already been used. Try logging in or request a new link.';
    case 'auth/user-token-expired':
      return 'Your verification session has expired. Please enter your credentials to log in or resend the verification email.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-up is currently disabled in Firebase Authentication settings.';
    case 'auth/timeout':
      return error?.message || 'The authentication request timed out. Please check your connection and try again.';
    default:
      return error?.message || 'Authentication failed. Please check your credentials.';
  }
}

/**
 * Checks if the current 24-hour login session has expired
 */
export function isSessionExpired(): boolean {
  const loginTimestampStr = localStorage.getItem(SESSION_KEY);
  if (!loginTimestampStr) return true;

  const loginTime = parseInt(loginTimestampStr, 10);
  if (isNaN(loginTime)) return true;

  return Date.now() - loginTime > SESSION_MAX_AGE_MS;
}

/**
 * Records a new login timestamp (and optional Firebase UID binding)
 */
export function recordLoginSession(uid?: string): void {
  localStorage.setItem(SESSION_KEY, Date.now().toString());
  if (uid) {
    localStorage.setItem(SESSION_UID_KEY, uid);
    if (localStorage.getItem(PENDING_VERIFICATION_UID_KEY) === uid) {
      localStorage.removeItem(PENDING_VERIFICATION_UID_KEY);
    }
  }
}

/**
 * Clears the login session timestamp
 */
export function clearLoginSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_UID_KEY);
}

export function setPendingVerificationUid(uid: string): void {
  localStorage.setItem(PENDING_VERIFICATION_UID_KEY, uid);
}

export function clearPendingVerificationUid(): void {
  localStorage.removeItem(PENDING_VERIFICATION_UID_KEY);
}

export function isPendingVerificationUid(uid: string): boolean {
  return localStorage.getItem(PENDING_VERIFICATION_UID_KEY) === uid;
}

/**
 * Validates whether a Firebase Auth user currently holds a verified, unexpired 24-hour login session
 */
export function hasValidUserSession(user: Pick<User, 'uid' | 'emailVerified'> | null): boolean {
  if (!user || !user.emailVerified) return false;
  if (isPendingVerificationUid(user.uid)) return false;
  if (isSessionExpired()) return false;

  const storedUid = localStorage.getItem(SESSION_UID_KEY);
  if (storedUid && storedUid !== user.uid) return false;
  return true;
}

async function sendVerificationEmailWithFallback(user: User): Promise<void> {
  const actionCodeSettings: ActionCodeSettings | undefined =
    typeof window !== 'undefined' && window.location?.origin
      ? {
          url: `${window.location.origin}/?emailVerificationRedirect=1`,
          handleCodeInApp: false,
        }
      : undefined;

  if (actionCodeSettings) {
    try {
      await withTimeout(
        sendEmailVerification(user, actionCodeSettings),
        AUTH_REQUEST_TIMEOUT_MS,
        'Sending verification email timed out. You can resend it from the verification screen.'
      );
      return;
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/unauthorized-continue-uri' ||
        code === 'auth/invalid-continue-uri' ||
        code === 'auth/missing-continue-uri'
      ) {
        console.warn('Unauthorized continue URI fallback to default verification email:', code);
      } else {
        throw err;
      }
    }
  }

  await withTimeout(
    sendEmailVerification(user),
    AUTH_REQUEST_TIMEOUT_MS,
    'Sending verification email timed out. You can resend it from the verification screen.'
  );
}

/**
 * Signs in with email and password, enforcing Firebase emailVerified check and 24-hour session start
 */
export async function loginShopOwner(email: string, password: string): Promise<LoginResult> {
  loginInProgress = true;
  try {
    await authPersistenceReady;
    const userCredential = await withTimeout(
      signInWithEmailAndPassword(auth, email.trim(), password),
      AUTH_REQUEST_TIMEOUT_MS,
      'Login request timed out. Please check your internet connection and try again.'
    );
    const user = userCredential.user;

    if (!user.emailVerified) {
      try {
        await reload(user);
      } catch {
        // Proceed with current flag if reload fails transiently
      }
    }

    // Check Firebase Authentication's actual emailVerified property
    if (!user.emailVerified) {
      clearLoginSession();
      setPendingVerificationUid(user.uid);
      return {
        success: false,
        user,
        isUnverified: true,
        error: 'Your email address is not verified yet. Please check your inbox and try again.'
      };
    }

    recordLoginSession(user.uid);
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: formatAuthError(error) };
  } finally {
    loginInProgress = false;
  }
}

/**
 * Creates a new Firebase Auth account, initializes shop profile/settings safely with timeouts,
 * sends an email verification link, and leaves verification completion strictly gated before login.
 */
export async function registerShopOwner(data: {
  ownerName: string;
  shopName: string;
  phone: string;
  address: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  if (registrationInProgress) {
    return { success: false, error: 'Registration is already in progress. Please wait.' };
  }

  registrationInProgress = true;
  try {
    await authPersistenceReady;
    const cleanEmail = data.email.trim().toLowerCase();
    const userCredential = await withTimeout(
      createUserWithEmailAndPassword(auth, cleanEmail, data.password),
      AUTH_REQUEST_TIMEOUT_MS,
      'Account creation timed out. Please check your internet connection and try again.'
    );

    const uid = userCredential.user.uid;
    const shopId = `shop_${uid}`;

    // Ensure AuthContext treats this account strictly as pending email verification until verified + logged in
    clearLoginSession();
    setPendingVerificationUid(uid);

    const shopProfile: ShopProfile = {
      shopId,
      ownerUid: uid,
      ownerName: data.ownerName.trim(),
      shopName: data.shopName.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      email: cleanEmail,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const defaultSettings: AppSettings = {
      shopId,
      defaultInterestDuration: 'Monthly',
      defaultGoldPercentage: 2.0,
      defaultSilverPercentage: 3.0,
      defaultOthersPercentage: 4.0,
      updatedAt: Date.now(),
    };

    // Provision Firestore profile, user mapping, and settings concurrently with bounded timeout
    try {
      await withTimeout(
        Promise.all([
          setDoc(doc(db, 'shops', shopId), {
            ...shopProfile,
            serverCreatedAt: serverTimestamp(),
          }),
          setDoc(doc(db, 'users', uid), {
            uid,
            shopId,
            role: 'owner',
            email: cleanEmail,
            createdAt: serverTimestamp(),
          }),
          setDoc(doc(db, 'settings', shopId), defaultSettings),
        ]),
        AUTH_REQUEST_TIMEOUT_MS,
        'Profile setup took too long.'
      );
    } catch (profileSetupErr: any) {
      // Do not trap user on spinner; getShopProfile self-heals on login if needed
      console.warn('Non-fatal initial profile write warning during registration:', profileSetupErr);
    }

    // Send email verification link through Firebase Auth
    let verificationSent = true;
    let verificationError: string | undefined;
    try {
      await sendVerificationEmailWithFallback(userCredential.user);
    } catch (verErr: any) {
      verificationSent = false;
      verificationError = formatAuthError(verErr);
      console.warn('Could not send verification email immediately:', verErr);
    }

    return {
      success: true,
      user: userCredential.user,
      email: cleanEmail,
      verificationSent,
      verificationError,
    };
  } catch (error: any) {
    return { success: false, error: formatAuthError(error) };
  } finally {
    registrationInProgress = false;
  }
}

/**
 * Checks Firebase Auth server emailVerified state via user.reload().
 * When verified, clears any pre-login verification session and signs out so user manually logs in.
 */
export async function checkEmailVerificationStatus(user?: User | null): Promise<VerificationCheckResult> {
  const targetUser = user || auth.currentUser;
  if (!targetUser) {
    return {
      verified: false,
      noSession: true,
      error: 'Please return to the Login Page and sign in with your registered email and password.',
    };
  }

  try {
    await withTimeout(
      reload(targetUser),
      AUTH_REQUEST_TIMEOUT_MS,
      'Could not reach Firebase Authentication to check verification status.'
    );

    if (targetUser.emailVerified) {
      const email = targetUser.email || '';
      clearPendingVerificationUid();
      clearLoginSession();
      await signOut(auth);
      return { verified: true, email };
    }

    return {
      verified: false,
      error: 'Your email address is not verified yet. Please check your inbox and try again.',
    };
  } catch (err: any) {
    return {
      verified: false,
      error: formatAuthError(err),
    };
  }
}

/**
 * Applies a Firebase email verification oobCode action directly in-app and returns to manual login.
 */
export async function verifyEmailWithActionCode(
  oobCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await withTimeout(
      applyActionCode(auth, oobCode),
      AUTH_REQUEST_TIMEOUT_MS,
      'Verification link check timed out. Please try again.'
    );
    clearPendingVerificationUid();
    clearLoginSession();
    if (auth.currentUser) {
      try {
        await reload(auth.currentUser);
      } catch {
        // Ignore reload error after applyActionCode
      }
      await signOut(auth);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: formatAuthError(err) };
  }
}

/**
 * Resends email verification link to the user
 */
export async function resendVerificationEmail(
  user?: User | null
): Promise<{ success: boolean; alreadyVerified?: boolean; error?: string }> {
  try {
    const targetUser = user || auth.currentUser;
    if (!targetUser) {
      return { success: false, error: 'No user session found. Please enter your credentials on the Login Page.' };
    }

    try {
      await reload(targetUser);
      if (targetUser.emailVerified) {
        clearPendingVerificationUid();
        clearLoginSession();
        await signOut(auth);
        return { success: true, alreadyVerified: true };
      }
    } catch {
      // Continue to send if reload fails transiently
    }

    await sendVerificationEmailWithFallback(targetUser);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: formatAuthError(error) };
  }
}

/**
 * Sends a password reset email using Firebase's secure flow
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (error: any) {
    return { success: false, error: formatAuthError(error) };
  }
}

/**
 * Explicit sign-out (clears auth session and active UI lock overlay state)
 */
export async function logoutShopOwner(): Promise<void> {
  clearLoginSession();
  clearPendingVerificationUid();
  clearAppLockActiveState();
  await signOut(auth);
}

/**
 * Loads the shop profile for the current user, automatically recovering from
 * missing /users/{uid} mappings or incomplete registrations without silently masking errors.
 */
export async function getShopProfile(uid: string, authUser?: User | null): Promise<ShopProfile | null> {
  if (!uid) return null;

  let resolvedShopId: string | null = null;
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      resolvedShopId = userSnap.data()?.shopId || null;
    }
  } catch (err: any) {
    console.warn('Primary /users lookup warning:', err?.code || err?.message);
    if (err?.code === 'unavailable') {
      throw new Error('Network unavailable while loading your shop profile. Please check your internet connection.');
    }
  }

  // Try resolved shopId first, then deterministic shop_${uid}
  const candidateIds = Array.from(new Set([resolvedShopId, `shop_${uid}`].filter(Boolean) as string[]));
  for (const candidateId of candidateIds) {
    try {
      const shopSnap = await getDoc(doc(db, 'shops', candidateId));
      if (shopSnap.exists()) {
        const shopData = shopSnap.data() as ShopProfile;
        // Repair missing /users/{uid} mapping asynchronously if needed
        if (resolvedShopId !== shopData.shopId) {
          setDoc(
            doc(db, 'users', uid),
            {
              uid,
              shopId: shopData.shopId,
              role: 'owner',
              email: (shopData.email || authUser?.email || '').toLowerCase(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch((repairErr) => console.warn('Could not repair /users mapping:', repairErr));
        }
        return shopData;
      }
    } catch (err: any) {
      if (err?.code === 'unavailable') {
        throw new Error('Firestore connection is currently offline. Please retry once connected.');
      }
      if (err?.code === 'permission-denied') {
        throw new Error('Permission denied when reading your shop profile. Please log out and sign in again.');
      }
      throw err;
    }
  }

  // Fallback query by ownerUid in case a legacy shop document uses a non-standard ID
  try {
    const ownerQuery = query(collection(db, 'shops'), where('ownerUid', '==', uid), limit(1));
    const ownerSnap = await getDocs(ownerQuery);
    if (!ownerSnap.empty) {
      const shopDoc = ownerSnap.docs[0];
      const shopData = { ...(shopDoc.data() as ShopProfile), shopId: shopDoc.id };
      setDoc(
        doc(db, 'users', uid),
        {
          uid,
          shopId: shopData.shopId,
          role: 'owner',
          email: (shopData.email || authUser?.email || '').toLowerCase(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch((repairErr) => console.warn('Could not repair /users mapping:', repairErr));
      return shopData;
    }
  } catch (err: any) {
    console.warn('OwnerUid fallback query warning:', err?.code || err?.message);
    if (err?.code === 'unavailable') {
      throw new Error('Network unavailable while verifying your shop profile.');
    }
    if (err?.code === 'permission-denied') {
      throw new Error('Access denied reading your shop profile. Please re-authenticate and try again.');
    }
  }

  // Last-resort auto-provisioning if user exists in Firebase Auth with missing Firestore profile
  const activeUser = authUser || (auth.currentUser?.uid === uid ? auth.currentUser : null);
  if (activeUser) {
    const shopId = resolvedShopId || `shop_${uid}`;
    const email = (activeUser.email || '').trim().toLowerCase();
    const displayName = activeUser.displayName?.trim() || (email ? email.split('@')[0] : 'Shop Owner');
    const recoveredProfile: ShopProfile = {
      shopId,
      ownerUid: uid,
      ownerName: displayName,
      shopName: `${displayName}'s Pawn Shop`,
      phone: '',
      address: '',
      email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'shops', shopId), {
        ...recoveredProfile,
        serverCreatedAt: serverTimestamp(),
      });
      await setDoc(
        doc(db, 'users', uid),
        {
          uid,
          shopId,
          role: 'owner',
          email,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'settings', shopId),
        {
          shopId,
          defaultInterestDuration: 'Monthly',
          defaultGoldPercentage: 2.0,
          defaultSilverPercentage: 3.0,
          defaultOthersPercentage: 4.0,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      return recoveredProfile;
    } catch (provisionErr: any) {
      console.error('Failed to auto-provision missing shop profile:', provisionErr);
      throw new Error(
        provisionErr?.code === 'permission-denied'
          ? 'Could not initialize your shop profile due to Firestore permissions.'
          : 'Could not initialize your shop profile. Please check your connection and try again.'
      );
    }
  }

  return null;
}

/**
 * Updates editable shop profile fields in Firestore without overwriting account status or billing fields.
 */
export async function updateShopProfile(
  shopId: string,
  updates: Partial<Pick<ShopProfile, 'shopName' | 'ownerName' | 'phone' | 'email' | 'address' | 'logoUrl'>>
): Promise<ShopProfile> {
  if (!shopId) {
    throw new Error('Shop ID is required to update profile.');
  }

  const now = Date.now();
  const payload: Record<string, any> = {
    updatedAt: now,
  };

  if (updates.shopName !== undefined) payload.shopName = updates.shopName.trim();
  if (updates.ownerName !== undefined) payload.ownerName = updates.ownerName.trim();
  if (updates.phone !== undefined) payload.phone = updates.phone.trim();
  if (updates.email !== undefined) payload.email = updates.email.trim().toLowerCase();
  if (updates.address !== undefined) payload.address = updates.address.trim();
  if (updates.logoUrl !== undefined) payload.logoUrl = updates.logoUrl;

  const shopRef = doc(db, 'shops', shopId);
  await updateDoc(shopRef, payload);

  const refreshed = await getDoc(shopRef);
  if (!refreshed.exists()) {
    throw new Error('Updated shop profile could not be reloaded.');
  }
  return refreshed.data() as ShopProfile;
}
