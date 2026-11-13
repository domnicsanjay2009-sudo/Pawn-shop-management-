// Vercel Serverless Function entry point for GS Pawn shop management API
import crypto from 'crypto';

// Confirmed Live Production credentials with fallback to process.env
const KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_Tu8s092MqjR3il';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mZl6mJyLzV40E7GG1GP0r2AN';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Secure Gemini API Key for 'AI Care Plus' Customer Support (Loaded via process.env.GEMINI_API_KEY)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Authoritative Pricing constants in paise (₹1,999 = 199900 paise, ₹2,999 = 299900 paise)
const PLANS = {
  'Yearly': { name: 'Yearly', amountPaise: 199900, maxDevices: 3, days: 365 },
  'Yearly Premium': { name: 'Yearly Premium', amountPaise: 299900, maxDevices: 9, days: 365 },
};

function generateCarePlusFallback(question, context) {
  const qLower = (question || '').toLowerCase();
  const shopName = context?.shopName || 'GS Pawn Shop';
  const plan = context?.plan || 'Yearly Premium';

  if (
    qLower.includes('vanakkam') ||
    qLower.includes('வணக்கம்') ||
    qLower.includes('epdi') ||
    qLower.includes('eppadi') ||
    qLower.includes('solunga') ||
    qLower.includes('tamil') ||
    qLower.includes('tanglish')
  ) {
    return `வணக்கம்! நான் உங்கள் "AI Care Plus" உதவியாளர் (${shopName}).

அடகு பில் போடுவது (Pledge Bill), வட்டி கணக்கு (Interest Calculation), கடன் திருப்பம் (Redemption & Closure), அல்லது சப்ஸ்கிரிப்ஷன் பற்றிய அனைத்து சந்தேகங்களுக்கும் நான் தமிழில் மற்றும் Tanglish-ல் உதவ முடியும்.

உங்களுக்கு என்ன உதவி தேவை?`;
  }

  if (qLower.includes('add bill') || qLower.includes('create bill') || qLower.includes('new bill') || qLower.includes('bill podu')) {
    return `To create a Pledge Bill in ${shopName}:
1. Click the "Bills" or "Parties" tab.
2. Select an existing customer or tap "+ Add Party" for a new customer.
3. Tap "+ Add Bill".
4. Enter Collateral Item (Gold, Silver, Platinum), Gross & Net Weight, Purity (e.g. 22K / 916), and Loan Principal amount.
5. The default interest rate & monthly/daily duration will auto-fill from Settings.
6. Click "Create Bill" to issue the pledge bill with immediate audit numbering (e.g., B-1001).

(தமிழில்: 'Bills' அல்லது 'Parties' பகுதிக்குச் சென்று '+ Add Bill' கிளிக் செய்து வாடிக்கையாளருக்கு அடகு பில் உருவாக்கலாம்.)`;
  }

  if (qLower.includes('interest') || qLower.includes('rate') || qLower.includes('calculation') || qLower.includes('vatti')) {
    return `Interest Calculation Rules:
1. Accrual: Interest accrues accurately based on the elapsed calendar days and your configured rate (Gold / Silver / Others).
2. Partial Payments: When a customer pays money, the payment settles accrued interest first. Any remaining balance reduces the principal loan.
3. Late Fees: If late interest fees or late closing fees are enabled in Settings, they automatically calculate without breaking previous ledgers.

(தமிழில்: வட்டி நாட்கள் அடிப்படையில் கணக்கிடப்படுகிறது. வாடிக்கையாளர் பணம் செலுத்தும்போது முதலில் வட்டி கழிக்கப்பட்டு மீதி அசல் குறையும்.)`;
  }

  if (qLower.includes('close') || qLower.includes('settle') || qLower.includes('redemption') || qLower.includes('redeem')) {
    return `Bill Closure & Redemption Steps:
1. Open the active bill from the "Bills" or "Closing Bills" tab.
2. Click "Settle & Close a Bill".
3. The system calculates: Outstanding Principal + Accrued Interest + Late Fees.
4. Mandatory Adjustment (+ / -):
   - PLUS (+): Adds any legal/processing penalty or additional charge.
   - MINUS (-): Applies a discount, concession, or interest waiver.
5. Allocate payment methods (Cash, GPay, or Bank Transfer) to match the final settlement amount.
6. The bill is marked "Closed", balance becomes ₹0, and a printed receipt with a CLOSED watermark is generated.`;
  }

  if (qLower.includes('subscription') || qLower.includes('plan') || qLower.includes('tier') || qLower.includes('price')) {
    return `Subscription Tiers in GS Pawn Shop Management:
• Yearly Plan: ₹1,999/year (Up to 3 active devices, unlimited customer records & bills).
• Yearly Premium Plan: ₹2,999/year (Up to 9 active devices, 90-day Temporary Staff Passes, real-time analytics, and AI Care Plus priority support).
Current Shop Plan: ${plan}.`;
  }

  if (qLower.includes('lock') || qLower.includes('pin') || qLower.includes('biometric') || qLower.includes('security')) {
    return `Local App Lock Security:
You can secure your pawn ledger in Settings using a 4-6 digit numeric PIN or Password, with optional Biometric/Fingerprint authentication. The app automatically locks upon 2 minutes of background inactivity without logging you out of your 24-hour Firebase session.`;
  }

  return `Hello! I am "AI Care Plus", your expert customer support assistant for GS Pawn Shop Management (${shopName}).

I can assist you with:
• Pledge bill creation, purity guidelines & collateral valuation.
• Interest rules, partial payments & principal reductions.
• Bill settlement & closing with Plus (+) / Minus (-) adjustments.
• App navigation, multi-device management & subscription plans.

I understand English, Tamil (தமிழ்), and Tanglish. How can I help you today?`;
}

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

    // 5. Razorpay Webhook Handler (supports both /api/webhook and /api/razorpay-webhook)
    if (
      urlPath.endsWith('/webhook') ||
      urlPath.endsWith('/api/webhook') ||
      urlPath.endsWith('/razorpay-webhook') ||
      urlPath.endsWith('/api/razorpay-webhook')
    ) {
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

    // 5. 'AI Care Plus' Dedicated Customer Support Endpoint (Gemini Model Integration)
    if (
      urlPath.endsWith('/ask-gemini') ||
      urlPath.endsWith('/api/ask-gemini') ||
      urlPath.endsWith('/ai-care-plus') ||
      urlPath.endsWith('/api/ai-care-plus')
    ) {
      if (req.method !== 'POST') {
        return sendJson(405, { error: 'Method not allowed. Please use POST.' });
      }

      const body = await getParsedBody(req);
      const { question, context, history } = body || {};

      if (!question || typeof question !== 'string' || !question.trim()) {
        return sendJson(400, { error: 'Question is required.' });
      }

      const cleanQuestion = question.trim();
      const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;

      const systemPrompt = `You are "AI Care Plus", the expert, polite, and dedicated customer support assistant for the GS Pawn Shop Management App.

Your core mission is to assist shop owners and end-users with:
1. Pledge Bill Details: Explaining pledge bill creation, loan principal, collateral item records (Gold, Silver, Platinum, Others), gross and net weights, purity standards (24K, 22K/916, 925), and bill numbering (e.g. B-1001).
2. Interest Calculation Rules: Explaining interest accrual policies based on elapsed calendar days, partial payment priority where accrued interest is cleared first before principal reduction, and late fee configurations.
3. Renewal & Redemption: Explaining pledge renewals, collateral redemption procedures, and bill closures featuring mandatory PLUS (+) adjustments (additional fees, penalty, service charge) or MINUS (-) adjustments (discount, waiver, concession) to reach exact zero outstanding balance.
4. App Navigation & Billing: Guiding users through the 8 application tabs (Home, Bills, Payments, Closing Bills, Parties, Expired Bills, Analytics, Settings), and explaining subscription tiers: Yearly Plan at ₹1,999/year (up to 3 devices) and Yearly Premium Plan at ₹2,999/year (up to 9 devices, 90-day Temporary Staff Passes, real-time analytics, and AI Care Plus).
5. Pawn Compliance & KYC: Explaining customer KYC documentation (Aadhaar/phone requirements), pledge bill receipt issuance with CLOSED/EXPIRED watermarks, and safe collateral vaulting.
6. Multilingual & Politeness Enforcement:
   - Always be polite, courteous, accurate, and concise.
   - You MUST fully understand and respond fluently in English, Tamil (தமிழ்), or Tanglish (Tamil in English letters) based on the user's language.
   - If the user greets or asks in Tamil or Tanglish, reply warmly in Tamil or Tanglish with clear, easy-to-follow steps.
7. Active Context:
   - Store Name: ${context?.shopName || 'GS Pawn Shop'}
   - Shop Owner: ${context?.ownerName || 'Shop Owner'}
   - Current Subscription Plan: ${context?.plan || 'Yearly Premium'}
   - Connected Devices: ${context?.activeDevices || 1} of ${context?.maxDevices || 9}`;

      // Build Gemini contents payload with optional history
      const contents = [];
      if (Array.isArray(history)) {
        for (const h of history) {
          if (h && h.text) {
            contents.push({
              role: h.role === 'model' || h.role === 'ai' ? 'model' : 'user',
              parts: [{ text: String(h.text) }]
            });
          }
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: cleanQuestion }]
      });

      const payload = {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        }
      };

      const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];
      let geminiReply = null;

      if (apiKey && !apiKey.includes('DEMO')) {
        for (const model of candidateModels) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6500);
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const geminiRes = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (geminiRes.ok) {
              const resJson = await geminiRes.json();
              const candidate = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
              if (candidate && candidate.trim()) {
                geminiReply = candidate.trim();
                break;
              }
            }
          } catch (_) {
            // Attempt next model or graceful fallback
          }
        }
      }

      if (geminiReply) {
        return sendJson(200, {
          success: true,
          persona: 'AI Care Plus',
          text: geminiReply,
          reply: geminiReply,
          source: 'gemini_api'
        });
      }

      // Graceful high-quality fallback for rate limits, network interruptions, or timeout
      const fallbackReply = generateCarePlusFallback(cleanQuestion, context);
      return sendJson(200, {
        success: true,
        persona: 'AI Care Plus',
        text: fallbackReply,
        reply: fallbackReply,
        source: 'care_plus_assistant'
      });
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
