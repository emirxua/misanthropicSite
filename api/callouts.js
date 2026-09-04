/**
 * Vercel Serverless Function: /api/callouts
 * Proxies live Pump.fun Alpha Callouts with CORS support.
 */

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
    const upstream = await fetch('https://www.outbid.bond/api/callouts', {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    });

    if (upstream.ok) {
      const data = await upstream.json();
      return res.status(200).json(data);
    }

    // Fallback URL
    const fallback = await fetch('https://outbid.bond/api/callouts', {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    });

    if (fallback.ok) {
      const data = await fallback.json();
      return res.status(200).json(data);
    }

    return res.status(502).json({ success: false, callouts: [], error: 'Upstream unavailable' });
  } catch (err) {
    return res.status(500).json({ success: false, callouts: [], error: err.message });
  }
};
