export const config = { runtime: 'nodejs' };
import { rateLimit, getIp } from '../../lib/rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIp(req);
  const { allowed, retryAfter } = rateLimit(ip, 15, 60000);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests. Please wait before trying again.', retryAfter });
  }

  const { code, doubleCode } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const validCode = process.env.POOL_CODE;
  const validDoubleCode = process.env.DOUBLE_TROUBLE_CODE;

  if (!validCode) return res.status(500).json({ error: 'Pool code not configured' });

  if (code !== validCode) {
    return res.status(200).json({ valid: false });
  }

  const BASE_AMOUNT = 5854.45;

  // Read boost % from env variable — e.g. DT_BOOST_PERCENT=53.8
  // Defaults to 53.8 if not set
  const rawBoost = parseFloat(process.env.DT_BOOST_PERCENT);
  const BOOST_RATE = (!isNaN(rawBoost) && rawBoost >= 0) ? rawBoost / 100 : 0.538;

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
    boostRate: parseFloat((BOOST_RATE * 100).toFixed(2)),
  });
}
