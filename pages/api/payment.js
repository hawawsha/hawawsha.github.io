export const config = {
  maxDuration: 30
};

// ✅ دالة تنظيف النصوص من أي محاولة injection
function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen).replace(/[<>'"]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const API_KEY = process.env.PI_API_KEY;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

  if (!API_KEY || !AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ✅ تنظيف وتحقق من البيانات
  const action = sanitize(req.body?.action, 20);
  const paymentId = sanitize(req.body?.paymentId, 100);
  const txid = sanitize(req.body?.txid, 100);
  const username = sanitize(req.body?.username, 50);
  const productId = sanitize(req.body?.productId, 50);
  const productName = sanitize(req.body?.productName, 200);
  const tableName = sanitize(req.body?.tableName, 50);
  const sellerUsername = sanitize(req.body?.sellerUsername, 50);
  const amountPi = parseFloat(req.body?.amountPi);

  // ✅ تحقق من صحة البيانات الأساسية
  if (!action || !paymentId) {
    return res.status(400).json({ error: 'بيانات ناقصة' });
  }

  // ✅ تحقق من أن action واحد من القيم المسموحة فقط
  if (!['approve', 'complete'].includes(action)) {
    return res.status(400).json({ error: 'action غير صالح' });
  }

  try {
    // 1. الموافقة
    if (action === 'approve') {
      const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
      });
      if (!approveRes.ok) {
        return res.status(400).json({ error: 'فشل الموافقة على الدفع' });
      }
      return res.status(200).json({ message: 'Approved' });
    }

    // 2. الإكمال والحفظ
    if (action === 'complete') {
      if (!txid) return res.status(400).json({ error: 'txid مطلوب' });

      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid })
      });

      if (!completeRes.ok) {
        return res.status(400).json({ error: 'فشل إكمال الدفع' });
      }

      // ✅ تحقق من البيانات قبل الحفظ
      if (username && productId) {

        // ✅ تحقق من عدم تكرار نفس الـ paymentId
        const checkRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders?filterByFormula=${encodeURIComponent(`{payment_id}="${paymentId}"`)}`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const checkData = await checkRes.json();

        if (checkData.records?.length > 0) {
          // الطلب موجود مسبقاً — لا نحفظ مرة ثانية
          return res.status(200).json({ message: 'Already saved' });
        }

        // ✅ تحقق من أن المبلغ رقم موجب
        const safeAmount = (!isNaN(amountPi) && amountPi > 0) ? amountPi : 0;

        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              username,
              product_id: productId,
              product_name: productName,
              amount_pi: safeAmount,
              payment_id: paymentId,
              table_name: tableName,
              seller_username: sellerUsername,
              purchased_at: new Date().toISOString().split('T')[0]
            }
          })
        });
      }

      return res.status(200).json({ message: 'Completed' });
    }

  } catch {
    // ✅ لا نكشف تفاصيل الخطأ للمستخدم
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
