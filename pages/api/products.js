export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { table } = req.query;
  const TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!TOKEN || !BASE_ID) return res.status(500).json({ error: 'Missing env vars' });

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${table}`,
      { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
