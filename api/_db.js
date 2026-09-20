import { createClient } from "@supabase/supabase-js";

// Service-role client: server only. Bypasses RLS, so never import this in browser code.
export const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
