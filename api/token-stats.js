/**
 * Vercel Serverless Function: /api/token-stats
 * Real-time $MISANTHROPIC stats directly from DexScreener.
 */

const MIS_CA = 'AWQSXRxiNUGLj9moJMFhq2axqwu6Dqerp16ftj4FjLyG';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const upstream = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MIS_CA}`, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ success: false, error: 'DexScreener upstream failed' });
    }

    const json = await upstream.json();
    const pairs = json.pairs || [];
    const p = pairs[0];

    if (!p) {
      return res.status(404).json({ success: false, error: 'Pair not found' });
    }

    return res.status(200).json({
      success: true,
      priceUsd: parseFloat(p.priceUsd || 0),
      marketCap: parseFloat(p.marketCap || p.fdv || 0),
      volume24h: parseFloat(p.volume?.h24 || 0),
      priceChange24h: parseFloat(p.priceChange?.h24 || 0),
      liquidityUsd: parseFloat(p.liquidity?.usd || 0),
      pairAddress: p.pairAddress,
      baseToken: p.baseToken,
      quoteToken: p.quoteToken,
      dexId: p.dexId,
      url: p.url,
      timestamp: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
