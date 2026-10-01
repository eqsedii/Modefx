(() => {
  "use strict";
  const gate = document.getElementById("arena-gate");
  if (!gate) return; // this page has no arena section

  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = $("#arena-body");
  const fmtKES = (n) => "KSh " + Number(n).toLocaleString("en-KE", { maximumFractionDigits: 2 });
  const msg = (el, text, kind = "") => { el.textContent = text; el.className = "msg " + kind; };

  // Shared with instrument.html via market-engine.js, so prices always match across pages.
  const M = window.MFXMarket;
  const SYMS = M.SYMS;
  const priceOf = M.priceOf;
  const fmtPrice = M.fmtPrice;
  const candlesFor = (s) => M.candlesFor(s, 60000, 60);
  const sma = M.sma;
  const safeId = (sym) => "chart-" + sym.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  const charts = {}; // symbol -> { chart, candleSeries, maSeries, bars, lastBar }
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
    const bucket = Math.floor((Math.floor(Date.now() / 60000) * 60000) / 1000);
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

  let sb = null, session = null, tiers = null;

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

  function renderSymbols() {
    $("#arena-symbols").innerHTML = SYMS.map((s) => {
      const p = priceOf(s);
      return `<li class="arena-row" data-sym="${s.sym}">
        <a class="arena-row-info" href="instrument.html?symbol=${encodeURIComponent(s.sym)}"><strong>${s.sym}</strong><span>${s.nm}</span></a>
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
    await loadBalance();
  }

  // ---- Open trade dialog (Positions and Journal now live on their own full-screen pages) ----
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
      const sl = $("#open-sl"), tp = $("#open-tp"); if (sl) sl.value = ""; if (tp) tp.value = "";
      msg(openMsg, ""); openSubmit.disabled = false; openSubmit.textContent = "Place simulated trade";
      openDlg.showModal();
    }
  });

  $("#open-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const qty = Number($("#open-qty").value);
    const reason = $("#open-reason").value.trim();
    if (!(qty > 0)) return msg(openMsg, "Enter a quantity greater than 0.");
    if (!reason) return msg(openMsg, "Say briefly why you're entering this trade.");
    openSubmit.disabled = true; msg(openMsg, "");
    const slEl = $("#open-sl"), tpEl = $("#open-tp");
    const { error } = await sb.rpc("open_trade", {
      p_symbol: openSym.sym, p_side: openSide, p_qty: qty, p_entry_price: priceOf(openSym),
      p_reason_in: reason, p_strategy: $("#open-strategy").value.trim() || null, p_risk_level: $("#open-risk").value,
      p_stop_loss: slEl && slEl.value.trim() ? Number(slEl.value) : null,
      p_take_profit: tpEl && tpEl.value.trim() ? Number(tpEl.value) : null
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
    await loadBalance();
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
