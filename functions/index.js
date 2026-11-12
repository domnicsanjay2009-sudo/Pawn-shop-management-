require('dotenv').config();
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Use asia-south1 (Mumbai) regional deployment for low latency & compliance
const regionalFunctions = functions.region('asia-south1');

/**
 * Lazy initialize Razorpay client with private backend credentials
 */
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID || functions.config().razorpay?.key_id;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || functions.config().razorpay?.key_secret;
  
  if (!keyId || !keySecret) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Razorpay credentials are not configured in the secure backend environment.'
    );
  }
  return {
    rzp: new Razorpay({ key_id: keyId, key_secret: keySecret }),
    keyId,
    keySecret,
  };
}

/**
 * Constant-time comparison to prevent timing attacks on cryptographic signatures
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Authoritative Pricing constants in paise (₹1,999 = 199900 paise, ₹2,999 = 299900 paise)
const PLANS = {
  'Yearly': { name: 'Yearly', amountPaise: 199900, maxDevices: 3, days: 365 },
  'Yearly Premium': { name: 'Yearly Premium', amountPaise: 299900, maxDevices: 9, days: 365 },
};

/**
 * Helper: Verify that the authenticated caller owns or belongs to the specified shopId
 */
async function verifyShopOwnership(uid, shopId) {
  if (!uid || !shopId) return false;
  if (shopId === `shop_${uid}` || shopId === uid) return true;

  try {
    const shopDoc = await db.collection('shops').doc(shopId).get();
    if (shopDoc.exists && shopDoc.data().ownerUid === uid) return true;

    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists && userDoc.data().shopId === shopId) return true;
  } catch (err) {
    console.error('Error verifying shop ownership:', err);
  }
  return false;
}

/**
 * 1. Create Razorpay Order (Server-Side Endpoint)
 * Creates an authorized order directly via Razorpay API without exposing secret keys.
 */
exports.createRazorpayOrder = regionalFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { planName, shopId } = data || {};
  if (!planName || !shopId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing planName or shopId.');
  }

  const plan = PLANS[planName];
  if (!plan) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid plan specified: "${planName}".`);
  }

  // Security: verify that the caller owns the shop
  const isAuthorized = await verifyShopOwnership(context.auth.uid, shopId);
  if (!isAuthorized) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized access to shop subscription.');
  }

  // Anti-duplicate guard: prevent purchasing same plan unless near expiry, but allow upgrades
  try {
    const subDoc = await db.collection('subscriptions').doc(shopId).get();
    if (subDoc.exists) {
      const sub = subDoc.data();
      if (sub.status === 'Approved' && sub.expiryDate > Date.now()) {
        const isUpgrade = sub.plan === 'Yearly' && planName === 'Yearly Premium';
        const isNearExpiry = (sub.expiryDate - Date.now()) <= (30 * 24 * 60 * 60 * 1000);

        if (!isUpgrade && !isNearExpiry) {
          const expDate = new Date(sub.expiryDate).toLocaleDateString('en-IN');
          throw new functions.https.HttpsError(
            'failed-precondition',
            `Your subscription is already active. Current plan expires on ${expDate}. You can renew within 30 days of expiry.`
          );
        }
      }
    }
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error('Error checking active subscription:', err);
  }

  try {
    const { rzp, keyId } = getRazorpayInstance();
    const safeShopPrefix = shopId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const receipt = `rcpt_${safeShopPrefix}_${Date.now().toString(36)}`;

    const order = await rzp.orders.create({
      amount: plan.amountPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        shopId,
        planName,
        uid: context.auth.uid,
        userEmail: context.auth.token?.email || '',
      },
    });

    return {
      orderId: order.id,
      amount: plan.amountPaise,
      currency: 'INR',
      keyId: keyId, // Return public Key ID dynamically to frontend
    };
  } catch (err) {
    console.error('Razorpay Order creation error:', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', err.message || 'Failed to create Razorpay payment order.');
  }
});

/**
 * 2. Verify Razorpay Payment Signature & Activate Subscription
 * Validates HMAC SHA-256 signature server-side and atomically activates subscription.
 */
exports.verifyRazorpayPayment = regionalFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planName, shopId } = data || {};
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !planName || !shopId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing mandatory payment verification fields.');
  }

  // Security: verify that the caller owns the shop
  const isAuthorized = await verifyShopOwnership(context.auth.uid, shopId);
  if (!isAuthorized) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized access to shop subscription.');
  }

  const { keySecret } = getRazorpayInstance();

  // Verify HMAC SHA-256 signature generated by Razorpay
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (!safeCompare(expectedSignature, razorpaySignature)) {
    console.error(`Signature mismatch: expected ${expectedSignature}, received ${razorpaySignature}`);
    throw new functions.https.HttpsError('permission-denied', 'Invalid payment signature. Verification failed.');
  }

  // Idempotency check: if this payment was already verified, return existing record
  const txRef = db.collection('payment_transactions').doc(`tx_${razorpayPaymentId}`);
  const existingTx = await txRef.get();
  if (existingTx.exists && existingTx.data().status === 'Approved') {
    const subDoc = await db.collection('subscriptions').doc(shopId).get();
    return { success: true, subscription: subDoc.data(), message: 'Payment already verified and active.' };
  }

  const plan = PLANS[planName] || PLANS['Yearly'];
  const now = Date.now();
  const expiry = now + (plan.days * 24 * 60 * 60 * 1000);

  const subRecord = {
    id: `sub_${shopId}`,
    shopId,
    ownerUid: context.auth.uid,
    plan: plan.name,
    amountPaise: plan.amountPaise,
    startDate: now,
    expiryDate: expiry,
    status: 'Approved',
    maxDevices: plan.maxDevices,
    activeDeviceIds: ['device_primary'],
    razorpayOrderId,
    razorpayPaymentId,
    approvedAt: now,
    updatedAt: now,
    createdAt: now,
  };

  const txRecord = {
    id: `tx_${razorpayPaymentId}`,
    shopId,
    ownerUid: context.auth.uid,
    plan: plan.name,
    amountPaise: plan.amountPaise,
    currency: 'INR',
    paymentMethod: 'Razorpay Standard Checkout',
    razorpayOrderId,
    razorpayPaymentId,
    status: 'Approved',
    startDate: now,
    expiryDate: expiry,
    verifiedServerSide: true,
    createdAt: now,
    serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Atomic transaction to activate subscription and record payment audit ledger
  await db.runTransaction(async (tx) => {
    tx.set(db.collection('subscriptions').doc(shopId), subRecord, { merge: true });
    tx.set(txRef, txRecord, { merge: true });
  });

  return { success: true, subscription: subRecord };
});

/**
 * 3. Retrieve Payment & Subscription Status
 */
exports.getPaymentStatus = regionalFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { paymentId, shopId } = data || {};
  if (!shopId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing shopId parameter.');
  }

  const isAuthorized = await verifyShopOwnership(context.auth.uid, shopId);
  if (!isAuthorized) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized access.');
  }

  if (paymentId) {
    const txDoc = await db.collection('payment_transactions').doc(`tx_${paymentId}`).get();
    if (txDoc.exists) {
      return { found: true, transaction: txDoc.data() };
    }
  }

  const subDoc = await db.collection('subscriptions').doc(shopId).get();
  return {
    found: subDoc.exists,
    subscription: subDoc.exists ? subDoc.data() : null,
  };
});

/**
 * 4. Secure Razorpay Webhook Handler
 * Receives asynchronous events from Razorpay (payment.captured, payment.failed, order.paid, refund.processed)
 */
exports.razorpayWebhook = regionalFunctions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || functions.config().razorpay?.webhook_secret;
  const signature = req.headers['x-razorpay-signature'];

  if (!secret || !signature) {
    console.error('Webhook missing secret or signature header.');
    res.status(400).send('Missing webhook secret or signature');
    return;
  }

  // Use rawBody buffer to guarantee bit-exact HMAC computation
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (!safeCompare(expectedSignature, signature)) {
    console.error('Webhook signature mismatch.');
    res.status(400).send('Invalid signature');
    return;
  }

  const event = req.body?.event;
  const payload = req.body?.payload;

  console.log(`Processing Razorpay Webhook event: ${event}`);

  try {
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload?.payment?.entity;
      const notes = payment?.notes || {};
      const shopId = notes.shopId;
      const planName = notes.planName || 'Yearly';

      if (shopId) {
        const plan = PLANS[planName] || PLANS['Yearly'];
        const now = Date.now();
        const expiry = now + (plan.days * 24 * 60 * 60 * 1000);

        // Check idempotency
        const txRef = db.collection('payment_transactions').doc(`tx_${payment.id}`);
        const txDoc = await txRef.get();

        if (!txDoc.exists || txDoc.data().status !== 'Approved') {
          await db.runTransaction(async (tx) => {
            tx.set(db.collection('subscriptions').doc(shopId), {
              id: `sub_${shopId}`,
              shopId,
              plan: planName,
              amountPaise: payment.amount,
              startDate: now,
              expiryDate: expiry,
              status: 'Approved',
              maxDevices: plan.maxDevices,
              razorpayPaymentId: payment.id,
              razorpayOrderId: payment.order_id || '',
              approvedAt: now,
              updatedAt: now,
            }, { merge: true });

            tx.set(txRef, {
              id: `tx_${payment.id}`,
              shopId,
              plan: planName,
              amountPaise: payment.amount,
              currency: payment.currency || 'INR',
              paymentMethod: payment.method || 'Razorpay Webhook',
              razorpayPaymentId: payment.id,
              razorpayOrderId: payment.order_id || '',
              status: 'Approved',
              verifiedViaWebhook: true,
              createdAt: now,
              serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          });
          console.log(`Subscription for shop ${shopId} successfully activated via webhook (${event}).`);
        }
      }
    } else if (event === 'payment.failed') {
      const payment = payload?.payment?.entity;
      const notes = payment?.notes || {};
      const shopId = notes.shopId;

      if (payment && shopId) {
        await db.collection('payment_transactions').doc(`tx_${payment.id}`).set({
          id: `tx_${payment.id}`,
          shopId,
          amountPaise: payment.amount || 0,
          currency: payment.currency || 'INR',
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id || '',
          status: 'Failed',
          errorCode: payment.error_code || 'PAYMENT_FAILED',
          errorDescription: payment.error_description || 'Transaction failed',
          createdAt: Date.now(),
          serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`Logged failed payment transaction tx_${payment.id} for shop ${shopId}.`);
      }
    } else if (event === 'refund.processed') {
      const refund = payload?.refund?.entity;
      const paymentId = refund?.payment_id;

      if (paymentId) {
        const txRef = db.collection('payment_transactions').doc(`tx_${paymentId}`);
        const txDoc = await txRef.get();

        if (txDoc.exists) {
          const shopId = txDoc.data().shopId;
          await txRef.update({
            status: 'Refunded',
            refundId: refund.id,
            refundAmountPaise: refund.amount,
            refundedAt: Date.now(),
          });

          if (shopId) {
            await db.collection('subscriptions').doc(shopId).update({
              status: 'Refunded',
              updatedAt: Date.now(),
            });
          }
          console.log(`Processed refund for payment tx_${paymentId}.`);
        }
      }
    }
  } catch (err) {
    console.error('Error handling webhook event:', err);
    // Return 200 to prevent Razorpay from repeatedly retrying a malformed internal error
    res.status(200).json({ status: 'error_logged', message: err.message });
    return;
  }

  res.status(200).json({ status: 'ok' });
});

/**
 * 5. Premium AI Customer Care via Gemini (Server-side key protection)
 */
exports.askGeminiSupport = regionalFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { question } = data || {};
  if (!question || typeof question !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Question must be a non-empty string.');
  }

  // Look up user's shopId and verify active Yearly Premium plan
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User profile not found.');
  }
  const shopId = userDoc.data().shopId;

  const subDoc = await db.collection('subscriptions').doc(shopId).get();
  const sub = subDoc.exists ? subDoc.data() : null;
  const isPremium = sub && sub.status === 'Approved' && sub.plan === 'Yearly Premium' && sub.expiryDate > Date.now();

  if (!isPremium) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'AI Customer Care is an exclusive feature for Yearly Premium subscribers.'
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'Gemini API key is not configured on the server.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `You are the AI Customer Care Assistant for Pawn Shop Management software.
Guidelines:
1. Provide concise, clear, polite guidance about how to use the app (e.g., adding parties, creating pledge bills, recording payments, closing bills, app lock, settings).
2. Do not fabricate or request sensitive customer financial numbers.
3. Be friendly and helpful.`;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I am ready to assist shop staff with software operations.' }] }
      ]
    });

    const result = await chat.sendMessage(question);
    const response = await result.response;
    return { reply: response.text() };
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw new functions.https.HttpsError('internal', 'AI Customer Care service is temporarily unavailable. Please retry.');
  }
});
