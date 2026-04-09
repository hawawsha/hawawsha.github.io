// pages/api/add-product.js

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, fields, username } = req.body;

  if (!username) {
    return res.status(403).json({ error: 'username مطلوب' });
  }

  // ✅ التحقق من Airtable بدل ALLOWED_SELLERS
  try {
    const checkRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Approved_Sellers?filterByFormula={username}="${username}"`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const checkData = await checkRes.json();

    if (!checkData.records || checkData.records.length === 0) {
      return res.status(403).json({ error: 'غير مصرح - تواصل مع الإدارة للانضمام' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'خطأ في التحقق من الصلاحية' });
  }

  if (!table || !fields) {
    return res.status(400).json({ error: 'table and fields required' });
  }

  // ✅ إضافة المنتج
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${table}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      }
    );
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e) {
    console.error('[add-product]', e);
    return res.status(500).json({ error: e.message });
  }
}
