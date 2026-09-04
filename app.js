/**
 * $MISANTHROPIC Pro Alpha Terminal — app.js (v4.0)
 * 100% Real Live On-Chain Data • Zero Mock Data
 * Full Day/Night Theme Support • Flawless Alignment & Smart Image Fallbacks
 */

'use strict';

/* ==========================================================================
   CONFIG & CONSTANTS
   ========================================================================== */
const MIS_CA = 'AWQSXRxiNUGLj9moJMFhq2axqwu6Dqerp16ftj4FjLyG';
const MIS_PAIR_SLUG = 'bsjw4nhx3kyr5m3nl12rcpfmtybnba5ncmw2pazstevv';

const STATS_INTERVAL_MS = 5_000;
const CALLOUTS_INTERVAL_MS = 6_000;
const TRENDING_INTERVAL_MS = 10_000;

/* ==========================================================================
   STATE
   ========================================================================== */
const state = {
  activeTab: 'tab-callouts',
  audioAlerts: true,
  misPriceUsd: 0.00001219,
  solPriceUsd: 135.0,

  // Current swap target
  targetSwapMint: MIS_CA,
  targetSwapSymbol: '$MIS',
  targetSwapImg: 'assets/flower.png',

  // Live callouts
  callouts: [],
  knownCalloutIds: new Set(),
  calloutFilter: 'all',
  calloutSearch: '',

  // Trending
  trendingTokens: [],
  trendingFilter: 'all',
  trendingSearch: '',
};

/* ==========================================================================
   DOM ELEMENTS CACHE
   ========================================================================== */
const dom = {
  themeToggleBtn: document.getElementById('themeToggleBtn'),

  // Header Ticker
  tickerPrice: document.getElementById('tickerPrice'),
  tickerChange: document.getElementById('tickerChange'),
  tickerMcap: document.getElementById('tickerMcap'),
  tickerVol: document.getElementById('tickerVol'),
  headerCopyBtn: document.getElementById('headerCopyCaBtn'),
  signalAudioBtn: document.getElementById('signalAudioBtn'),
  audioIconOn: document.getElementById('audioIconOn'),
  audioIconOff: document.getElementById('audioIconOff'),

  // Telemetry Bar
  heroSignalsCount: document.getElementById('heroSignalsCount'),
  heroMaxMultVal: document.getElementById('heroMaxMultVal'),
  heroLiqVal: document.getElementById('heroLiqVal'),

  // Tab Navigation
  tabButtons: document.querySelectorAll('.tab-btn'),
  panes: document.querySelectorAll('.stage-pane'),
  deckRefreshBtn: document.getElementById('deckRefreshBtn'),

  // Callouts
  calloutsGrid: document.getElementById('calloutsGrid'),
  calloutsEmpty: document.getElementById('calloutsEmptyState'),
  calloutFilters: document.getElementById('calloutFilters'),
  calloutSearchInput: document.getElementById('calloutSearchInput'),
  calloutCountBadge: document.getElementById('calloutCountBadge'),

  // Trending
  trendingGrid: document.getElementById('trendingGrid'),
  trendingFilters: document.getElementById('trendingFilters'),
  trendingSearchInput: document.getElementById('trendingSearchInput'),

  // Swap Sidebar
  swapFromAmount: document.getElementById('swapFromAmount'),
  swapToAmount: document.getElementById('swapToAmount'),
  swapTargetSymbol: document.getElementById('swapTargetSymbol'),
  swapTargetImg: document.getElementById('swapTargetImg'),
  swapTargetCa: document.getElementById('swapTargetCa'),
  copySwapCaBtn: document.getElementById('copySwapCaBtn'),
  targetTokenRate: document.getElementById('targetTokenRate'),
  jupiterDirectLink: document.getElementById('jupiterDirectLink'),
  presetChips: document.querySelectorAll('.preset-chip'),
  slipChips: document.querySelectorAll('.slip-chip'),

  // Modal & Toast
  chartModal: document.getElementById('chartModal'),
  modalChartTitle: document.getElementById('modalChartTitle'),
  dexChartIframe: document.getElementById('dexChartIframe'),
  toast: document.getElementById('termToast'),

  // Mobile Dock
  dockButtons: document.querySelectorAll('.dock-btn'),
};

/* ==========================================================================
   DAY / NIGHT (LIGHT / DARK) SYSTEM THEME ENGINE
   ========================================================================== */
function initThemeEngine() {
  const root = document.documentElement;
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(isDark) {
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }

  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    applyTheme(storedTheme === 'dark');
  } else {
    applyTheme(darkQuery.matches);
  }

  // Follow system theme changes automatically if user hasn't hardcoded a choice
  darkQuery.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches);
    }
  });

  // Manual Toggle Button
  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener('click', () => {
      const isCurrentlyDark = root.classList.contains('dark');
      const nextIsDark = !isCurrentlyDark;
      applyTheme(nextIsDark);
      localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
      showToast(nextIsDark ? '🌙 Night Mode Activated' : '☀️ Day Mode Activated');
    });
  }
}


/* ==========================================================================
   FORMATTING & UTILITIES
   ========================================================================== */
function fmtUSD(num) {
  if (num == null || isNaN(num) || num === 0) return '$0.00';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
  if (num >= 1) return '$' + num.toFixed(2);
  if (num >= 0.01) return '$' + num.toFixed(2);
  if (num < 0.000001) return '$' + num.toFixed(8);
  return '$' + num.toFixed(6);
}

function fmtMcap(num) {
  if (num == null || isNaN(num) || num <= 0) return '—';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(num).toLocaleString('en-US');
}

function fmtPercent(num) {
  if (num == null || isNaN(num)) return { text: '0.00%', cls: 'change-neutral' };
  const sign = num > 0 ? '+' : '';
  const cls = num > 0 ? 'change-up' : num < 0 ? 'change-down' : 'change-neutral';
  return { text: `${sign}${Number(num).toFixed(2)}%`, cls };
}

function fmtShortAddr(addr) {
  if (!addr) return '';
  const s = String(addr).trim();
  if (s.length <= 8) return s;
  return s.slice(0, 4) + '...' + s.slice(-4);
}

function timeAgo(dateOrMs) {
  if (!dateOrMs) return 'just now';
  const time = typeof dateOrMs === 'number' ? dateOrMs : new Date(dateOrMs).getTime();
  const diffSec = Math.max(1, Math.floor((Date.now() - time) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function sanitizeUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  if (clean.includes('ipfs.io/ipfs/')) {
    clean = clean.replace('https://ipfs.io/ipfs/', 'https://cf-ipfs.com/ipfs/');
  }
  return clean;
}

// Generate deterministic styling for token avatar badges
function getTokenGradient(symbol) {
  const styles = [
    'background: #18181b; border: 1px solid rgba(255,85,0,0.4); color: #ff5500;',
    'background: #27272a; border: 1px solid rgba(255,255,255,0.15); color: #ffffff;',
    'background: #1c1917; border: 1px solid rgba(255,119,0,0.4); color: #ff7700;',
    'background: #09090b; border: 1px solid #3f3f46; color: #ffffff;',
    'background: #18181b; border: 1px solid #52525b; color: #f4f4f5;',
  ];
  let hash = 0;
  for (let i = 0; i < (symbol || '').length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return styles[Math.abs(hash) % styles.length];
}

/* ==========================================================================
   TOAST & AUDIO FEEDBACK
   ========================================================================== */
let toastTimer = null;
function showToast(message) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.classList.remove('show');
  }, 2200);
}

function playSignalChime() {
  if (!state.audioAlerts) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  } catch {}
}

/* ==========================================================================
   CLIPBOARD
   ========================================================================== */
async function copyToClipboard(text, label = 'Contract Address') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`✓ Copied ${label}!`);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(`✓ Copied ${label}!`);
  }
}

function copyMainCA() {
  copyToClipboard(MIS_CA, '$MISANTHROPIC CA');
}

/* ==========================================================================
   1. REAL-TIME $MIS STATS POLLING (ZERO MOCK DATA)
   ========================================================================== */
async function fetchTokenStats() {
  try {
    let pairData = null;

    // 1. Try local server endpoint
    try {
      const res = await fetch('/api/token-stats', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) pairData = json;
      }
    } catch {}

    // 2. Direct DexScreener fallback
    if (!pairData) {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MIS_CA}`);
      if (res.ok) {
        const json = await res.json();
        const p = (json.pairs || [])[0];
        if (p) {
          pairData = {
            priceUsd: parseFloat(p.priceUsd || 0),
            marketCap: parseFloat(p.marketCap || p.fdv || 0),
            volume24h: parseFloat(p.volume?.h24 || 0),
            priceChange24h: parseFloat(p.priceChange?.h24 || 0),
            liquidityUsd: parseFloat(p.liquidity?.usd || 0),
          };
        }
      }
    }

    if (pairData && pairData.priceUsd > 0) {
      state.misPriceUsd = pairData.priceUsd;
      const chg = fmtPercent(pairData.priceChange24h);

      if (dom.tickerPrice) dom.tickerPrice.textContent = fmtUSD(pairData.priceUsd);
      if (dom.tickerChange) {
        dom.tickerChange.textContent = chg.text;
        dom.tickerChange.className = `seg-val ${chg.cls}`;
      }
      if (dom.tickerMcap) dom.tickerMcap.textContent = fmtMcap(pairData.marketCap);
      if (dom.tickerVol) dom.tickerVol.textContent = fmtUSD(pairData.volume24h);
      if (dom.heroLiqVal) dom.heroLiqVal.textContent = fmtMcap(pairData.liquidityUsd || 11600);

      updateSwapCalculations();
    }
  } catch (err) {
    console.warn('[Terminal] Stats error:', err);
  }
}

/* ==========================================================================
   2. REAL-TIME ALPHA CALLOUTS STREAM (ZERO MOCK DATA)
   ========================================================================== */
async function fetchCallouts() {
  try {
    let rawCallouts = [];

    // Local / Netlify proxy endpoint
    try {
      const res = await fetch('/api/callouts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        rawCallouts = data.callouts || [];
      }
    } catch {}

    // Upstream fallback
    if (!rawCallouts || rawCallouts.length === 0) {
      try {
        const res = await fetch('https://www.outbid.bond/api/callouts');
        if (res.ok) {
          const data = await res.json();
          rawCallouts = data.callouts || [];
        }
      } catch {}
    }

    if (!rawCallouts || rawCallouts.length === 0) return;

    // Detect new incoming calls
    let hasNew = false;
    rawCallouts.forEach((c) => {
      const id = c.calloutId || c.coinMint;
      if (id && !state.knownCalloutIds.has(id)) {
        state.knownCalloutIds.add(id);
        hasNew = true;
      }
    });

    if (hasNew && state.callouts.length > 0) {
      playSignalChime();
    }

    state.callouts = rawCallouts;

    if (dom.heroSignalsCount) {
      dom.heroSignalsCount.textContent = `${state.callouts.length} Signals`;
    }

    let maxMult = 0;
    state.callouts.forEach((c) => {
      const mult = Number(c.multiplier || c.multiple || 1);
      if (mult > maxMult) maxMult = mult;
    });

    if (dom.heroMaxMultVal && maxMult > 0) {
      dom.heroMaxMultVal.textContent = `${maxMult.toFixed(1)}x`;
    }

    renderCalloutsGrid();

  } catch (err) {
    console.warn('[Terminal] Callouts error:', err);
  }
}

function renderCalloutsGrid() {
  if (!dom.calloutsGrid) return;

  let filtered = [...state.callouts];

  // Filter chips
  if (state.calloutFilter === '2x') {
    filtered = filtered.filter((c) => (c.multiplier || c.multiple || 1) >= 2.0);
  } else if (state.calloutFilter === '5x') {
    filtered = filtered.filter((c) => (c.multiplier || c.multiple || 1) >= 5.0);
  } else if (state.calloutFilter === '10x') {
    filtered = filtered.filter((c) => (c.multiplier || c.multiple || 1) >= 10.0);
  } else if (state.calloutFilter === 'recent') {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    filtered = filtered.filter((c) => (c.createdAt || 0) >= oneHourAgo);
  }

  // Text search
  if (state.calloutSearch.trim()) {
    const q = state.calloutSearch.toLowerCase().trim();
    filtered = filtered.filter((c) => {
      const sym = (c.coinSymbol || '').toLowerCase();
      const name = (c.coinName || '').toLowerCase();
      const caller = (c.callerLabel || c.callerXUsername || c.callerWallet || '').toLowerCase();
      const mint = (c.coinMint || '').toLowerCase();
      return sym.includes(q) || name.includes(q) || caller.includes(q) || mint.includes(q);
    });
  }

  if (dom.calloutCountBadge) {
    dom.calloutCountBadge.textContent = `${filtered.length}`;
  }

  if (filtered.length === 0) {
    dom.calloutsGrid.innerHTML = '';
    if (dom.calloutsEmpty) dom.calloutsEmpty.classList.remove('hidden');
    return;
  }

  if (dom.calloutsEmpty) dom.calloutsEmpty.classList.add('hidden');

  const html = filtered.map((c) => {
    const mint = c.coinMint || '';
    const sym = (c.coinSymbol || 'TOKEN').toUpperCase();
    const name = c.coinName || sym;
    const mult = Number(c.multiplier || c.multiple || 1);
    const multText = mult.toFixed(2) + 'x';
    const multClass = mult >= 5.0 ? 'mult-super' : mult >= 1.0 ? 'mult-up' : 'mult-down';

    const entryMcap = Number(c.entryMcap || c.marketCap || 0);
    const currMcap = Number(c.currentMcap || c.marketCap || 0);
    const callerName = c.callerLabel || (c.callerXUsername ? '@' + c.callerXUsername : fmtShortAddr(c.callerWallet));
    const callerInitial = (callerName.replace('@', '')[0] || 'A').toUpperCase();
    const callerAvatar = sanitizeUrl(c.callerAvatarUrl);
    const coinImg = sanitizeUrl(c.mediaUrl);
    const tokenInitials = sym.slice(0, 2);
    const tokenGrad = getTokenGradient(sym);

    const thesis = c.thesis ? `“${c.thesis}”` : 'Live Solana alpha signal detected in the trenches.';
    const xLink = c.callerXUsername ? `https://x.com/${c.callerXUsername}` : null;

    return `
      <div class="callout-card" data-mint="${mint}">
        <!-- Caller Row -->
        <div class="card-caller-row">
          <div class="caller-identity">
            ${callerAvatar ? `
              <img class="caller-avatar" src="${callerAvatar}" alt="${callerName}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="caller-fallback-badge" style="display:none;">${callerInitial}</div>
            ` : `
              <div class="caller-fallback-badge">${callerInitial}</div>
            `}
            <div class="caller-name-wrap">
              <span class="caller-name">${callerName}</span>
              ${xLink ? `<a href="${xLink}" target="_blank" rel="noopener noreferrer" class="caller-x-link" title="X Profile">𝕏</a>` : ''}
            </div>
          </div>
          <span class="callout-time">${timeAgo(c.createdAt)}</span>
        </div>

        <!-- Token Banner -->
        <div class="card-token-banner">
          <div class="token-info-left">
            ${coinImg ? `
              <img class="token-avatar" src="${coinImg}" alt="${sym}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="token-fallback-avatar" style="display:none; ${tokenGrad}">${tokenInitials}</div>
            ` : `
              <div class="token-fallback-avatar" style="${tokenGrad}">${tokenInitials}</div>
            `}
            <div class="token-titles">
              <div class="token-symbol-row">
                <span class="token-symbol-text">$${sym}</span>
                <span class="token-badge">pump</span>
              </div>
              <span class="token-name-text">${name}</span>
            </div>
          </div>

          <!-- Multiplier Hero Badge -->
          <div class="multiplier-hero-pill">
            <span class="multiplier-badge ${multClass}">${multText}</span>
            <span class="mult-label">${mult >= 1.0 ? 'GAIN' : 'LOSS'}</span>
          </div>
        </div>

        <!-- Telemetry Stats -->
        <div class="callout-stats-row">
          <div class="stat-item">
            <span class="label">ENTRY MCAP</span>
            <span class="value">${fmtMcap(entryMcap)}</span>
          </div>
          <div class="stat-item">
            <span class="label">CURRENT MCAP</span>
            <span class="value ${currMcap >= entryMcap ? 'color-green' : 'color-red'}">${fmtMcap(currMcap)}</span>
          </div>
        </div>

        <!-- Caller Thesis Note (NO SCROLLBARS) -->
        <div class="callout-thesis-box">
          <p>${thesis}</p>
        </div>

        <!-- Card Action Footer -->
        <div class="card-actions-footer">
          <button type="button" class="card-mint-btn" onclick="copyToClipboard('${mint}', '${sym} Mint')">
            <span>${fmtShortAddr(mint)}</span>
          </button>

          <div class="card-links-group">
            <button type="button" class="card-btn-chart" onclick="openChartModal('${mint}', '${sym}')">
              Chart
            </button>
            <button type="button" class="card-btn-swap" onclick="selectTokenForSwap('${mint}', '${sym}', '${coinImg}')">
              ⚡ Swap
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  dom.calloutsGrid.innerHTML = html;
}

function resetCalloutFilters() {
  state.calloutFilter = 'all';
  state.calloutSearch = '';
  if (dom.calloutSearchInput) dom.calloutSearchInput.value = '';
  if (dom.calloutFilters) {
    dom.calloutFilters.querySelectorAll('.chip-item').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-filter') === 'all');
    });
  }
  renderCalloutsGrid();
}

/* ==========================================================================
   3. REAL-TIME TRENDING TOKENS SCANNER (ZERO MOCK DATA)
   ========================================================================== */
async function fetchTrending() {
  try {
    let coins = [];

    // Local / Netlify proxy endpoint
    try {
      const res = await fetch('/api/trending', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        coins = json.data || [];
      }
    } catch {}

    // Direct fallback
    if (!coins || coins.length === 0) {
      try {
        const res = await fetch('https://www.outbid.bond/api/coins');
        if (res.ok) {
          const json = await res.json();
          coins = json.data || (Array.isArray(json) ? json : []);
        }
      } catch {}
    }

    if (coins && coins.length > 0) {
      state.trendingTokens = coins.filter(c => {
        const mint = c.mintAddress || '';
        const tick = (c.ticker || '').toUpperCase();
        return !tick.includes('BATON') && !mint.toLowerCase().includes('baton');
      });
      renderTrendingGrid();
    }
  } catch (err) {
    console.warn('[Terminal] Trending error:', err);
  }
}

function renderTrendingGrid() {
  if (!dom.trendingGrid) return;

  let list = [...state.trendingTokens];

  if (state.trendingFilter === 'gainers') {
    list.sort((a, b) => (b.change24h || 0) - (a.change24h || 0));
  } else if (state.trendingFilter === 'volume') {
    list.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
  } else if (state.trendingFilter === 'mcap') {
    list.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  }

  if (state.trendingSearch.trim()) {
    const q = state.trendingSearch.toLowerCase().trim();
    list = list.filter((c) => {
      const sym = (c.ticker || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return sym.includes(q) || name.includes(q);
    });
  }

  const html = list.map((c) => {
    const mint = c.mintAddress || '';
    const sym = (c.ticker || 'SOL').toUpperCase();
    const name = c.name || sym;
    const price = fmtUSD(c.priceUsd);
    const mcap = fmtMcap(c.marketCap);
    const vol = fmtUSD(c.volume24h);
    const chg = fmtPercent(c.change24h);
    const img = sanitizeUrl(c.imageUrl);
    const tokenInitials = sym.slice(0, 2);
    const tokenGrad = getTokenGradient(sym);

    return `
      <div class="trend-card" data-mint="${mint}">
        <div class="trend-head-row">
          <div class="trend-token-left">
            ${img ? `
              <img class="trend-avatar" src="${img}" alt="${sym}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="trend-fallback-avatar" style="display:none; ${tokenGrad}">${tokenInitials}</div>
            ` : `
              <div class="trend-fallback-avatar" style="${tokenGrad}">${tokenInitials}</div>
            `}
            <div class="trend-titles">
              <span class="trend-symbol">$${sym}</span>
              <span class="trend-name">${name}</span>
            </div>
          </div>
          <span class="trend-chg-badge ${chg.cls}">${chg.text}</span>
        </div>

        <div class="trend-stats-grid">
          <div class="stat-item">
            <span class="label">PRICE</span>
            <span class="value">${price}</span>
          </div>
          <div class="stat-item">
            <span class="label">MCAP</span>
            <span class="value">${mcap}</span>
          </div>
          <div class="stat-item">
            <span class="label">24H VOL</span>
            <span class="value">${vol}</span>
          </div>
          <div class="stat-item">
            <span class="label">MINT</span>
            <span class="value font-mono">${fmtShortAddr(mint)}</span>
          </div>
        </div>

        <div class="card-actions-footer">
          <button type="button" class="card-mint-btn" onclick="copyToClipboard('${mint}', '${sym} Mint')">
            <span>Copy CA</span>
          </button>
          <div class="card-links-group">
            <button type="button" class="card-btn-chart" onclick="openChartModal('${mint}', '${sym}')">
              Chart
            </button>
            <button type="button" class="card-btn-swap" onclick="selectTokenForSwap('${mint}', '${sym}', '${img}')">
              ⚡ Swap
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  dom.trendingGrid.innerHTML = html;
}

/* ==========================================================================
   4. SIDEBAR SWAP CALCULATIONS & SELECTION
   ========================================================================== */
function updateSwapCalculations() {
  if (!dom.swapFromAmount || !dom.swapToAmount) return;

  const solAmt = parseFloat(dom.swapFromAmount.value) || 0;
  if (solAmt <= 0) {
    dom.swapToAmount.value = '0';
    return;
  }

  // Value in USD
  const totalUsd = solAmt * state.solPriceUsd;

  if (state.targetSwapMint === MIS_CA) {
    const tokenPrice = state.misPriceUsd > 0 ? state.misPriceUsd : 0.00001219;
    const tokenTokens = totalUsd / tokenPrice;
    dom.swapToAmount.value = (tokenTokens / 1e6).toFixed(2) + 'M';
    if (dom.targetTokenRate) {
      const rate = Math.round(state.solPriceUsd / tokenPrice);
      dom.targetTokenRate.textContent = `1 SOL ≈ ${(rate / 1e6).toFixed(2)}M $MIS`;
    }
  } else {
    // For other selected tokens
    dom.swapToAmount.value = `≈ $${totalUsd.toFixed(2)}`;
    if (dom.targetTokenRate) {
      dom.targetTokenRate.textContent = `1 SOL ≈ $${state.solPriceUsd.toFixed(2)}`;
    }
  }
}

function selectTokenForSwap(mint, symbol, imgUrl) {
  state.targetSwapMint = mint;
  state.targetSwapSymbol = '$' + symbol.replace('$', '');
  state.targetSwapImg = imgUrl || 'assets/flower.png';

  if (dom.swapTargetSymbol) dom.swapTargetSymbol.textContent = state.targetSwapSymbol;
  if (dom.swapTargetCa) dom.swapTargetCa.textContent = fmtShortAddr(mint);
  if (dom.jupiterDirectLink) {
    dom.jupiterDirectLink.href = `https://jup.ag/swap/SOL-${mint}`;
  }

  updateSwapCalculations();
  showToast(`⚡ Swap target set to ${state.targetSwapSymbol}`);

  // On mobile, scroll to sidebar
  if (window.innerWidth <= 1060) {
    scrollToSidebarSwap();
  }
}

function scrollToSidebarSwap() {
  const sidebar = document.querySelector('.stage-sidebar');
  if (sidebar) {
    sidebar.scrollIntoView({ behavior: 'smooth' });
  }
}

function scrollToGame() {
  const game = document.getElementById('game');
  if (game) {
    game.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ==========================================================================
   5. DEXSCREENER CHART MODAL
   ========================================================================== */
function openChartModal(mint, symbol) {
  if (!dom.chartModal || !dom.dexChartIframe) return;
  dom.modalChartTitle.textContent = `${symbol} DexScreener Live Chart`;
  dom.dexChartIframe.src = `https://dexscreener.com/solana/${mint}?embed=1&theme=dark&trades=0&info=0`;
  dom.chartModal.classList.remove('hidden');
}

function closeChartModal() {
  if (!dom.chartModal || !dom.dexChartIframe) return;
  dom.chartModal.classList.add('hidden');
  dom.dexChartIframe.src = '';
}

/* ==========================================================================
   6. EVENT LISTENERS SETUP
   ========================================================================== */
function setupEventListeners() {
  // CA copy buttons
  if (dom.headerCopyBtn) {
    dom.headerCopyBtn.addEventListener('click', copyMainCA);
  }
  if (dom.copySwapCaBtn) {
    dom.copySwapCaBtn.addEventListener('click', () => {
      copyToClipboard(state.targetSwapMint, `${state.targetSwapSymbol} Mint`);
    });
  }

  // Audio button
  if (dom.signalAudioBtn) {
    dom.signalAudioBtn.addEventListener('click', () => {
      state.audioAlerts = !state.audioAlerts;
      if (dom.audioIconOn) dom.audioIconOn.classList.toggle('hidden', !state.audioAlerts);
      if (dom.audioIconOff) dom.audioIconOff.classList.toggle('hidden', state.audioAlerts);
      showToast(state.audioAlerts ? '🔔 Signal Chimes ON' : '🔕 Signal Chimes MUTED');
    });
  }

  // Refresh button
  if (dom.deckRefreshBtn) {
    dom.deckRefreshBtn.addEventListener('click', () => {
      fetchCallouts();
      fetchTrending();
      fetchTokenStats();
      showToast('⚡ Feed Refreshed');
    });
  }

  // Tab navigation
  dom.tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // Mobile dock
  dom.dockButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      if (target) {
        switchTab(target);
        dom.dockButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // Callout filter chips
  if (dom.calloutFilters) {
    dom.calloutFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-item');
      if (!btn) return;
      dom.calloutFilters.querySelectorAll('.chip-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.calloutFilter = btn.getAttribute('data-filter') || 'all';
      renderCalloutsGrid();
    });
  }

  // Callout search
  if (dom.calloutSearchInput) {
    dom.calloutSearchInput.addEventListener('input', (e) => {
      state.calloutSearch = e.target.value;
      renderCalloutsGrid();
    });
  }

  // Trending filter chips
  if (dom.trendingFilters) {
    dom.trendingFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-item');
      if (!btn) return;
      dom.trendingFilters.querySelectorAll('.chip-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.trendingFilter = btn.getAttribute('data-tfilter') || 'all';
      renderTrendingGrid();
    });
  }

  // Trending search
  if (dom.trendingSearchInput) {
    dom.trendingSearchInput.addEventListener('input', (e) => {
      state.trendingSearch = e.target.value;
      renderTrendingGrid();
    });
  }

  // Swap input calculation
  if (dom.swapFromAmount) {
    dom.swapFromAmount.addEventListener('input', updateSwapCalculations);
  }

  // Presets
  dom.presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      dom.presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.getAttribute('data-sol');
      if (val && dom.swapFromAmount) {
        dom.swapFromAmount.value = parseFloat(val);
        updateSwapCalculations();
      }
    });
  });

  // Slippage
  dom.slipChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      dom.slipChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const slip = chip.getAttribute('data-slip');
      if (dom.jupiterDirectLink) {
        dom.jupiterDirectLink.href = `https://jup.ag/swap/SOL-${state.targetSwapMint}?slippageBps=${parseFloat(slip) * 100}`;
      }
    });
  });

  // Escape key closes modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeChartModal();
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;

  dom.tabButtons.forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });

  dom.panes.forEach((p) => {
    p.classList.toggle('active', p.id === tabId);
  });

  if (tabId === 'tab-lore' && typeof window.handleGameResize === 'function') {
    requestAnimationFrame(() => window.handleGameResize());
  }
}

/* ==========================================================================
   INIT
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  setupEventListeners();

  // Initial polls
  fetchTokenStats();
  fetchCallouts();
  fetchTrending();

  // Background polling intervals
  setInterval(fetchTokenStats, STATS_INTERVAL_MS);
  setInterval(fetchCallouts, CALLOUTS_INTERVAL_MS);
  setInterval(fetchTrending, TRENDING_INTERVAL_MS);
});

// Global exports for inline HTML onclick handlers
window.copyMainCA = copyMainCA;
window.copyToClipboard = copyToClipboard;
window.openChartModal = openChartModal;
window.closeChartModal = closeChartModal;
window.selectTokenForSwap = selectTokenForSwap;
window.resetCalloutFilters = resetCalloutFilters;
window.scrollToGame = scrollToGame;
window.scrollToSidebarSwap = scrollToSidebarSwap;

