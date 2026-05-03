import { verifyAdmin } from '../../lib/authMiddleware';

export default async function handler(req, res) {
  const PI_API_KEY = process.env.PI_API_KEY;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

  // ✅ GET - جلب كل الاسترجاعات للأدمن (مرتبة بالأحدث حسب الوقت)
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
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { action, productId, productName, buyerUid, buyerUsername, amountPi, recordId } = req.body || {};

  // ✅ request - إرسال طلب استرجاع جديد مع الوقت الدقيق
  if (action === 'request') {
    if (!productId || !buyerUsername || !amountPi) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
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
            amount_pi: Number(amountPi),
            status: 'pending',
            // 🛠 التعديل هنا: إرسال الوقت الكامل بصيغة ISO ليعرض الساعة والدقيقة
            created_at: new Date().toISOString() 
          }
        })
      });
      const data = await response.json();
      return res.status(200).json({ success: true, data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
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
        } catch (e) {
          console.error('فشل إرسال دفعة Pi:', e);
        }
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
    } catch (e) {
      return res.status(500).json({ error: e.message });
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
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'invalid action' });
}
