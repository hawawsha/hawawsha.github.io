// api/approve.js
export default async function handler(req, res) {
  const { paymentId } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY; // تأكد أن الاسم مطابق لما في Vercel

  try {
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      const data = await response.json();
      return res.status(400).json({ error: data.message });
    }
  } catch (error) {
    return res.status(500).json({ error: "Timeout or Server Error" });
  }
}