import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, onAuthStateChanged, reload } from 'firebase/auth';
import { auth, authPersistenceReady } from '../services/firebase';
import {
  loginShopOwner,
  registerShopOwner,
  sendPasswordReset,
  resendVerificationEmail,
  logoutShopOwner,
  getShopProfile,
  checkEmailVerificationStatus,
  verifyEmailWithActionCode,
  hasValidUserSession,
  isPendingVerificationUid,
  isAuthOperationInProgress,
  initiateEmailChange as apiInitiateEmailChange,
  syncVerifiedEmailChange as apiSyncVerifiedEmailChange,
  getPendingEmailChange,
  clearPendingEmailChange,
  PendingEmailChangeInfo,
  RegisterResult,
  VerificationCheckResult,
} from '../services/authService';
import { startDeviceSession, stopDeviceSession, recordFailedLoginAttempt } from '../services/heartbeatService';
import { ShopProfile } from '../types';

export interface AuthBannerMessage {
  type: 'success' | 'info' | 'error';
  message: string;
  prefillEmail?: string;
}

interface AuthContextType {
  currentUser: User | null;
  pendingVerificationUser: User | null;
  shopProfile: ShopProfile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  isSessionValid: boolean;
  authBanner: AuthBannerMessage | null;
  shouldShowLogin: boolean;
  consumeShouldShowLogin: () => void;
  clearAuthBanner: () => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; isUnverified?: boolean; user?: User }>;
  register: (data: any) => Promise<RegisterResult>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (user?: User | null) => Promise<{ success: boolean; alreadyVerified?: boolean; error?: string }>;
  checkVerificationStatus: (user?: User | null) => Promise<VerificationCheckResult>;
  openVerificationScreenForUser: (user: User, banner?: AuthBannerMessage) => void;
  cancelPendingVerification: () => Promise<void>;
  pendingEmailChange: PendingEmailChangeInfo | null;
  initiateEmailChange: (newEmail: string, currentPassword?: string) => Promise<{ success: boolean; error?: string; requiresPassword?: boolean }>;
  checkEmailChangeStatus: () => Promise<{ changed: boolean; newEmail?: string; error?: string }>;
  cancelEmailChange: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<ShopProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [authBanner, setAuthBanner] = useState<AuthBannerMessage | null>(null);
  const [shouldShowLogin, setShouldShowLogin] = useState(false);
  const [pendingEmailChange, setPendingEmailChange] = useState<PendingEmailChangeInfo | null>(() => getPendingEmailChange());

  const activeSessionUidRef = useRef<string | null>(null);
  const verificationRedirectRef = useRef<boolean>(false);

  const consumeShouldShowLogin = useCallback(() => setShouldShowLogin(false), []);
  const clearAuthBanner = useCallback(() => setAuthBanner(null), []);

  const initiateEmailChange = async (newEmail: string, currentPassword?: string) => {
    const res = await apiInitiateEmailChange(newEmail, currentPassword);
    if (res.success) {
      setPendingEmailChange(getPendingEmailChange());
    }
    return res;
  };

  const cancelEmailChange = () => {
    clearPendingEmailChange();
    setPendingEmailChange(null);
  };

  const checkEmailChangeStatus = async (): Promise<{ changed: boolean; newEmail?: string; error?: string }> => {
    const targetUser = currentUser || auth.currentUser;
    if (!targetUser) return { changed: false, error: 'User is not logged in.' };

    const res = await apiSyncVerifiedEmailChange(targetUser, shopProfile?.shopId);
    if (res.changed) {
      setPendingEmailChange(null);
      if (shopProfile && res.newEmail) {
        setShopProfile((prev) => prev ? { ...prev, email: res.newEmail! } : null);
      }
    } else {
      setPendingEmailChange(getPendingEmailChange());
    }
    return res;
  };

  // Check email change verification whenever user returns to browser tab
  useEffect(() => {
    const onWindowFocus = () => {
      if (currentUser && getPendingEmailChange()) {
        checkEmailChangeStatus().catch(() => {});
      }
    };
    window.addEventListener('focus', onWindowFocus);
    return () => window.removeEventListener('focus', onWindowFocus);
  }, [currentUser, shopProfile?.shopId]);

  const openVerificationScreenForUser = useCallback((user: User, banner?: AuthBannerMessage) => {
    setCurrentUser(null);
    setShopProfile(null);
    setPendingVerificationUser(user);
    if (banner) {
      setAuthBanner(banner);
    }
  }, []);

  const refreshProfile = async (): Promise<ShopProfile | null> => {
    const activeUser = auth.currentUser;
    if (!activeUser || !activeUser.emailVerified) {
      setShopProfile(null);
      return null;
    }

    setProfileLoading(true);
    setProfileError(null);
    try {
      const profile = await getShopProfile(activeUser.uid, activeUser);
      setShopProfile(profile);
      return profile;
    } catch (err: any) {
      const msg = err?.message || 'Unable to load shop profile.';
      setProfileError(msg);
      throw err;
    } finally {
      setProfileLoading(false);
    }
  };

  const hydrateVerifiedUser = useCallback(async (user: User): Promise<'ok' | 'blocked' | 'suspended'> => {
    setProfileLoading(true);
    setProfileError(null);

    let profile: ShopProfile | null = null;
    try {
      profile = await getShopProfile(user.uid, user);
    } catch (err: any) {
      console.error('Auth listener profile load failed:', err);
      setProfileError(err?.message || 'Unable to load your shop profile.');
    }

    if (profile) {
      if (profile.isBlocked || profile.status === 'Blocked') {
        activeSessionUidRef.current = null;
        await stopDeviceSession(true);
        await logoutShopOwner();
        setCurrentUser(null);
        setShopProfile(null);
        setPendingVerificationUser(null);
        setProfileLoading(false);
        setIsSessionValid(false);
        return 'blocked';
      }

      if (profile.isSuspended || profile.status === 'Suspended' || profile.status === 'Disabled') {
        activeSessionUidRef.current = null;
        await stopDeviceSession(true);
        await logoutShopOwner();
        setCurrentUser(null);
        setShopProfile(null);
        setPendingVerificationUser(null);
        setProfileLoading(false);
        setIsSessionValid(false);
        return 'suspended';
      }
    }

    setPendingVerificationUser(null);
    setShopProfile(profile);
    setCurrentUser(user);
    setIsSessionValid(true);
    setProfileLoading(false);

    if (profile && activeSessionUidRef.current !== user.uid) {
      activeSessionUidRef.current = user.uid;
      startDeviceSession(
        user.uid,
        user.email || profile.email || '',
        profile.ownerName || '',
        profile.shopId || '',
        profile.shopName || '',
        {
          onRevoked: async (reason) => {
            alert(reason || 'This device session has been revoked by an administrator.');
            activeSessionUidRef.current = null;
            await stopDeviceSession(true);
            await logoutShopOwner();
            setCurrentUser(null);
            setShopProfile(null);
            setIsSessionValid(false);
          },
          onBlocked: async (reason) => {
            alert(reason || 'Your account has been blocked by the administrator. Please contact customer support.');
            activeSessionUidRef.current = null;
            await stopDeviceSession(true);
            await logoutShopOwner();
            setCurrentUser(null);
            setShopProfile(null);
            setIsSessionValid(false);
          },
          onSuspended: async (reason) => {
            alert(reason || 'Your account access has been suspended by the administrator. Please contact customer support.');
            activeSessionUidRef.current = null;
            await stopDeviceSession(true);
            await logoutShopOwner();
            setCurrentUser(null);
            setShopProfile(null);
            setIsSessionValid(false);
          }
        }
      ).catch((err) => console.warn('Device session start error:', err));
    }

    return 'ok';
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        await authPersistenceReady;

        // Inspect URL parameters for Firebase email verification action links or continue redirect
        if (typeof window !== 'undefined' && window.location.search) {
          const params = new URLSearchParams(window.location.search);
          const mode = params.get('mode');
          const oobCode = params.get('oobCode');
          const redirectMarker = params.get('emailVerificationRedirect');

          if (mode === 'verifyEmail' && oobCode) {
            const verifyRes = await verifyEmailWithActionCode(oobCode);
            window.history.replaceState({}, document.title, window.location.pathname);
            if (!isMounted) return;
            if (verifyRes.success) {
              setAuthBanner({
                type: 'success',
                message: 'Your email address has been verified! Please log in with your registered email and password.',
              });
            } else {
              setAuthBanner({
                type: 'error',
                message: verifyRes.error || 'This verification link is invalid or has expired.',
              });
            }
            setShouldShowLogin(true);
          } else if (redirectMarker === '1') {
            verificationRedirectRef.current = true;
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (initErr) {
        console.warn('Auth initialization warning:', initErr);
      }

      if (!isMounted) return;

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!isMounted) return;

        // Avoid racing against an in-flight login or registration transaction
        if (isAuthOperationInProgress()) {
          return;
        }

        if (!user) {
          activeSessionUidRef.current = null;
          await stopDeviceSession(false);
          if (!isMounted) return;
          setCurrentUser(null);
          setShopProfile(null);
          setPendingVerificationUser(null);
          setProfileError(null);
          setProfileLoading(false);
          setIsSessionValid(false);
          if (verificationRedirectRef.current) {
            verificationRedirectRef.current = false;
            setAuthBanner({
              type: 'success',
              message: 'Your email verification is complete! Please sign in with your registered email and password.',
            });
            setShouldShowLogin(true);
          }
          setLoading(false);
          return;
        }

        // Force fresh emailVerified check when Firebase restores an unverified user on startup/refresh
        if (!user.emailVerified) {
          try {
            await reload(user);
          } catch {
            // Keep existing state if temporarily offline
          }
        }

        if (!isMounted) return;

        // Never grant protected application access to an unverified Firebase user
        if (!user.emailVerified) {
          activeSessionUidRef.current = null;
          await stopDeviceSession(false);
          setCurrentUser(null);
          setShopProfile(null);
          setPendingVerificationUser(user);
          setProfileLoading(false);
          setIsSessionValid(false);
          setLoading(false);
          return;
        }

        // Verified Firebase Auth user: check whether a valid 24-hour login session is active
        if (!hasValidUserSession(user)) {
          const wasAwaitingVerification =
            isPendingVerificationUid(user.uid) || verificationRedirectRef.current;
          verificationRedirectRef.current = false;
          activeSessionUidRef.current = null;
          await stopDeviceSession(false);
          await logoutShopOwner();
          if (!isMounted) return;
          setCurrentUser(null);
          setShopProfile(null);
          setPendingVerificationUser(null);
          setProfileLoading(false);
          setIsSessionValid(false);

          if (wasAwaitingVerification) {
            setAuthBanner({
              type: 'success',
              message: 'Your email address has been verified! Please log in with your registered email and password.',
              prefillEmail: user.email || undefined,
            });
            setShouldShowLogin(true);
          }
          setLoading(false);
          return;
        }

        verificationRedirectRef.current = false;
        const status = await hydrateVerifiedUser(user);
        if (!isMounted) return;
        if (status === 'blocked') {
          alert('Your account has been blocked by the administrator. Please contact customer support.');
        } else if (status === 'suspended') {
          alert('Your account access has been suspended by the administrator. Please contact customer support.');
        }
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      // Pause timers cleanly on unmount/HMR without marking Firestore sessions ended
      stopDeviceSession(false);
    };
  }, [hydrateVerifiedUser]);

  const login = async (email: string, pass: string) => {
    const res = await loginShopOwner(email, pass);
    if (res.success && res.user) {
      const hydrationStatus = await hydrateVerifiedUser(res.user);
      if (hydrationStatus === 'blocked') {
        await recordFailedLoginAttempt(email, res.user.uid, 'Account is blocked by administrator');
        return {
          success: false,
          error: 'Your account has been blocked by the administrator. Please contact customer support.',
        };
      }
      if (hydrationStatus === 'suspended') {
        await recordFailedLoginAttempt(email, res.user.uid, 'Account access is suspended by administrator');
        return {
          success: false,
          error: 'Your account access has been suspended by the administrator. Please contact customer support.',
        };
      }

      setAuthBanner(null);
      return { success: true };
    }

    if (res.isUnverified && res.user) {
      setCurrentUser(null);
      setShopProfile(null);
      setIsSessionValid(false);
    }

    if (!res.success && !res.isUnverified) {
      await recordFailedLoginAttempt(email, res.user?.uid, res.error || 'Authentication failure');
    }

    return {
      success: false,
      error: res.error,
      isUnverified: res.isUnverified,
      user: res.user,
    };
  };

  const register = async (data: any): Promise<RegisterResult> => {
    const res = await registerShopOwner(data);
    if (res.success && res.user) {
      setCurrentUser(null);
      setShopProfile(null);
      setIsSessionValid(false);
      setPendingVerificationUser(res.user);
      setAuthBanner({
        type: res.verificationSent ? 'success' : 'info',
        message: 'Account created successfully! Please verify your email address before logging in.',
        prefillEmail: res.email,
      });
    }
    return res;
  };

  const resetPassword = async (email: string) => {
    return await sendPasswordReset(email);
  };

  const resendVerification = async (user?: User | null) => {
    const target = user || pendingVerificationUser;
    const res = await resendVerificationEmail(target);
    if (res.alreadyVerified) {
      setPendingVerificationUser(null);
      setCurrentUser(null);
      setAuthBanner({
        type: 'success',
        message: 'Your email is already verified! Please log in with your email and password.',
        prefillEmail: target?.email || undefined,
      });
      setShouldShowLogin(true);
    }
    return res;
  };

  const checkVerificationStatus = async (user?: User | null): Promise<VerificationCheckResult> => {
    const target = user || pendingVerificationUser;
    const res = await checkEmailVerificationStatus(target);
    if (res.verified) {
      setPendingVerificationUser(null);
      setCurrentUser(null);
      setShopProfile(null);
      setIsSessionValid(false);
      setAuthBanner({
        type: 'success',
        message: 'Email verified successfully! Please log in with your registered email and password.',
        prefillEmail: res.email || target?.email || undefined,
      });
      setShouldShowLogin(true);
    } else if (res.noSession) {
      setPendingVerificationUser(null);
      setShouldShowLogin(true);
    }
    return res;
  };

  const cancelPendingVerification = async () => {
    const email = pendingVerificationUser?.email || undefined;
    await logoutShopOwner();
    setPendingVerificationUser(null);
    setCurrentUser(null);
    setShopProfile(null);
    setIsSessionValid(false);
    setAuthBanner(
      email
        ? {
            type: 'info',
            message: 'Sign in after verifying your email address.',
            prefillEmail: email,
          }
        : null
    );
    setShouldShowLogin(true);
  };

  const logout = async () => {
    activeSessionUidRef.current = null;
    await stopDeviceSession(true);
    await logoutShopOwner();
    setCurrentUser(null);
    setPendingVerificationUser(null);
    setShopProfile(null);
    setIsSessionValid(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        pendingVerificationUser,
        shopProfile,
        loading,
        profileLoading,
        profileError,
        isSessionValid,
        authBanner,
        shouldShowLogin,
        consumeShouldShowLogin,
        clearAuthBanner,
        login,
        register,
        resetPassword,
        resendVerification,
        checkVerificationStatus,
        openVerificationScreenForUser,
        cancelPendingVerification,
        pendingEmailChange,
        initiateEmailChange,
        checkEmailChangeStatus,
        cancelEmailChange,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
