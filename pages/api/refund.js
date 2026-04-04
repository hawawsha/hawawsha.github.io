export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const PI_API_KEY = process.env.PI_API_KEY;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
  const { action, productId, productName, buyerUid, buyerUsername, amountPi, refundId } = req.body || {};

  try {
    // الزبون يطلب استرجاع
    if (action === 'request') {
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { product_name: productName, product_id: productId, buyer_uid: buyerUid, buyer_username: buyerUsername, amount_pi: amountPi, status: 'pending' } })
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // الأدمن يوافق ويرسل Pi
    if (action === 'approve') {
      const payRes = await fetch('https://api.minepi.com/v2/payments', {
        method: 'POST',
        headers: { 'Authorization': `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment: { amount: amountPi, memo: `استرجاع: ${productName}`, metadata: { refundId, type: 'refund' }, uid: buyerUid } })
      });
      const payData = await payRes.json();
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${refundId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { status: 'approved', payment_id: payData.identifier } })
      });
      return res.status(200).json(payData);
    }

    // جلب الطلبات المعلقة للأدمن
    if (action === 'list') {
      const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds?filterByFormula=${encodeURIComponent("{status}='pending'")}`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'invalid action' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
