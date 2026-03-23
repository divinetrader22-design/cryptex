export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, doubleCode } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const validCode = process.env.POOL_CODE;
  const validDoubleCode = process.env.DOUBLE_TROUBLE_CODE;

  if (!validCode) return res.status(500).json({ error: 'Pool code not configured' });

  if (code !== validCode) {
    return res.status(200).json({ valid: false });
  }

  const BASE_AMOUNT = 5854.45;
  const BOOST_RATE = 0.538; // 53.8%

  let amount = BASE_AMOUNT;
  let doubled = false;

  if (doubleCode && validDoubleCode && doubleCode === validDoubleCode) {
    amount = parseFloat((BASE_AMOUNT * (1 + BOOST_RATE)).toFixed(2));
    doubled = true;
  }

  return res.status(200).json({
    valid: true,
    amount,
    doubled,
    baseAmount: BASE_AMOUNT,
    boostRate: BOOST_RATE * 100,
  });
}
