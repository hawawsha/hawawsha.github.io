const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export default async function handler(req, res) {

  // GET: تحقق من حالة التاجر
  if (req.method === 'GET') {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username مطلوب' });
    try {
      const approvedRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Approved_Sellers?filterByFormula=${encodeURIComponent(`{username}="${username}"`)}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const approvedData = await approvedRes.json();
      if (approvedData.records?.length > 0) {
        return res.status(200).json({ isSeller: true });
      }
      const reqRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Sellers_Requests?filterByFormula=${encodeURIComponent(`{username}="${username}"`)}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const reqData = await reqRes.json();
      if (reqData.records?.length > 0) {
        const status = reqData.records[0].fields.status;
        return res.status(200).json({ isSeller: false, requestStatus: status });
      }
      return res.status(200).json({ isSeller: false, requestStatus: null });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST: إرسال طلب جديد
  if (req.method === 'POST') {
    const { username, shop_name, whatsapp } = req.body;
    if (!username || !shop_name) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }

    // ✅ التحقق من رقم الواتساب
    if (!whatsapp || whatsapp.trim().length < 7) {
      return res.status(400).json({ error: 'رقم الواتساب مطلوب' });
    }

    try {
      const checkRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Sellers_Requests?filterByFormula=${encodeURIComponent(`{username}="${username}"`)}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const checkData = await checkRes.json();
      if (checkData.records?.length > 0) {
        const status = checkData.records[0].fields.status;
        return res.status(200).json({ error: 'طلب موجود مسبقاً', status });
      }

      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Sellers_Requests`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              username,
              shop_name,
              whatsapp: whatsapp.trim(),
              status: 'pending',
              created_at: new Date().toISOString().split('T')[0]
            }
          })
        }
      );
      const data = await response.json();
      return res.status(200).json({ success: true, data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
