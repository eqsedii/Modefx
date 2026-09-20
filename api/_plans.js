// Source of truth for prices and durations. The browser never decides the amount.
// Keep in sync with the display copy in config.js.
export const PLANS = {
  spark:  { name: "Spark",  amount: 99,  days: 7 },
  pulse:  { name: "Pulse",  amount: 199, days: 14 },
  drive:  { name: "Drive",  amount: 299, days: 30 },
  apex:   { name: "Apex",   amount: 599, days: 30 },
  zenith: { name: "Zenith", amount: 999, days: 30 }
};
