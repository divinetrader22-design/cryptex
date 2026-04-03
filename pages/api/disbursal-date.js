export const config = { runtime: 'nodejs' };

export default function handler(req, res) {
  // Set DISBURSAL_DATE in Vercel env vars, e.g. "April 1 - 3, 2025"
  const date = process.env.DISBURSAL_DATE || 'April 1 - 3, 2025';
  return res.status(200).json({ date });
}
