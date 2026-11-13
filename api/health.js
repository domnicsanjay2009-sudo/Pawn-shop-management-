export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'ok',
    businessName: 'GS Pawn shop management',
    officialEmail: 'domnicsanjay2009@gmail.com',
    businessPhone: '+91 9363200295',
    address: 'Ponneri, Thiruvallur, Tamil Nadu, India',
    timestamp: Date.now()
  });
}
