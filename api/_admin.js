import { admin } from "./_db.js";

// Confirms the request's bearer token belongs to a signed-in user whose profile
// role is 'admin'. On failure, writes the response itself and returns null —
// callers should just check `if (!user) return;`.
export async function requireAdmin(req, res) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) { res.status(401).json({ error: "Sign in to continue." }); return null; }
  const { data: auth, error } = await admin.auth.getUser(token);
  if (error || !auth?.user) { res.status(401).json({ error: "Your session has expired. Sign in again." }); return null; }
  const { data: profile } = await admin.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (!profile || profile.role !== "admin") { res.status(403).json({ error: "Not authorized." }); return null; }
  return auth.user;
}
