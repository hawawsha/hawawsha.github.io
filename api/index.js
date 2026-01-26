export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentId, txid } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY;

  try {
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      const errorData = await response.json();
      return res.status(400).json({ error: errorData.message });
    }
  } catch (error) {
    return res.status(500).json({ error: "خطأ في الاتصال النهائي" });
  }
}
