export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { paymentId } = req.body;
    // هذه الخطوة تخبر Pi Network أن السيرفر موافق على العملية
    return res.status(200).json({ message: "Approved" });
  }
  res.status(405).json({ message: "Method not allowed" });
}
