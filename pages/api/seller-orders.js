// pages/api/my-orders.js
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username مطلوب' });

  try {
    // جلب الطلبات
    const formula = encodeURIComponent(`{username}="${username}"`);
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await response.json();
    const orders = data.records || [];

    // جلب أرقام الواتساب للتجار
    const sellerUsernames = [...new Set(
      orders
        .map(o => o.fields.seller_username)
        .filter(Boolean)
    )];

    const sellerWhatsappMap = {};

    if (sellerUsernames.length > 0) {
      await Promise.all(sellerUsernames.map(async (seller) => {
        try {
          const sellerFormula = encodeURIComponent(`{username}="${seller}"`);
          const sellerRes = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE}/Sellers_Requests?filterByFormula=${sellerFormula}`,
            { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
          );
          const sellerData = await sellerRes.json();
          if (sellerData.records?.length > 0) {
            sellerWhatsappMap[seller] = sellerData.records[0].fields.whatsapp || null;
          }
        } catch(e) {}
      }));
    }

    // إضافة الواتساب لكل طلب
    const enrichedOrders = orders.map(order => ({
      ...order,
      fields: {
        ...order.fields,
        seller_whatsapp: order.fields.seller_username
          ? sellerWhatsappMap[order.fields.seller_username] || null
          : null
      }
    }));

    return res.status(200).json({ records: enrichedOrders });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
