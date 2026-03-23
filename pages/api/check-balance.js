export const config = { runtime: "nodejs" };

// Minimum wallet integration value in USDC
const MIN_USDC = 212.54;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, minUsdc } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });
  // Use caller-supplied minimum if provided, otherwise default
  const EFFECTIVE_MIN = (minUsdc && minUsdc > 0) ? parseFloat(minUsdc) : MIN_USDC;

  // ── 1. Fetch live SOL price from CoinGecko ──────────────────────────────
  let solPrice = null;
  try {
    const priceRes = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { headers: { 'Accept': 'application/json' } }
    );
    const priceData = await priceRes.json();
    solPrice = priceData?.solana?.usd;
  } catch (e) {
    console.error('CoinGecko fetch failed:', e.message);
  }

  // Fallback: if CoinGecko fails use a reasonable recent price
  if (!solPrice || solPrice <= 0) solPrice = 212.54;

  // ── 2. Compute minimum SOL required based on live price ─────────────────
  // dynamic minimum
  const minSolRequired = EFFECTIVE_MIN / solPrice;

  // ── 3. Fetch wallet SOL balance via Solana RPC ──────────────────────────
  const rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com',
  ];

  let lastError = null;

  for (const rpc of rpcEndpoints) {
    try {
      const response = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const lamports = data.result.value;
      const solBalance = lamports / 1_000_000_000;
      const usdcValue = solBalance * solPrice;

      return res.status(200).json({
        success: true,
        balance: solBalance,
        usdcValue: parseFloat(usdcValue.toFixed(2)),
        solPrice: parseFloat(solPrice.toFixed(2)),
        minSolRequired: parseFloat(minSolRequired.toFixed(4)),
        minUsdcRequired: EFFECTIVE_MIN,
        meetsMinimum: usdcValue >= EFFECTIVE_MIN,
        lamports,
        address,
      });

    } catch (e) {
      lastError = e.message;
      continue;
    }
  }

  return res.status(500).json({
    error: 'Could not fetch balance',
    detail: lastError,
  });
}
