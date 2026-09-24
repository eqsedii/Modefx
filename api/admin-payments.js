import { admin } from "./_db.js";
import { requireAdmin } from "./_admin.js";

// GET /api/admin-payments   Authorization: Bearer <supabase access token of an admin>
// Returns the most recent 100 payments, newest first, with the user's email attached.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const { data, error } = await admin.from("payments")
    .select("id, plan_id, amount, status, phone_last4, external_reference, mpesa_receipt, failure_reason, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: "Couldn't load payments." });

  const ids = [...new Set(data.map((p) => p.user_id))];
  const emails = {};
  await Promise.all(ids.map(async (id) => {
    const { data: u } = await admin.auth.admin.getUserById(id);
    if (u?.user) emails[id] = u.user.email;
  }));

  return res.status(200).json({ payments: data.map((p) => ({ ...p, email: emails[p.user_id] || null })) });
}
