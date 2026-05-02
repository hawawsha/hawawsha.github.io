export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { action, paymentId, txid, username, productId, productName, amountPi, tableName, sellerUsername } = req.body;
  const API_KEY = process.env.PI_API_KEY;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

  if (!API_KEY) {
    return res.status(500).json({ error: "API Key missing" });
  }

  try {
    // 1. الموافقة
    if (action === 'approve') {
      const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
      });
      if (!approveRes.ok) {
        const errData = await approveRes.json();
        return res.status(400).json(errData);
      }
      return res.status(200).json({ message: "Approved" });
    }

    // 2. الإكمال والحفظ
    if (action === 'complete') {
      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid })
      });

      if (!completeRes.ok) {
        const errData = await completeRes.json();
        return res.status(400).json(errData);
      }

      if (username && productId && AIRTABLE_TOKEN && AIRTABLE_BASE) {
        try {
          await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                username: username,
                product_id: productId,
                product_name: productName || '',
                amount_pi: Number(amountPi) || 0,
                payment_id: paymentId,
                table_name: tableName || '',
                seller_username: sellerUsername || '',
                purchased_at: new Date().toISOString().split('T')[0]
              }
            })
          });
        } catch(e) {
          console.error('فشل حفظ الطلب في Airtable:', e);
        }
      }

      return res.status(200).json({ message: "Completed" });
    }

  } catch (error) {
    console.error("خطأ:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
