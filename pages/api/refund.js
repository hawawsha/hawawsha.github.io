// ============================================================
// ملف: pages/api/refund.js
// دعم كامل لـ A2U Payment + Airtable (متوافق مع الأعمدة الجديدة)
// انسخ كل ما بين السطرين ⬇️
// ============================================================

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const PI_API_KEY = process.env.PI_API_KEY;           // يبدأ بـ k8w...
const PI_PRIVATE_SEED = process.env.PI_PRIVATE_SEED; // يبدأ بـ S_...

function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen).replace(/[<>'"]/g, '');
}

async function cancelPayment(paymentId) {
  try {
    const res = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${PI_API_KEY}` }
    });
    return res.ok;
  } catch { return false; }
}

export default async function handler(req, res) {
  // =============== GET ===============
  if (req.method === 'GET') {
    const action = req.query?.action;
    if (action === 'list') {
      try {
        const response = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds?sort[0][field]=created_at&sort[0][direction]=desc`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const data = await response.json();
        return res.status(200).json({ records: data.records || [] });
      } catch {
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }
    if (action === 'seller' && req.query?.seller_username) {
      const sellerUsername = sanitize(req.query.seller_username, 50);
      try {
        const productsRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders?filterByFormula=${encodeURIComponent(`{seller_username}="${sellerUsername}"`)}`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const productsData = await productsRes.json();
        const productIds = [...new Set(productsData.records.map(r => r.fields?.product_id).filter(Boolean))];
        if (productIds.length === 0) return res.status(200).json({ records: [] });
        const formula = productIds.map(id => `{product_id}="${id}"`).join(',');
        const refundsRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds?filterByFormula=${encodeURIComponent(`OR(${formula})`)}&sort[0][field]=created_at&sort[0][direction]=desc`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const refundsData = await refundsRes.json();
        return res.status(200).json({ records: refundsData.records || [] });
      } catch {
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }
    if (action === 'my' && req.query?.username) {
      const username = sanitize(req.query.username, 50);
      try {
        const response = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds?filterByFormula=${encodeURIComponent(`{buyer_username}="${username}"`)}&sort[0][field]=created_at&sort[0][direction]=desc`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const data = await response.json();
        return res.status(200).json({ records: data.records || [] });
      } catch {
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }
    return res.status(400).json({ error: 'action غير صالح' });
  }

  // =============== POST ===============
  if (req.method === 'POST') {
    const action = sanitize(req.body?.action, 20).toLowerCase();

    // ---------- طلب استرجاع جديد ----------
    if (action === 'request') {
      const productId = sanitize(req.body?.productId, 50);
      const productName = sanitize(req.body?.productName, 200);
      const buyerUsername = sanitize(req.body?.buyerUsername, 50);
      const buyerUid = sanitize(req.body?.buyerUid, 100);
      const amountPi = parseFloat(req.body?.amountPi);
      const paymentId = sanitize(req.body?.paymentId, 100);

      if (!productId || !buyerUsername || isNaN(amountPi) || amountPi <= 0) {
        return res.status(400).json({ error: 'بيانات ناقصة أو غير صالحة' });
      }

      try {
        const checkRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds?filterByFormula=${encodeURIComponent(`AND({buyer_username}="${buyerUsername}",{product_id}="${productId}",{status}="pending")`)}`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const checkData = await checkRes.json();
        if (checkData.records?.length > 0) {
          return res.status(400).json({ error: 'يوجد طلب استرجاع معلق مسبقاً' });
        }

        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              product_name: productName,
              product_id: productId,
              buyer_username: buyerUsername,
              buyer_uid: buyerUid,
              amount_pi: amountPi,
              status: 'pending',
              created_at: new Date().toISOString(),
              payment_id: paymentId
            }
          })
        });
        if (!response.ok) {
          const errText = await response.text();
          return res.status(500).json({ error: 'فشل حفظ طلب الاسترجاع', details: errText });
        }
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('Request error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }

    // ---------- الموافقة على الاسترجاع (A2U كامل) ----------
    if (action === 'approve') {
      const recordId = sanitize(req.body?.recordId, 50);
      if (!recordId) return res.status(400).json({ error: 'recordId مطلوب' });

      try {
        // 1. جلب بيانات الطلب من Airtable
        const refundRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        );
        if (!refundRes.ok) throw new Error('Airtable record not found');
        const refund = await refundRes.json();
        const fields = refund.fields;
        if (!fields?.buyer_uid) throw new Error('Missing buyer_uid');
        const amount = parseFloat(fields.amount_pi);
        const productName = fields.product_name || 'منتج';

        // 2. إنشاء دفعة A2U (Create)
        const createRes = await fetch('https://api.minepi.com/v2/payments', {
          method: 'POST',
          headers: { 'Authorization': `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment: {
              amount,
              memo: `استرجاع - ${productName}`,
              uid: fields.buyer_uid,
              metadata: { type: 'refund', recordId }
            }
          })
        });

        let createData;
        try { createData = await createRes.json(); } catch(e) { throw new Error('Create payment - invalid JSON'); }

        if (!createRes.ok) {
          if (createData.error === 'ongoing_payment_found' && createData.payment?.identifier) {
            await cancelPayment(createData.payment.identifier);
            const retryRes = await fetch('https://api.minepi.com/v2/payments', {
              method: 'POST',
              headers: { 'Authorization': `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                payment: {
                  amount,
                  memo: `استرجاع - ${productName}`,
                  uid: fields.buyer_uid,
                  metadata: { type: 'refund', recordId }
                }
              })
            });
            const retryData = await retryRes.json();
            if (!retryRes.ok) throw new Error(`Retry create failed: ${JSON.stringify(retryData)}`);
            createData = retryData;
          } else {
            throw new Error(`Create failed: ${JSON.stringify(createData)}`);
          }
        }

        const paymentId = createData.identifier;
        if (!paymentId) throw new Error('No payment identifier');

        // 3. إرسال الدفعة إلى البلوكشين (Submit)
        const submitRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/submit`, {
          method: 'POST',
          headers: { 'Authorization': `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_wallet_seed: PI_PRIVATE_SEED })
        });
        const submitData = await submitRes.json();
        if (!submitRes.ok) throw new Error(`Submit failed: ${JSON.stringify(submitData)}`);
        const txid = submitData.transaction?.txid;
        if (!txid) throw new Error('No txid');

        // 4. إكمال الدفعة (Complete)
        const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
          method: 'POST',
          headers: { 'Authorization': `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ txid })
        });
        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(`Complete failed: ${JSON.stringify(completeData)}`);

        // 5. تحديث Airtable (باستخدام الأعمدة الجديدة)
        const updateFields = {
          status: 'approved',
          approved_at: new Date().toISOString(),
          refund_payment_id: paymentId,
          refund_txid: txid,
          refunded_at: new Date().toISOString(),
          refund_error: null   // مسح أي خطأ سابق
        };

        const updateRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: updateFields })
        });
        if (!updateRes.ok) {
          const errData = await updateRes.json();
          throw new Error(`Airtable update failed: ${JSON.stringify(errData)}`);
        }

        console.log(`✅ Refund A2U completed: ${paymentId} | txid ${txid}`);
        return res.status(200).json({ success: true, paymentId, txid });

      } catch (err) {
        console.error('A2U Error:', err);
        // تسجيل الخطأ في Airtable
        try {
          await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { refund_error: err.message } })
          });
        } catch(e) {}
        return res.status(500).json({ error: err.message });
      }
    }

    // ---------- رفض الاسترجاع ----------
    if (action === 'reject') {
      const recordId = sanitize(req.body?.recordId, 50);
      if (!recordId) return res.status(400).json({ error: 'recordId مطلوب' });
      try {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { status: 'rejected', rejected_at: new Date().toISOString() } })
        });
        return res.status(200).json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    return res.status(400).json({ error: 'action غير صالح' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
//