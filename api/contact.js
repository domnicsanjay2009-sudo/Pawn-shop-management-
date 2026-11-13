export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      let rawData = typeof body === 'string' ? body : '';
      if (!rawData) {
        for await (const chunk of req) {
          rawData += chunk;
        }
      }
      if (rawData) {
        try {
          body = JSON.parse(rawData);
        } catch (_) {
          body = {};
        }
      } else {
        body = {};
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
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to process inquiry. Please email us directly at domnicsanjay2009@gmail.com.',
      details: err?.message || String(err)
    });
  }
}
