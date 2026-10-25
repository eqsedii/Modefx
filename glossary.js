(() => {
  "use strict";
  const T = [
    ["Pip", "The smallest standard price step in a forex pair, usually the fourth decimal place (0.0001)."],
    ["Spread", "The gap between the price you can buy at and the price you can sell at. It is a cost on every trade."],
    ["Leverage", "Borrowing from a broker to control a larger position than your balance alone allows. It magnifies gains and losses equally."],
    ["Margin", "The deposit a broker holds to keep a leveraged position open."],
    ["Stop-loss", "An order that closes a trade at a set price to limit the loss."],
    ["Take-profit", "An order that closes a trade at a set price to lock in a gain."],
    ["Drawdown", "The fall from an account's highest balance to its next low. It measures how deep the bad patches go."],
    ["Bull market", "A market in which prices are rising or expected to rise."],
    ["Bear market", "A market in which prices are falling or expected to fall."],
    ["Candlestick", "A chart bar showing the open, high, low and close for one period."],
    ["Support", "A price area where falling prices have repeatedly stopped and turned up."],
    ["Resistance", "A price area where rising prices have repeatedly stopped and turned down."],
    ["Trend", "The general direction of price over a period: up, down or sideways."],
    ["Breakout", "A move of price beyond a support or resistance level, often on rising activity."],
    ["Volatility", "How much and how fast a price moves. High volatility means larger swings."],
    ["Liquidity", "How easily an asset can be bought or sold without moving its price."],
    ["Slippage", "The difference between the price you expected and the price you actually got."],
    ["Lot", "A standard unit of trade size. A standard forex lot is 100,000 units of the base currency."],
    ["Long", "A trade that profits if the price rises. Also called a buy."],
    ["Short", "A trade that profits if the price falls. Also called a sell."],
    ["Market order", "An order to trade immediately at the best available price."],
    ["Limit order", "An order to trade only at a chosen price or better."],
    ["Moving average", "The average price over a set number of periods, redrawn each period to smooth out noise."],
    ["RSI", "Relative Strength Index. A 0 to 100 gauge of recent momentum. Above 70 is often read as stretched up, below 30 as stretched down."],
    ["ATR", "Average True Range. A measure of how far a market typically moves in one period, used to size stops."],
    ["Risk-reward ratio", "How much you stand to gain compared with how much you risk. A 1:2 ratio risks 1 unit to try to gain 2."],
    ["Position size", "How many units of an asset you trade. It should come from your planned risk, not from a hunch."],
    ["Equity", "Your account balance plus or minus the profit or loss on open trades."],
    ["Scalping", "A style of very short trades that aim for small gains many times."],
    ["Day trading", "Opening and closing trades within the same day."],
    ["Swing trading", "Holding trades for days or weeks to capture larger moves."],
    ["Broker", "A company that gives you access to a market and carries out your trades."],
    ["CFD", "Contract for difference. A product that pays the change in an asset's price without owning the asset. It is high risk."],
    ["Economic calendar", "A schedule of data releases and central bank decisions that can move markets."],
    ["Backtest", "Testing a strategy on past price data to see how it would have performed. Past results do not guarantee future ones."]
  ].sort((a, b) => a[0].localeCompare(b[0]));
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let letter = "";
  const letters = [...new Set(T.map((t) => t[0][0].toUpperCase()))];
  $("#g-letters").innerHTML = `<button type="button" data-l="" aria-pressed="true" data-quiet>All</button>` + letters.map((l) => `<button type="button" data-l="${l}" aria-pressed="false" data-quiet>${l}</button>`).join("");
  function render() {
    const q = $("#g-q").value.trim().toLowerCase();
    const list = T.filter((t) => (!letter || t[0][0].toUpperCase() === letter) && (!q || (t[0] + " " + t[1]).toLowerCase().includes(q)));
    $("#g-list").innerHTML = list.length ? list.map((t) => `<div class="term"><dt>${esc(t[0])}</dt><dd>${esc(t[1])}</dd></div>`).join("") : '<p class="fine">No terms match. Try a shorter word.</p>';
    $("#g-count").textContent = `${list.length} of ${T.length} terms`;
  }
  $("#g-q").addEventListener("input", render);
  $("#g-letters").addEventListener("click", (e) => { const b = e.target.closest("[data-l]"); if (!b) return; letter = b.dataset.l; document.querySelectorAll("#g-letters button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); render(); });
  render();
})();
