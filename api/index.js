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
    res.status(200).end();
    return;
  }

  const url = req.url || '';

  // Health check endpoint
  if (url.includes('/health') || url === '/api' || url === '/api/') {
    return res.status(200).json({
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
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
    }

    const { name, email, phone, subject, message } = body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required fields.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Thank you for contacting GS Pawn shop management. Your message has been received. Our support team will respond to your registered email shortly.'
    });
  }

  // Fallback for other /api routes
  return res.status(200).json({
    status: 'ok',
    message: 'GS Pawn shop management API service is active.',
    endpoint: url
  });
}
