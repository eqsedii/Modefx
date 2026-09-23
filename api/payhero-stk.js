import crypto from "node:crypto";
import { admin } from "./_db.js";
import { TIERS } from "./_plans.js";

// POST /api/payhero-stk  { tier, phone }   Authorization: Bearer <supabase access token>
// Creates a pending payment row, then asks PayHero to send an M-Pesa STK prompt.
// A tier is only activated later, by the webhook, after PayHero reports success.
export default async function handler(req, res) {
  // The site (GitHub Pages) and this API (Vercel) live on different addresses, so the
  // browser needs explicit permission (CORS) to call this endpoint from the page.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  const { data: auth, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !auth?.user) return res.status(401).json({ error: "Your session has expired. Sign in again." });
  const user = auth.user;

  const { tier: tierId, phone } = req.body || {};
  const tier = TIERS[tierId];
  if (!tier) return res.status(400).json({ error: "Unknown plan." });
  const m = String(phone || "").replace(/[\s()-]/g, "").match(/^(?:\+?254|0)([71]\d{8})$/);
  if (!m) return res.status(400).json({ error: "Enter a valid Safaricom number." });
  const msisdn = "0" + m[1];

  // Enforce the ladder: a tier can only be bought once its prerequisite has been paid,
  // and a tier the user already owns can't be bought again.
  const { data: owned } = await admin.from("entitlements").select("tier").eq("user_id", user.id);
  const ownedTiers = new Set((owned || []).map((r) => r.tier));
  if (ownedTiers.has(tierId)) return res.status(400).json({ error: `You already have ${tier.name}.` });
  if (tier.requires && !ownedTiers.has(tier.requires)) {
    return res.status(400).json({ error: `Get ${TIERS[tier.requires].name} first, then ${tier.name} unlocks.` });
  }

  // Basic abuse guard: no more than 3 pending prompts in 2 minutes per user.
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { count } = await admin.from("payments").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("status", "pending").gte("created_at", since);
  if ((count ?? 0) >= 3) return res.status(429).json({ error: "Please wait a couple of minutes before trying again." });

  const reference = "MFX-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  const { error: insErr } = await admin.from("payments").insert({
    user_id: user.id, plan_id: tierId, amount: tier.amount,
    external_reference: reference, status: "pending", phone_last4: msisdn.slice(-4)
  });
  if (insErr) return res.status(500).json({ error: "Couldn't start the payment. Try again." });

  // PAYHERO_BASIC_AUTH may be stored with or without a leading "Basic " — handle both.
  const rawAuth = String(process.env.PAYHERO_BASIC_AUTH || "");
  const authHeader = /^basic\s/i.test(rawAuth) ? rawAuth : `Basic ${rawAuth}`;

  try {
    const r = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader
      },
      body: JSON.stringify({
        amount: tier.amount,
        phone_number: msisdn,
        channel_id: Number(process.env.PAYHERO_CHANNEL_ID),
        provider: "m-pesa",
        external_reference: reference,
        callback_url: `${process.env.PUBLIC_BASE_URL}/api/payhero-webhook?token=${process.env.PAYHERO_WEBHOOK_TOKEN}`
      })
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || out.success === false) throw new Error("payhero_rejected");
  } catch (_) {
    await admin.from("payments").update({ status: "failed", failure_reason: "prompt_not_sent", updated_at: new Date().toISOString() })
      .eq("external_reference", reference).eq("status", "pending");
    return res.status(502).json({ error: "We couldn't send the M-Pesa prompt. Try again in a moment." });
  }

  return res.status(200).json({ reference });
}
