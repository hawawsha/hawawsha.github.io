export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { paymentId } = req.body;
  if (!paymentId) {
    return res.status(400).json({ error: "Missing paymentId" });
  }

  try {
    // 1️⃣ الموافقة (Approve)
    await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.PI_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    // 2️⃣ الإكمال (Complete)
    const completeRes = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${process.env.PI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await completeRes.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
