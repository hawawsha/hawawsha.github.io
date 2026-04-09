const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;

export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  if (req.method === 'GET') {
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Sellers_Requests?sort[0][field]=created_at&sort[0][direction]=desc`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await response.json();
      return res.status(200).json({ records: data.records || [] });
    } catch (e) {
      return res.status(500).json({ error: 'خطأ في جلب البيانات' });
    }
  }

  if (req.method === 'POST') {
    const { recordId, action, username, shop_name } = req.body;
    if (!recordId || !action) {
      return res.status(400).json({ error: 'recordId و action مطلوبان' });
    }
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Sellers_Requests/${recordId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields: { status: newStatus } })
        }
      );
      if (action === 'approve' && username && shop_name) {
        await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Approved_Sellers`,
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
                approved_at: new Date().toISOString().split('T')[0]
              }
            })
          }
        );
      }
      return res.status(200).json({ success: true, status: newStatus });
    } catch (e) {
      return res.status(500).json({ error: 'خطأ في التحديث' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
