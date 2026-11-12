import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ShopProfile, AppSettings } from '../types';

const SESSION_KEY = 'psm_auth_session_timestamp';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
  isExpired?: boolean;
  isUnverified?: boolean;
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
      return 'Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';
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
 * Records a new login timestamp
 */
export function recordLoginSession(): void {
  localStorage.setItem(SESSION_KEY, Date.now().toString());
}

/**
 * Clears the login session timestamp
 */
export function clearLoginSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Signs in with email and password, enforcing email verification and friendly error messages
 */
export async function loginShopOwner(email: string, password: string): Promise<LoginResult> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Check if email has been verified
    if (!user.emailVerified) {
      return {
        success: false,
        user,
        isUnverified: true,
        error: 'Please verify your email address before logging in. A verification link was sent to your email.'
      };
    }

    recordLoginSession();
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: formatAuthError(error) };
  }
}

/**
 * Creates a new account with shop profile, default settings, and triggers email verification
 */
export async function registerShopOwner(data: {
  ownerName: string;
  shopName: string;
  phone: string;
  address: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
    const uid = userCredential.user.uid;
    const shopId = `shop_${uid}`;
    
    // Create Shop Profile in Firestore
    const shopProfile: ShopProfile = {
      shopId,
      ownerUid: uid,
      ownerName: data.ownerName.trim(),
      shopName: data.shopName.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      email: data.email.trim().toLowerCase(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'shops', shopId), {
      ...shopProfile,
      serverCreatedAt: serverTimestamp(),
    });
    
    // Map User to Shop
    await setDoc(doc(db, 'users', uid), {
      uid,
      shopId,
      role: 'owner',
      email: data.email.trim().toLowerCase(),
      createdAt: serverTimestamp(),
    });

    // Create Initial Default Settings
    const defaultSettings: AppSettings = {
      shopId,
      defaultInterestDuration: 'Monthly',
      defaultGoldPercentage: 2.0,
      defaultSilverPercentage: 3.0,
      defaultOthersPercentage: 4.0,
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'settings', shopId), defaultSettings);

    // Send email verification link to the newly registered user
    try {
      await sendEmailVerification(userCredential.user);
    } catch (verErr: any) {
      console.warn('Could not send verification email immediately:', verErr);
    }

    // Sign out immediately so user is returned to Login Page as specified
    await signOut(auth);
    clearLoginSession();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: formatAuthError(error) };
  }
}

/**
 * Resends email verification link to the user
 */
export async function resendVerificationEmail(user?: User): Promise<{ success: boolean; error?: string }> {
  try {
    const targetUser = user || auth.currentUser;
    if (!targetUser) {
      return { success: false, error: 'No user session found. Please enter your credentials to log in.' };
    }
    await sendEmailVerification(targetUser);
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
 * Explicit sign-out
 */
export async function logoutShopOwner(): Promise<void> {
  clearLoginSession();
  await signOut(auth);
}

/**
 * Loads the shop profile for the current user
 */
export async function getShopProfile(uid: string): Promise<ShopProfile | null> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return null;
    
    const shopId = userSnap.data()?.shopId;
    if (!shopId) return null;
    
    const shopSnap = await getDoc(doc(db, 'shops', shopId));
    if (!shopSnap.exists()) return null;
    
    return shopSnap.data() as ShopProfile;
  } catch (e) {
    console.error('Error fetching shop profile:', e);
    return null;
  }
}
