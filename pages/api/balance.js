export default async function handler(req, res) {
  const { walletAddress } = req.query;
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress مطلوب' });
  try {
    const response = await fetch(
      `https://api.mainnet.minepi.com/accounts/${walletAddress}`
    );
    const data = await response.json();
    if (data.balances) {
      const piBalance = data.balances.find(b => b.asset_type === 'native');
      return res.status(200).json({ balance: piBalance?.balance || '0' });
    }
    return res.status(404).json({ error: 'المحفظة غير موجودة' });
  } catch (error) {
    return res.status(500).json({ error: 'خطأ في الاتصال بالشبكة' });
  }
}
