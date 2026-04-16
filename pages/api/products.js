// بدلاً من كتابة الـ ID يدوياً، نستخدم عملية الاستدعاء المؤمنة
const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

export default async function handler(req, res) {
  const { table } = req.query;
  
  // الرابط سيصبح الآن ديناميكي وآمن
  const url = `https://api.airtable.com/v0/${baseId}/${table}`;
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
