// pages/api/my-orders.js
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username مطلوب' });

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders?filterByFormula={username}="${username}"&sort[0][field]=purchased_at&sort[0][direction]=desc`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await response.json();
    return res.status(200).json({ records: data.records || [] });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
