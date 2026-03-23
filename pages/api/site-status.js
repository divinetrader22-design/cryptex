export const config = { runtime: 'nodejs' };

export default function handler(req, res) {
  const isUnderLoad = process.env.SITE_UNDER_LOAD === '1';
  return res.status(200).json({ underLoad: isUnderLoad });
}
