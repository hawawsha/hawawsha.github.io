// كود السيرفر لإصدار souq-pi-v3 - Testnet
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { action, paymentId, txid } = req.body;
  const API_KEY = process.env.PI_API_KEY; // المفتاح الذي أضفته في إعدادات Vercel

  // التأكد من وجود مفتاح API
  if (!API_KEY) {
    console.error("خطأ: PI_API_KEY غير موجود في إعدادات Vercel");
    return res.status(500).json({ error: "API Key missing" });
  }

  try {
    if (action === 'approve') {
      // 1. إرسال الموافقة لمنصة Pi (لحل مشكلة انتهاء الصلاحية)
      const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
      });

      if (!approveRes.ok) {
        const errData = await approveRes.json();
        console.error("فشل الموافقة من طرف Pi:", errData);
        return res.status(400).json(errData);
      }

      return res.status(200).json({ message: "Approved" });
    } 

    if (action === 'complete') {
      // 2. إرسال تأكيد إكمال المعاملة بعد نجاح الدفع
      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid })
      });

      if (!completeRes.ok) {
        const errData = await completeRes.json();
        console.error("فشل الإكمال من طرف Pi:", errData);
        return res.status(400).json(errData);
      }

      return res.status(200).json({ message: "Completed" });
    }

  } catch (error) {
    console.error("خطأ في الاتصال بسيرفر Pi:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
