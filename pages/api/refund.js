import { verifyAdmin } from '../../lib/authMiddleware';

// ✅ دالة تنظيف النصوص
function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen).replace(/[<>'"]/g, '');
}

export default async function handler(req, res) {
  const PI_API_KEY = process.env.PI_API_KEY;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ✅ GET - جلب كل الاسترجاعات للأدمن فقط
  if (req.method === 'GET') {
    const allowed = await verifyAdmin(req, res);
    if (!allowed) return;
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds?sort[0][field]=created_at&sort[0][direction]=desc`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await response.json();
      return res.status(200).json({ records: data.records || [] });
    } catch {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();

  // ✅ تنظيف البيانات
  const action = sanitize(req.body?.action, 20);
  const productId = sanitize(req.body?.productId, 50);
  const productName = sanitize(req.body?.productName, 200);
  const buyerUid = sanitize(req.body?.buyerUid, 100);
  const buyerUsername = sanitize(req.body?.buyerUsername, 50);
  const recordId = sanitize(req.body?.recordId, 50);
  const paymentId = sanitize(req.body?.paymentId, 100);
  const amountPi = parseFloat(req.body?.amountPi);

  // ✅ تحقق من action
  if (!['request', 'approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action غير صالح' });
  }

  // ✅ request - مفتوح للزبون
  if (action === 'request') {
    if (!productId || !buyerUsername || isNaN(amountPi) || amountPi <= 0) {
      return res.status(400).json({ error: 'بيانات ناقصة أو غير صالحة' });
    }
    try {
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            product_name: productName,
            product_id: productId,
            buyer_uid: buyerUid,
            buyer_username: buyerUsername,
            amount_pi: amountPi,
            status: 'pending',
            created_at: new Date().toISOString(),
            payment_id: paymentId
          }
        })
      });
      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: 'Internal Server Error' });
      return res.status(200).json({ success: true, data });
    } catch {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // ✅ approve و reject للأدمن فقط
  const allowed = await verifyAdmin(req, res);
  if (!allowed) return;

  if (action === 'approve') {
    if (!recordId) return res.status(400).json({ error: 'recordId مطلوب' });
    try {
      const getRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const record = await getRes.json();
      const fields = record.fields || {};

      if (fields.buyer_uid && PI_API_KEY) {
        try {
          await fetch('https://api.minepi.com/v2/payments', {
            method: 'POST',
            headers: {
              'Authorization': `Key ${PI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              payment: {
                amount: fields.amount_pi,
                memo: `استرجاع: ${fields.product_name}`,
                metadata: { recordId, type: 'refund' },
                uid: fields.buyer_uid
              }
            })
          });
        } catch { /* Pi payment error - silent */ }
      }

      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: { status: 'approved' } })
      });

      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (action === 'reject') {
    if (!recordId) return res.status(400).json({ error: 'recordId مطلوب' });
    try {
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: { status: 'rejected' } })
      });
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(400).json({ error: 'invalid action' });
}
