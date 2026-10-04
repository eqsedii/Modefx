// Shared simulated-price engine. Every page that shows a price or a chart uses this file,
// so a symbol always shows the same "current" price everywhere on the site at any moment.
// These are NOT real market prices — see the "Demo/Simulated" labels throughout the site.
window.MFXMarket = (() => {
  // Each symbol's price is three sine waves added together: a slow multi-hour "trend",
  // a medium "swing", and a fast "wiggle" — so 1-minute and 1-hour charts both look sensible,
  // instead of one fast wave that's fine up close but flat/meaningless zoomed out.
  const SYMS = [
    { sym: "EUR/USD", nm: "Euro / US dollar", cls: "Forex", base: 1.0842, amp: 0.006, dp: 4,
      w: [{ p: 8 * 3600000, ph: 0.3 }, { p: 34 * 60000, ph: 1.9 }, { p: 4 * 60000, ph: 4.1 }] },
    { sym: "USD/KES", nm: "US dollar / Kenyan shilling", cls: "Forex", base: 129.10, amp: 0.004, dp: 2,
      w: [{ p: 10 * 3600000, ph: 1.1 }, { p: 40 * 60000, ph: 0.4 }, { p: 5 * 60000, ph: 5.2 }] },
    { sym: "BTC/USD", nm: "Bitcoin", cls: "Crypto", base: 64210, amp: 0.03, dp: 0,
      w: [{ p: 5 * 3600000, ph: 2.0 }, { p: 22 * 60000, ph: 3.3 }, { p: 3 * 60000, ph: 0.8 }] },
    { sym: "XAU/USD", nm: "Gold", cls: "Commodity", base: 2352.40, amp: 0.012, dp: 2,
      w: [{ p: 9 * 3600000, ph: 2.7 }, { p: 38 * 60000, ph: 5.0 }, { p: 4.5 * 60000, ph: 1.4 }] },
    { sym: "SCOM", nm: "Safaricom (NSE)", cls: "Stock", base: 17.85, amp: 0.015, dp: 2,
      w: [{ p: 7 * 3600000, ph: 0.8 }, { p: 30 * 60000, ph: 2.2 }, { p: 3.5 * 60000, ph: 3.6 }] },
    { sym: "US100", nm: "Nasdaq 100 index", cls: "Index", base: 18410, amp: 0.01, dp: 0,
      w: [{ p: 6 * 3600000, ph: 1.7 }, { p: 26 * 60000, ph: 4.4 }, { p: 3 * 60000, ph: 0.2 }] }
  ];

  // Real quotes (fetched from our own server, which fetches them from CoinGecko/ECB) are
  // layered on top of the simulated formula below. A symbol with no real quote yet, or
  // whose quote has gone stale, simply uses the simulated price — nothing breaks.
  let realQuotes = {}, realFetchedAt = 0;
  const REAL_STALE_MS = 90000;
  async function refreshRealQuotes(apiBase) {
    try {
      const r = await fetch((apiBase || "") + "/api/market-quotes");
      if (!r.ok) return;
      const j = await r.json();
      realQuotes = j; realFetchedAt = Date.now();
      window.dispatchEvent(new CustomEvent("mfx:real-quotes"));
    } catch (_) { /* keep using whatever we had, or fall back to simulated */ }
  }
  function startRealQuotes(apiBase, intervalMs = 20000) {
    refreshRealQuotes(apiBase);
    setInterval(() => refreshRealQuotes(apiBase), intervalMs);
  }
  function realQuoteFor(sym) {
    if (Date.now() - realFetchedAt > REAL_STALE_MS) return null;
    const q = realQuotes[sym];
    return q ? q.price : null;
  }
  function isReal(sym) { return realQuoteFor(sym) != null; }

  function simulatedPriceAt(s, t) {
    const [macro, swing, micro] = s.w;
    const v = 0.55 * Math.sin((2 * Math.PI * t) / macro.p + macro.ph)
            + 0.30 * Math.sin((2 * Math.PI * t) / swing.p + swing.ph)
            + 0.15 * Math.sin((2 * Math.PI * t) / micro.p + micro.ph);
    return s.base * (1 + s.amp * v);
  }
  // When a real quote is live for this symbol, shift the ENTIRE simulated curve (past and
  // present) by a constant amount so it lines up exactly with the real price right now.
  // That keeps the simulated shape/volatility for chart texture, but removes any jump or
  // mismatch between the chart, the ticker, and the daily % change — they all agree.
  function priceAt(s, t) {
    const real = realQuoteFor(s.sym);
    if (real == null) return simulatedPriceAt(s, t);
    const offset = real - simulatedPriceAt(s, Date.now());
    return simulatedPriceAt(s, t) + offset;
  }
  const priceOf = (s) => priceAt(s, Date.now());
  const fmtPrice = (s, p) => p.toLocaleString("en-KE", { minimumFractionDigits: s.dp, maximumFractionDigits: s.dp });
  const bySym = (sym) => SYMS.find((x) => x.sym === sym);

  // Deterministic "random" (same wick shape for everyone looking at the same candle).
  function seededRandom(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }

  // Builds `count` candles of length `periodMs`, ending at the current (still-forming) candle.
  // Works the same way regardless of timeframe, by sampling the smooth price curve several
  // times within each candle to get open/high/low/close, then adding a small seeded wick.
  function candlesFor(s, periodMs, count) {
    const bucketNow = Math.floor(Date.now() / periodMs) * periodMs;
    const bars = [];
    for (let i = count - 1; i >= 0; i--) {
      const tStart = bucketNow - i * periodMs;
      const samples = 6;
      let open, close, hi = -Infinity, lo = Infinity;
      for (let k = 0; k < samples; k++) {
        const t = tStart + (k / (samples - 1)) * periodMs * 0.999;
        const p = priceAt(s, t);
        if (k === 0) open = p;
        close = p; hi = Math.max(hi, p); lo = Math.min(lo, p);
      }
      const rnd = seededRandom(s.sym + ":" + periodMs + ":" + tStart);
      const wick = s.base * s.amp * 0.08;
      bars.push({ time: Math.floor(tStart / 1000), open, high: hi + rnd() * wick, low: lo - rnd() * wick, close });
    }
    return bars;
  }

  function sma(bars, period) {
    const out = [];
    for (let i = period - 1; i < bars.length; i++) {
      let sum = 0; for (let j = i - period + 1; j <= i; j++) sum += bars[j].close;
      out.push({ time: bars[i].time, value: sum / period });
    }
    return out;
  }

  // Plain stats for the day: % change vs 24h ago, and how wide today's range has been.
  // Purely descriptive — no invented causes or news, since none of this is real data.
  function dailyStats(s) {
    const now = priceOf(s);
    const q = isReal(s.sym) ? realQuotes[s.sym] : null;
    const dayAgo = priceAt(s, Date.now() - 24 * 3600000);
    const chgPct = (q && q.chg24h != null) ? q.chg24h : ((now - dayAgo) / dayAgo) * 100;
    const dayBars = candlesFor(s, 3600000, 24);
    const hi = Math.max(...dayBars.map((b) => b.high)), lo = Math.min(...dayBars.map((b) => b.low));
    const rangePct = ((hi - lo) / s.base) * 100;
    return { now, chgPct, hi, lo, rangePct };
  }

  const api = { SYMS, priceAt, priceOf, fmtPrice, bySym, seededRandom, candlesFor, sma, dailyStats, startRealQuotes, isReal };
  // Starts itself — every page that loads this file gets real quotes automatically.
  startRealQuotes((window.MODEFX_CONFIG || {}).apiBase);
  return api;
})();
