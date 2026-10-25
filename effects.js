// Visual layer shared by every page: live ticker tape, animated hero chart, market board,
// count-up numbers, hover spotlight, scroll reveal. Needs market-engine.js (window.MFXMarket).
// Every effect is skipped under prefers-reduced-motion, and nothing here is required for the site to work.
(() => {
  "use strict";
  const M = window.MFXMarket, C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sign = (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

  /* ---------- Ticker tape (under the header, every page) ---------- */
  function tape() {
    const nav = $(".nav"); if (!M || !nav || $(".tape")) return;
    const el = document.createElement("div");
    el.className = "tape"; el.setAttribute("role", "marquee"); el.setAttribute("aria-label", "Practice market prices");
    el.innerHTML = '<div class="tape-track"></div>';
    nav.after(el);
    const track = $(".tape-track", el);
    const items = () => M.SYMS.map((s) => {
      const d = M.dailyStats(s);
      return `<a class="tick ${d.chgPct >= 0 ? "up" : "dn"}" href="instrument.html?symbol=${encodeURIComponent(s.sym)}"><b>${s.sym}</b><span>${M.fmtPrice(s, d.now)}</span><em>${sign(d.chgPct)}</em></a>`;
    }).join("");
    const paint = () => { const h = items(); track.innerHTML = h + h; }; // doubled so the loop is seamless
    paint(); setInterval(paint, 4000);
    if (reduce) track.style.animation = "none";
  }

  /* ---------- Hero chart: live candles drawn on a canvas ---------- */
  function heroChart() {
    const cv = $("#hero-chart"); if (!M || !cv) return;
    const ctx = cv.getContext("2d"); let sym = M.SYMS[0], dpr = 1, W = 0, H = 0, raf = 0, last = 0;
    const chips = $("#hero-chips"), pxEl = $("#hero-px"), chEl = $("#hero-chg"), nmEl = $("#hero-nm");
    chips.innerHTML = M.SYMS.map((s, i) => `<button type="button" data-q="${s.sym}" data-quiet aria-pressed="${i === 0}">${s.sym}</button>`).join("");
    chips.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; sym = M.bySym(b.dataset.q); $$("button", chips).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); draw(performance.now(), true); });
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    function draw(t, force) {
      if (!force && t - last < (reduce ? 4000 : 120)) { raf = requestAnimationFrame(draw); return; }
      last = t;
      const bars = M.candlesFor(sym, 60000, W < 460 ? 36 : 60);
      const pad = { l: 8, r: 64, t: 14, b: 16 };
      let hi = -Infinity, lo = Infinity; bars.forEach((b) => { hi = Math.max(hi, b.high); lo = Math.min(lo, b.low); });
      const span = (hi - lo) || 1; hi += span * .08; lo -= span * .08;
      const y = (p) => pad.t + (1 - (p - lo) / (hi - lo)) * (H - pad.t - pad.b);
      const cw = (W - pad.l - pad.r) / bars.length;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(120,170,255,.10)"; ctx.lineWidth = 1; ctx.font = "11px Figtree, system-ui"; ctx.fillStyle = "rgba(166,179,208,.8)";
      for (let i = 0; i < 5; i++) { const gy = pad.t + i * (H - pad.t - pad.b) / 4; ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(W - pad.r, gy); ctx.stroke(); ctx.fillText(M.fmtPrice(sym, hi - (hi - lo) * i / 4), W - pad.r + 6, gy + 4); }
      bars.forEach((b, i) => {
        const x = pad.l + i * cw + cw / 2, up = b.close >= b.open, col = up ? "#3ddc97" : "#ff7a88";
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y(b.high)); ctx.lineTo(x, y(b.low)); ctx.stroke();
        const top = y(Math.max(b.open, b.close)), bh = Math.max(1.5, Math.abs(y(b.open) - y(b.close)));
        ctx.globalAlpha = i === bars.length - 1 ? 1 : .85; ctx.fillRect(x - cw * .32, top, cw * .64, bh); ctx.globalAlpha = 1;
      });
      const cur = bars[bars.length - 1].close, cy = y(cur), up = cur >= bars[0].open;
      const pulse = reduce ? 0 : (Math.sin(t / 380) + 1) / 2;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(34,211,255,.7)"; ctx.beginPath(); ctx.moveTo(pad.l, cy); ctx.lineTo(W - pad.r, cy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "rgba(34,211,255,.18)"; ctx.beginPath(); ctx.arc(W - pad.r - cw / 2, cy, 5 + pulse * 6, 0, 7); ctx.fill();
      ctx.fillStyle = "#22d3ff"; ctx.beginPath(); ctx.arc(W - pad.r - cw / 2, cy, 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#1e6bff"; ctx.fillRect(W - pad.r + 2, cy - 9, pad.r - 4, 18);
      ctx.fillStyle = "#fff"; ctx.fillText(M.fmtPrice(sym, cur), W - pad.r + 6, cy + 4);
      const d = M.dailyStats(sym);
      nmEl.textContent = sym.nm; pxEl.textContent = M.fmtPrice(sym, d.now);
      chEl.textContent = sign(d.chgPct); chEl.className = d.chgPct >= 0 ? "pos" : "neg";
      raf = requestAnimationFrame(draw);
    }
    size(); addEventListener("resize", () => { size(); draw(performance.now(), true); });
    // pause when off-screen or tab hidden
    new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); if (e.isIntersecting) raf = requestAnimationFrame(draw); }).observe(cv);
  }

  /* ---------- Market board with sparklines (home) ---------- */
  function board() {
    const el = $("#board"); if (!M || !el) return;
    const spark = (s) => {
      const bars = M.candlesFor(s, 3600000, 24), v = bars.map((b) => b.close), mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1;
      const pts = v.map((x, i) => `${(i / 23 * 100).toFixed(1)},${(26 - ((x - mn) / r) * 24).toFixed(1)}`).join(" ");
      return `<svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
    };
    const paint = () => {
      el.innerHTML = M.SYMS.map((s) => {
        const d = M.dailyStats(s), up = d.chgPct >= 0;
        return `<a class="brow ${up ? "up" : "dn"}" href="instrument.html?symbol=${encodeURIComponent(s.sym)}">
          <span class="bname"><strong>${s.sym}</strong><small>${esc(s.nm)}</small></span>
          <span class="bspark">${spark(s)}</span>
          <span class="bpx">${M.fmtPrice(s, d.now)}</span>
          <span class="bchg">${sign(d.chgPct)}</span>
          <span class="brange">${d.rangePct.toFixed(2)}% range</span></a>`;
      }).join("");
    };
    paint(); setInterval(paint, 5000);
  }

  /* ---------- Plan ladder preview (home) ---------- */
  function ladder() {
    const el = $("#home-ladder"); if (!el || !C.tiers) return;
    el.innerHTML = C.tiers.map((t, i) => `<a class="rung ${t.id === "golden" ? "rung-gold" : ""}" href="plans.html" style="--i:${i}">
      <small>${i === 0 ? "Start here" : "Needs " + esc(C.tiers[i - 1].name)}</small>
      <strong>${esc(t.name)}</strong><span class="rprice">KSh ${t.price.toLocaleString("en-KE")}</span>
      <p>${esc(t.features[1] || t.line)}</p></a>`).join("");
  }

  /* ---------- Count-up, spotlight, reveal ---------- */
  function counters() {
    const els = $$("[data-count]"); if (!els.length) return;
    const run = (el) => {
      const to = +el.dataset.count, dur = 1100, t0 = performance.now();
      if (reduce) { el.textContent = to.toLocaleString("en-KE"); return; }
      const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e).toLocaleString("en-KE"); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: .6 });
    els.forEach((e) => io.observe(e));
  }
  function spotlight() {
    if (reduce || matchMedia("(hover: none)").matches) return;
    document.addEventListener("pointermove", (e) => {
      const t = e.target.closest && e.target.closest(".sheet, .rung, .feat, .pred, .brow"); if (!t) return;
      const r = t.getBoundingClientRect(); t.style.setProperty("--mx", (e.clientX - r.left) + "px"); t.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }
  function reveal() {
    const els = $$(".reveal"); if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .15 });
    els.forEach((e) => io.observe(e));
  }

  const go = () => { tape(); heroChart(); board(); ladder(); counters(); spotlight(); reveal(); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
})();
