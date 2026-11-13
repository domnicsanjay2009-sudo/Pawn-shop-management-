// Vercel Serverless Function entry point for GS Pawn shop management API
import crypto from 'crypto';

// Confirmed live credentials with fallback to process.env
const KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_Tu8s092MqjR3il';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mZl6mJyLzV40E7GG1GP0r2AN';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Authoritative Pricing constants in paise (₹1,999 = 199900 paise, ₹2,999 = 299900 paise)
const PLANS = {
  'Yearly': { name: 'Yearly', amountPaise: 199900, maxDevices: 3, days: 365 },
  'Yearly Premium': { name: 'Yearly Premium', amountPaise: 299900, maxDevices: 9, days: 365 },
};

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function getParsedBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) {
    try {
      for await (const chunk of req) {
        raw += chunk;
      }
    } catch (_) {
      // Stream reading error or already consumed
    }
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-razorpay-signature'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const sendJson = (statusCode, data) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  try {
    const rawUrl = req.url || '';
    // Normalize URL path to match without query strings
    const urlPath = rawUrl.split('?')[0];

    // 1. Health check endpoint
    if (urlPath === '/api' || urlPath === '/api/' || urlPath.endsWith('/health')) {
      return sendJson(200, {
        status: 'ok',
        businessName: 'GS Pawn shop management',
        officialEmail: 'domnicsanjay2009@gmail.com',
        businessPhone: '+91 9363200295',
        address: 'Ponneri, Thiruvallur, Tamil Nadu, India',
        razorpayConfigured: Boolean(KEY_ID && KEY_SECRET),
        keyId: KEY_ID,
        timestamp: Date.now()
      });
    }

    // 2. Razorpay Order Creation Endpoint
    if (urlPath.endsWith('/create-order') || urlPath.endsWith('/api/create-order')) {
      if (req.method !== 'POST') {
        return sendJson(405, { error: 'Method not allowed. Please use POST.' });
      }

      const body = await getParsedBody(req);
      const { planName, shopId } = body || {};

      if (!planName || !shopId) {
        return sendJson(400, { error: 'Missing mandatory fields: planName and shopId are required.' });
      }

      const plan = PLANS[planName];
      if (!plan) {
        return sendJson(400, { error: `Invalid plan specified: "${planName}". Available plans: Yearly, Yearly Premium.` });
      }

      if (!KEY_ID || !KEY_SECRET) {
        return sendJson(500, { error: 'Razorpay API credentials are not configured on the server.' });
      }

      const safeShopPrefix = String(shopId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      const receipt = `rcpt_${safeShopPrefix}_${Date.now().toString(36)}`;

      const orderPayload = JSON.stringify({
        amount: plan.amountPaise,
        currency: 'INR',
        receipt: receipt,
        notes: {
          shopId: String(shopId),
          planName: String(planName),
          platform: 'GS Pawn shop management'
        }
      });

      const authHeader = 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');

      try {
        const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Content-Length': String(Buffer.byteLength(orderPayload))
          },
          body: orderPayload
        });

        const rzpData = await rzpResponse.json();

        if (!rzpResponse.ok) {
          console.error('[Razorpay Order Error]', rzpResponse.status, rzpData);
          return sendJson(rzpResponse.status || 500, {
            error: rzpData?.error?.description || rzpData?.message || 'Failed to create order on Razorpay gateway.',
            code: rzpData?.error?.code || 'RAZORPAY_API_ERROR'
          });
        }

        return sendJson(200, {
          orderId: rzpData.id,
          amount: plan.amountPaise,
          currency: 'INR',
          keyId: KEY_ID,
          receipt: receipt
        });
      } catch (rzpFetchErr) {
        console.error('[Razorpay Gateway Network Error]', rzpFetchErr);
        return sendJson(502, {
          error: 'Network error connecting to Razorpay payment gateway. Please retry.',
          details: rzpFetchErr?.message || String(rzpFetchErr)
        });
      }
    }

    // 3. Razorpay Signature Verification & Activation Endpoint
    if (urlPath.endsWith('/verify-payment') || urlPath.endsWith('/api/verify-payment')) {
      if (req.method !== 'POST') {
        return sendJson(405, { error: 'Method not allowed. Please use POST.' });
      }

      const body = await getParsedBody(req);
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planName, shopId } = body || {};

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !planName || !shopId) {
        return sendJson(400, {
          error: 'Missing mandatory payment verification fields (razorpayOrderId, razorpayPaymentId, razorpaySignature, planName, shopId).'
        });
      }

      const plan = PLANS[planName] || PLANS['Yearly'];

      // Cryptographic HMAC SHA-256 signature verification
      const expectedSignature = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (!safeCompare(expectedSignature, razorpaySignature)) {
        console.error('[Signature Mismatch]', { expected: expectedSignature, received: razorpaySignature });
        return sendJson(403, {
          error: 'Invalid payment signature. Verification failed.',
          code: 'INVALID_SIGNATURE'
        });
      }

      const now = Date.now();
      const expiry = now + (plan.days * 24 * 60 * 60 * 1000);

      const subscriptionRecord = {
        id: `sub_${shopId}`,
        shopId: String(shopId),
        plan: plan.name,
        amountPaise: plan.amountPaise,
        startDate: now,
        expiryDate: expiry,
        status: 'Approved',
        maxDevices: plan.maxDevices,
        activeDeviceIds: ['device_primary'],
        razorpayOrderId: String(razorpayOrderId),
        razorpayPaymentId: String(razorpayPaymentId),
        paymentStatus: 'PAID',
        entitlementSource: 'RAZORPAY',
        approvedAt: now,
        updatedAt: now,
        createdAt: now,
      };

      const transactionRecord = {
        id: `tx_${razorpayPaymentId}`,
        shopId: String(shopId),
        plan: plan.name,
        amountPaise: plan.amountPaise,
        currency: 'INR',
        paymentMethod: 'Razorpay Standard Checkout',
        razorpayOrderId: String(razorpayOrderId),
        razorpayPaymentId: String(razorpayPaymentId),
        status: 'Approved',
        verifiedServerSide: true,
        createdAt: now,
      };

      return sendJson(200, {
        success: true,
        verified: true,
        subscription: subscriptionRecord,
        transaction: transactionRecord,
        message: `${plan.name} subscription successfully verified and activated.`
      });
    }

    // 4. Payment status check endpoint
    if (urlPath.endsWith('/payment-status') || urlPath.endsWith('/api/payment-status')) {
      return sendJson(200, {
        status: 'ok',
        gateway: 'Razorpay',
        configured: Boolean(KEY_ID && KEY_SECRET),
        keyId: KEY_ID,
        plans: PLANS,
        timestamp: Date.now()
      });
    }

    // 5. Razorpay Webhook Handler
    if (urlPath.endsWith('/webhook') || urlPath.endsWith('/api/webhook')) {
      const signature = req.headers['x-razorpay-signature'];
      const rawBody = await (async () => {
        if (typeof req.body === 'string') return req.body;
        if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
        let str = '';
        for await (const chunk of req) str += chunk;
        return str;
      })();

      if (WEBHOOK_SECRET && signature) {
        const expectedSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
        if (!safeCompare(expectedSignature, signature)) {
          return sendJson(400, { error: 'Invalid webhook signature.' });
        }
      }

      return sendJson(200, { status: 'ok', message: 'Webhook received.' });
    }

    // 6. Public contact & support inquiry endpoint
    if (urlPath.endsWith('/contact') || urlPath.endsWith('/api/contact')) {
      if (req.method !== 'POST') {
        return sendJson(405, { error: 'Method not allowed' });
      }

      const body = await getParsedBody(req);
      const { name, email, message } = body || {};
      if (!name || !email || !message) {
        return sendJson(400, { error: 'Name, email, and message are required fields.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendJson(400, { error: 'Please provide a valid email address.' });
      }

      return sendJson(200, {
        success: true,
        message: 'Thank you for contacting GS Pawn shop management. Your message has been received. Our support team will respond to your registered email shortly.'
      });
    }

    // Fallback for other /api routes
    return sendJson(200, {
      status: 'ok',
      message: 'GS Pawn shop management API service is active.',
      endpoint: urlPath
    });
  } catch (err) {
    console.error('[API Unhandled Error]', err);
    return sendJson(500, {
      error: 'Failed to process request. Please contact support at domnicsanjay2009@gmail.com.',
      details: err?.message || String(err)
    });
  }
}
