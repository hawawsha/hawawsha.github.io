export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://www.okx.com/api/v5/market/ticker?instId=PI-USDT'
    );
    const data = await response.json();
    const price = data?.data?.[0]?.last;
    res.status(200).json({ price: price ? parseFloat(price) : null });
  } catch (err) {
    res.status(500).json({ price: null });
  }
}
