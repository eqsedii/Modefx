// GET /api/golden-signals   (header: Authorization: Bearer <supabase access token>)
// Golden-only. The tier is checked HERE, on the server, from the entitlements table, so editing the
// website code cannot unlock it. Indicators are computed from REAL candles:
//   BTC/USD  -> CoinGecko OHLC (no key needed)
//   EUR/USD, USD/KES, XAU/USD -> Twelve Data hourly candles (needs TWELVEDATA_API_KEY)
// A symbol whose data can't be fetched is left out of the response, never faked.
// Optional: set ANTHROPIC_API_KEY to add a short written commentary from Claude (numbers in, text out).
// Without it, the commentary is generated from fixed templates. The `commentary` field says which.
import { admin } from "./_db.js";

const TTL_MS = 60 * 60 * 1000; // 1h cache keeps Twelve Data inside the free 800 credits/day alongside market-quotes.js
let cache = { data: null, ts: 0 };

const ema = (v, n) => { const k = 2 / (n + 1); let e = v[0]; const out = [e]; for (let i = 1; i < v.length; i++) { e = v[i] * k + e * (1 - k); out.push(e); } return out; };
function rsi(c, n = 14) {
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; d >= 0 ? (g += d) : (l -= d); }
  g /= n; l /= n;
  for (let i = n + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}
function atr(b, n = 14) {
  const tr = b.map((x, i) => i === 0 ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - b[i - 1].c), Math.abs(x.l - b[i - 1].c)));
  let a = tr.slice(1, n + 1).reduce((s, x) => s + x, 0) / n;
  for (let i = n + 1; i < tr.length; i++) a = (a * (n - 1) + tr[i]) / n;
  return a;
}

function analyse(sym, dp, bars, source) {
  const c = bars.map((b) => b.c), last = c[c.length - 1];
  const e9 = ema(c, 9).at(-1), e21 = ema(c, 21).at(-1), e50 = ema(c, 50).at(-1);
  const r = rsi(c), a = atr(bars);
  const mom = ((last - c[c.length - 11]) / c[c.length - 11]) * 100;
  const win = bars.slice(-24), hi = Math.max(...win.map((b) => b.h)), lo = Math.min(...win.map((b) => b.l));
  const pos = hi === lo ? 0.5 : (last - lo) / (hi - lo);
  const reasons = []; let score = 0;
  if (e9 > e21) { score += 1; reasons.push("The fast average (9) is above the slower one (21): short-term trend is up."); }
  else { score -= 1; reasons.push("The fast average (9) is below the slower one (21): short-term trend is down."); }
  if (last > e50) { score += 1; reasons.push("Price is above its 50-hour average, which favours buyers."); }
  else { score -= 1; reasons.push("Price is below its 50-hour average, which favours sellers."); }
  if (r > 70) { score -= 0.5; reasons.push(`RSI is ${r.toFixed(0)}: stretched upward, so a pullback is more likely.`); }
  else if (r < 30) { score += 0.5; reasons.push(`RSI is ${r.toFixed(0)}: stretched downward, so a bounce is more likely.`); }
  else if (r >= 50) { score += 0.5; reasons.push(`RSI is ${r.toFixed(0)}: momentum leans up without being stretched.`); }
  else { score -= 0.5; reasons.push(`RSI is ${r.toFixed(0)}: momentum leans down without being stretched.`); }
  if (mom > 0) { score += 0.5; reasons.push(`Price is up ${mom.toFixed(2)}% over the last 10 hours.`); }
  else { score -= 0.5; reasons.push(`Price is down ${Math.abs(mom).toFixed(2)}% over the last 10 hours.`); }
  const bias = score >= 1.5 ? "bullish" : score <= -1.5 ? "bearish" : "neutral";
  // "strength" is how many of the four checks agree, scaled 0-100. It is NOT a probability of winning.
  const strength = Math.round(Math.min(100, (Math.abs(score) / 3) * 100));
  const dir = bias === "bearish" ? -1 : 1;
  const lvl = (m) => Number((last + dir * m * a).toFixed(dp));
  return {
    sym, source, price: Number(last.toFixed(dp)), bias, strength,
    rsi: Number(r.toFixed(1)), atr: Number(a.toFixed(dp + 1)), rangePos: Number(pos.toFixed(2)),
    ema: { fast: Number(e9.toFixed(dp)), slow: Number(e21.toFixed(dp)), trend: Number(e50.toFixed(dp)) },
    // A practice plan, sized by volatility: stop 1.5 ATR away, targets at 1x and 2x that distance.
    plan: bias === "neutral" ? null : { side: bias === "bullish" ? "buy" : "sell", stop: lvl(-1.5), target1: lvl(1.5), target2: lvl(3) },
    reasons, spark: c.slice(-48).map((x) => Number(x.toFixed(dp)))
  };
}

async function gecko() {
  try {
    const headers = process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {};
    const r = await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=7", { headers });
    if (!r.ok) return null;
    const j = await r.json(); // [ms, o, h, l, c] every 4h for 7 days
    if (!Array.isArray(j) || j.length < 60) return null;
    return j.map((x) => ({ h: x[2], l: x[3], c: x[4] }));
  } catch (_) { return null; }
}
async function twelve(sym) {
  const key = process.env.TWELVEDATA_API_KEY; if (!key) return null;
  try {
    const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=1h&outputsize=120&apikey=${key}`);
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j.values) || j.values.length < 60) return null;
    return j.values.slice().reverse().map((v) => ({ h: +v.high, l: +v.low, c: +v.close }));
  } catch (_) { return null; }
}

async function commentary(items) {
  const fallback = Object.fromEntries(items.map((i) => [i.sym, i.bias === "neutral"
    ? "The indicators disagree, so there is no clear lean. Waiting is a valid position."
    : `The indicators lean ${i.bias}. Practise this setup with the stop and targets shown, and size the trade so the stop risks only a small slice of your balance.`]));
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { by: "template", text: fallback };
  try {
    const brief = items.map((i) => ({ sym: i.sym, bias: i.bias, rsi: i.rsi, ema: i.ema, price: i.price }));
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-5-5", max_tokens: 700,
        system: "You write short educational market notes for beginner traders around the world. For each symbol write at most 2 plain sentences explaining what the indicators show and one thing to watch. Never promise outcomes, never say 'will', never give personal advice. Reply with ONLY a JSON object mapping each symbol to its note.",
        messages: [{ role: "user", content: JSON.stringify(brief) }]
      })
    });
    if (!r.ok) return { by: "template", text: fallback };
    const j = await r.json();
    const t = (j.content || []).map((x) => x.text || "").join("").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(t);
    return { by: "claude", text: { ...fallback, ...parsed } };
  } catch (_) { return { by: "template", text: fallback }; }
}

async function build() {
  if (cache.data && Date.now() - cache.ts < TTL_MS) return cache.data;
  const jobs = [
    ["BTC/USD", 0, gecko(), "coingecko (4h candles)"],
    ["EUR/USD", 4, twelve("EUR/USD"), "twelvedata (1h candles)"],
    ["USD/KES", 2, twelve("USD/KES"), "twelvedata (1h candles)"],
    ["XAU/USD", 2, twelve("XAU/USD"), "twelvedata (1h candles)"]
  ];
  const items = [];
  for (const [sym, dp, p, src] of jobs) { const bars = await p; if (bars) items.push(analyse(sym, dp, bars, src)); }
  const note = await commentary(items);
  items.forEach((i) => { i.note = note.text[i.sym]; });
  const data = { asOf: new Date().toISOString(), commentary: note.by, signals: items };
  cache = { data, ts: Date.now() };
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  const { data: auth, error } = await admin.auth.getUser(token);
  if (error || !auth?.user) return res.status(401).json({ error: "Your session has expired. Sign in again." });
  const { data: ent } = await admin.from("entitlements").select("expires_at").eq("user_id", auth.user.id).eq("tier", "golden").maybeSingle();
  if (!ent || (ent.expires_at && new Date(ent.expires_at) <= new Date())) return res.status(403).json({ error: "Golden is required for market predictions." });

  try { return res.status(200).json(await build()); }
  catch (_) { return res.status(502).json({ error: "Market data is unavailable right now. Try again in a few minutes." }); }
}
