(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  let sb = null, session = null;
  const fmtKES = (n) => "KSh " + Number(n).toLocaleString("en-KE");

  async function getSB() {
    if (sb) return sb;
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
    return sb;
  }

  async function api(path, opts = {}) {
    const res = await fetch((C.apiBase || "") + path, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, ...(opts.headers || {}) }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Request failed.");
    return body;
  }

  const statusEl = $("#admin-status"), listEl = $("#payment-list");

  function row(p) {
    const when = new Date(p.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
    const cls = p.status === "success" ? "ok" : p.status === "failed" ? "err" : "info";
    const detail = p.status === "success" ? (p.mpesa_receipt || "—") : (p.failure_reason || "");
    const action = p.status === "success"
      ? "—"
      : `<form class="confirm-form" data-id="${p.id}">
           <input type="text" class="receipt" placeholder="M-Pesa receipt (optional)">
           <button type="submit" class="btn btn-ghost" data-async>Mark as paid</button>
         </form>`;
    return `<tr>
      <td>${when}</td>
      <td>${p.email || p.user_id.slice(0, 8)}</td>
      <td>${p.plan_id}</td>
      <td>${fmtKES(p.amount)}</td>
      <td>•••${p.phone_last4 || "----"}</td>
      <td class="${cls}">${p.status}${detail ? ` — ${detail}` : ""}</td>
      <td>${action}</td>
    </tr>`;
  }

  async function load() {
    statusEl.textContent = "Loading…";
    try {
      const { payments } = await api("/api/admin-payments");
      listEl.innerHTML = payments.map(row).join("");
      statusEl.textContent = payments.length ? "" : "No payments yet.";
    } catch (e) {
      statusEl.textContent = e.message;
    }
  }

  document.addEventListener("submit", async (e) => {
    const f = e.target.closest(".confirm-form");
    if (!f) return;
    e.preventDefault();
    const id = f.dataset.id, receipt = $(".receipt", f).value.trim();
    const btn = f.querySelector("button"); btn.disabled = true; btn.textContent = "Confirming…";
    try {
      await api("/api/admin-confirm", { method: "POST", body: JSON.stringify({ paymentId: id, mpesaReceipt: receipt }) });
      await load();
    } catch (err) {
      alert(err.message);
      btn.disabled = false; btn.textContent = "Mark as paid";
    }
  });

  $("#admin-signout").addEventListener("click", async () => {
    const client = await getSB();
    await client.auth.signOut();
    location.href = "index.html";
  });

  (async () => {
    const client = await getSB();
    const { data } = await client.auth.getSession();
    if (!data.session) {
      try { sessionStorage.setItem("mfx-next", "admin.html"); } catch (_) {}
      location.href = "account.html";
      return;
    }
    session = data.session;
    $("#admin-email").textContent = session.user.email;
    $("#admin-signout").hidden = false;
    load();
  })();
})();
