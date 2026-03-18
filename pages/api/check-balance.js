export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address required' });
  }

  // Try multiple RPC endpoints in case one fails
  const rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
  ];

  let lastError = null;

  for (const rpc of rpcEndpoints) {
    try {
      const response = await fetch(rpc, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address, { commitment: 'confirmed' }],
        }),
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status} from ${rpc}`;
        continue;
      }

      const data = await response.json();

      if (data.error) {
        lastError = data.error.message;
        continue;
      }

      if (data.result === undefined || data.result === null) {
        lastError = 'No result from RPC';
        continue;
      }

      // lamports to SOL
      const lamports = data.result.value;
      const sol = lamports / 1_000_000_000;

      return res.status(200).json({
        success: true,
        balance: sol,
        lamports,
        address,
      });

    } catch (e) {
      lastError = e.message;
      continue;
    }
  }

  // All RPCs failed
  return res.status(500).json({
    error: 'Could not fetch balance',
    detail: lastError,
  });
}
