export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // استقبال البيانات والتأكد من شمول اسم التاجر (sellerUsername)
  const { action, paymentId, txid, username, productId, productName, amountPi, tableName, sellerUsername } = req.body;
  
  const API_KEY = process.env.PI_API_KEY;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

  if (!API_KEY || !AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return res.status(500).json({ error: "Server Configuration Error" });
  }

  try {
    // 1. مرحلة الموافقة على الدفع (Approve)
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

    // 2. مرحلة إتمام الدفع (Complete) وحفظ البيانات
    if (action === 'complete') {
      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid })
      });

      if (!completeRes.ok) {
        const errData = await completeRes.json();
        return res.status(completeRes.status).json(errData);
      }

      // بعد نجاح الدفع على الماينت، نقوم بحفظ الطلب في Airtable
      if (username && productId) {
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
                product_name: productName || 'منتج غير معروف',
                amount_pi: Number(amountPi) || 0,
                payment_id: paymentId,
                table_name: tableName || '',
                // هنا يتم حفظ اسم التاجر لضمان ظهور زر الواتساب لاحقاً
                seller_username: sellerUsername || '',
                created_at: new Date().toISOString()
              }
            })
          });
        } catch(e) {
          console.error('فشل حفظ الطلب في Airtable:', e);
        }
      }

      return res.status(200).json({ message: "Mainnet Transaction Success" });
    }

  } catch (error) {
    console.error("Payment Error:", error);
    return res.status(500).json({ error: "Internal System Error" });
  }
}
