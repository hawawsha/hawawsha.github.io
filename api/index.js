export default async function handler(req, res) {
    // التأكد من أن الطلب قادم بطريقة POST (إرسال بيانات)
    if (req.method === 'POST') {
        try {
            const { paymentId } = req.body;

            // في الخطوة العاشرة، نحتاج فقط لإرسال موافقة (Approved) للشبكة
            // لكي تفتح المحفظة للمستخدم فوراً
            console.log("تم استلام طلب دفع برقم:", paymentId);

            return res.status(200).json({
                message: "Approved",
                status: "success"
            });
        } catch (error) {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    } else {
        // إذا حاول أحد الدخول للرابط بطريقة خاطئة
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
}
