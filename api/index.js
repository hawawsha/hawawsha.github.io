export default async function handler(req, res) {
    // 1. السماح فقط بطلبات POST لإرسال بيانات الدفع
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { paymentId } = req.body;

        // التحقق من وصول رقم العملية
        if (!paymentId) {
            return res.status(400).json({ error: 'Missing paymentId' });
        }

        // استخدام المفتاح السري الذي سنضعه في Vercel
        const PI_API_KEY = process.env.PI_API_KEY;

        // 2. إرسال طلب الموافقة الرسمي لخوادم Pi Network
        const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${PI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        // 3. التحقق من رد خادم Pi
        if (!response.ok) {
            console.error('فشل اعتماد الدفع من جهة Pi:', data);
            return res.status(500).json({ error: 'Pi approval failed' });
        }

        // 4. الرد بنجاح لفتح المحفظة فوراً للمستخدم
        return res.status(200).json({
            status: 'approved',
            paymentId: paymentId
        });

    } catch (err) {
        console.error('خطأ في السيرفر:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}
