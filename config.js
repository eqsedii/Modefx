/* Public, client-side settings. Never put secret keys in this file.
   The Supabase anon key is designed to be public; access is enforced by RLS in supabase/schema.sql. */
window.MODEFX_CONFIG = {
  supabaseUrl: "",       // e.g. https://abcd1234.supabase.co
  supabaseAnonKey: "",   // Project Settings > API > anon public key
  apiBase: "",           // "" = same origin (Vercel). Set a full URL if the API lives elsewhere.

  // Shown in the Help section. Leave both empty to hide the section.
  supportEmail: "",
  supportWhatsApp: "",   // international format, digits only, e.g. 2547XXXXXXXX

  // Real-money trading is done on a separate, licensed broker. Modefx only links out.
  brokerName: "Deriv",
  brokerUrl: "https://deriv.com",

  // Display copy only. Amounts and the unlock order are enforced on the server in api/_plans.js.
  // Keep the tier ids ("id") and prices in sync with that file.
  // Each tier requires the one before it: growth needs starter, pro needs growth, golden needs pro.
  tiers: [
    {
      id: "starter", name: "Starter", price: 99,
      line: "Your first step. Unlocks for 7 days, then locks until you get Growth.",
      features: [
        "Simulated trading account with a virtual balance",
        "Basic trade journal, up to 20 entries",
        "Daily plain-language market summary",
        "5 starter lessons"
      ]
    },
    {
      id: "growth", name: "Growth", price: 599, requires: "starter",
      line: "Unlocks live market status and makes Starter permanent.",
      features: [
        "Everything in Starter, unlocked forever",
        "Live market status and prices",
        "Full trade journal with analytics (win rate, drawdown, risk)",
        "Practice challenges and XP",
        "Full lesson library"
      ]
    },
    {
      id: "pro", name: "Pro", price: 2999, requires: "growth",
      line: "For traders who want deeper tools and the community.",
      features: [
        "Everything in Growth, unlocked forever",
        "AI market explainers and journal review",
        "Economic calendar with plain-language notes",
        "Post and comment in the community",
        "Strategy documentation tools"
      ]
    },
    {
      id: "golden", name: "Golden", price: 5999, requires: "pro",
      line: "The full platform, including a link to your Deriv account.",
      features: [
        "Everything in Pro, unlocked forever",
        "Link your Deriv account",
        "AI market predictions (educational, not guaranteed)",
        "Highest usage limits"
      ]
    }
  ]
};
