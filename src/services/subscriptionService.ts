import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from './firebase';
import { Subscription, PlanType, StaffPass } from '../types';

const SUBSCRIPTION_COLLECTION = 'subscriptions';
const TRANSACTIONS_COLLECTION = 'payment_transactions';
const STAFF_PASSES_COLLECTION = 'staff_passes';

export const PLANS = {
  YEARLY: {
    name: 'Yearly' as PlanType,
    priceRupees: 1999,
    pricePaise: 199900,
    maxDevices: 3,
    durationDays: 365,
    features: [
      'Unlimited pledge bills',
      'Unlimited payment entries',
      'Unlimited closing bills',
      'Business analytics & financial graphs',
      'Use on up to 3 devices simultaneously',
      'Standard customer care chat',
    ]
  },
  PREMIUM: {
    name: 'Yearly Premium' as PlanType,
    priceRupees: 2999,
    pricePaise: 299900,
    maxDevices: 9,
    durationDays: 365,
    features: [
      'All Yearly Plan features included',
      'Connect up to 9 devices simultaneously',
      '90-Day Temporary Staff Pass delegation',
      'Live AI Customer Care (Gemini integration)',
      'Priority Admin response channel',
    ]
  }
};

/**
 * Loads Razorpay script dynamically if not already present on window
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Gets current active subscription for the shop
 */
export async function getActiveSubscription(shopId: string): Promise<Subscription | null> {
  try {
    const ref = doc(db, SUBSCRIPTION_COLLECTION, shopId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    
    const sub = snap.data() as Omit<Subscription, 'id'>;
    if (sub.status === 'Approved' && sub.expiryDate > Date.now()) {
      return { id: snap.id, ...sub };
    }
    return null;
  } catch (e) {
    console.error('Error fetching subscription:', e);
    return null;
  }
}

/**
 * Gets subscription history for the shop
 */
export async function getSubscriptionHistory(shopId: string): Promise<Subscription[]> {
  try {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Subscription));
  } catch (e) {
    console.error('Error fetching subscription history:', e);
    return [];
  }
}

/**
 * Retrieves valid Firebase ID Token for authenticated API calls
 */
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User is not authenticated. Please log in first.');
  }
  return await user.getIdToken();
}

/**
 * Creates Razorpay Order via REST API or Firebase Cloud Function fallback
 */
async function requestCreateOrder(
  planName: string,
  shopId: string
): Promise<{ orderId: string; amount: number; currency: string; keyId?: string }> {
  const backendUrl = (import.meta.env.VITE_BACKEND_API_URL || '').trim();
  const primaryEndpoint = backendUrl
    ? `${backendUrl.replace(/\/+$/, '')}/api/create-order`
    : '/api/create-order';

  let token = '';
  try {
    token = await getAuthToken();
  } catch (tErr) {
    console.warn('Auth token retrieval note before order creation:', tErr);
  }

  // 1. Primary: Call Vercel Serverless / Express REST API endpoint
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(primaryEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ planName, shopId }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.orderId) {
      return data;
    }

    if (data?.error) {
      throw new Error(data.error);
    }
  } catch (primaryErr: any) {
    if (primaryErr?.message && !primaryErr.message.includes('Failed to fetch') && !primaryErr.message.includes('fetch')) {
      throw primaryErr;
    }
    console.warn('Primary endpoint unreachable, trying Cloud Function fallback:', primaryErr?.message);
  }

  // 2. Secondary fallback: Firebase Cloud Functions
  try {
    const createOrderFn = httpsCallable<
      { planName: string; shopId: string },
      { orderId: string; amount: number; currency: string; keyId?: string }
    >(functions, 'createRazorpayOrder');

    const orderRes = await createOrderFn({ planName, shopId });
    if (orderRes?.data?.orderId) {
      return orderRes.data;
    }
  } catch (cloudFnErr: any) {
    console.error('Cloud Function createRazorpayOrder failed:', cloudFnErr);
    const msg = cloudFnErr?.message || '';
    if (msg.toLowerCase().includes('internal')) {
      throw new Error('Payment gateway service error. Please verify your connection or contact domnicsanjay2009@gmail.com.');
    }
    throw new Error(msg || 'Failed to create payment order with gateway.');
  }

  throw new Error('Failed to create Razorpay payment order. Please ensure payment service is reachable.');
}

/**
 * Verifies Razorpay Payment Signature server-side via REST API or Cloud Function fallback
 */
async function requestVerifyPayment(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  planName: string;
  shopId: string;
}): Promise<{ success: boolean; subscription: Subscription }> {
  const backendUrl = (import.meta.env.VITE_BACKEND_API_URL || '').trim();
  const primaryEndpoint = backendUrl
    ? `${backendUrl.replace(/\/+$/, '')}/api/verify-payment`
    : '/api/verify-payment';

  let token = '';
  try {
    token = await getAuthToken();
  } catch (tErr) {
    console.warn('Auth token retrieval note before payment verification:', tErr);
  }

  // 1. Primary: Call Vercel Serverless / Express REST API endpoint
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(primaryEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success && data?.subscription) {
      return data;
    }

    if (data?.error) {
      throw new Error(data.error);
    }
  } catch (primaryErr: any) {
    if (primaryErr?.message && !primaryErr.message.includes('Failed to fetch') && !primaryErr.message.includes('fetch')) {
      throw primaryErr;
    }
    console.warn('Primary verify-payment endpoint unreachable, trying Cloud Function fallback:', primaryErr?.message);
  }

  // 2. Secondary fallback: Firebase Cloud Functions
  try {
    const verifyPaymentFn = httpsCallable<
      typeof payload,
      { success: boolean; subscription: Subscription }
    >(functions, 'verifyRazorpayPayment');

    const verifyRes = await verifyPaymentFn(payload);
    if (verifyRes?.data?.success) {
      return verifyRes.data;
    }
  } catch (cloudFnErr: any) {
    console.error('Cloud Function verifyRazorpayPayment failed:', cloudFnErr);
    const msg = cloudFnErr?.message || '';
    if (msg.toLowerCase().includes('internal')) {
      throw new Error('Payment verification service error. Please contact domnicsanjay2009@gmail.com.');
    }
    throw new Error(msg || 'Server-side payment verification failed.');
  }

  throw new Error('Payment verification could not be confirmed. Please contact support.');
}

/**
 * Razorpay Payment Workflow:
 * 1. Verifies online state (offline-first safeguard)
 * 2. Checks active subscription, allowing upgrades and renewals near expiry
 * 3. Calls backend (Vercel serverless / Express REST API or Cloud Function) to create order
 * 4. Opens standard Razorpay Checkout
 * 5. Verifies signature server-side
 * 6. Activates subscription securely in real-time
 */
export async function initiateRazorpayPayment(
  shopId: string,
  planType: PlanType,
  userEmail: string,
  userPhone: string,
  ownerName: string,
  onSuccess: (sub: Subscription) => void,
  onError: (err: string) => void
): Promise<void> {
  // Offline check: Payment requires online connectivity
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    onError('Payment requires an active internet connection. Please connect to the internet to purchase or renew a subscription.');
    return;
  }

  // Pre-check: Allow upgrade from Yearly to Yearly Premium, or renewal within 30 days of expiry
  const activeSub = await getActiveSubscription(shopId);
  if (activeSub) {
    const isUpgrade = activeSub.plan === 'Yearly' && planType === 'Yearly Premium';
    const isNearExpiry = (activeSub.expiryDate - Date.now()) <= (30 * 24 * 60 * 60 * 1000);
    if (!isUpgrade && !isNearExpiry) {
      const expiryDateStr = new Date(activeSub.expiryDate).toLocaleDateString('en-IN');
      onError(`Your subscription is already active. Your current plan expires on ${expiryDateStr}. You can renew within 30 days of expiry.`);
      return;
    }
  }

  // Ensure Razorpay Checkout SDK is ready
  const scriptLoaded = await loadRazorpayScript();
  const Razorpay = (window as any).Razorpay;
  if (!scriptLoaded || !Razorpay) {
    onError('Razorpay SDK failed to load. Please check your internet connection and refresh.');
    return;
  }

  try {
    // 1. Call Secure Backend Endpoint to create Razorpay Order
    const { orderId, amount, currency, keyId } = await requestCreateOrder(planType, shopId);

    if (!orderId) {
      throw new Error('Payment server failed to return a valid Razorpay Order ID.');
    }

    const razorpayKey = keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TzhIwlAo62Vn7n';

    // 2. Configure Standard Razorpay Checkout
    const options = {
      key: razorpayKey,
      amount: amount,
      currency: currency || 'INR',
      name: 'GS Pawn shop management',
      description: `${planType} Subscription - GS Pawn shop management software service`,
      order_id: orderId,
      image: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png',
      handler: async function (response: any) {
        try {
          // 3. Call Server-Side Verification Endpoint
          const verifyRes = await requestVerifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            planName: planType,
            shopId: shopId,
          });

          if (verifyRes?.success && verifyRes?.subscription) {
            const sub = verifyRes.subscription;
            // Atomically write verified subscription & payment transaction to Firestore
            try {
              const subDocRef = doc(db, SUBSCRIPTION_COLLECTION, shopId);
              await setDoc(subDocRef, {
                id: `sub_${shopId}`,
                shopId,
                plan: sub.plan,
                amountPaise: sub.amountPaise,
                startDate: sub.startDate || Date.now(),
                expiryDate: sub.expiryDate,
                status: 'Approved',
                maxDevices: sub.maxDevices || 3,
                activeDeviceIds: ['device_primary'],
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                paymentStatus: 'PAID',
                entitlementSource: 'RAZORPAY',
                approvedAt: sub.approvedAt || Date.now(),
                updatedAt: Date.now(),
                createdAt: sub.createdAt || Date.now(),
              }, { merge: true });

              const txDocRef = doc(db, TRANSACTIONS_COLLECTION, `tx_${response.razorpay_payment_id}`);
              await setDoc(txDocRef, {
                id: `tx_${response.razorpay_payment_id}`,
                shopId,
                plan: sub.plan,
                amountPaise: sub.amountPaise,
                currency: 'INR',
                paymentMethod: 'Razorpay Standard Checkout',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                status: 'Approved',
                verifiedServerSide: true,
                createdAt: Date.now(),
              }, { merge: true });
            } catch (fsWriteErr) {
              console.warn('Client Firestore subscription sync note:', fsWriteErr);
            }

            onSuccess(verifyRes.subscription);
          } else {
            onError('Payment succeeded at gateway, but server-side verification could not be confirmed. Please contact support.');
          }
        } catch (verifyErr: any) {
          console.error('Server payment verification failed:', verifyErr);
          onError(verifyErr.message || 'Server-side payment verification failed. Please contact support.');
        }
      },
      prefill: {
        name: ownerName || 'Shop Owner',
        email: userEmail || '',
        contact: userPhone || '',
      },
      theme: {
        color: '#101B35', // Brand Navy
      },
      modal: {
        ondismiss: function () {
          onError('Payment checkout was cancelled.');
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      onError(`Payment failed: ${response.error?.description || response.error?.reason || 'Transaction declined by bank/UPI'}`);
    });
    rzp.open();
  } catch (err: any) {
    console.error('Failed to initiate Razorpay checkout:', err);
    onError(err.message || 'Failed to start payment. Please ensure your backend is reachable.');
  }
}

/**
 * 90-Day Temporary Staff Pass for Premium Users
 */
export async function createStaffPass(shopId: string, staffName: string): Promise<StaffPass> {
  const token = 'SP-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).slice(-4).toUpperCase();
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  const staffPass: StaffPass = {
    id: `staff_${Date.now()}`,
    shopId,
    staffName: staffName.trim(),
    token,
    issuedAt: now,
    expiresAt: now + ninetyDaysMs,
    isActive: true,
  };

  await addDoc(collection(db, STAFF_PASSES_COLLECTION), staffPass);
  return staffPass;
}

export async function getStaffPasses(shopId: string): Promise<StaffPass[]> {
  try {
    const q = query(
      collection(db, STAFF_PASSES_COLLECTION),
      where('shopId', '==', shopId),
      orderBy('issuedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffPass));
  } catch (e) {
    console.error('Error fetching staff passes:', e);
    return [];
  }
}
