(() => {
  "use strict";
  const A = window.MFX_INSIGHTS || [];
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mins = (a) => Math.max(1, Math.round(a.body.join(" ").split(/\s+/).length / 200));
  const when = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  function route() {
    const a = A.find((x) => x.slug === location.hash.slice(1));
    $("#ins-list").hidden = !!a; $("#ins-article").hidden = !a;
    if (!a) { document.title = "Insights | Modefx"; $("#ins-list").innerHTML = A.map((x) => `<a class="art" href="#${x.slug}"><small>${esc(x.tag)} &middot; ${mins(x)} min read</small><strong>${esc(x.title)}</strong><p>${esc(x.summary)}</p></a>`).join(""); return; }
    document.title = a.title + " | Modefx";
    const next = A[(A.indexOf(a) + 1) % A.length];
    $("#ins-article").innerHTML = `<a class="link" href="#">All articles</a><small class="fine">${esc(a.tag)} &middot; ${when(a.date)} &middot; ${mins(a)} min read</small><h2>${esc(a.title)}</h2>${a.body.map((p) => `<p>${esc(p)}</p>`).join("")}<p class="fine">This article is educational. It is not financial advice.</p><a class="art" href="#${next.slug}"><small>Next</small><strong>${esc(next.title)}</strong></a>`;
    scrollTo(0, 0);
  }
  addEventListener("hashchange", route); route();
})();
