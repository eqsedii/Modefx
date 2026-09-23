import crypto from "node:crypto";
import { admin } from "./_db.js";
import { TIERS } from "./_plans.js";

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// POST /api/payhero-webhook?token=<PAYHERO_WEBHOOK_TOKEN>
// PayHero calls this when the STK payment finishes. This is the ONLY place a tier is unlocked.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!safeEqual(req.query.token || "", process.env.PAYHERO_WEBHOOK_TOKEN || "")) return res.status(401).end();

  // TODO: confirm these field names against a real callback in your PayHero dashboard/logs.
  const body = req.body || {};
  const r = body.response || body;
  const ref = r.ExternalReference || r.external_reference;
  if (!ref) return res.status(400).json({ error: "missing reference" });

  const { data: pay } = await admin.from("payments").select("*").eq("external_reference", ref).maybeSingle();
  if (!pay) return res.status(404).json({ error: "unknown reference" });
  if (pay.status !== "pending") return res.status(200).json({ ok: true, note: "already processed" }); // idempotent

  const success = (r.ResultCode === 0 || r.ResultCode === "0") && String(r.Status || "").toLowerCase() === "success";
  const amountOk = r.Amount == null || Number(r.Amount) === pay.amount;

  if (success && amountOk) {
    // Conditional update: only the first delivery wins, so a repeated callback can't double-unlock.
    const { data: won } = await admin.from("payments")
      .update({ status: "success", mpesa_receipt: r.MpesaReceiptNumber || null, updated_at: new Date().toISOString() })
      .eq("id", pay.id).eq("status", "pending").select("id");
    if (won && won.length) {
      const tier = TIERS[pay.plan_id];
      await admin.rpc("grant_entitlement", { p_user: pay.user_id, p_tier: pay.plan_id, p_lock_days: tier.lockDays, p_payment: pay.id });
    }
  } else {
    await admin.from("payments")
      .update({ status: "failed", failure_reason: success ? "amount_mismatch" : String(r.ResultDesc || "not_completed").slice(0, 120), updated_at: new Date().toISOString() })
      .eq("id", pay.id).eq("status", "pending");
  }
  return res.status(200).json({ ok: true });
}
