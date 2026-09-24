(() => {
  "use strict";
  const gate = document.getElementById("arena-gate");
  if (!gate) return; // this page has no arena section

  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const body = $("#arena-body");
  const fmtKES = (n) => "KSh " + Number(n).toLocaleString("en-KE", { maximumFractionDigits: 2 });
  const msg = (el, text, kind = "") => { el.textContent = text; el.className = "msg " + kind; };

  // Simulated instruments: a smooth, deterministic wave so everyone sees the same "live" price
  // at any given moment. This is a practice sandbox, not real market data.
  const SYMS = [
    { sym: "EUR/USD", nm: "Euro / US dollar", cls: "Forex", base: 1.0842, amp: 0.006, period: 90000, phase: 0.3, dp: 4 },
    { sym: "USD/KES", nm: "US dollar / Kenyan shilling", cls: "Forex", base: 129.10, amp: 0.004, period: 140000, phase: 1.1, dp: 2 },
    { sym: "BTC/USD", nm: "Bitcoin", cls: "Crypto", base: 64210, amp: 0.03, period: 60000, phase: 2.0, dp: 0 },
    { sym: "XAU/USD", nm: "Gold", cls: "Commodity", base: 2352.40, amp: 0.012, period: 110000, phase: 2.7, dp: 2 },
    { sym: "SCOM", nm: "Safaricom (NSE)", cls: "Stock", base: 17.85, amp: 0.015, period: 130000, phase: 0.8, dp: 2 },
    { sym: "US100", nm: "Nasdaq 100 index", cls: "Index", base: 18410, amp: 0.01, period: 100000, phase: 1.7, dp: 0 }
  ];
  const priceOf = (s) => s.base * (1 + s.amp * Math.sin((2 * Math.PI * Date.now()) / s.period + s.phase));
  const priceAt = (s, t) => s.base * (1 + s.amp * Math.sin((2 * Math.PI * t) / s.period + s.phase));
  const fmtPrice = (s, p) => p.toLocaleString("en-KE", { minimumFractionDigits: s.dp, maximumFractionDigits: s.dp });

  // A small seeded random generator so the candle wicks look natural but are identical
  // for everyone looking at the same moment — this is a practice sandbox, not live data.
  function seededRandom(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }
  const CANDLE_MS = 60000, CANDLE_COUNT = 60;
  function candlesFor(s) {
    const bucketNow = Math.floor(Date.now() / CANDLE_MS) * CANDLE_MS;
    const bars = []; let prevClose = null;
    for (let i = CANDLE_COUNT - 1; i >= 0; i--) {
      const t = bucketNow - i * CANDLE_MS;
      const rnd = seededRandom(s.sym + ":" + t);
      const close = priceAt(s, t);
      const open = prevClose == null ? close * (1 - (rnd() - 0.5) * 0.002) : prevClose;
      const wick = s.base * s.amp * 0.25;
      const high = Math.max(open, close) + rnd() * wick;
      const low = Math.min(open, close) - rnd() * wick;
      bars.push({ time: Math.floor(t / 1000), open, high, low, close });
      prevClose = close;
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

  const charts = {}; // symbol -> { chart, candleSeries, maSeries, lastBar }
  function ensureChart(sym) {
    if (charts[sym] || typeof LightweightCharts === "undefined") return;
    const s = SYMS.find((x) => x.sym === sym);
    const el = document.getElementById(safeId(sym));
    if (!s || !el) return;
    const chart = LightweightCharts.createChart(el, {
      width: el.clientWidth, height: 220,
      layout: { background: { color: "transparent" }, textColor: "#a6b3d0", fontFamily: "Figtree, sans-serif" },
      grid: { vertLines: { color: "rgba(120,170,255,0.08)" }, horzLines: { color: "rgba(120,170,255,0.08)" } },
      rightPriceScale: { borderColor: "rgba(120,170,255,0.18)" },
      timeScale: { borderColor: "rgba(120,170,255,0.18)", timeVisible: true, secondsVisible: false }
    });
    const candleSeries = chart.addCandlestickSeries({ upColor: "#3ddc97", downColor: "#ff7a88", borderVisible: false, wickUpColor: "#3ddc97", wickDownColor: "#ff7a88" });
    const bars = candlesFor(s);
    candleSeries.setData(bars);
    const maSeries = chart.addLineSeries({ color: "#22d3ff", lineWidth: 2 });
    maSeries.setData(sma(bars, 10));
    chart.timeScale().fitContent();
    charts[sym] = { chart, candleSeries, maSeries, bars: bars.slice(), lastBar: bars[bars.length - 1] };
    window.addEventListener("resize", () => chart.applyOptions({ width: el.clientWidth }));
  }
  function tickChart(sym) {
    const c = charts[sym]; if (!c) return;
    const s = SYMS.find((x) => x.sym === sym);
    const bucket = Math.floor(Date.now() / CANDLE_MS);
    const price = priceOf(s);
    if (c.lastBar.time !== bucket) {
      c.lastBar = { time: bucket, open: c.lastBar.close, high: price, low: price, close: price };
      c.bars.push(c.lastBar);
    } else {
      c.lastBar.high = Math.max(c.lastBar.high, price);
      c.lastBar.low = Math.min(c.lastBar.low, price);
      c.lastBar.close = price;
    }
    c.candleSeries.update(c.lastBar);
    const ma = sma(c.bars, 10);
    if (ma.length) c.maSeries.update(ma[ma.length - 1]);
  }

  let sb = null, session = null, tiers = null, trades = [];

  async function getSB() {
    if (sb) return sb;
    if (!C.supabaseUrl || !C.supabaseAnonKey) return null;
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
    return sb;
  }

  const isUnlocked = (tierId) => {
    const e = (tiers || []).find((x) => x.tier === tierId);
    return !!e && (!e.expires_at || new Date(e.expires_at) > new Date());
  };

  const safeId = (sym) => "chart-" + sym.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  function renderSymbols() {
    $("#arena-symbols").innerHTML = SYMS.map((s) => {
      const p = priceOf(s);
      return `<li class="arena-row" data-sym="${s.sym}">
        <div class="arena-row-info"><strong>${s.sym}</strong><span>${s.nm}</span></div>
        <div class="arena-row-price" data-price>${fmtPrice(s, p)}</div>
        <div class="arena-row-actions">
          <button type="button" class="btn btn-ghost" data-chart="${s.sym}">Chart</button>
          <button type="button" class="btn btn-ghost" data-open="${s.sym}" data-side="buy">Buy</button>
          <button type="button" class="btn btn-ghost" data-open="${s.sym}" data-side="sell">Sell</button>
        </div>
        <div class="arena-chart" id="${safeId(s.sym)}" hidden></div>
      </li>`;
    }).join("");
  }
  function tickPrices() {
    SYMS.forEach((s) => {
      const el = document.querySelector(`.arena-row[data-sym="${CSS.escape(s.sym)}"] [data-price]`);
      if (el) el.textContent = fmtPrice(s, priceOf(s));
      if (charts[s.sym]) tickChart(s.sym);
    });
    // also refresh "now" price shown against each open position
    $$(".pos-now").forEach((el) => {
      const s = SYMS.find((x) => x.sym === el.dataset.sym);
      if (s) el.textContent = fmtPrice(s, priceOf(s));
    });
  }
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function renderTrades() {
    const open = trades.filter((t) => t.status === "open");
    const closed = trades.filter((t) => t.status === "closed");

    $("#positions-empty").hidden = open.length > 0;
    $("#positions-list").innerHTML = open.map((t) => {
      const s = SYMS.find((x) => x.sym === t.symbol);
      const now = s ? priceOf(s) : t.entry_price;
      const unreal = (now - t.entry_price) * t.qty * (t.side === "buy" ? 1 : -1);
      const cls = unreal >= 0 ? "ok" : "err";
      return `<tr>
        <td>${t.symbol}</td><td>${t.side}</td><td>${t.qty}</td>
        <td>${s ? fmtPrice(s, t.entry_price) : t.entry_price}</td>
        <td class="pos-now" data-sym="${t.symbol}">${s ? fmtPrice(s, now) : now}</td>
        <td class="${cls}">${unreal >= 0 ? "+" : ""}${unreal.toFixed(2)}</td>
        <td><button type="button" class="btn btn-ghost" data-close="${t.id}">Close</button></td>
      </tr>`;
    }).join("");

    $("#journal-empty").hidden = closed.length > 0;
    $("#journal-list").innerHTML = closed.map((t) => {
      const s = SYMS.find((x) => x.sym === t.symbol);
      const cls = t.pnl >= 0 ? "ok" : "err";
      const notes = [t.reason_in && `In: ${t.reason_in}`, t.reason_out && `Out: ${t.reason_out}`, t.note].filter(Boolean).join(" · ");
      return `<tr>
        <td>${t.symbol}</td><td>${t.side}</td><td>${t.qty}</td>
        <td>${s ? fmtPrice(s, t.entry_price) : t.entry_price}</td>
        <td>${s ? fmtPrice(s, t.exit_price) : t.exit_price}</td>
        <td class="${cls}">${t.pnl >= 0 ? "+" : ""}${Number(t.pnl).toFixed(2)}</td>
        <td class="fine">${notes || "—"}</td>
      </tr>`;
    }).join("");
  }

  async function loadTrades() {
    const { data } = await sb.from("trades").select("*").order("opened_at", { ascending: false });
    trades = data || [];
    renderTrades();
  }
  async function loadBalance() {
    const { data, error } = await sb.rpc("ensure_trading_account");
    if (!error) $("#arena-balance").textContent = fmtKES(data);
  }

  async function refreshGate() {
    if (!session) {
      gate.hidden = false; body.hidden = true;
      gate.innerHTML = `Sign in and get Starter to open the trading arena. <a class="link" href="account.html?mode=signup">Create an account</a>`;
      return;
    }
    try {
      const { data } = await sb.from("entitlements").select("tier, expires_at");
      tiers = data || [];
    } catch (_) { tiers = []; }

    if (!isUnlocked("starter")) {
      gate.hidden = false; body.hidden = true;
      const everHadStarter = (tiers || []).some((x) => x.tier === "starter");
      gate.innerHTML = everHadStarter
        ? `Your Starter access has locked. <a class="link" href="plans.html">Get Growth to unlock it again</a>, forever.`
        : `Get Starter to open the trading arena. <a class="link" href="plans.html">View plans</a>`;
      return;
    }

    gate.hidden = true; body.hidden = false;
    renderSymbols();
    await Promise.all([loadBalance(), loadTrades()]);
  }

  // ---- Open trade dialog ----
  const openDlg = $("#open-dialog"), openMsg = $("#open-msg"), openSubmit = $("#open-submit");
  let openSym = null, openSide = null;

  document.addEventListener("click", (e) => {
    const ch = e.target.closest("[data-chart]");
    if (ch) {
      const el = document.getElementById(safeId(ch.dataset.chart));
      if (el) { el.hidden = !el.hidden; if (!el.hidden) { ensureChart(ch.dataset.chart); requestAnimationFrame(() => charts[ch.dataset.chart]?.chart.applyOptions({ width: el.clientWidth })); } }
    }
    const b = e.target.closest("[data-open]");
    if (b) {
      openSym = SYMS.find((s) => s.sym === b.dataset.open);
      openSide = b.dataset.side;
      $("#open-title").textContent = `${openSide === "buy" ? "Buy" : "Sell"} ${openSym.sym}`;
      $("#open-price").textContent = `Entry price: ${fmtPrice(openSym, priceOf(openSym))} (simulated)`;
      $("#open-qty").value = "1"; $("#open-reason").value = ""; $("#open-strategy").value = ""; $("#open-risk").value = "Medium";
      msg(openMsg, ""); openSubmit.disabled = false; openSubmit.textContent = "Place simulated trade";
      openDlg.showModal();
    }
    const c = e.target.closest("[data-close]");
    if (c) startClose(c.dataset.close);
  });

  $("#open-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const qty = Number($("#open-qty").value);
    const reason = $("#open-reason").value.trim();
    if (!(qty > 0)) return msg(openMsg, "Enter a quantity greater than 0.");
    if (!reason) return msg(openMsg, "Say briefly why you're entering this trade.");
    openSubmit.disabled = true; msg(openMsg, "");
    const { error } = await sb.rpc("open_trade", {
      p_symbol: openSym.sym, p_side: openSide, p_qty: qty, p_entry_price: priceOf(openSym),
      p_reason_in: reason, p_strategy: $("#open-strategy").value.trim() || null, p_risk_level: $("#open-risk").value
    });
    if (error) {
      const m = (error.message || "").includes("starter_locked")
        ? "Starter has locked. Get Growth to unlock the arena again."
        : (error.message || "").includes("journal_full")
          ? "You've reached Starter's 20-trade limit. Get Growth for unlimited trades."
          : "Couldn't place the trade. Try again.";
      msg(openMsg, m); openSubmit.disabled = false; return;
    }
    openDlg.close();
    await Promise.all([loadTrades(), loadBalance()]);
  });

  // ---- Close trade dialog ----
  const closeDlg = $("#close-dialog"), closeMsg = $("#close-msg"), closeSubmit = $("#close-submit");
  let closingId = null, closingSym = null;

  function startClose(id) {
    const t = trades.find((x) => x.id === id);
    if (!t) return;
    closingId = id; closingSym = SYMS.find((s) => s.sym === t.symbol);
    const now = closingSym ? priceOf(closingSym) : t.entry_price;
    const unreal = (now - t.entry_price) * t.qty * (t.side === "buy" ? 1 : -1);
    $("#close-title").textContent = `Close ${t.side} ${t.symbol}`;
    $("#close-price").textContent = `Exit price: ${closingSym ? fmtPrice(closingSym, now) : now} (simulated) — estimated P/L ${unreal >= 0 ? "+" : ""}${unreal.toFixed(2)}`;
    $("#close-reason").value = ""; $("#close-note").value = "";
    msg(closeMsg, ""); closeSubmit.disabled = false; closeSubmit.textContent = "Close trade";
    closeDlg.showModal();
  }

  $("#close-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const reason = $("#close-reason").value.trim();
    if (!reason) return msg(closeMsg, "Say briefly why you're exiting now.");
    closeSubmit.disabled = true; msg(closeMsg, "");
    const exitPrice = closingSym ? priceOf(closingSym) : trades.find((t) => t.id === closingId).entry_price;
    const { error } = await sb.rpc("close_trade", {
      p_trade_id: closingId, p_exit_price: exitPrice, p_reason_out: reason, p_note: $("#close-note").value.trim() || null
    });
    if (error) { msg(closeMsg, "Couldn't close the trade. Try again."); closeSubmit.disabled = false; return; }
    closeDlg.close();
    await Promise.all([loadTrades(), loadBalance()]);
  });

  setInterval(() => { if (!body.hidden) tickPrices(); }, 4000);

  (async () => {
    const client = await getSB();
    if (!client) { gate.textContent = "Sign-in isn't connected yet. Add your Supabase keys in config.js."; return; }
    client.auth.onAuthStateChange((_event, s) => { session = s; refreshGate(); });
    const { data } = await client.auth.getSession();
    session = data.session;
    refreshGate();
  })();
})();
