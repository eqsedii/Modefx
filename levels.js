// Learning levels: a shared level switcher on every lessons page, the level cards on lessons.html,
// and the Golden member touches (nav badge, account card, markets strip).
// Reads entitlements from app.js via window.MFXEnt and the "mfx:ent" event. Without JS the pages still work.
(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "KSh " + Number(n).toLocaleString();
  const price = (id) => ((C.tiers || []).find((t) => t.id === id) || {}).price;

  const LEVELS = [
    { id: "starter", n: 1, name: "Starter", count: "10 lessons", href: "lessons.html",
      blurb: "The fundamentals: candles, position sizing, stops, trends, risk and reward, psychology and order types." },
    { id: "growth", n: 2, name: "Growth", count: "6 lessons", href: "growth.html", requires: "starter",
      blurb: "Multi-timeframe analysis, risk of ruin, volatility-aware sizing, reversal candles, your trading plan and journal analytics." },
    { id: "pro", n: 3, name: "Pro", count: "22 lessons + tools", href: "pro.html#lessons", requires: "growth",
      blurb: "Market structure, indicators, risk math, execution, news and testing a strategy, with calculators, a calendar and a community." },
    { id: "golden", n: 4, name: "Golden", count: "Predictions desk", href: "golden.html", requires: "pro", gold: true,
      blurb: "Market predictions from real candles with stop and target levels, the reasoning behind each one, and a link to your broker." }
  ];

  const ent = () => window.MFXEnt || { signedIn: false, isUnlocked: () => false, wasEverBought: () => false };
  const nameOf = (id) => (LEVELS.find((l) => l.id === id) || {}).name || id;

  function status(l) {
    const e = ent();
    if (!e.signedIn) return { key: "signin", label: "Sign in", href: "account.html" };
    if (e.isUnlocked(l.id)) return { key: "open", label: "Unlocked", href: l.href };
    if (l.requires && !e.wasEverBought(l.requires)) return { key: "needs", label: "Needs " + nameOf(l.requires), href: "plans.html" };
    return { key: "buy", label: price(l.id) ? "Get " + l.name + " · " + money(price(l.id)) : "Get " + l.name, href: "plans.html" };
  }

  /* ---------- Level switcher on lessons / growth / pro ---------- */
  function currentLevel() {
    const p = document.body.dataset.page || "";
    return { lessons: "starter", growth: "growth", pro: "pro", golden: "golden" }[p] || null;
  }
  function renderSwitcher() {
    const host = $("#level-nav"); if (!host) return;
    const cur = currentLevel();
    host.innerHTML = LEVELS.map((l) => {
      const st = status(l);
      const icon = st.key === "open" ? "" : '<span class="lv-lock" aria-hidden="true">&#128274;</span>';
      return `<a class="lv ${l.gold ? "lv-gold" : ""} ${st.key === "open" ? "is-open" : ""}" href="${esc(l.href)}" ${cur === l.id ? 'aria-current="page"' : ""}>
        <small>Level ${l.n}</small><strong>${l.gold ? "&#9733; " : ""}${esc(l.name)} ${icon}</strong><span>${esc(l.count)}</span></a>`;
    }).join("");
  }

  /* ---------- Level cards on the lessons hub ---------- */
  function renderCards() {
    const host = $("#level-cards"); if (!host) return;
    host.innerHTML = LEVELS.map((l) => {
      const st = status(l);
      return `<article class="level-card ${l.gold ? "level-gold" : ""} ${st.key === "open" ? "is-open" : ""}">
        <div class="level-top"><span class="level-n">Level ${l.n}</span><span class="level-chip chip-${st.key}">${esc(st.key === "open" ? "Unlocked" : st.key === "signin" ? "Locked" : st.key === "needs" ? "Locked" : "Available")}</span></div>
        <h3>${l.gold ? '<span class="gold-star" aria-hidden="true">&#9733;</span> ' : ""}${esc(l.name)}</h3>
        <p class="level-count">${esc(l.count)}</p>
        <p>${esc(l.blurb)}</p>
        <a class="btn ${st.key === "open" ? "btn-primary" : "btn-ghost"}" href="${esc(st.href)}">${st.key === "open" ? "Open " + esc(l.name) + " &rarr;" : esc(st.label)}</a>
      </article>`;
    }).join("");
  }

  /* ---------- Golden member touches ---------- */
  function goldenTouches() {
    const member = ent().isUnlocked("golden");
    document.querySelectorAll(".nav-gold").forEach((a) => {
      if (!a.dataset.star) { a.dataset.star = "1"; a.innerHTML = '<span class="gold-star" aria-hidden="true">&#9733;</span> ' + esc(a.textContent.trim()); }
      a.classList.toggle("is-member", member);
    });
    // Account page: a Golden member card
    const acct = $("#account");
    if (acct) {
      let card = $("#gold-member-card");
      if (member && !card) {
        card = document.createElement("a"); card.id = "gold-member-card"; card.className = "gold-member"; card.href = "golden.html";
        card.innerHTML = '<span class="gold-star big" aria-hidden="true">&#9733;</span><span><strong>Golden member</strong><small>Predictions and your broker link are unlocked, forever.</small></span><span class="gm-go" aria-hidden="true">&rarr;</span>';
        const dl = $(".acct-plan", acct); (dl || acct.firstElementChild).after(card);
      } else if (!member && card) card.remove();
    }
    // Markets page: a slim Golden strip for members
    const page = $("main.page");
    if ((document.body.dataset.page === "markets" || document.body.dataset.page === "home") && page) {
      let strip = $("#gold-strip");
      if (member && !strip) {
        strip = document.createElement("a"); strip.id = "gold-strip"; strip.className = "gold-strip"; strip.href = "golden.html";
        strip.innerHTML = '<span class="gold-star" aria-hidden="true">&#9733;</span><span><strong>Golden desk</strong> Today&rsquo;s predictions with stop and target levels are ready.</span><span aria-hidden="true">&rarr;</span>';
        page.prepend(strip);
      } else if (!member && strip) strip.remove();
    }
  }

  const paint = () => { renderSwitcher(); renderCards(); goldenTouches(); };
  document.addEventListener("mfx:ent", paint);
  const go = () => { paint(); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
})();
