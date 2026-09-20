(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmtKES = (n) => "KSh " + Number(n).toLocaleString("en-KE");
  const ACCOUNT_URL = new URL("account.html", location.href).href;

  /* ---------------- Loader (short video on every button click) ---------------- */
  const Loader = (() => {
    const el = $("#loader"), v = $("video", el);
    let pending = 0, until = 0, timer;
    const show = () => {
      el.classList.add("on"); el.setAttribute("aria-hidden", "false");
      try { v.currentTime = 0; v.play().catch(() => {}); } catch (_) {}
    };
    const hide = () => { el.classList.remove("on"); el.setAttribute("aria-hidden", "true"); v.pause(); };
    const check = () => {
      clearTimeout(timer);
      if (pending > 0) return;
      const left = until - Date.now();
      if (left > 0) { timer = setTimeout(check, left); return; }
      hide();
    };
    const begin = (min) => {
      if (!el.classList.contains("on")) { until = 0; show(); }
      until = Math.max(until, Date.now() + min);
    };
    return {
      flash(min = 1500) { begin(min); check(); },
      run(promise, min = 1500) {
        pending++; begin(min);
        return Promise.resolve(promise).finally(() => { pending--; check(); });
      }
    };
  })();

  // Any button click shows the loader. Buttons that are links to another page wait a moment, then go.
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button, .btn");
    if (!b || b.disabled || b.closest("#intro") || b.closest("#loader")) return;
    if (b.matches("a.btn")) {
      const sameSite = b.origin === location.origin && b.target !== "_blank" && !b.hasAttribute("download");
      const samePage = b.pathname === location.pathname && b.hash;
      if (sameSite && !samePage && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        Loader.flash(1000);
        setTimeout(() => { location.href = b.href; }, 1000);
        return;
      }
    }
    if (b.hasAttribute("data-async") || b.hasAttribute("data-quiet")) return;
    Loader.flash();
  });

  /* ---------------- Background video ---------------- */
  (function bg() {
    const v = $(".bgvid video"); if (!v) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { v.removeAttribute("autoplay"); v.pause(); return; }
    const p = v.play(); if (p && p.catch) p.catch(() => {}); // if blocked, the poster image stays
  })();

  /* ---------------- Intro (home page only, once per session) ---------------- */
  (function intro() {
    const el = $("#intro"); if (!el) return;
    const v = $("video", el);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ended = false;
    const end = () => {
      if (ended) return; ended = true;
      try { sessionStorage.setItem("mfx-intro", "1"); } catch (_) {}
      el.classList.add("done");
      document.body.classList.remove("intro-lock");
      v.pause();
      setTimeout(() => el.remove(), 800);
    };
    let seen = false;
    try { seen = sessionStorage.getItem("mfx-intro") === "1"; } catch (_) {}
    if (seen || reduce) { el.remove(); document.body.classList.remove("intro-lock"); return; }
    v.addEventListener("ended", end);
    $("#intro-skip").addEventListener("click", end);
    const snd = $("#intro-sound");
    snd.addEventListener("click", () => {
      v.muted = !v.muted;
      snd.textContent = v.muted ? "Sound off" : "Sound on";
      snd.setAttribute("aria-pressed", String(!v.muted));
    });
    const p = v.play();
    if (p && p.catch) p.catch(end); // autoplay blocked: go straight to the site
    setTimeout(end, 12000);          // safety net
  })();

  /* ---------------- Shared bits ---------------- */
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
  $$("[data-broker-name]").forEach((n) => (n.textContent = C.brokerName || "a licensed broker"));
  const bl = $("#broker-link"); if (bl && C.brokerUrl) bl.href = C.brokerUrl;

  if (C.supportEmail || C.supportWhatsApp) {
    const sec = $("#support");
    if (sec) {
      sec.hidden = false;
      if (C.supportEmail) { const a = $("#support-email"); a.href = "mailto:" + C.supportEmail; a.hidden = false; }
      if (C.supportWhatsApp) { const a = $("#support-wa"); a.href = "https://wa.me/" + C.supportWhatsApp; a.hidden = false; }
    }
  }

  /* ---------------- Markets (demo data, not live) ---------------- */
  const mlist = $("#market-list");
  if (mlist) {
    const DEMO = [
      { sym: "EUR/USD", nm: "Euro / US dollar", cls: "Forex", px: "1.0842", chg: 0.21, seed: 3 },
      { sym: "USD/KES", nm: "US dollar / Kenyan shilling", cls: "Forex", px: "129.10", chg: -0.05, seed: 8 },
      { sym: "BTC/USD", nm: "Bitcoin", cls: "Crypto", px: "64,210", chg: 1.84, seed: 15 },
      { sym: "XAU/USD", nm: "Gold", cls: "Commodity", px: "2,352.40", chg: -0.32, seed: 21 },
      { sym: "SCOM", nm: "Safaricom (NSE)", cls: "Stock", px: "17.85", chg: 0.56, seed: 34 },
      { sym: "US100", nm: "Nasdaq 100 index", cls: "Index", px: "18,410", chg: 0.74, seed: 42 }
    ];
    const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const spark = (seed, up) => {
      const r = rng(seed * 977 + 13), n = 28; let y = 0; const pts = [];
      for (let i = 0; i < n; i++) { y += (r() - (up ? 0.42 : 0.58)) * 4; pts.push(y); }
      const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
      const d = pts.map((v, i) => `${(i / (n - 1)) * 130},${32 - ((v - min) / span) * 30}`).join(" ");
      const col = up ? "#3ddc97" : "#ff7a88";
      return `<svg viewBox="0 0 130 34" aria-hidden="true" preserveAspectRatio="none"><polyline points="${d}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    };
    mlist.innerHTML = DEMO.map((m) => {
      const up = m.chg >= 0;
      return `<li class="market"><span class="sym">${m.sym}</span><span class="nm">${m.nm}</span>
        <span class="cls">${m.cls}</span>${spark(m.seed, up)}
        <span class="px">${m.px}</span><span class="chg ${up ? "up" : "down"}">${up ? "+" : ""}${m.chg.toFixed(2)}%</span></li>`;
    }).join("");
  }

  /* ---------------- Plans ---------------- */
  const planList = $("#plan-list");
  if (planList) {
    (C.plans || []).forEach((p) => {
      const art = document.createElement("article");
      art.className = "plan";
      art.innerHTML = `
        <div class="plan-head"><div class="plan-name"></div><p></p></div>
        <ul></ul>
        <div class="plan-buy">
          <div class="price"><span class="amt"></span><small class="dur"></small></div>
          <button type="button" class="btn btn-primary" data-plan="${p.id}"></button>
        </div>`;
      $(".plan-name", art).textContent = p.name;
      $(".plan-head p", art).textContent = p.line;
      p.features.forEach((f) => { const li = document.createElement("li"); li.textContent = f; $("ul", art).append(li); });
      $(".amt", art).textContent = fmtKES(p.price);
      $(".dur", art).textContent = `for ${p.days} days`;
      $(".btn", art).textContent = `Get ${p.name}`;
      planList.append(art);
    });
  }

  /* ---------------- Auth (Supabase) ---------------- */
  let sb = null, session = null, mode = "signin";
  const msg = (el, text, kind = "") => { el.textContent = text; el.className = "msg " + kind; };
  const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  const friendly = (error) => {
    const m = (error.message || "").toLowerCase();
    if (m.includes("invalid login")) return "Email or password is incorrect.";
    if (m.includes("already registered")) return "An account with this email already exists. Try signing in.";
    if (m.includes("email not confirmed")) return "Verify your email first. Check your inbox for the link.";
    if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a few minutes and try again.";
    return error.message || "Something went wrong. Try again.";
  };

  async function getSB() {
    if (sb) return sb;
    if (!C.supabaseUrl || !C.supabaseAnonKey) return null;
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
    return sb;
  }

  const navAccount = $("#nav-account");
  const authForm = $("#auth-form");   // only on account.html

  async function planStatus() {
    try {
      const { data } = await sb.from("subscriptions").select("plan_id, ends_at")
        .gt("ends_at", new Date().toISOString()).order("ends_at", { ascending: false }).limit(1);
      if (data && data[0]) {
        const p = (C.plans || []).find((x) => x.id === data[0].plan_id);
        const d = new Date(data[0].ends_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
        return `${p ? p.name : data[0].plan_id}, until ${d}`;
      }
    } catch (_) {}
    return "No active plan";
  }

  async function render(s) {
    session = s;
    if (navAccount) navAccount.textContent = s ? "Account" : "Sign in";
    if (!authForm) return;
    const recovering = !$("#recovery-form").hidden;
    $("#auth-forms").hidden = !!s || recovering;
    $("#account").hidden = !s || recovering;
    if (s) {
      $("#acct-email").textContent = s.user.email;
      let next = null;
      try { next = sessionStorage.getItem("mfx-next"); sessionStorage.removeItem("mfx-next"); } catch (_) {}
      if (next && !recovering) { location.href = next; return; }
      $("#acct-plan").textContent = await planStatus();
    }
  }

  (async () => {
    const client = await getSB();
    if (!client) return;
    client.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY" && authForm) {
        $("#recovery-form").hidden = false; $("#auth-forms").hidden = true; $("#account").hidden = true;
      } else { render(s); }
    });
    const { data } = await client.auth.getSession();
    render(data.session);
  })();

  if (authForm) {
    const authMsg = $("#auth-msg");
    const notConnected = () => msg(authMsg, "Sign-in isn't connected yet. Add your Supabase URL and anon key in config.js.", "info");

    function setMode(m) {
      mode = m;
      const up = m === "signup";
      $("#tab-signin").setAttribute("aria-selected", String(!up));
      $("#tab-signup").setAttribute("aria-selected", String(up));
      $("#auth-submit").textContent = up ? "Create account" : "Sign in";
      $("#password").autocomplete = up ? "new-password" : "current-password";
      $("#consent-row").hidden = !up;
      $("#forgot").hidden = up;
      msg(authMsg, "");
    }
    $("#tab-signin").addEventListener("click", () => setMode("signin"));
    $("#tab-signup").addEventListener("click", () => setMode("signup"));

    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "signup") setMode("signup");
    if (params.get("next")) { try { sessionStorage.setItem("mfx-next", params.get("next")); } catch (_) {} }
    try { if (sessionStorage.getItem("mfx-notice")) { msg(authMsg, sessionStorage.getItem("mfx-notice"), "info"); sessionStorage.removeItem("mfx-notice"); } } catch (_) {}

    $("#pw-toggle").addEventListener("click", (e) => {
      const i = $("#password"), show = i.type === "password";
      i.type = show ? "text" : "password";
      e.currentTarget.textContent = show ? "Hide" : "Show";
      e.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });

    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#email").value.trim(), password = $("#password").value;
      if (!validEmail(email)) return msg(authMsg, "Enter a valid email address.");
      if (password.length < 8) return msg(authMsg, "Your password needs at least 8 characters.");
      if (mode === "signup" && !$("#consent").checked) return msg(authMsg, "Please confirm you understand Modefx is simulated practice.");
      msg(authMsg, "");
      const btn = $("#auth-submit"); btn.disabled = true;
      try {
        const client = await getSB();
        if (!client) { notConnected(); return; }
        const { data, error } = await Loader.run(
          mode === "signup"
            ? client.auth.signUp({ email, password, options: { emailRedirectTo: ACCOUNT_URL } })
            : client.auth.signInWithPassword({ email, password })
        );
        if (error) return msg(authMsg, friendly(error));
        if (mode === "signup" && !data.session) msg(authMsg, "Check your email and open the verification link to finish creating your account.", "ok");
      } catch (err) {
        msg(authMsg, "Something went wrong. Check your connection and try again.");
      } finally { btn.disabled = false; }
    });

    $("#google").addEventListener("click", async () => {
      const client = await getSB();
      if (!client) return notConnected();
      const { error } = await Loader.run(client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: ACCOUNT_URL } }));
      if (error) msg(authMsg, friendly(error));
    });

    $("#forgot").addEventListener("click", async () => {
      const email = $("#email").value.trim();
      if (!validEmail(email)) return msg(authMsg, "Enter your email above, then tap Forgot password again.");
      const client = await getSB();
      if (!client) return notConnected();
      const { error } = await Loader.run(client.auth.resetPasswordForEmail(email, { redirectTo: ACCOUNT_URL }));
      if (error) return msg(authMsg, friendly(error));
      msg(authMsg, "If an account exists for that email, a reset link is on its way.", "ok");
    });

    $("#recovery-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pw = $("#new-password").value, out = $("#recovery-msg");
      if (pw.length < 8) return msg(out, "Your password needs at least 8 characters.");
      const client = await getSB();
      const { error } = await Loader.run(client.auth.updateUser({ password: pw }));
      if (error) return msg(out, friendly(error));
      $("#recovery-form").hidden = true;
      render(session);
    });

    $("#signout").addEventListener("click", async () => {
      const client = await getSB();
      await Loader.run(client.auth.signOut());
    });
  }

  /* ---------------- Checkout (M-Pesa via PayHero, confirmed server-side) ---------------- */
  const dlg = $("#checkout");
  if (dlg && planList) {
    const coMsg = $("#co-msg"), coPay = $("#co-pay");
    let chosen = null, pollTimer = null;

    planList.addEventListener("click", (e) => {
      const b = e.target.closest("[data-plan]"); if (!b) return;
      chosen = (C.plans || []).find((p) => p.id === b.dataset.plan);
      if (!session) {
        try {
          sessionStorage.setItem("mfx-next", "plans.html");
          sessionStorage.setItem("mfx-notice", `Create an account or sign in to get ${chosen.name}.`);
        } catch (_) {}
        setTimeout(() => { location.href = "account.html?mode=signup"; }, 900);
        return;
      }
      $("#co-summary").textContent = `${chosen.name}: ${fmtKES(chosen.price)} for ${chosen.days} days`;
      coPay.disabled = false; coPay.onclick = null; coPay.textContent = "Send payment prompt"; msg(coMsg, "");
      dlg.showModal();
    });
    dlg.addEventListener("close", () => clearTimeout(pollTimer));

    const normalizePhone = (raw) => {
      const d = raw.replace(/[\s()-]/g, "");
      const m = d.match(/^(?:\+?254|0)([71]\d{8})$/);
      return m ? "0" + m[1] : null;
    };

    $("#co-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const phone = normalizePhone($("#co-phone").value);
      if (!phone) return msg(coMsg, "Enter a valid Safaricom number, like 0712 345 678.");
      coPay.disabled = true; msg(coMsg, "");
      try {
        const res = await Loader.run(fetch((C.apiBase || "") + "/api/payhero-stk", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
          body: JSON.stringify({ planId: chosen.id, phone })
        }));
        const body = await res.json().catch(() => ({}));
        if (!res.ok) { msg(coMsg, body.error || "We couldn't start the payment. Try again."); coPay.disabled = false; return; }
        msg(coMsg, "Check your phone and enter your M-Pesa PIN to approve the payment.", "info");
        coPay.textContent = "Waiting for confirmation…";
        poll(body.reference, Date.now());
      } catch (_) {
        msg(coMsg, "Couldn't reach the server. Check your connection and try again.");
        coPay.disabled = false;
      }
    });

    function poll(ref, started) {
      pollTimer = setTimeout(async () => {
        if (!dlg.open) return;
        const { data } = await sb.from("payments").select("status, failure_reason").eq("external_reference", ref).maybeSingle();
        if (data && data.status === "success") {
          msg(coMsg, "Payment received. Your plan is now active.", "ok");
          coPay.textContent = "Done"; coPay.disabled = false;
          coPay.onclick = (ev) => { ev.preventDefault(); dlg.close(); coPay.onclick = null; coPay.textContent = "Send payment prompt"; };
          return;
        }
        if (data && data.status === "failed") {
          msg(coMsg, "The payment wasn't completed" + (data.failure_reason ? ` (${data.failure_reason}).` : ".") + " Try again.");
          coPay.disabled = false; coPay.textContent = "Send payment prompt"; return;
        }
        if (Date.now() - started > 120000) {
          msg(coMsg, "We haven't received confirmation yet. If M-Pesa charged you, your plan will activate automatically. If it doesn't, contact support with your M-Pesa message.");
          coPay.disabled = false; coPay.textContent = "Send payment prompt"; return;
        }
        poll(ref, started);
      }, 3000);
    }
  }
})();
