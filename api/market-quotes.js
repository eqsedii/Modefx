// GET /api/market-quotes
// Fetches real prices server-side (so all visitors share one cached result instead of each
// browser hammering third-party APIs) and returns whatever succeeded. A symbol missing from
// the response simply has no real quote right now — the site falls back to its simulated
// price for that one automatically. Nothing here ever breaks the site if an upstream fails.
//
// BTC/USD: CoinGecko (no key, refreshed often — short cache).
// EUR/USD, USD/KES, XAU/USD: Twelve Data (free key, genuinely real-time — refreshed every
//   few minutes, capped to respect Twelve Data's free daily quota regardless of traffic).
//   Falls back to the European Central Bank's daily reference rate (via Frankfurter, no key)
//   for EUR/USD and USD/KES if no Twelve Data key is configured yet.
let cryptoCache = { data: null, ts: 0 };
let fxCache = { data: null, ts: 0 };
const CRYPTO_TTL_MS = 20000;
// 3 symbols per Twelve Data call; free tier allows 800 credits/day. A 6-minute cache caps us
// at 240 calls/day (720 credits) even under constant traffic, with safety margin to spare.
const FX_TTL_MS = 360000;

async function getCrypto() {
  if (cryptoCache.data && Date.now() - cryptoCache.ts < CRYPTO_TTL_MS) return cryptoCache.data;
  const out = {};
  try {
    const headers = process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {};
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true", { headers });
    if (r.ok) {
      const j = await r.json();
      if (j?.bitcoin?.usd) out["BTC/USD"] = { price: j.bitcoin.usd, chg24h: j.bitcoin.usd_24h_change ?? null, source: "coingecko" };
    }
  } catch (_) {}
  cryptoCache = { data: out, ts: Date.now() };
  return out;
}

async function getFxViaTwelveData() {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`https://api.twelvedata.com/price?symbol=EUR/USD,USD/KES,XAU/USD&apikey=${key}`);
    if (!r.ok) return null;
    const j = await r.json();
    const out = {};
    for (const sym of ["EUR/USD", "USD/KES", "XAU/USD"]) {
      const p = j?.[sym]?.price ?? (Object.keys(j).length === 1 ? j.price : null); // single-symbol shape fallback
      if (p && !isNaN(Number(p))) out[sym] = { price: Number(p), source: "twelvedata" };
    }
    return Object.keys(out).length ? out : null;
  } catch (_) { return null; }
}

async function getFxViaEcb() {
  const out = {};
  try {
    const r = await fetch("https://api.frankfurter.dev/v2/rate/EUR/USD");
    if (r.ok) { const j = await r.json(); if (j?.rates?.USD) out["EUR/USD"] = { price: j.rates.USD, source: "ecb-frankfurter", daily: true }; }
  } catch (_) {}
  try {
    const r = await fetch("https://api.frankfurter.dev/v2/rate/USD/KES");
    if (r.ok) { const j = await r.json(); if (j?.rates?.KES) out["USD/KES"] = { price: j.rates.KES, source: "ecb-frankfurter", daily: true }; }
  } catch (_) {}
  return out;
}

async function getFx() {
  if (fxCache.data && Date.now() - fxCache.ts < FX_TTL_MS) return fxCache.data;
  let out = await getFxViaTwelveData();
  if (!out) out = await getFxViaEcb(); // no key configured yet, or the call failed — still real, just daily
  fxCache = { data: out, ts: Date.now() };
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const [crypto, fx] = await Promise.all([getCrypto(), getFx()]);
  return res.status(200).json({ ...crypto, ...fx, asOf: new Date().toISOString() });
}
