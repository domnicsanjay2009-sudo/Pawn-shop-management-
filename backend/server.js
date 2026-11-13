require('dotenv').config({ path: __dirname + '/.env' });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'pawn-shop-management'
      });
      console.log('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT JSON.');
    } catch (e) {
      console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT, initializing with project ID:', e.message);
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'pawn-shop-management' });
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
    try {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized with service account key path.');
    } catch (e) {
      console.warn('Could not load service account path:', e.message);
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'pawn-shop-management' });
    }
  } else {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'pawn-shop-management'
    });
    console.log('Firebase Admin initialized with project ID.');
  }
}

const db = admin.firestore();

// 2. Pricing Plans (Paise values)
const PLANS = {
  'Yearly': { name: 'Yearly', amountPaise: 199900, maxDevices: 3, days: 365 },
  'Yearly Premium': { name: 'Yearly Premium', amountPaise: 299900, maxDevices: 9, days: 365 },
};

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_TzhIwlAo62Vn7n';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'g5RPEmA6TcfwoQozy5m8gNMU';
  
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET) missing on server.');
  }
  return {
    rzp: new Razorpay({ key_id: keyId, key_secret: keySecret }),
    keyId,
    keySecret,
  };
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function verifyShopOwnership(uid, shopId) {
  if (!uid || !shopId) return false;
  if (shopId === `shop_${uid}` || shopId === uid) return true;

  try {
    const shopDoc = await db.collection('shops').doc(shopId).get();
    if (shopDoc.exists && shopDoc.data().ownerUid === uid) return true;

    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists && userDoc.data().shopId === shopId) return true;
  } catch (err) {
    console.error('Error verifying shop ownership:', err.message);
  }
  return false;
}

// Middleware: Authenticate Firebase ID Token
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('ID Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
  }
}

// Middleware: Authenticate Firebase Admin Token
async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // Strict Single-User Admin Check
    if (decoded.email === 'domnicsanjay2009@gmail.com' || decoded.uid === 'PbDMTp8ROrXRaQWUfJ2tvjdlIGC3') {
      req.adminUser = decoded;
      return next();
    }
    // 1. Check custom claim
    if (decoded.role === 'global_admin') {
      req.adminUser = decoded;
      return next();
    }
    // 2. Check platform_admins Firestore document
    const adminDoc = await db.collection('platform_admins').doc(decoded.uid).get();
    if (adminDoc.exists && adminDoc.data().role === 'global_admin') {
      req.adminUser = decoded;
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Global Admin privileges required.' });
  } catch (err) {
    console.error('Admin ID Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
  }
}

const app = express();

// CORS setup
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature']
}));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'pawn-shop-management-backend',
    timestamp: Date.now(),
    razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  });
});

// WEBHOOK HANDLER: Raw body parsing must precede express.json()
app.post('/api/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!secret || !signature) {
    console.error('Webhook missing secret or signature header.');
    return res.status(400).send('Missing webhook secret or signature');
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (!safeCompare(expectedSignature, signature)) {
    console.error('Webhook signature verification failed.');
    return res.status(400).send('Invalid signature');
  }

  let bodyData;
  try {
    bodyData = JSON.parse(rawBody);
  } catch (e) {
    bodyData = {};
  }

  const event = bodyData.event;
  const payload = bodyData.payload;

  console.log(`[Webhook] Event received: ${event}`);

  try {
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload?.payment?.entity;
      const notes = payment?.notes || {};
      const shopId = notes.shopId;
      const planName = notes.planName || 'Yearly';

      if (shopId) {
        const shopDoc = await db.collection('shops').doc(shopId).get();
        if (shopDoc.exists) {
          const sData = shopDoc.data();
          if (sData.isBlocked || sData.status === 'Blocked' || sData.status === 'BLOCKED') {
            const txRef = db.collection('payment_transactions').doc(`tx_${payment.id}`);
            await txRef.set({
              id: `tx_${payment.id}`,
              shopId,
              plan: planName,
              amountPaise: payment.amount,
              currency: payment.currency || 'INR',
              paymentMethod: payment.method || 'Razorpay Webhook',
              razorpayPaymentId: payment.id,
              razorpayOrderId: payment.order_id || '',
              status: 'Captured_Account_Blocked',
              note: 'Payment received but account is blocked by administrator; subscription activation skipped.',
              verifiedViaWebhook: true,
              createdAt: Date.now(),
              serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            console.warn(`[Webhook] Shop ${shopId} is BLOCKED. Payment logged but subscription activation skipped.`);
            return res.status(200).json({ status: 'ok', warning: 'Account blocked; subscription activation skipped' });
          }
        }

        const plan = PLANS[planName] || PLANS['Yearly'];
        const now = Date.now();
        const expiry = now + (plan.days * 24 * 60 * 60 * 1000);

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
          console.log(`[Webhook] Subscription activated for shop ${shopId} via ${event}.`);
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
        console.log(`[Webhook] Logged payment failure tx_${payment.id} for shop ${shopId}.`);
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
          console.log(`[Webhook] Processed refund for payment tx_${paymentId}.`);
        }
      }
    }
  } catch (err) {
    console.error('[Webhook] Internal error processing event:', err);
    return res.status(200).json({ status: 'error_logged', message: err.message });
  }

  return res.status(200).json({ status: 'ok' });
});

// JSON Body Parser for remaining routes
app.use(express.json());

// PUBLIC CONTACT & SUPPORT INQUIRY ENDPOINT
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required fields.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const inquiryRecord = {
      name: String(name).trim().slice(0, 100),
      email: String(email).trim().toLowerCase().slice(0, 100),
      phone: phone ? String(phone).trim().slice(0, 20) : '',
      subject: subject ? String(subject).trim().slice(0, 150) : 'General Inquiry',
      message: String(message).trim().slice(0, 2000),
      createdAt: Date.now(),
      status: 'new',
      businessName: 'GS Pawn shop management',
      source: 'public_website_contact_form'
    };

    try {
      if (db) {
        await db.collection('support_inquiries').add(inquiryRecord);
      }
    } catch (dbErr) {
      console.warn('Could not store inquiry in Firestore:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Thank you for contacting GS Pawn shop management. Your message has been received. Our support team will respond to your registered email shortly.'
    });
  } catch (err) {
    console.error('Contact endpoint error:', err);
    return res.status(500).json({
      error: 'Failed to process inquiry. Please email us directly at domnicsanjay2009@gmail.com.'
    });
  }
});

// 1. CREATE ORDER ENDPOINT
app.post('/api/create-order', authenticateUser, async (req, res) => {
  const { planName, shopId } = req.body || {};

  if (!planName || !shopId) {
    return res.status(400).json({ error: 'Missing planName or shopId.' });
  }

  const plan = PLANS[planName];
  if (!plan) {
    return res.status(400).json({ error: `Invalid plan specified: "${planName}".` });
  }

  const isAuthorized = await verifyShopOwnership(req.user.uid, shopId);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Unauthorized access to shop subscription.' });
  }

  const shopDoc = await db.collection('shops').doc(shopId).get();
  if (shopDoc.exists) {
    const sData = shopDoc.data();
    if (sData.isBlocked || sData.status === 'Blocked' || sData.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Your account has been blocked by the administrator. Subscription purchases are disabled.' });
    }
  }

  try {
    const subDoc = await db.collection('subscriptions').doc(shopId).get();
    if (subDoc.exists) {
      const sub = subDoc.data();
      if (sub.status === 'Approved' && sub.expiryDate > Date.now()) {
        const isUpgrade = sub.plan === 'Yearly' && planName === 'Yearly Premium';
        const isNearExpiry = (sub.expiryDate - Date.now()) <= (30 * 24 * 60 * 60 * 1000);

        if (!isUpgrade && !isNearExpiry) {
          const expDate = new Date(sub.expiryDate).toLocaleDateString('en-IN');
          return res.status(400).json({
            error: `Your subscription is already active. Current plan expires on ${expDate}. You can renew within 30 days of expiry.`
          });
        }
      }
    }
  } catch (subErr) {
    console.warn('Subscription pre-check error:', subErr.message);
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
        uid: req.user.uid,
        userEmail: req.user.email || '',
      },
    });

    return res.status(200).json({
      orderId: order.id,
      amount: plan.amountPaise,
      currency: 'INR',
      keyId: keyId,
    });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create Razorpay payment order.' });
  }
});

// 2. VERIFY PAYMENT ENDPOINT
app.post('/api/verify-payment', authenticateUser, async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planName, shopId } = req.body || {};

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !planName || !shopId) {
    return res.status(400).json({ error: 'Missing mandatory payment verification fields.' });
  }

  const isAuthorized = await verifyShopOwnership(req.user.uid, shopId);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Unauthorized access to shop subscription.' });
  }

  const shopDoc = await db.collection('shops').doc(shopId).get();
  if (shopDoc.exists) {
    const sData = shopDoc.data();
    if (sData.isBlocked || sData.status === 'Blocked' || sData.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Your account has been blocked by the administrator. Subscription purchases are disabled.' });
    }
  }

  let keySecret;
  try {
    const rzpData = getRazorpayInstance();
    keySecret = rzpData.keySecret;
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (!safeCompare(expectedSignature, razorpaySignature)) {
    console.error(`Signature mismatch: expected ${expectedSignature}, received ${razorpaySignature}`);
    return res.status(403).json({ error: 'Invalid payment signature. Verification failed.' });
  }

  const txRef = db.collection('payment_transactions').doc(`tx_${razorpayPaymentId}`);
  const existingTx = await txRef.get();
  if (existingTx.exists && existingTx.data().status === 'Approved') {
    const subDoc = await db.collection('subscriptions').doc(shopId).get();
    return res.status(200).json({ success: true, subscription: subDoc.data(), message: 'Payment already verified and active.' });
  }

  const plan = PLANS[planName] || PLANS['Yearly'];
  const now = Date.now();
  const expiry = now + (plan.days * 24 * 60 * 60 * 1000);

  const subRecord = {
    id: `sub_${shopId}`,
    shopId,
    ownerUid: req.user.uid,
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
    ownerUid: req.user.uid,
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

  try {
    await db.runTransaction(async (tx) => {
      tx.set(db.collection('subscriptions').doc(shopId), subRecord, { merge: true });
      tx.set(txRef, txRecord, { merge: true });
    });

    return res.status(200).json({ success: true, subscription: subRecord });
  } catch (err) {
    console.error('Firestore transaction error during activation:', err);
    return res.status(500).json({ error: 'Payment verified, but saving activation record failed.' });
  }
});

// 3. PAYMENT STATUS ENDPOINT
app.get('/api/payment-status', authenticateUser, async (req, res) => {
  const { paymentId, shopId } = req.query || {};

  if (!shopId) {
    return res.status(400).json({ error: 'Missing shopId parameter.' });
  }

  const isAuthorized = await verifyShopOwnership(req.user.uid, shopId);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Unauthorized access.' });
  }

  try {
    if (paymentId) {
      const txDoc = await db.collection('payment_transactions').doc(`tx_${paymentId}`).get();
      if (txDoc.exists) {
        return res.status(200).json({ found: true, transaction: txDoc.data() });
      }
    }

    const subDoc = await db.collection('subscriptions').doc(shopId).get();
    return res.status(200).json({
      found: subDoc.exists,
      subscription: subDoc.exists ? subDoc.data() : null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. ASK GEMINI CUSTOMER CARE ENDPOINT
app.post('/api/ask-gemini', authenticateUser, async (req, res) => {
  const { question } = req.body || {};

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question must be a non-empty string.' });
  }

  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    const shopId = userDoc.data().shopId;

    const subDoc = await db.collection('subscriptions').doc(shopId).get();
    const sub = subDoc.exists ? subDoc.data() : null;
    const isPremium = sub && sub.status === 'Approved' && (
      sub.plan === 'Yearly Premium' ||
      sub.plan === 'Complimentary Premium' ||
      sub.entitlementSource === 'ADMIN_GRANTED' ||
      sub.entitlementSource === 'COMPLIMENTARY'
    ) && sub.expiryDate > Date.now();

    if (!isPremium) {
      return res.status(403).json({
        error: 'AI Customer Care is an exclusive feature for Yearly Premium subscribers.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

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
    return res.status(200).json({ reply: response.text() });
  } catch (error) {
    console.error('Gemini API call failed:', error);
    return res.status(500).json({ error: 'AI Customer Care service is temporarily unavailable. Please retry.' });
  }
});

// ==========================================
// 5. DEVICE MANAGEMENT & SESSION MONITORING APIS
// ==========================================

// Client starts a device session
app.post('/api/device/session-start', authenticateUser, async (req, res) => {
  try {
    const {
      sessionId,
      deviceId,
      deviceName,
      deviceType,
      browser,
      operatingSystem,
      userUid,
      email,
      ownerName,
      shopId,
      shopName
    } = req.body || {};

    if (!sessionId || !deviceId) {
      return res.status(400).json({ error: 'sessionId and deviceId are required.' });
    }

    const effectiveUid = req.user.uid;
    const effectiveEmail = req.user.email || email || '';

    // Check if shop is blocked or suspended
    if (shopId) {
      const shopDoc = await db.collection('shops').doc(shopId).get();
      if (shopDoc.exists) {
        const sData = shopDoc.data();
        if (sData.isBlocked || sData.status === 'Blocked' || sData.status === 'BLOCKED') {
          return res.status(403).json({ error: 'Your account has been blocked by the administrator. Please contact customer support.', blocked: true });
        }
        if (sData.isSuspended || sData.status === 'Suspended' || sData.status === 'Disabled' || sData.status === 'DISABLED') {
          return res.status(403).json({ error: 'Your account access has been suspended by the administrator. Please contact customer support.', suspended: true });
        }
      }
    }

    // Check device limit vs subscription
    let maxAllowedDevices = 3; // Default for yearly
    if (shopId) {
      const subDoc = await db.collection('subscriptions').doc(shopId).get();
      if (subDoc.exists) {
        const sub = subDoc.data();
        if (
          sub.plan === 'Yearly Premium' ||
          sub.plan === 'Complimentary Premium' ||
          sub.entitlementSource === 'ADMIN_GRANTED' ||
          sub.entitlementSource === 'COMPLIMENTARY'
        ) {
          maxAllowedDevices = sub.maxDevices || 9;
        } else {
          maxAllowedDevices = sub.maxDevices || 3;
        }
      }
    }

    // Count currently active devices for this user
    const devSnap = await db.collection('user_devices')
      .where('user_uid', '==', effectiveUid)
      .where('device_status', '==', 'active')
      .get();
    
    // Check if this device is already in active devices
    const deviceDocId = `dev_${effectiveUid}_${deviceId}`;
    const thisDevDoc = await db.collection('user_devices').doc(deviceDocId).get();
    const isAlreadyActive = thisDevDoc.exists && thisDevDoc.data().device_status === 'active';

    if (!isAlreadyActive && devSnap.size >= maxAllowedDevices) {
      return res.status(403).json({
        error: `Device limit reached. Your subscription plan allows up to ${maxAllowedDevices} active device(s). Revoke an existing device from the Admin Panel or upgrade your plan.`,
        limitExceeded: true,
        maxAllowedDevices,
        currentCount: devSnap.size,
      });
    }

    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24-hr session
    const ipInfo = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Local Client';

    // 1. Write user_sessions
    await db.collection('user_sessions').doc(sessionId).set({
      session_id: sessionId,
      user_uid: effectiveUid,
      email_snapshot: effectiveEmail,
      owner_name: ownerName || '',
      shop_id: shopId || '',
      shop_name: shopName || '',
      device_id: deviceId,
      device_name: deviceName || 'Unknown Device',
      device_type: deviceType || 'Desktop',
      browser: browser || 'Unknown Browser',
      operating_system: operatingSystem || 'Unknown OS',
      ip_info: Array.isArray(ipInfo) ? ipInfo[0] : String(ipInfo),
      login_at: now,
      last_heartbeat_at: now,
      logout_at: null,
      expires_at: expiresAt,
      session_status: 'online',
      created_at: now,
    }, { merge: true });

    // 2. Upsert user_devices
    const currentSessions = (thisDevDoc.exists ? (thisDevDoc.data().total_sessions || 0) : 0) + 1;
    await db.collection('user_devices').doc(deviceDocId).set({
      id: deviceDocId,
      device_id: deviceId,
      user_uid: effectiveUid,
      shop_id: shopId || '',
      owner_email: effectiveEmail,
      owner_name: ownerName || '',
      shop_name: shopName || '',
      device_name: deviceName || 'Unknown Device',
      device_type: deviceType || 'Desktop',
      browser: browser || 'Unknown Browser',
      operating_system: operatingSystem || 'Unknown OS',
      ip_info: Array.isArray(ipInfo) ? ipInfo[0] : String(ipInfo),
      first_seen_at: thisDevDoc.exists ? (thisDevDoc.data().first_seen_at || now) : now,
      last_seen_at: now,
      device_status: 'active',
      total_sessions: currentSessions,
      schema_version: 1,
    }, { merge: true });

    // 3. Append to device_activity_logs
    const actId = `act_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('device_activity_logs').doc(actId).set({
      event_id: actId,
      user_uid: effectiveUid,
      email: effectiveEmail,
      shop_id: shopId || '',
      device_id: deviceId,
      session_id: sessionId,
      event_type: 'login',
      event_result: 'success',
      event_timestamp: now,
      recorded_at: now,
      actor_uid: effectiveUid,
      ip_info: Array.isArray(ipInfo) ? ipInfo[0] : String(ipInfo),
      metadata: {
        deviceName: deviceName || 'Unknown',
        browser: browser || 'Unknown',
        os: operatingSystem || 'Unknown'
      }
    });

    return res.status(200).json({ success: true, sessionId });
  } catch (err) {
    console.error('Session start error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Periodic Heartbeat
app.post('/api/device/heartbeat', authenticateUser, async (req, res) => {
  try {
    const { sessionId, deviceId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const sessionDocRef = db.collection('user_sessions').doc(sessionId);
    const sessionDoc = await sessionDocRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const sessionData = sessionDoc.data();
    if (sessionData.session_status === 'revoked') {
      return res.status(200).json({ status: 'revoked', message: 'Session has been revoked.' });
    }

    const now = Date.now();
    await sessionDocRef.update({
      last_heartbeat_at: now,
      session_status: 'online',
    });

    if (deviceId && sessionData.user_uid) {
      const devDocRef = db.collection('user_devices').doc(`dev_${sessionData.user_uid}_${deviceId}`);
      await devDocRef.update({
        last_seen_at: now,
        device_status: 'active'
      }).catch(() => {});
    }

    return res.status(200).json({ status: 'online', last_heartbeat_at: now });
  } catch (err) {
    console.error('Heartbeat error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Session Termination / Logout
app.post('/api/device/session-end', authenticateUser, async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const sessionDocRef = db.collection('user_sessions').doc(sessionId);
    const sessionDoc = await sessionDocRef.get();
    if (sessionDoc.exists) {
      const data = sessionDoc.data();
      const now = Date.now();
      await sessionDocRef.update({
        logout_at: now,
        session_status: 'offline',
      });

      const actId = `act_${now}_${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('device_activity_logs').doc(actId).set({
        event_id: actId,
        user_uid: data.user_uid,
        email: data.email_snapshot,
        shop_id: data.shop_id || '',
        device_id: data.device_id,
        session_id: sessionId,
        event_type: 'logout',
        event_result: 'success',
        event_timestamp: now,
        recorded_at: now,
        actor_uid: req.user.uid,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Session end error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. COMPANION ADMIN PANEL APIS
// ==========================================

// Initial Admin Setup / Bootstrap
app.post('/api/admin/setup-first-admin', async (req, res) => {
  try {
    const { email, password, setupSecret } = req.body || {};
    
    // Check if platform_admins collection already has members
    const existingAdmins = await db.collection('platform_admins').limit(1).get();
    
    // If admins already exist, require setupSecret if defined
    if (!existingAdmins.empty && process.env.ADMIN_SETUP_SECRET) {
      if (!setupSecret || setupSecret !== process.env.ADMIN_SETUP_SECRET) {
        return res.status(403).json({ error: 'Forbidden: Invalid setup secret.' });
      }
    } else if (!existingAdmins.empty && !process.env.ADMIN_SETUP_SECRET) {
      return res.status(403).json({ error: 'Platform admin is already initialized. Access denied.' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (e) {
      userRecord = await admin.auth().createUser({
        email,
        password,
        emailVerified: true,
        displayName: 'Platform Admin'
      });
    }

    // Set custom claims: role = 'global_admin'
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'global_admin',
      admin: true
    });

    const now = Date.now();
    await db.collection('platform_admins').doc(userRecord.uid).set({
      admin_id: userRecord.uid,
      email: userRecord.email,
      displayName: 'Global Administrator',
      role: 'global_admin',
      created_at: now,
      updated_at: now,
    }, { merge: true });

    return res.status(200).json({
      success: true,
      message: 'Platform administrator successfully provisioned.',
      adminUid: userRecord.uid,
      email: userRecord.email
    });
  } catch (err) {
    console.error('Admin bootstrap error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Admin Dashboard Stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const now = Date.now();
    const onlineThreshold = now - (90 * 1000); // 90 seconds

    // Users & Shops stats
    const usersSnap = await db.collection('users').get();
    const shopsSnap = await db.collection('shops').get();
    
    let totalUsers = usersSnap.size;
    let approvedUsers = 0;
    let pendingUsers = 0;
    let suspendedUsers = 0;

    shopsSnap.forEach(doc => {
      const s = doc.data();
      if (s.isSuspended || s.status === 'Suspended') {
        suspendedUsers++;
      } else if (s.status === 'Pending' || s.approvalStatus === 'Pending') {
        pendingUsers++;
      } else {
        approvedUsers++;
      }
    });

    // Devices & Sessions stats
    const devicesSnap = await db.collection('user_devices').get();
    let totalDevices = devicesSnap.size;
    let activeDevices = 0;
    let inactiveDevices = 0;
    let revokedDevices = 0;

    devicesSnap.forEach(doc => {
      const d = doc.data();
      if (d.device_status === 'revoked') {
        revokedDevices++;
      } else if (d.device_status === 'active') {
        activeDevices++;
      } else {
        inactiveDevices++;
      }
    });

    // Online sessions (heartbeat within 90s)
    const sessionsSnap = await db.collection('user_sessions')
      .where('session_status', '==', 'online')
      .where('last_heartbeat_at', '>=', onlineThreshold)
      .get();
    const currentlyOnlineUsers = sessionsSnap.size;

    return res.status(200).json({
      totalUsers,
      approvedUsers,
      pendingUsers,
      suspendedUsers,
      totalDevices,
      activeDevices,
      currentlyOnlineUsers,
      inactiveDevices,
      revokedDevices,
      serverTime: now,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// User Management APIs
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    const shopsSnap = await db.collection('shops').get();
    const subsSnap = await db.collection('subscriptions').get();
    const devicesSnap = await db.collection('user_devices').get();

    const shopsMap = {};
    shopsSnap.forEach(d => { shopsMap[d.id] = d.data(); });

    const subsMap = {};
    subsSnap.forEach(d => { subsMap[d.id] = d.data(); });

    const userDevicesCount = {};
    devicesSnap.forEach(d => {
      const dev = d.data();
      if (dev.device_status === 'active') {
        userDevicesCount[dev.user_uid] = (userDevicesCount[dev.user_uid] || 0) + 1;
      }
    });

    const userList = [];
    usersSnap.forEach(doc => {
      const u = doc.data();
      const shop = shopsMap[u.shopId] || {};
      const sub = subsMap[u.shopId] || {};

      userList.push({
        uid: doc.id,
        email: u.email,
        ownerName: shop.ownerName || u.name || '',
        shopId: u.shopId || '',
        shopName: shop.shopName || '',
        phone: shop.phone || u.phone || '',
        city: shop.city || '',
        status: shop.isSuspended ? 'Suspended' : (shop.status || 'Approved'),
        isSuspended: Boolean(shop.isSuspended),
        suspensionReason: shop.suspensionReason || null,
        plan: sub.plan || 'Free Trial',
        subscriptionStatus: sub.status || 'Pending',
        activeDevicesCount: userDevicesCount[doc.id] || 0,
        createdAt: u.createdAt || shop.createdAt || null,
      });
    });

    return res.status(200).json({ users: userList });
  } catch (err) {
    console.error('Admin get users error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/approve-user', authenticateAdmin, async (req, res) => {
  try {
    const { shopId, userUid, note } = req.body || {};
    if (!shopId && !userUid) {
      return res.status(400).json({ error: 'shopId or userUid is required.' });
    }

    const targetShopId = shopId || `shop_${userUid}`;
    const now = Date.now();

    await db.collection('shops').doc(targetShopId).set({
      status: 'Approved',
      isApproved: true,
      approvedAt: now,
      approvalNote: note || '',
      approvedBy: req.adminUser.email || req.adminUser.uid,
    }, { merge: true });

    if (userUid) {
      await db.collection('users').doc(userUid).set({
        status: 'Approved',
        isApproved: true,
      }, { merge: true });
    }

    // Audit log
    const auditId = `audit_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('admin_audit_logs').doc(auditId).set({
      id: auditId,
      admin_uid: req.adminUser.uid,
      admin_email: req.adminUser.email || '',
      action: 'APPROVE_USER',
      target_resource: 'shops',
      target_id: targetShopId,
      details: { userUid, note },
      timestamp: now,
      ip_address: req.ip || '',
    });

    return res.status(200).json({ success: true, message: 'User approved successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/suspend-user', authenticateAdmin, async (req, res) => {
  try {
    const { shopId, userUid, reason } = req.body || {};
    if (!shopId && !userUid) {
      return res.status(400).json({ error: 'shopId or userUid is required.' });
    }

    const targetShopId = shopId || `shop_${userUid}`;
    const now = Date.now();

    await db.collection('shops').doc(targetShopId).set({
      isSuspended: true,
      status: 'Suspended',
      suspendedAt: now,
      suspensionReason: reason || 'Account suspended by administrator.',
      suspendedBy: req.adminUser.email || req.adminUser.uid,
    }, { merge: true });

    let effectiveUid = userUid;
    if (!effectiveUid) {
      const shopDoc = await db.collection('shops').doc(targetShopId).get();
      effectiveUid = shopDoc.exists ? shopDoc.data().ownerUid : null;
    }

    if (effectiveUid) {
      const sessionsSnap = await db.collection('user_sessions')
        .where('user_uid', '==', effectiveUid)
        .where('session_status', 'in', ['online', 'active'])
        .get();

      const batch = db.batch();
      sessionsSnap.forEach(doc => {
        batch.update(doc.ref, {
          session_status: 'revoked',
          revocation_reason: reason || 'Account suspended by administrator.',
          revoked_at: now,
        });
      });
      await batch.commit();
    }

    const auditId = `audit_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('admin_audit_logs').doc(auditId).set({
      id: auditId,
      admin_uid: req.adminUser.uid,
      admin_email: req.adminUser.email || '',
      action: 'SUSPEND_USER',
      target_resource: 'shops',
      target_id: targetShopId,
      details: { userUid: effectiveUid, reason },
      timestamp: now,
      ip_address: req.ip || '',
    });

    return res.status(200).json({ success: true, message: 'User account suspended.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reactivate-user', authenticateAdmin, async (req, res) => {
  try {
    const { shopId, userUid } = req.body || {};
    const targetShopId = shopId || `shop_${userUid}`;
    const now = Date.now();

    await db.collection('shops').doc(targetShopId).set({
      isSuspended: false,
      status: 'Approved',
      reactivatedAt: now,
      suspensionReason: null,
      reactivatedBy: req.adminUser.email || req.adminUser.uid,
    }, { merge: true });

    const auditId = `audit_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('admin_audit_logs').doc(auditId).set({
      id: auditId,
      admin_uid: req.adminUser.uid,
      admin_email: req.adminUser.email || '',
      action: 'REACTIVATE_USER',
      target_resource: 'shops',
      target_id: targetShopId,
      details: { userUid },
      timestamp: now,
      ip_address: req.ip || '',
    });

    return res.status(200).json({ success: true, message: 'User account reactivated.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Device Management APIs
app.get('/api/admin/devices', authenticateAdmin, async (req, res) => {
  try {
    const snap = await db.collection('user_devices').orderBy('last_seen_at', 'desc').limit(200).get();
    const devices = [];
    snap.forEach(doc => {
      devices.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ devices });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/sessions', authenticateAdmin, async (req, res) => {
  try {
    const snap = await db.collection('user_sessions').orderBy('last_heartbeat_at', 'desc').limit(200).get();
    const sessions = [];
    snap.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ sessions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/revoke-device', authenticateAdmin, async (req, res) => {
  try {
    const { deviceId, userUid, reason } = req.body || {};
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required.' });
    }

    const now = Date.now();
    const revReason = reason || 'Revoked by platform administrator.';

    if (userUid) {
      const devDocRef = db.collection('user_devices').doc(`dev_${userUid}_${deviceId}`);
      await devDocRef.set({
        device_status: 'revoked',
        revoked_at: now,
        revocation_reason: revReason,
        revoked_by: req.adminUser.email || req.adminUser.uid,
      }, { merge: true });
    }

    let sessionsQuery = db.collection('user_sessions').where('device_id', '==', deviceId);
    if (userUid) {
      sessionsQuery = sessionsQuery.where('user_uid', '==', userUid);
    }
    const sessSnap = await sessionsQuery.get();
    const batch = db.batch();
    sessSnap.forEach(doc => {
      batch.update(doc.ref, {
        session_status: 'revoked',
        revoked_at: now,
        revocation_reason: revReason,
      });
    });
    await batch.commit();

    const actId = `act_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('device_activity_logs').doc(actId).set({
      event_id: actId,
      user_uid: userUid || 'system',
      device_id: deviceId,
      event_type: 'device_revoked',
      event_result: 'success',
      event_timestamp: now,
      recorded_at: now,
      actor_uid: req.adminUser.uid,
      actor_role: 'admin',
      reason: revReason,
    });

    const auditId = `audit_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('admin_audit_logs').doc(auditId).set({
      id: auditId,
      admin_uid: req.adminUser.uid,
      admin_email: req.adminUser.email || '',
      action: 'REVOKE_DEVICE',
      target_resource: 'user_devices',
      target_id: deviceId,
      details: { userUid, reason: revReason },
      timestamp: now,
      ip_address: req.ip || '',
    });

    return res.status(200).json({ success: true, message: 'Device revoked successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/revoke-all-devices', authenticateAdmin, async (req, res) => {
  try {
    const { userUid, reason } = req.body || {};
    if (!userUid) {
      return res.status(400).json({ error: 'userUid is required.' });
    }

    const now = Date.now();
    const revReason = reason || 'Bulk revocation by platform administrator.';

    const devSnap = await db.collection('user_devices').where('user_uid', '==', userUid).get();
    const devBatch = db.batch();
    devSnap.forEach(doc => {
      devBatch.update(doc.ref, {
        device_status: 'revoked',
        revoked_at: now,
        revocation_reason: revReason,
        revoked_by: req.adminUser.email || req.adminUser.uid,
      });
    });
    await devBatch.commit();

    const sessSnap = await db.collection('user_sessions').where('user_uid', '==', userUid).get();
    const sessBatch = db.batch();
    sessSnap.forEach(doc => {
      sessBatch.update(doc.ref, {
        session_status: 'revoked',
        revoked_at: now,
        revocation_reason: revReason,
      });
    });
    await sessBatch.commit();

    const auditId = `audit_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('admin_audit_logs').doc(auditId).set({
      id: auditId,
      admin_uid: req.adminUser.uid,
      admin_email: req.adminUser.email || '',
      action: 'REVOKE_ALL_DEVICES',
      target_resource: 'user_devices',
      target_id: userUid,
      details: { count: devSnap.size, reason: revReason },
      timestamp: now,
      ip_address: req.ip || '',
    });

    return res.status(200).json({ success: true, count: devSnap.size });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Subscription Management & Manual Overrides
app.get('/api/admin/subscriptions', authenticateAdmin, async (req, res) => {
  try {
    const subSnap = await db.collection('subscriptions').get();
    const txSnap = await db.collection('payment_transactions').orderBy('created_at', 'desc').limit(100).get();

    const subscriptions = [];
    subSnap.forEach(doc => {
      subscriptions.push({ id: doc.id, ...doc.data() });
    });

    const transactions = [];
    txSnap.forEach(doc => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({ subscriptions, transactions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/override-subscription', authenticateAdmin, async (req, res) => {
  try {
    const { shopId, plan, maxDevices, expiryDate, note } = req.body || {};
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required.' });
    }

    const now = Date.now();
    const effectivePlan = plan || 'Yearly';
    const effectiveMaxDevices = Number(maxDevices) || (effectivePlan === 'Yearly Premium' ? 9 : 3);
    const effectiveExpiry = expiryDate ? Number(expiryDate) : (now + 365 * 24 * 60 * 60 * 1000);

    const subData = {
      shopId,
      plan: effectivePlan,
      status: 'Approved',
      approvalType: 'manual_admin',
      approvedBy: req.adminUser.email || req.adminUser.uid,
      maxDevices: effectiveMaxDevices,
      startDate: now,
      expiryDate: effectiveExpiry,
      note: note || 'Manually approved by Administrator',
      updatedAt: now,
    };

    await db.collection('subscriptions').doc(shopId).set(subData, { merge: true });

    const auditId = `audit_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('admin_audit_logs').doc(auditId).set({
      id: auditId,
      admin_uid: req.adminUser.uid,
      admin_email: req.adminUser.email || '',
      action: 'OVERRIDE_SUBSCRIPTION',
      target_resource: 'subscriptions',
      target_id: shopId,
      details: { ...subData },
      timestamp: now,
      ip_address: req.ip || '',
    });

    return res.status(200).json({ success: true, subscription: subData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Activity & Audit Logs
app.get('/api/admin/activity-logs', authenticateAdmin, async (req, res) => {
  try {
    const { email, deviceId, eventType, limit = 100 } = req.query || {};
    let q = db.collection('device_activity_logs').orderBy('event_timestamp', 'desc');

    if (email) q = q.where('email', '==', email);
    if (deviceId) q = q.where('device_id', '==', deviceId);
    if (eventType) q = q.where('event_type', '==', eventType);

    const snap = await q.limit(Number(limit)).get();
    const logs = [];
    snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));

    return res.status(200).json({ logs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    const snap = await db.collection('admin_audit_logs').orderBy('timestamp', 'desc').limit(100).get();
    const logs = [];
    snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ logs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Pawn Shop Management Backend running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}
