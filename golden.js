(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const say = (el, text, kind = "") => { el.textContent = text; el.className = "msg " + kind; };
  const DP = { "EUR/USD": 4, "USD/KES": 2, "BTC/USD": 0, "XAU/USD": 2 };
  const fmt = (sym, n) => Number(n).toLocaleString("en-KE", { minimumFractionDigits: DP[sym] ?? 2, maximumFractionDigits: DP[sym] ?? 2 });

  let sb = null, session = null;
  async function getSB() {
    if (sb) return sb;
    if (!C.supabaseUrl || !C.supabaseAnonKey) return null;
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
    return sb;
  }
  const isUnlocked = (tiers, id) => { const e = (tiers || []).find((x) => x.tier === id); return !!e && (!e.expires_at || new Date(e.expires_at) > new Date()); };

  /* ---------- Tabs ---------- */
  const loaded = {};
  function showTab(name) {
    if (!["predictions", "deriv"].includes(name)) name = "predictions";
    $$("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== name; });
    if (!loaded[name]) { loaded[name] = true; (name === "predictions" ? initPredictions : initDeriv)(); }
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) { history.replaceState(null, "", "#" + b.dataset.tab); showTab(b.dataset.tab); } });

  /* ---------- Predictions ---------- */
  function spark(vals, up) {
    const w = 120, h = 36, min = Math.min(...vals), max = Math.max(...vals), r = max - min || 1;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(h - 3 - ((v - min) / r) * (h - 6)).toFixed(1)}`).join(" ");
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${up == null ? "#a6b3d0" : up ? "var(--ok)" : "var(--err)"}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  }
  function card(s) {
    const up = s.bias === "bullish" ? true : s.bias === "bearish" ? false : null;
    const label = { bullish: "Bullish", bearish: "Bearish", neutral: "Neutral" }[s.bias];
    const plan = s.plan ? `
      <dl class="levels">
        <div><dt>Practice ${s.plan.side}</dt><dd>${fmt(s.sym, s.price)}</dd></div>
        <div><dt>Stop</dt><dd class="neg">${fmt(s.sym, s.plan.stop)}</dd></div>
        <div><dt>Target 1</dt><dd class="pos">${fmt(s.sym, s.plan.target1)}</dd></div>
        <div><dt>Target 2</dt><dd class="pos">${fmt(s.sym, s.plan.target2)}</dd></div>
      </dl>` : `<p class="fine">No levels: when the checks disagree, there is no edge to size a trade around.</p>`;
    return `<article class="pred ${s.bias}">
      <header><div><h3>${esc(s.sym)}</h3><span class="fine">${fmt(s.sym, s.price)}</span></div>${spark(s.spark, up)}<span class="bias bias-${s.bias}">${label}</span></header>
      <div class="meter" role="img" aria-label="Signal strength ${s.strength} out of 100"><i style="width:${s.strength}%"></i><span>Strength ${s.strength}</span></div>
      <p class="pred-note">${esc(s.note)}</p>
      ${plan}
      <details><summary>Why this reading</summary><ul class="plain-list">${s.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
        <p class="fine">RSI ${s.rsi}. Volatility (ATR) ${s.atr}. Source: ${esc(s.source)}. Stop is 1.5 ATR away; targets sit at 1x and 2x that distance.</p></details>
    </article>`;
  }
  async function initPredictions() {
    const list = $("#pred-list"), meta = $("#pred-meta"), msg = $("#pred-msg");
    list.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    try {
      const r = await fetch((C.apiBase || "") + "/api/golden-signals", { headers: { Authorization: "Bearer " + session.access_token } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't load predictions.");
      if (!j.signals.length) { list.innerHTML = ""; say(msg, "No market data is available right now. Add a TWELVEDATA_API_KEY on Vercel for forex and gold, then reload."); meta.textContent = ""; return; }
      list.innerHTML = j.signals.map(card).join("");
      const t = new Date(j.asOf).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
      meta.textContent = `Updated ${t}. Notes written by ${j.commentary === "claude" ? "an AI model" : "fixed templates"}.`;
      say(msg, "");
    } catch (e) { list.innerHTML = ""; meta.textContent = ""; say(msg, e.message || "Couldn't load predictions."); }
  }

  /* ---------- Deriv link ---------- */
  async function initDeriv() {
    const url = C.brokerUrl || "https://deriv.com";
    $("#deriv-signup").href = url; $("#deriv-open").href = url;
    const msg = $("#deriv-msg");
    async function refresh() {
      const { data } = await sb.from("deriv_links").select("login_id, nickname").eq("user_id", session.user.id).maybeSingle();
      $("#deriv-linked").hidden = !data; $("#deriv-form-wrap").hidden = !!data;
      if (data) { $("#deriv-id").textContent = data.login_id; $("#deriv-nick").textContent = data.nickname || ""; }
    }
    $("#deriv-save").addEventListener("click", async () => {
      const id = $("#deriv-input").value.trim().toUpperCase();
      if (!/^[A-Z]{2,5}[0-9]{4,10}$/.test(id)) { say(msg, "Enter your login ID as letters then numbers, like CR1234567. It is not your password."); return; }
      const nick = $("#deriv-nick-input").value.trim() || null;
      const { error } = await sb.from("deriv_links").upsert({ user_id: session.user.id, login_id: id, nickname: nick });
      if (error) { say(msg, "Couldn't save the link. Check you are signed in with Golden unlocked."); return; }
      say(msg, "Linked.", "ok"); await refresh();
    });
    $("#deriv-unlink").addEventListener("click", async () => {
      const { error } = await sb.from("deriv_links").delete().eq("user_id", session.user.id);
      if (!error) { $("#deriv-input").value = ""; say(msg, "Link removed.", "ok"); await refresh(); }
    });
    refresh();
  }

  /* ---------- Gate ---------- */
  (async () => {
    const gate = $("#gold-gate");
    const client = await getSB();
    if (!client) { gate.textContent = "Sign-in isn't connected yet. Add your Supabase keys in config.js."; return; }
    const { data } = await client.auth.getSession();
    session = data.session;
    if (!session) { gate.innerHTML = `Sign in and get Golden to unlock this area. <a class="link" href="account.html">Sign in</a>`; $("#gold-teaser").hidden = false; return; }
    let tiers = [];
    try { const r = await client.from("entitlements").select("tier, expires_at"); tiers = r.data || []; } catch (_) {}
    if (!isUnlocked(tiers, "golden")) {
      gate.innerHTML = isUnlocked(tiers, "pro") ? `Get Golden to unlock this area, forever. <a class="link" href="plans.html">View plans</a>` : `Golden needs Pro first. <a class="link" href="plans.html">View plans</a>`;
      $("#gold-teaser").hidden = false; return;
    }
    gate.textContent = ""; $("#gold-app").hidden = false;
    showTab(location.hash.slice(1));
  })();
})();
