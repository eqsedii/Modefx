// Site-wide chrome shared by every page: scroll progress, back-to-top, skip link, rich footer,
// privacy notice, magnetic buttons, hero tilt, plan comparison table, toasts.
// Nothing here is required for the site to work; without JS the pages still read fine.
(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Toast: window.MFXToast("Saved", "ok") */
  window.MFXToast = (text, kind = "") => {
    let box = $("#toasts"); if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("aria-live", "polite"); document.body.append(box); }
    const t = document.createElement("div"); t.className = "toast " + kind; t.textContent = text; box.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 3200);
  };

  function chrome() {
    const main = $("main"); if (main && !$(".skip")) { main.id = main.id || "main"; const a = document.createElement("a"); a.className = "skip"; a.href = "#" + main.id; a.textContent = "Skip to content"; document.body.prepend(a); }
    const bar = document.createElement("div"); bar.className = "progress"; bar.setAttribute("aria-hidden", "true"); document.body.append(bar);
    const up = document.createElement("button"); up.type = "button"; up.className = "backtop"; up.setAttribute("aria-label", "Back to top"); up.setAttribute("data-quiet", ""); up.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>'; document.body.append(up);
    up.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
    let tick = false;
    const onScroll = () => { if (tick) return; tick = true; requestAnimationFrame(() => {
      const h = document.documentElement, max = h.scrollHeight - innerHeight, p = max > 0 ? h.scrollTop / max : 0;
      bar.style.transform = `scaleX(${p})`; up.classList.toggle("on", h.scrollTop > 700);
      const nav = $(".nav"); if (nav) nav.classList.toggle("scrolled", h.scrollTop > 8); tick = false; }); };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    document.body.classList.add("ready");
  }

  function footer() {
    const f = $(".footer"); if (!f) return;
    const mail = C.supportEmail ? `<a href="mailto:${esc(C.supportEmail)}">${esc(C.supportEmail)}</a>` : `<a href="help.html">Help centre</a>`;
    f.classList.add("footer-rich");
    f.innerHTML = `
      <div class="foot-grid">
        <div class="foot-about"><div class="footer-brand"><img src="assets/mark.png" alt="" width="34" height="23"><span>Modefx</span></div>
          <p>Practice trading with virtual money, keep a journal, learn the markets. Learn at your own pace, from anywhere.</p>
          <p class="foot-live"><span class="live-dot">Practice feed running</span></p></div>
        <nav aria-label="Product"><h4>Product</h4><a href="markets.html">Markets</a><a href="lessons.html">Lessons</a><a href="pro.html">Pro</a><a href="golden.html">Golden</a><a href="plans.html">Plans</a></nav>
        <nav aria-label="Learn"><h4>Learn</h4><a href="insights.html">Insights</a><a href="glossary.html">Glossary</a><a href="lessons.html">Free lessons</a><a href="help.html">Help</a></nav>
        <nav aria-label="Company"><h4>Company</h4><a href="about.html">About</a><a href="help.html#contact">Contact</a>${mail}</nav>
        <nav aria-label="Legal"><h4>Legal</h4><a href="terms.html">Terms of use</a><a href="privacy.html">Privacy policy</a><a href="risk.html">Risk disclosure</a></nav>
      </div>
      <p class="fine">&copy; ${new Date().getFullYear()} Modefx. All rights reserved.</p>`;
  }

  function notice() {
    try { if (localStorage.getItem("mfx-notice") === "1") return; } catch (_) { return; }
    const n = document.createElement("div"); n.className = "notice-bar"; n.setAttribute("role", "region"); n.setAttribute("aria-label", "Privacy notice");
    n.innerHTML = `<p>Modefx stores your sign-in and lesson progress on this device so the site works. We don't run advertising trackers. <a href="privacy.html">Privacy policy</a></p><button type="button" class="btn btn-ghost" data-quiet>Got it</button>`;
    document.body.append(n);
    $("button", n).addEventListener("click", () => { try { localStorage.setItem("mfx-notice", "1"); } catch (_) {} n.classList.add("out"); setTimeout(() => n.remove(), 400); });
  }

  function fx() {
    if (reduce || matchMedia("(hover: none)").matches) return;
    document.addEventListener("pointermove", (e) => {
      const b = e.target.closest && e.target.closest(".btn-primary");
      document.querySelectorAll(".btn-primary.mag").forEach((x) => { if (x !== b) { x.style.transform = ""; x.classList.remove("mag"); } });
      if (b && !b.disabled) { const r = b.getBoundingClientRect(); b.classList.add("mag"); b.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 8}px, ${((e.clientY - r.top) / r.height - .5) * 6}px)`; }
    }, { passive: true });
    const lb = $(".livebox");
    if (lb) {
      lb.addEventListener("pointermove", (e) => { const r = lb.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; lb.style.transform = `perspective(1000px) rotateY(${x * 5}deg) rotateX(${-y * 4}deg)`; });
      lb.addEventListener("pointerleave", () => { lb.style.transform = ""; });
    }
  }

  function compare() {
    const anchor = $("#plan-list"); if (!anchor || $("#compare")) return;
    const T = (C.tiers || []).map((t) => t.name);
    const Y = "yes", N = "no";
    const rows = [
      ["Simulated trading account", [Y, Y, Y, Y]],
      ["Trade journal", ["Basic, 20 entries", "Full + analytics", "Full + analytics", "Full + analytics"]],
      ["Lessons", ["10 starter", "Full library", "Full library", "Full library"]],
      ["Live market status", [N, Y, Y, Y]],
      ["Challenges and XP", [N, Y, Y, Y]],
      ["22 advanced lessons", [N, N, Y, Y]],
      ["Economic calendar (your local time)", [N, N, Y, Y]],
      ["Strategy playbook and checklists", [N, N, Y, Y]],
      ["Community board", [N, N, Y, Y]],
      ["Market predictions with levels", [N, N, N, Y]],
      ["Deriv account link", [N, N, N, Y]],
      ["How long it stays unlocked", ["7 days, then locks", "Forever", "Forever", "Forever"]]
    ];
    const cell = (v) => v === Y ? '<span class="tick-y" aria-label="Included">&#10003;</span>' : v === N ? '<span class="tick-n" aria-label="Not included">&ndash;</span>' : esc(v);
    const sec = document.createElement("section"); sec.className = "sheet"; sec.id = "compare";
    sec.innerHTML = `<h2>Compare plans</h2><p class="sheet-sub">Every plan includes everything in the one before it.</p><div class="table-wrap"><table class="compare"><thead><tr><th scope="col">Feature</th>${T.map((n, i) => `<th scope="col" class="${i === 3 ? "gold" : ""}">${esc(n)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${esc(r[0])}</th>${r[1].map((v, i) => `<td class="${i === 3 ? "gold" : ""}">${cell(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    (anchor.closest(".sheet") || anchor).after(sec);
  }

  const go = () => { chrome(); footer(); notice(); fx(); compare(); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
})();
