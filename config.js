/* Public, client-side settings. Never put secret keys in this file.
   The Supabase anon key is designed to be public; access is enforced by RLS in supabase/schema.sql. */
window.MODEFX_CONFIG = {
  supabaseUrl: "",       // e.g. https://abcd1234.supabase.co
  supabaseAnonKey: "",   // Project Settings > API > anon public key
  apiBase: "",           // "" = same origin (Vercel). Set a full URL if the API lives elsewhere.

  // Shown in the Support section. Leave both empty to hide the section.
  supportEmail: "",
  supportWhatsApp: "",   // international format, digits only, e.g. 2547XXXXXXXX

  // Real-money trading is done on a separate, licensed broker. Modefx only links out.
  brokerName: "Deriv",
  brokerUrl: "https://deriv.com",

  // Display copy only. Amounts and durations are enforced on the server in api/_plans.js.
  // Keep the two files in sync.
  plans: [
    {
      id: "spark", name: "Spark", price: 99, days: 7,
      line: "A week of guided practice to see if Modefx fits you.",
      features: [
        "Daily plain-language market summary",
        "Paper trading account with virtual balance",
        "Trade journal, up to 20 entries",
        "5 starter lessons"
      ]
    },
    {
      id: "pulse", name: "Pulse", price: 199, days: 14,
      line: "Two weeks to build a routine with lessons and challenges.",
      features: [
        "Everything in Spark",
        "Lesson library, levels 1 and 2",
        "Stop-loss, take-profit and position-size calculator",
        "Weekly practice challenges",
        "Trade journal, up to 100 entries"
      ]
    },
    {
      id: "drive", name: "Drive", price: 299, days: 30,
      line: "A month of full practice with real performance analytics.",
      features: [
        "Everything in Pulse",
        "Analytics: win rate, drawdown, risk per trade",
        "Unlimited journal entries with screenshots",
        "Paper trading across forex, crypto, stocks and indices",
        "Post and comment in the community"
      ]
    },
    {
      id: "apex", name: "Apex", price: 599, days: 30,
      line: "Explanations and reviews that help you understand your own trades.",
      features: [
        "Everything in Drive",
        "AI market explainers and journal review (monthly fair-use limit)",
        "Economic calendar with plain-language notes",
        "Advanced courses"
      ]
    },
    {
      id: "zenith", name: "Zenith", price: 999, days: 30,
      line: "Everything Modefx offers, with the highest limits.",
      features: [
        "Everything in Apex",
        "Full course library",
        "Highest AI usage limits",
        "Strategy documentation tools",
        "Early access to new tools"
      ]
    }
  ]
};
