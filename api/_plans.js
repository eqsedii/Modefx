// Source of truth for prices and the unlock order. The browser never decides the amount.
// Each tier requires the one before it to have been paid at least once (see payhero-stk.js).
// starter is the only tier with an expiry: it locks after 7 days unless growth is paid,
// at which point starter (and growth) stay unlocked forever.
export const TIER_ORDER = ["starter", "growth", "pro", "golden"];

export const TIERS = {
  starter: { name: "Starter", amount: 99, requires: null, lockDays: 7 },
  growth:  { name: "Growth",  amount: 599, requires: "starter", lockDays: null },
  pro:     { name: "Pro",     amount: 2999, requires: "growth", lockDays: null },
  golden:  { name: "Golden",  amount: 5999, requires: "pro", lockDays: null }
};
