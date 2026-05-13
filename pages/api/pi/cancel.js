export default async function handler(req, res) {
  // 1. نتأكد أن الطلب من نوع POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. نستخرج paymentId من جسم الطلب
  const { paymentId } = req.body;
  if (!paymentId) {
    return res.status(400).json({ error: 'Missing paymentId' });
  }

  // 3. نجلب المفتاح السري من بيئة التشغيل
  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'PI_API_KEY not configured' });
  }

  try {
    // 4. نرسل طلب الإلغاء إلى خوادم Pi Network مباشرة
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pi API cancel error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(500).json({ error: error.message });
  }
}