/* Public, client-side settings. Never put secret keys in this file.
   The Supabase anon key is designed to be public; access is enforced by RLS in supabase/schema.sql. */
window.MODEFX_CONFIG = {
  supabaseUrl: "https://aicrlpbnvbwpmjlgoddw.supabase.co",       // e.g. https://abcd1234.supabase.co
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY3JscGJudmJ3cG1qbGdvZGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MTUwNDQsImV4cCI6MjEwODQ5MTA0NH0.fIeszV6BxXjWJtmMTo9dey3VniEtFqshR4XS1fKgZaw",   // Project Settings > API > anon public key
  apiBase: "https://modefx.vercel.app",           // "" = same origin (Vercel). Set a full URL if the API lives elsewhere.

  // Shown in the Help section. Leave both empty to hide the section.
  supportEmail: "modefx.ke@gmail.com",
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
        "10 starter lessons"
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
        "22 advanced lessons with calculators",
        "Market explainers and an automated journal review",
        "Economic calendar in Nairobi time, with plain-language notes",
        "Strategy playbook with pre-trade checklists",
        "Community board: post and comment"
      ]
    },
    {
      id: "golden", name: "Golden", price: 5999, requires: "pro",
      line: "Predictions with levels, plus a saved link to your Deriv account.",
      features: [
        "Everything in Pro, unlocked forever",
        "Market predictions from real candles, with stop and target levels",
        "Reasons behind every prediction, so you learn to read the chart",
        "Save your Deriv login ID and open your broker in one tap"
      ]
    }
  ]
};
