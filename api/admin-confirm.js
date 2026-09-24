import { admin } from "./_db.js";
import { requireAdmin } from "./_admin.js";
import { TIERS } from "./_plans.js";

// POST /api/admin-confirm   { paymentId, mpesaReceipt? }   Authorization: Bearer <admin token>
// Manually marks a payment as successful and grants the tier — for when a real M-Pesa
// payment went through but PayHero's automatic callback never reached the webhook.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const { paymentId, mpesaReceipt } = req.body || {};
  if (!paymentId) return res.status(400).json({ error: "Missing paymentId." });

  const { data: pay } = await admin.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!pay) return res.status(404).json({ error: "Payment not found." });
  if (pay.status === "success") return res.status(200).json({ ok: true, note: "already confirmed" });

  const { data: won } = await admin.from("payments")
    .update({
      status: "success",
      mpesa_receipt: mpesaReceipt || pay.mpesa_receipt || "manual-confirm",
      failure_reason: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", pay.id).neq("status", "success").select("id");
  if (!won || !won.length) return res.status(409).json({ error: "This payment was just updated by something else — refresh and check its status." });

  const tier = TIERS[pay.plan_id];
  await admin.rpc("grant_entitlement", { p_user: pay.user_id, p_tier: pay.plan_id, p_lock_days: tier.lockDays, p_payment: pay.id });

  return res.status(200).json({ ok: true });
}
