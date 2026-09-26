(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const M = window.MFXMarket;
  const $ = (s, r = document) => r.querySelector(s);
  const msg = (el, text, kind = "") => { el.textContent = text; el.className = "msg " + kind; };

  const params = new URLSearchParams(location.search);
  const symbol = params.get("symbol") || "";
  const s = M.bySym(symbol);
  if (!s) {
    document.body.innerHTML = `<div class="page"><p>Unknown instrument. <a class="link" href="markets.html">Back to Markets</a></p></div>`;
    return;
  }

  $("#ins-symbol").textContent = s.sym;
  $("#ins-name").textContent = s.nm;
  document.title = `${s.sym} | Modefx`;

  const TF = {
    "1m": { periodMs: 60000, count: 90 },
    "5m": { periodMs: 300000, count: 90 },
    "15m": { periodMs: 900000, count: 90 },
    "1H": { periodMs: 3600000, count: 90 }
  };
  let tf = "1m";

  // ---------------- Loader (matches app.js's on every button click) ----------------
  const Loader = (() => {
    const el = $("#loader"), v = $("video", el);
    let pending = 0, until = 0, timer;
    const show = () => { el.classList.add("on"); try { v.currentTime = 0; v.play().catch(() => {}); } catch (_) {} };
    const hide = () => el.classList.remove("on");
    const check = () => {
      clearTimeout(timer);
      if (pending > 0) return;
      const left = until - Date.now();
      if (left > 0) { timer = setTimeout(check, left); return; }
      hide();
    };
    const begin = (min) => { if (!el.classList.contains("on")) { until = 0; show(); } until = Math.max(until, Date.now() + min); };
    return { flash(min = 1200) { begin(min); check(); }, run(p, min = 1200) { pending++; begin(min); return Promise.resolve(p).finally(() => { pending--; check(); }); } };
  })();
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button, .btn");
    if (!b || b.disabled || b.closest("#loader") || b.hasAttribute("data-async") || b.hasAttribute("data-quiet")) return;
    Loader.flash();
  });

  // ---------------- Price header ----------------
  function updateHeader() {
    const now = M.priceOf(s);
    const dayAgo = M.priceAt(s, Date.now() - 24 * 3600000);
    const chg = ((now - dayAgo) / dayAgo) * 100;
    $("#ins-price").textContent = M.fmtPrice(s, now);
    $("#ins-price").className = chg >= 0 ? "ok" : "err";
    $("#ins-change").textContent = `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}% today`;
    const dayBars = M.candlesFor(s, 3600000, 24);
    const hi = Math.max(...dayBars.map((b) => b.high)), lo = Math.min(...dayBars.map((b) => b.low));
    $("#ins-high").textContent = M.fmtPrice(s, hi);
    $("#ins-low").textContent = M.fmtPrice(s, lo);
    $("#ins-spread").textContent = M.fmtPrice(s, s.base * s.amp * 0.02);
  }

  // ---------------- Chart ----------------
  let chart, candleSeries, maSeries, bars = [];
  function buildChart() {
    const el = $("#instrument-chart");
    el.innerHTML = "";
    if (typeof LightweightCharts === "undefined") { el.innerHTML = `<p class="fine" style="padding:1rem">Chart library didn't load — check your connection.</p>`; return; }
    chart = LightweightCharts.createChart(el, {
      width: el.clientWidth, height: el.clientHeight,
      layout: { background: { color: "transparent" }, textColor: "#a6b3d0", fontFamily: "Figtree, sans-serif" },
      grid: { vertLines: { color: "rgba(120,170,255,0.08)" }, horzLines: { color: "rgba(120,170,255,0.08)" } },
      rightPriceScale: { borderColor: "rgba(120,170,255,0.18)" },
      timeScale: { borderColor: "rgba(120,170,255,0.18)", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 }
    });
    candleSeries = chart.addCandlestickSeries({ upColor: "#3ddc97", downColor: "#ff7a88", borderVisible: false, wickUpColor: "#3ddc97", wickDownColor: "#ff7a88" });
    maSeries = chart.addLineSeries({ color: "#22d3ff", lineWidth: 2 });
    loadBars();
    window.addEventListener("resize", () => chart && chart.applyOptions({ width: el.clientWidth, height: el.clientHeight }));
  }
  function loadBars() {
    const { periodMs, count } = TF[tf];
    bars = M.candlesFor(s, periodMs, count);
    candleSeries.setData(bars);
    maSeries.setData(M.sma(bars, 10));
    chart.timeScale().fitContent();
  }
  function tickChart() {
    if (!chart) return;
    const { periodMs } = TF[tf];
    const bucket = Math.floor(Date.now() / periodMs);
    const price = M.priceOf(s);
    const last = bars[bars.length - 1];
    if (!last || last.time !== bucket) {
      const nb = { time: bucket, open: last ? last.close : price, high: price, low: price, close: price };
      bars.push(nb);
    } else {
      last.high = Math.max(last.high, price); last.low = Math.min(last.low, price); last.close = price;
    }
    candleSeries.update(bars[bars.length - 1]);
    const ma = M.sma(bars, 10);
    if (ma.length) maSeries.update(ma[ma.length - 1]);
  }

  $("#timeframes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tf]"); if (!b) return;
    tf = b.dataset.tf;
    $$("#timeframes button").forEach((x) => x.classList.toggle("active", x === b));
    if (chart) loadBars();
  });
  const $$ = (sel, r = document) => [...r.querySelectorAll(sel)];

  // ---------------- Supabase: session, tier gate, trades ----------------
  let sb = null, session = null, tiers = null, myTrades = [];
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

  async function refreshGate() {
    const gate = $("#ins-gate");
    if (!session) {
      gate.innerHTML = `Sign in and get Starter to trade this market. <a class="link" href="account.html?mode=signup">Create an account</a>`;
      $("#ins-actions").hidden = true; $("#ins-positions").hidden = true;
      return;
    }
    try { const { data } = await sb.from("entitlements").select("tier, expires_at"); tiers = data || []; } catch (_) { tiers = []; }

    if (!isUnlocked("starter")) {
      const everHad = (tiers || []).some((x) => x.tier === "starter");
      gate.innerHTML = everHad
        ? `Your Starter access has locked. <a class="link" href="plans.html">Get Growth to unlock it again</a>, forever.`
        : `Get Starter to trade this market. <a class="link" href="plans.html">View plans</a>`;
      $("#ins-actions").hidden = true;
    } else {
      gate.innerHTML = "";
      $("#ins-actions").hidden = false;
    }
    await loadMyTrades();
  }

  async function loadMyTrades() {
    const { data } = await sb.from("trades").select("*").eq("symbol", s.sym).eq("status", "open").order("opened_at", { ascending: false });
    myTrades = data || [];
    const box = $("#ins-positions"), list = $("#ins-positions-list");
    box.hidden = myTrades.length === 0;
    list.innerHTML = myTrades.map((t) => {
      const now = M.priceOf(s);
      const unreal = (now - t.entry_price) * t.qty * (t.side === "buy" ? 1 : -1);
      const cls = unreal >= 0 ? "ok" : "err";
      return `<tr><td>${t.side}</td><td>${t.qty}</td><td>${M.fmtPrice(s, t.entry_price)}</td>
        <td class="${cls}">${unreal >= 0 ? "+" : ""}${unreal.toFixed(2)}</td>
        <td><button type="button" class="btn btn-ghost" data-close="${t.id}">Close</button></td></tr>`;
    }).join("");
  }

  // ---- Open trade dialog ----
  const openDlg = $("#open-dialog"), openMsg = $("#open-msg"), openSubmit = $("#open-submit");
  let openSide = null;
  function launchOpen(side) {
    openSide = side;
    $("#open-title").textContent = `${side === "buy" ? "Buy" : "Sell"} ${s.sym}`;
    $("#open-price").textContent = `Entry price: ${M.fmtPrice(s, M.priceOf(s))} (simulated)`;
    $("#open-qty").value = "1"; $("#open-reason").value = ""; $("#open-strategy").value = ""; $("#open-risk").value = "Medium";
    msg(openMsg, ""); openSubmit.disabled = false; openSubmit.textContent = "Place simulated trade";
    openDlg.showModal();
  }
  $("#ins-buy").addEventListener("click", () => launchOpen("buy"));
  $("#ins-sell").addEventListener("click", () => launchOpen("sell"));

  $("#open-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const qty = Number($("#open-qty").value);
    const reason = $("#open-reason").value.trim();
    if (!(qty > 0)) return msg(openMsg, "Enter a quantity greater than 0.");
    if (!reason) return msg(openMsg, "Say briefly why you're entering this trade.");
    openSubmit.disabled = true; msg(openMsg, "");
    const { error } = await Loader.run(sb.rpc("open_trade", {
      p_symbol: s.sym, p_side: openSide, p_qty: qty, p_entry_price: M.priceOf(s),
      p_reason_in: reason, p_strategy: $("#open-strategy").value.trim() || null, p_risk_level: $("#open-risk").value
    }));
    if (error) {
      const m = (error.message || "").includes("starter_locked") ? "Starter has locked. Get Growth to unlock trading again."
        : (error.message || "").includes("journal_full") ? "You've reached Starter's 20-trade limit. Get Growth for unlimited trades."
        : "Couldn't place the trade. Try again.";
      msg(openMsg, m); openSubmit.disabled = false; return;
    }
    openDlg.close();
    await loadMyTrades();
  });

  // ---- Close trade dialog ----
  const closeDlg = $("#close-dialog"), closeMsg = $("#close-msg"), closeSubmit = $("#close-submit");
  let closingId = null;
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-close]"); if (!c) return;
    closingId = c.dataset.close;
    const t = myTrades.find((x) => x.id === closingId); if (!t) return;
    const now = M.priceOf(s);
    const unreal = (now - t.entry_price) * t.qty * (t.side === "buy" ? 1 : -1);
    $("#close-title").textContent = `Close ${t.side} ${s.sym}`;
    $("#close-price").textContent = `Exit price: ${M.fmtPrice(s, now)} (simulated) — estimated P/L ${unreal >= 0 ? "+" : ""}${unreal.toFixed(2)}`;
    $("#close-reason").value = ""; $("#close-note").value = "";
    msg(closeMsg, ""); closeSubmit.disabled = false; closeSubmit.textContent = "Close trade";
    closeDlg.showModal();
  });
  $("#close-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const reason = $("#close-reason").value.trim();
    if (!reason) return msg(closeMsg, "Say briefly why you're exiting now.");
    closeSubmit.disabled = true; msg(closeMsg, "");
    const { error } = await Loader.run(sb.rpc("close_trade", {
      p_trade_id: closingId, p_exit_price: M.priceOf(s), p_reason_out: reason, p_note: $("#close-note").value.trim() || null
    }));
    if (error) { msg(closeMsg, "Couldn't close the trade. Try again."); closeSubmit.disabled = false; return; }
    closeDlg.close();
    await loadMyTrades();
  });

  // ---------------- Boot ----------------
  updateHeader();
  buildChart();
  setInterval(() => { updateHeader(); tickChart(); if (session) loadMyTrades(); }, 4000);

  (async () => {
    const client = await getSB();
    if (!client) { $("#ins-gate").textContent = "Sign-in isn't connected yet. Add your Supabase keys in config.js."; return; }
    client.auth.onAuthStateChange((_e, sess) => { session = sess; refreshGate(); });
    const { data } = await client.auth.getSession();
    session = data.session;
    refreshGate();
  })();
})();
