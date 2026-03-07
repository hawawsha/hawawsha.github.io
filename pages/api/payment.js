export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, paymentId, txid } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY;

  if (!PI_API_KEY) return res.status(500).json({ error: 'PI_API_KEY missing' });

  try {
    let url = '';
    let body = null;

    if (action === 'approve') {
      url = `https://api.minepi.com/v2/payments/${paymentId}/approve`;
    } else if (action === 'complete') {
      url = `https://api.minepi.com/v2/payments/${paymentId}/complete`;
      body = JSON.stringify({ txid });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
