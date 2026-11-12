import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  loginShopOwner,
  registerShopOwner,
  sendPasswordReset,
  resendVerificationEmail,
  logoutShopOwner,
  getShopProfile,
  isSessionExpired,
  clearLoginSession
} from '../services/authService';
import { startDeviceSession, stopDeviceSession, recordFailedLoginAttempt } from '../services/heartbeatService';
import { ShopProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  shopProfile: ShopProfile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  isSessionValid: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; isUnverified?: boolean; user?: User }>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (user?: User) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<ShopProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(true);

  const refreshProfile = async (): Promise<ShopProfile | null> => {
    const activeUser = auth.currentUser;
    if (!activeUser) {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Enforce 24-hour login session policy
        if (isSessionExpired()) {
          await stopDeviceSession();
          await logoutShopOwner();
          setCurrentUser(null);
          setShopProfile(null);
          setProfileError(null);
          setProfileLoading(false);
          setIsSessionValid(false);
          setLoading(false);
          return;
        }

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
            alert('Your account has been blocked by the administrator. Please contact customer support.');
            await stopDeviceSession();
            await logoutShopOwner();
            setCurrentUser(null);
            setShopProfile(null);
            setProfileLoading(false);
            setIsSessionValid(false);
            setLoading(false);
            return;
          }

          if (profile.isSuspended || profile.status === 'Suspended' || profile.status === 'Disabled') {
            alert('Your account access has been suspended by the administrator. Please contact customer support.');
            await stopDeviceSession();
            await logoutShopOwner();
            setCurrentUser(null);
            setShopProfile(null);
            setProfileLoading(false);
            setIsSessionValid(false);
            setLoading(false);
            return;
          }
        }

        setShopProfile(profile);
        setCurrentUser(user);
        setIsSessionValid(true);
        setProfileLoading(false);

        if (profile) {
          // Start device heartbeat session & remote kill-switch listener
          startDeviceSession(
            user.uid,
            user.email || profile.email || '',
            profile.ownerName || '',
            profile.shopId || '',
            profile.shopName || '',
            {
              onRevoked: async (reason) => {
                alert(reason || 'This device session has been revoked by an administrator.');
                await stopDeviceSession();
                await logoutShopOwner();
                setCurrentUser(null);
                setShopProfile(null);
                setIsSessionValid(false);
              },
              onBlocked: async (reason) => {
                alert(reason || 'Your account has been blocked by the administrator. Please contact customer support.');
                await stopDeviceSession();
                await logoutShopOwner();
                setCurrentUser(null);
                setShopProfile(null);
                setIsSessionValid(false);
              },
              onSuspended: async (reason) => {
                alert(reason || 'Your account access has been suspended by the administrator. Please contact customer support.');
                await stopDeviceSession();
                await logoutShopOwner();
                setCurrentUser(null);
                setShopProfile(null);
                setIsSessionValid(false);
              }
            }
          ).catch((err) => console.warn('Device session start error:', err));
        }
      } else {
        await stopDeviceSession();
        setCurrentUser(null);
        setShopProfile(null);
        setProfileError(null);
        setProfileLoading(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      stopDeviceSession();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await loginShopOwner(email, pass);
    if (res.success && res.user) {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const profile = await getShopProfile(res.user.uid, res.user);
        if (profile) {
          if (profile.isBlocked || profile.status === 'Blocked') {
            await logoutShopOwner();
            await recordFailedLoginAttempt(email, res.user.uid, 'Account is blocked by administrator');
            return {
              success: false,
              error: 'Your account has been blocked by the administrator. Please contact customer support.'
            };
          }
          if (profile.isSuspended || profile.status === 'Suspended' || profile.status === 'Disabled') {
            await logoutShopOwner();
            await recordFailedLoginAttempt(email, res.user.uid, 'Account access is suspended by administrator');
            return {
              success: false,
              error: 'Your account access has been suspended by the administrator. Please contact customer support.'
            };
          }
        }

        setShopProfile(profile);
        setCurrentUser(res.user);
        setIsSessionValid(true);
        return { success: true };
      } catch (err: any) {
        const msg = err?.message || 'Unable to load your shop profile. Please try again.';
        setProfileError(msg);
        setCurrentUser(res.user);
        setIsSessionValid(true);
        return { success: true };
      } finally {
        setProfileLoading(false);
      }
    }

    if (!res.success && !res.isUnverified) {
      await recordFailedLoginAttempt(email, res.user?.uid, res.error || 'Authentication failure');
    }

    return {
      success: false,
      error: res.error,
      isUnverified: res.isUnverified,
      user: res.user
    };
  };

  const register = async (data: any) => {
    return await registerShopOwner(data);
  };

  const resetPassword = async (email: string) => {
    return await sendPasswordReset(email);
  };

  const resendVerification = async (user?: User) => {
    return await resendVerificationEmail(user);
  };

  const logout = async () => {
    await stopDeviceSession();
    await logoutShopOwner();
    setCurrentUser(null);
    setShopProfile(null);
    setIsSessionValid(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        shopProfile,
        loading,
        profileLoading,
        profileError,
        isSessionValid,
        login,
        register,
        resetPassword,
        resendVerification,
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
