// pages/api/seller-products.js
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

const TABLES = ['Cars', 'Electronics', 'Electric', 'Real_Estate'];

async function verifySellerOnAirtable(username) {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/Approved_Sellers?filterByFormula=${encodeURIComponent(`{username}="${username}"`)}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
  );
  const data = await res.json();
  return data.records && data.records.length > 0;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const AIRTABLE_TOKEN_ENV = AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ENV = AIRTABLE_BASE;

  if (!AIRTABLE_TOKEN_ENV || !AIRTABLE_BASE_ENV) {
    return res.status(500).json({ error: 'Server Configuration Error' });
  }

  // ✅ GET - جلب منتجات التاجر
  if (req.method === 'GET') {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username مطلوب' });

    // التحقق من صلاحية التاجر
    try {
      const isSeller = await verifySellerOnAirtable(username);
      if (!isSeller) return res.status(403).json({ error: 'غير مصرح' });
    } catch(e) {
      return res.status(500).json({ error: 'خطأ في التحقق' });
    }

    // جلب المنتجات من كل الجداول
    try {
      const results = await Promise.all(
        TABLES.map(async (table) => {
          const formula = encodeURIComponent(`{seller_username}="${username}"`);
          const r = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ENV}/${table}?filterByFormula=${formula}`,
            { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN_ENV}` } }
          );
          const d = await r.json();
          return (d.records || []).map(p => ({ ...p, _table: table }));
        })
      );
      const allProducts = results.flat();
      return res.status(200).json({ records: allProducts });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ✅ DELETE - حذف منتج
  if (req.method === 'DELETE') {
    const { username, recordId, table } = req.body;
    if (!username || !recordId || !table) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }

    // التحقق من صلاحية التاجر
    try {
      const isSeller = await verifySellerOnAirtable(username);
      if (!isSeller) return res.status(403).json({ error: 'غير مصرح' });
    } catch(e) {
      return res.status(500).json({ error: 'خطأ في التحقق' });
    }

    // التحقق إن المنتج يخص هذا التاجر
    try {
      const getRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ENV}/${table}/${recordId}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN_ENV}` } }
      );
      const product = await getRes.json();
      if (product.fields?.seller_username !== username) {
        return res.status(403).json({ error: 'لا يمكنك حذف منتج لا يخصك' });
      }

      // حذف المنتج
      const delRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ENV}/${table}/${recordId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN_ENV}` }
        }
      );
      const delData = await delRes.json();
      return res.status(200).json({ success: true, data: delData });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
