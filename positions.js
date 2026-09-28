(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const M = window.MFXMarket;
  const $ = (s, r = document) => r.querySelector(s);
  const msg = (el, text, kind = "") => { el.textContent = text; el.className = "msg " + kind; };

  const Loader = (() => {
    const el = $("#loader"), v = $("video", el);
    let pending = 0, until = 0, timer;
    const show = () => { el.classList.add("on"); try { v.currentTime = 0; v.play().catch(() => {}); } catch (_) {} };
    const hide = () => el.classList.remove("on");
    const check = () => { clearTimeout(timer); if (pending > 0) return; const left = until - Date.now(); if (left > 0) { timer = setTimeout(check, left); return; } hide(); };
    const begin = (min) => { if (!el.classList.contains("on")) { until = 0; show(); } until = Math.max(until, Date.now() + min); };
    return { flash(min = 1200) { begin(min); check(); }, run(p, min = 1200) { pending++; begin(min); return Promise.resolve(p).finally(() => { pending--; check(); }); } };
  })();
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button, .btn");
    if (!b || b.disabled || b.closest("#loader") || b.hasAttribute("data-async") || b.hasAttribute("data-quiet")) return;
    Loader.flash();
  });

  let sb = null, session = null, trades = [];
  async function getSB() {
    if (sb) return sb;
    if (!C.supabaseUrl || !C.supabaseAnonKey) return null;
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
    return sb;
  }

  async function loadBalance() {
    const { data, error } = await sb.rpc("ensure_trading_account");
    if (!error) $("#pg-balance").textContent = "KSh " + Number(data).toLocaleString("en-KE", { maximumFractionDigits: 2 });
  }

  async function load() {
    if (!session) {
      $("#pg-gate").textContent = "";
      $("#pg-gate").innerHTML = `Sign in to see your positions. <a class="link" href="account.html">Sign in</a>`;
      return;
    }
    await loadBalance();
    const { data } = await sb.from("trades").select("*").eq("status", "open").order("opened_at", { ascending: false });
    trades = data || [];
    $("#pg-table").hidden = trades.length === 0;
    $("#pg-empty").hidden = trades.length > 0;
    $("#pg-list").innerHTML = trades.map((t) => {
      const s = M.bySym(t.symbol);
      const now = s ? M.priceOf(s) : t.entry_price;
      const unreal = (now - t.entry_price) * t.qty * (t.side === "buy" ? 1 : -1);
      const cls = unreal >= 0 ? "ok" : "err";
      return `<tr>
        <td>${t.symbol}</td><td>${t.side}</td><td>${t.qty}</td>
        <td>${s ? M.fmtPrice(s, t.entry_price) : t.entry_price}</td>
        <td>${s ? M.fmtPrice(s, now) : now}</td>
        <td class="${cls}">${unreal >= 0 ? "+" : ""}${unreal.toFixed(2)}</td>
        <td><button type="button" class="btn btn-ghost" data-close="${t.id}">Close</button></td>
      </tr>`;
    }).join("");
  }

  const closeDlg = $("#close-dialog"), closeMsg = $("#close-msg"), closeSubmit = $("#close-submit");
  let closingId = null;
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-close]"); if (!c) return;
    closingId = c.dataset.close;
    const t = trades.find((x) => x.id === closingId); if (!t) return;
    const s = M.bySym(t.symbol);
    const now = s ? M.priceOf(s) : t.entry_price;
    const unreal = (now - t.entry_price) * t.qty * (t.side === "buy" ? 1 : -1);
    $("#close-title").textContent = `Close ${t.side} ${t.symbol}`;
    $("#close-price").textContent = `Exit price: ${s ? M.fmtPrice(s, now) : now} (simulated) — estimated P/L ${unreal >= 0 ? "+" : ""}${unreal.toFixed(2)}`;
    $("#close-reason").value = ""; $("#close-note").value = "";
    msg(closeMsg, ""); closeSubmit.disabled = false; closeSubmit.textContent = "Close trade";
    closeDlg.showModal();
  });
  $("#close-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const reason = $("#close-reason").value.trim();
    if (!reason) return msg(closeMsg, "Say briefly why you're exiting now.");
    closeSubmit.disabled = true; msg(closeMsg, "");
    const t = trades.find((x) => x.id === closingId);
    const s = M.bySym(t.symbol);
    const exitPrice = s ? M.priceOf(s) : t.entry_price;
    const { error } = await Loader.run(sb.rpc("close_trade", { p_trade_id: closingId, p_exit_price: exitPrice, p_reason_out: reason, p_note: $("#close-note").value.trim() || null }));
    if (error) { msg(closeMsg, "Couldn't close the trade. Try again."); closeSubmit.disabled = false; return; }
    closeDlg.close();
    await load();
  });

  setInterval(() => { if (session) load(); }, 5000);

  (async () => {
    const client = await getSB();
    if (!client) { $("#pg-gate").textContent = "Sign-in isn't connected yet. Add your Supabase keys in config.js."; return; }
    client.auth.onAuthStateChange((_e, s) => { session = s; load(); });
    const { data } = await client.auth.getSession();
    session = data.session;
    load();
  })();
})();
