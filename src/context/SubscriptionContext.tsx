import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Subscription, PlanType } from '../types';
import { getActiveSubscription, initiateRazorpayPayment } from '../services/subscriptionService';

interface SubscriptionContextType {
  subscription: Subscription | null;
  isPremium: boolean;
  hasActivePlan: boolean;
  loading: boolean;
  upgradePlan: (plan: PlanType, onDone?: () => void, onError?: (msg: string) => void) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { shopProfile, currentUser, profileError, refreshProfile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    const activeShopId = shopProfile?.shopId || (currentUser ? `shop_${currentUser.uid}` : null);
    if (!activeShopId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const sub = await getActiveSubscription(activeShopId);
      setSubscription(sub);
    } finally {
      setLoading(false);
    }
  }, [shopProfile?.shopId, currentUser?.uid]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const hasActivePlan = !!(subscription && subscription.status === 'Approved' && subscription.expiryDate > Date.now());
  const isPremium = hasActivePlan && (
    subscription?.plan === 'Yearly Premium' ||
    subscription?.plan === 'Complimentary Premium' ||
    subscription?.entitlementSource === 'ADMIN_GRANTED' ||
    subscription?.entitlementSource === 'COMPLIMENTARY'
  );

  const upgradePlan = async (
    plan: PlanType,
    onDone?: () => void,
    onError?: (msg: string) => void
  ) => {
    let activeProfile = shopProfile;

    if (!activeProfile) {
      if (!currentUser) {
        onError?.('Please sign in to select a subscription plan.');
        return;
      }
      try {
        activeProfile = await refreshProfile();
      } catch (err: any) {
        onError?.(err?.message || 'Unable to load shop profile from server. Please check your connection and try again.');
        return;
      }
    }

    if (!activeProfile) {
      onError?.(
        profileError ||
        'Unable to resolve your shop profile. Please verify your network connection and click Retry.'
      );
      return;
    }

    if (activeProfile.isBlocked || activeProfile.status === 'Blocked') {
      onError?.('Your account has been blocked by the administrator. Subscription purchases and payments are disabled.');
      return;
    }

    await initiateRazorpayPayment(
      activeProfile.shopId,
      plan,
      activeProfile.email || currentUser?.email || '',
      activeProfile.phone || '',
      activeProfile.ownerName || '',
      (sub) => {
        setSubscription(sub);
        onDone?.();
      },
      (err) => {
        onError?.(err);
      }
    );
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isPremium,
        hasActivePlan,
        loading,
        upgradePlan,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
};
