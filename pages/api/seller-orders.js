// pages/api/seller-orders.js
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { seller_username } = req.query;
  if (!seller_username) return res.status(400).json({ error: 'seller_username مطلوب' });

  try {
    const formula = encodeURIComponent(`{seller_username}="${seller_username}"`);
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders?filterByFormula=${formula}&sort[0][field]=purchased_at&sort[0][direction]=desc`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await response.json();
    return res.status(200).json({ records: data.records || [] });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
