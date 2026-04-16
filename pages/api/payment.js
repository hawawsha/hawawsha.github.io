export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { action, paymentId, txid, username, productId, productName, amountPi, tableName } = req.body;
  const API_KEY = process.env.PI_API_KEY;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

  // التحقق من وجود المفاتيح الأساسية
  if (!API_KEY || !AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    console.error("Critical Error: Missing Environment Variables");
    return res.status(500).json({ error: "Server Configuration Error" });
  }

  try {
    // 1. مرحلة الموافقة (Approve)
    if (action === 'approve') {
      const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
      });

      if (!approveRes.ok) {
        const errData = await approveRes.json();
        return res.status(approveRes.status).json(errData);
      }
      return res.status(200).json({ message: "Payment Approved" });
    }

    // 2. مرحلة الإكمال والتحقق (Complete & Verify)
    if (action === 'complete') {
      
      // أ: التحقق من الدفع من سيرفر Pi قبل الإكمال (خطوة أمان إضافية للماينت)
      const getPayment = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
        method: 'GET',
        headers: { 'Authorization': `Key ${API_KEY}` }
      });
      const paymentData = await getPayment.json();

      // تأكد أن المبلغ في البلوكشين يطابق السعر في قاعدة بياناتك
      if (Number(paymentData.amount) !== Number(amountPi)) {
        return res.status(400).json({ error: "Amount Mismatch! Verification Failed." });
      }

      // ب: إرسال أمر الإكمال (Complete)
      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid })
      });

      if (!completeRes.ok) {
        const errData = await completeRes.json();
        return res.status(completeRes.status).json(errData);
      }

      // ج: حفظ الطلب في Airtable مع تفاصيل البلوكشين كاملة
      try {
        const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              username: username,
              product_id: productId,
              product_name: productName || 'Unknown Product',
              amount_pi: Number(amountPi),
              payment_id: paymentId,
              transaction_id: txid, // الـ TXID الحقيقي على الماينت
              status: "Paid/Verified",
              table_origin: tableName || '',
              created_at: new Date().toISOString()
            }
          })
        });

        if (!airtableRes.ok) throw new Error("Airtable Sync Failed");

      } catch(e) {
        console.error('فشل التسجيل في Airtable لكن الدفع تم:', e);
        // ملاحظة: هنا الدفع تم بنجاح، يجب أن يكون لديك نظام لمراجعة الطلبات يدوياً في حال فشل Airtable
      }

      return res.status(200).json({ message: "Mainnet Transaction Success" });
    }

  } catch (error) {
    console.error("Mainnet Payment Bridge Error:", error);
    return res.status(500).json({ error: "Internal System Error" });
  }
}
