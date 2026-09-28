(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const M = window.MFXMarket;
  const $ = (s, r = document) => r.querySelector(s);

  let sb = null, session = null;
  async function getSB() {
    if (sb) return sb;
    if (!C.supabaseUrl || !C.supabaseAnonKey) return null;
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
    return sb;
  }

  async function load() {
    if (!session) {
      $("#pg-gate").innerHTML = `Sign in to see your journal. <a class="link" href="account.html">Sign in</a>`;
      return;
    }
    const { data } = await sb.from("trades").select("*").eq("status", "closed").order("closed_at", { ascending: false });
    const trades = data || [];
    $("#pg-table").hidden = trades.length === 0;
    $("#pg-empty").hidden = trades.length > 0;
    const total = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const pnlEl = $("#pg-pnl");
    pnlEl.textContent = `${total >= 0 ? "+" : ""}${total.toFixed(2)}`;
    pnlEl.className = total >= 0 ? "ok" : "err";

    $("#pg-list").innerHTML = trades.map((t) => {
      const s = M.bySym(t.symbol);
      const cls = t.pnl >= 0 ? "ok" : "err";
      const when = new Date(t.closed_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
      const notes = [t.reason_in && `In: ${t.reason_in}`, t.reason_out && `Out: ${t.reason_out}`, t.strategy && `Strategy: ${t.strategy}`, t.note].filter(Boolean).join(" · ");
      return `<tr>
        <td>${when}</td><td>${t.symbol}</td><td>${t.side}</td><td>${t.qty}</td>
        <td>${s ? M.fmtPrice(s, t.entry_price) : t.entry_price}</td>
        <td>${s ? M.fmtPrice(s, t.exit_price) : t.exit_price}</td>
        <td class="${cls}">${t.pnl >= 0 ? "+" : ""}${Number(t.pnl).toFixed(2)}</td>
        <td class="fine">${notes || "—"}</td>
      </tr>`;
    }).join("");
  }

  (async () => {
    const client = await getSB();
    if (!client) { $("#pg-gate").textContent = "Sign-in isn't connected yet. Add your Supabase keys in config.js."; return; }
    client.auth.onAuthStateChange((_e, s) => { session = s; load(); });
    const { data } = await client.auth.getSession();
    session = data.session;
    load();
  })();
})();
