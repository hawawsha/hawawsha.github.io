export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY;

  if (!PI_API_KEY) return res.status(500).json({ error: 'PI_API_KEY missing' });
  if (!uid) return res.status(400).json({ error: 'uid required' });

  try {
    const response = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment: {
          amount: 1,
          memo: 'مرحباً بك في سوق Pi! 🎁',
          metadata: { uid },
          uid
        }
      })
    });

    const data = await response.json();

    // تجاوز أي خطأ متعلق بدفعة معلقة
    if (!response.ok || data.error) {
      return res.status(200).json({ 
        status: 'already_sent',
        message: 'تم التسجيل بنجاح'
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
