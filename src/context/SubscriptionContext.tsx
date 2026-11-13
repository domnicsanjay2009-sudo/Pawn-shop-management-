import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
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

  const activeShopId = shopProfile?.shopId || (currentUser ? `shop_${currentUser.uid}` : null);

  const refreshSubscription = useCallback(async () => {
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
  }, [activeShopId]);

  // Real-time Firestore listener for Instant Enforcement of Pause, Cancel, Approval, and Payment Unlock
  useEffect(() => {
    if (!activeShopId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const subDocRef = doc(db, 'subscriptions', activeShopId);
    const unsubscribe = onSnapshot(
      subDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSubscription({
            id: snap.id,
            shopId: data.shopId || activeShopId,
            plan: data.plan || 'Free',
            amountPaise: data.amountPaise || 0,
            startDate: data.startDate || Date.now(),
            expiryDate: data.expiryDate || Date.now(),
            status: data.status || 'Pending',
            maxDevices: data.maxDevices || 3,
            activeDeviceIds: data.activeDeviceIds || [],
            entitlementSource: data.entitlementSource || 'SYSTEM',
            paymentStatus: data.paymentStatus || 'UNPAID',
            approvalType: data.approvalType,
            approvedBy: data.approvedBy,
            razorpayOrderId: data.razorpayOrderId || data.orderId,
            razorpayPaymentId: data.razorpayPaymentId || data.paymentId,
            createdAt: data.createdAt || data.startDate || Date.now(),
          });
        } else {
          getActiveSubscription(activeShopId)
            .then((fallbackSub) => setSubscription(fallbackSub))
            .catch(() => setSubscription(null));
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Real-time subscription listener warning:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeShopId]);

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
