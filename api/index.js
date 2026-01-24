export default async function handler(req, res) {
  console.log("APPROVE ENDPOINT HIT"); // هذه الجملة ستظهر في Vercel إذا نجح الاتصال

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { paymentId } = req.body;
  console.log("Payment ID received:", paymentId); // للتأكد أن رقم العملية وصل للسيرفر

  try {
    const response = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${process.env.PI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    console.log("PI RESPONSE:", data); // لرؤية رد شركة Pi Network الرسمي

    return res.status(200).json(data);
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
