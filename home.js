// Home-page widgets: market sessions clock, heatmap, risk calculator, article teasers.
(() => {
  "use strict";
  const M = window.MFXMarket;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---- Sessions: typical forex hours in UTC; shown in your local time. They shift with daylight saving. ---- */
  function sessions() {
    const el = $("#sessions"); if (!el) return;
    const S = [["Sydney", 22, 7], ["Tokyo", 0, 9], ["London", 8, 17], ["New York", 13, 22]];
    const hm = (mins) => { const h = Math.floor(mins / 60), m = Math.round(mins % 60); return h ? `${h}h ${m}m` : `${m}m`; };
    const paint = () => {
      const now = new Date(), u = now.getUTCHours() + now.getUTCMinutes() / 60, dow = now.getUTCDay();
      const weekend = (dow === 6) || (dow === 5 && u >= 22) || (dow === 0 && u < 22);
      const off = -now.getTimezoneOffset() / 60, eat = (((u + off) % 24) + 24) % 24;
      const rows = S.map(([n, a, b]) => {
        const open = a < b ? (u >= a && u < b) : (u >= a || u < b);
        const live = open && !weekend;
        const toClose = ((b - u) + 24) % 24 * 60, toOpen = ((a - u) + 24) % 24 * 60;
        const segs = (x, y) => { const L = (((x + off) % 24) + 24) % 24, W = ((y - x) + 24) % 24; return L + W <= 24 ? [[L, W]] : [[L, 24 - L], [0, L + W - 24]]; };
        const bar = segs(a, b).map(([l, w]) => `<i style="left:${l / 24 * 100}%;width:${w / 24 * 100}%"></i>`).join("");
        const status = weekend ? "Weekend" : live ? `Open, closes in ${hm(toClose)}` : `Closed, opens in ${hm(toOpen)}`;
        return `<div class="srow ${live ? "open" : ""}"><span class="sname">${n}</span><div class="strack">${bar}<b style="left:${eat / 24 * 100}%"></b></div><span class="sstat">${status}</span></div>`;
      }).join("");
      const lond = u >= 13 && u < 17 && !weekend;
      el.innerHTML = rows + `<div class="saxis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>` +
        `<p class="fine">${weekend ? "Forex markets are closed for the weekend. They reopen Sunday evening UTC." : lond ? "London and New York overlap now. This is usually the busiest, fastest-moving part of the day." : "Bars show typical hours in your local time. The line is now."}</p>`;
    };
    paint(); setInterval(paint, 30000);
  }

  /* ---- Heatmap ---- */
  function heat() {
    const el = $("#heat"); if (!M || !el) return;
    const paint = () => { el.innerHTML = M.SYMS.map((s) => {
      const d = M.dailyStats(s), a = Math.min(.62, .14 + Math.abs(d.chgPct) * .16), up = d.chgPct >= 0;
      return `<a class="tile" style="background:${up ? `rgba(61,220,151,${a})` : `rgba(255,122,136,${a})`}" href="instrument.html?symbol=${encodeURIComponent(s.sym)}"><b>${s.sym}</b><span>${(up ? "+" : "") + d.chgPct.toFixed(2)}%</span><small>${esc(s.cls)}</small></a>`; }).join(""); };
    paint(); setInterval(paint, 5000);
  }

  /* ---- Risk calculator ---- */
  function calc() {
    const f = $("#calc"); if (!f) return;
    const v = (id) => parseFloat($("#" + id).value);
    const fmt = (n, d = 2) => isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "-";
    const run = () => {
      const bal = v("c-bal"), risk = v("c-risk"), en = v("c-en"), sl = v("c-sl");
      const amt = bal * risk / 100, dist = Math.abs(en - sl), units = dist > 0 ? amt / dist : NaN, buy = sl < en;
      const t2 = buy ? en + dist * 2 : en - dist * 2;
      $("#c-amt").textContent = fmt(amt); $("#c-units").textContent = fmt(units, 2); $("#c-t2").textContent = dist > 0 ? fmt(t2, 4) : "-";
      $("#c-note").textContent = !(bal > 0 && en > 0 && sl > 0 && dist > 0) ? "Enter a balance, an entry and a stop-loss that differs from the entry." : `${buy ? "Buy" : "Sell"} setup. If the stop is hit you lose about ${fmt(amt)}. A 1:2 target pays about ${fmt(amt * 2)}.`;
    };
    f.addEventListener("input", run); run();
  }

  /* ---- Article teasers ---- */
  function teasers() {
    const el = $("#teasers"), A = window.MFX_INSIGHTS; if (!el || !A) return;
    el.innerHTML = A.slice(0, 3).map((a) => `<a class="art" href="insights.html#${a.slug}"><small>${esc(a.tag)} &middot; ${Math.max(1, Math.round(a.body.join(" ").split(/\s+/).length / 200))} min read</small><strong>${esc(a.title)}</strong><p>${esc(a.summary)}</p></a>`).join("");
  }

  const go = () => { sessions(); heat(); calc(); teasers(); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
})();
