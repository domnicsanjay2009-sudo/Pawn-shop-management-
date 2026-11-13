// Vercel Serverless Function entry point for GS Pawn shop management API
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
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
    const url = req.url || '';

    // Health check endpoint
    if (url.includes('/health') || url === '/api' || url === '/api/') {
      return sendJson(200, {
        status: 'ok',
        businessName: 'GS Pawn shop management',
        officialEmail: 'domnicsanjay2009@gmail.com',
        businessPhone: '+91 9363200295',
        address: 'Ponneri, Thiruvallur, Tamil Nadu, India',
        timestamp: Date.now()
      });
    }

    // Public contact & support inquiry endpoint
    if (url.includes('/contact')) {
      if (req.method !== 'POST') {
        return sendJson(405, { error: 'Method not allowed' });
      }

      let body = req.body;
      if (!body || typeof body !== 'object') {
        let raw = typeof body === 'string' ? body : '';
        if (!raw) {
          for await (const chunk of req) {
            raw += chunk;
          }
        }
        if (raw) {
          try {
            body = JSON.parse(raw);
          } catch (_) {
            body = {};
          }
        } else {
          body = {};
        }
      }

      const { name, email, phone, subject, message } = body || {};
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
      endpoint: url
    });
  } catch (err) {
    return sendJson(500, {
      error: 'Failed to process request. Please email us directly at domnicsanjay2009@gmail.com.',
      details: err?.message || String(err)
    });
  }
}
