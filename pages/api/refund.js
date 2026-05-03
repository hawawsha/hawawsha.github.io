export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const PI_API_KEY = process.env.PI_API_KEY;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

  // ✅ GET - جلب كل الاسترجاعات للأدمن
  if (req.method === 'GET') {
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await response.json();
      return res.status(200).json({ records: data.records || [] });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { action, productId, productName, buyerUid, buyerUsername, amountPi, recordId } = req.body || {};

  try {
    // ✅ الزبون يطلب استرجاع
    if (action === 'request') {
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            product_name: productName,
            product_id: productId,
            buyer_uid: buyerUid,
            buyer_username: buyerUsername,
            amount_pi: Number(amountPi) || 0,
            status: 'pending',
            created_at: new Date().toISOString().split('T')[0]
          }
        })
      });
      const data = await response.json();
      return res.status(200).json({ success: true, data });
    }

    // ✅ الأدمن يوافق
    if (action === 'approve') {
      if (!recordId) return res.status(400).json({ error: 'recordId مطلوب' });
      try {
        // جلب بيانات الطلب
        const getRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`,
          { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const record = await getRes.json();
        const fields = record.fields || {};

        // إرسال Pi للزبون إذا توفر buyerUid
        if (fields.buyer_uid && PI_API_KEY) {
          try {
            await fetch('https://api.minepi.com/v2/payments', {
              method: 'POST',
              headers: { 'Authorization': `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                payment: {
                  amount: fields.amount_pi,
                  memo: `استرجاع: ${fields.product_name}`,
                  metadata: { recordId, type: 'refund' },
                  uid: fields.buyer_uid
                }
              })
            });
          } catch(e) {
            console.error('فشل إرسال Pi:', e);
          }
        }

        // تحديث الحالة
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { status: 'approved' } })
        });
        return res.status(200).json({ success: true });
      } catch(e) {
        return res.status(500).json({ error: e.message });
      }
    }

    // ✅ الأدمن يرفض
    if (action === 'reject') {
      if (!recordId) return res.status(400).json({ error: 'recordId مطلوب' });
      try {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { status: 'rejected' } })
        });
        return res.status(200).json({ success: true });
      } catch(e) {
        return res.status(500).json({ error: e.message });
      }
    }

    return res.status(400).json({ error: 'invalid action' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
