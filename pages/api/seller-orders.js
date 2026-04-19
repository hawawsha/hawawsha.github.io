// pages/api/seller-orders.js
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

async function verifySellerOnAirtable(username) {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/Approved_Sellers?filterByFormula=${encodeURIComponent(`{username}="${username}"`)}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
  );
  const data = await res.json();
  return data.records && data.records.length > 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { seller_username } = req.query;
  if (!seller_username) return res.status(400).json({ error: 'seller_username مطلوب' });

  // التحقق من صلاحية التاجر
  try {
    const isSeller = await verifySellerOnAirtable(seller_username);
    if (!isSeller) return res.status(403).json({ error: 'غير مصرح' });
  } catch(e) {
    return res.status(500).json({ error: 'خطأ في التحقق' });
  }

  // جلب الطلبات التي تحتوي منتجات هذا التاجر
  try {
    const formula = encodeURIComponent(`{seller_username}="${seller_username}"`);
    const res2 = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res2.json();
    return res.status(200).json({ records: data.records || [] });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
