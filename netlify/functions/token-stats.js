const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const MIS_CA = 'AWQSXRxiNUGLj9moJMFhq2axqwu6Dqerp16ftj4FjLyG';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MIS_CA}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`DexScreener API returned ${res.status}`);
    }

    const data = await res.json();
    const pair = (data.pairs || [])[0] || {};

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Cache-Control': 'public, max-age=5, stale-while-revalidate=10',
      },
      body: JSON.stringify({
        success: true,
        symbol: 'MISANTHROPIC',
        name: 'Misanthropic',
        mint: MIS_CA,
        priceUsd: parseFloat(pair.priceUsd || 0),
        marketCap: parseFloat(pair.marketCap || pair.fdv || 0),
        volume24h: parseFloat(pair.volume?.h24 || 0),
        priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
        priceChange1h: parseFloat(pair.priceChange?.h1 || 0),
        priceChange5m: parseFloat(pair.priceChange?.m5 || 0),
        liquidityUsd: parseFloat(pair.liquidity?.usd || 0),
        pairAddress: pair.pairAddress || '',
        url: pair.url || `https://dexscreener.com/solana/${MIS_CA}`,
      }),
    };
  } catch (err) {
    console.error('Token stats error:', err);
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
