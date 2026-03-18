export const config = { runtime: "nodejs" };

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  // Access code is stored securely in environment variable
  const validCode = process.env.ACCESS_CODE;

  if (!validCode) {
    console.error('ACCESS_CODE environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const isValid = code === validCode;

  return res.status(200).json({ valid: isValid });
}
