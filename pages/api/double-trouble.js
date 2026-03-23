export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, code, name, exchangeWallet, walletAddress, svk, socialLink, foundryLink } = req.body;

  const dtCode = process.env.DOUBLE_TROUBLE_CODE;
  const accessCode = process.env.ACCESS_CODE;

  if (!dtCode) return res.status(500).json({ error: 'Double Trouble code not configured' });

  // Validate the main access code before joining
  if (action === 'validate') {
    if (!code) return res.status(400).json({ error: 'Code required' });
    return res.status(200).json({ valid: code === accessCode });
  }

  // Submit the full form and return the DT code
  if (action === 'submit') {
    if (!name || !walletAddress || !svk || !foundryLink || !exchangeWallet) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Return the Double Trouble code as reward
    return res.status(200).json({ success: true, doubleCode: dtCode });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
