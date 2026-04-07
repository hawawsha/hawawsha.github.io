// كود السيرفر المطور لربط Pi مع Airtable
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { action, paymentId, txid, amount, username } = req.body;
  const API_KEY = process.env.PI_API_KEY;
  
  // بيانات Airtable من إعدادات Vercel
  const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

  if (!API_KEY) return res.status(500).json({ error: "Pi API Key missing" });

  try {
    // 1. عملية الموافقة (Approve)
    if (action === 'approve') {
      const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' }
      });
      return res.status(200).json({ message: "Approved" });
    } 

    // 2. عملية الإكمال (Complete) + الحفظ في Airtable
    if (action === 'complete') {
      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid })
      });

      if (completeRes.ok) {
        // --- الجزء الجديد: الإرسال لـ Airtable بعد نجاح الدفع ---
        if (AIRTABLE_KEY && BASE_ID) {
          await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                "Order_ID": paymentId,
                "Transaction_ID": txid,
                "User": username || "Unknown",
                "Amount": parseFloat(amount) || 0,
                "Status": "Paid",
                "Date": new Date().toISOString()
              }
            })
          });
          console.log("تم حفظ البيانات في Airtable بنجاح!");
        }
        return res.status(200).json({ message: "Completed and Saved to Airtable" });
      } else {
        return res.status(400).json({ error: "Failed to complete payment" });
      }
    }

  } catch (error) {
    console.error("خطأ:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
