// هذا هو ملف Node.js (السيرفر) الذي طلبه صديقك
export default async function handler(req, res) {
    // التأكد أن الطلب قادم بطريقة POST (للموافقة على الدفع)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { paymentId } = req.body;
        const PI_API_KEY = process.env.PI_API_KEY; // قراءة مفتاحك من Vercel

        // إرسال طلب الموافقة (Approve) الرسمي لشبكة Pi كما شرح صديقك
        const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${PI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // إذا وافقت شبكة Pi، نرسل نجاح للمتصفح
            return res.status(200).json({ status: 'approved' });
        } else {
            const errorText = await response.text();
            return res.status(500).json({ error: 'Pi Approval Failed', details: errorText });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
