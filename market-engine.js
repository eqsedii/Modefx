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

  function priceAt(s, t) {
    const [macro, swing, micro] = s.w;
    const v = 0.55 * Math.sin((2 * Math.PI * t) / macro.p + macro.ph)
            + 0.30 * Math.sin((2 * Math.PI * t) / swing.p + swing.ph)
            + 0.15 * Math.sin((2 * Math.PI * t) / micro.p + micro.ph);
    return s.base * (1 + s.amp * v);
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

  return { SYMS, priceAt, priceOf, fmtPrice, bySym, seededRandom, candlesFor, sma };
})();
