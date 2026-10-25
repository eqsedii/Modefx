(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const M = window.MFXMarket;
  const EXAMPLE_BALANCE = 10000;

  const LESSONS = [
    {
      id: "candles",
      title: "1. Reading a candlestick",
      body: `Every candle on your chart covers one slice of time. Its body shows where the price opened and closed; the thin lines above and below — the wicks — show how far it reached before settling.
A green candle closed higher than it opened. A red one closed lower. The blue line running through your chart is a moving average — it's just the average of the last 10 closes, smoothed into a line, so you can see the overall direction without the noise of every single candle.`,
      cta: { text: "Open any market and watch the candles form", href: "markets.html" },
      demo: `<div class="demo-chart" id="demo-candles"></div><p class="fine">This is EUR/USD, ticking live, right here.</p>`,
      wire(card) {
        if (typeof LightweightCharts === "undefined" || !M) return;
        const s = M.bySym("EUR/USD");
        const el = $("#demo-candles", card);
        const chart = LightweightCharts.createChart(el, {
          width: el.clientWidth, height: 160,
          layout: { background: { color: "transparent" }, textColor: "#a6b3d0", fontFamily: "Figtree, sans-serif" },
          grid: { vertLines: { color: "rgba(120,170,255,0.08)" }, horzLines: { color: "rgba(120,170,255,0.08)" } },
          rightPriceScale: { borderColor: "rgba(120,170,255,0.18)" },
          timeScale: { borderColor: "rgba(120,170,255,0.18)", timeVisible: true, secondsVisible: false }
        });
        const candles = chart.addCandlestickSeries({ upColor: "#3ddc97", downColor: "#ff7a88", borderVisible: false, wickUpColor: "#3ddc97", wickDownColor: "#ff7a88" });
        const ma = chart.addLineSeries({ color: "#22d3ff", lineWidth: 2 });
        let bars = M.candlesFor(s, 60000, 40);
        candles.setData(bars); ma.setData(M.sma(bars, 10));
        chart.timeScale().fitContent();
        setInterval(() => {
          const bucket = Math.floor((Math.floor(Date.now() / 60000) * 60000) / 1000);
          const price = M.priceOf(s);
          const last = bars[bars.length - 1];
          if (last.time !== bucket) { bars.push({ time: bucket, open: last.close, high: price, low: price, close: price }); }
          else { last.high = Math.max(last.high, price); last.low = Math.min(last.low, price); last.close = price; }
          candles.update(bars[bars.length - 1]);
          const m = M.sma(bars, 10); if (m.length) ma.update(m[m.length - 1]);
        }, 4000);
        window.addEventListener("resize", () => chart.applyOptions({ width: el.clientWidth }));
        window.addEventListener("mfx:real-quotes", () => {
          bars = M.candlesFor(s, 60000, 40);
          candles.setData(bars); ma.setData(M.sma(bars, 10));
        });
      }
    },
    {
      id: "journal",
      title: "2. Why Modefx makes you write a reason",
      body: `Notice that Modefx won't let you open or close a trade without saying why. That's not a form field for its own sake — it's the single habit that separates traders who improve from traders who just guess.
After a few trades, open your Journal and read your own reasons back. You'll start noticing patterns: trades you entered out of boredom versus trades you entered because you actually saw something. That difference is worth more than any tip anyone can give you.`,
      cta: { text: "Review your trades so far", href: "journal.html" },
      demo: `<label class="fine">Try writing a real entry reason</label>
        <input type="text" class="demo-input" id="demo-journal-in" placeholder="e.g. price bounced off a level I was watching">
        <button type="button" class="btn btn-ghost" data-quiet data-act="preview-journal">See it as a journal entry</button>
        <div class="demo-preview" id="demo-journal-out" hidden></div>`,
      wire(card) {
        $('[data-act="preview-journal"]', card).addEventListener("click", () => {
          const txt = $("#demo-journal-in", card).value.trim() || "(you didn't write one — notice how that feels compared to having a real reason)";
          const out = $("#demo-journal-out", card);
          out.hidden = false;
          out.innerHTML = `<strong>EUR/USD · buy</strong><br><span class="fine">In: ${txt}</span>`;
        });
      }
    },
    {
      id: "sizing",
      title: "3. Position sizing: the boring skill that matters most",
      body: `New traders obsess over which direction to trade. Experienced ones obsess over how much to risk. If you only ever risk a small, consistent slice of your balance on each trade — many traders use around 1% — one bad trade can't hurt you badly, and you stay in the game long enough to get better.
Try the calculator below with an example balance of KSh ${EXAMPLE_BALANCE.toLocaleString("en-KE")} — the real one in any market's Tools panel works exactly the same way.`,
      cta: { text: "Open the real calculator in a market", href: "markets.html" },
      demo: `<div class="tools-grid">
          <label>Risk % of balance<input type="number" class="demo-input" id="demo-risk" value="1" min="0.1" step="0.1"></label>
          <label>Stop distance<input type="number" class="demo-input" id="demo-stop" placeholder="e.g. 0.002" step="any"></label>
        </div>
        <p class="fine" id="demo-sizing-out">Enter both values to see a suggested quantity.</p>`,
      wire(card) {
        const update = () => {
          const risk = Number($("#demo-risk", card).value), stop = Number($("#demo-stop", card).value);
          const out = $("#demo-sizing-out", card);
          if (!(risk > 0) || !(stop > 0)) { out.textContent = "Enter both values to see a suggested quantity."; return; }
          const riskAmt = EXAMPLE_BALANCE * (risk / 100);
          out.textContent = `Risking ${risk}% of KSh ${EXAMPLE_BALANCE.toLocaleString("en-KE")} (≈ KSh ${riskAmt.toFixed(2)}) over that stop suggests a quantity of about ${(riskAmt / stop).toFixed(4)} units.`;
        };
        $("#demo-risk", card).addEventListener("input", update);
        $("#demo-stop", card).addEventListener("input", update);
      }
    },
    {
      id: "sltp",
      title: "4. Stop-loss and take-profit: deciding your exit before you enter",
      body: `A stop-loss is the price where you admit a trade isn't working and exit automatically. A take-profit is the price where you lock in a win instead of hoping for more. Deciding both before you enter — not while you're watching the price move and feeling anxious — is one of the clearest signs of a disciplined trader.
On Modefx, you can set both when you open a trade. One honest limit: they only trigger while you have the app open and polling the price, not while you're away — a real broker's servers watch prices continuously, which is part of what separates practice from the real thing.`,
      cta: { text: "Place a trade with a stop-loss set", href: "markets.html" },
      demo: `<div class="tools-grid">
          <label>Entry price<input type="number" class="demo-input" id="demo-entry" value="1.0840" step="any"></label>
          <label>Quantity<input type="number" class="demo-input" id="demo-qty" value="1" step="any"></label>
          <label>Stop-loss<input type="number" class="demo-input" id="demo-sl" value="1.0800" step="any"></label>
          <label>Take-profit<input type="number" class="demo-input" id="demo-tp" value="1.0900" step="any"></label>
        </div>
        <p class="fine" id="demo-sltp-out"></p>`,
      wire(card) {
        const update = () => {
          const entry = Number($("#demo-entry", card).value), qty = Number($("#demo-qty", card).value);
          const sl = Number($("#demo-sl", card).value), tp = Number($("#demo-tp", card).value);
          const out = $("#demo-sltp-out", card);
          if (![entry, qty, sl, tp].every((n) => n > 0)) { out.textContent = "Fill in all four fields."; return; }
          const loss = (sl - entry) * qty, gain = (tp - entry) * qty;
          const ratio = Math.abs(gain) / Math.abs(loss || 1);
          out.innerHTML = `If this hits your stop-loss: <span class="err">${loss.toFixed(2)}</span>. If it hits your take-profit: <span class="ok">+${gain.toFixed(2)}</span>. That's a reward-to-risk ratio of about ${ratio.toFixed(1)}:1.`;
        };
        ["demo-entry", "demo-qty", "demo-sl", "demo-tp"].forEach((id) => $("#" + id, card).addEventListener("input", update));
        update();
      }
    },
    {
      id: "longshort",
      title: "5. Buying and selling: profiting either direction",
      body: `"Buy" means you profit if the price rises — you're betting the thing you bought becomes worth more. "Sell" (also called shorting) means you profit if the price falls — you're betting it becomes worth less, and most practice platforms let you do this without ever owning the asset.
Try both directions below with the same two prices and see how the result flips.`,
      cta: { text: "Try both a Buy and a Sell", href: "markets.html" },
      demo: `<div class="tools-grid">
          <label>Entry price<input type="number" class="demo-input" id="demo-ls-entry" value="1.0840" step="any"></label>
          <label>Exit price<input type="number" class="demo-input" id="demo-ls-exit" value="1.0860" step="any"></label>
        </div>
        <div class="cta-row" style="justify-content:flex-start;margin:.6rem 0">
          <button type="button" class="btn btn-ghost" data-quiet data-act="ls-buy">If I bought</button>
          <button type="button" class="btn btn-ghost" data-quiet data-act="ls-sell">If I sold</button>
        </div>
        <p class="fine" id="demo-ls-out">Pick Buy or Sell to see the result.</p>`,
      wire(card) {
        const calc = (side) => {
          const entry = Number($("#demo-ls-entry", card).value), exit = Number($("#demo-ls-exit", card).value);
          const out = $("#demo-ls-out", card);
          if (!(entry > 0) || !(exit > 0)) { out.textContent = "Fill in both prices."; return; }
          const pnl = (exit - entry) * (side === "buy" ? 1 : -1);
          out.innerHTML = `${side === "buy" ? "Buying" : "Selling"} at ${entry} and exiting at ${exit}: <span class="${pnl >= 0 ? "ok" : "err"}">${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)} per unit</span>.`;
        };
        $('[data-act="ls-buy"]', card).addEventListener("click", () => calc("buy"));
        $('[data-act="ls-sell"]', card).addEventListener("click", () => calc("sell"));
      }
    },
    {
      id: "trend",
      title: "6. Trend, range, and support/resistance",
      body: `A market is in an uptrend when each high and low is higher than the last, a downtrend when each is lower, and a range when price keeps bouncing between a rough ceiling and floor instead of going anywhere. Most new traders fight the trend; most experienced ones trade with it, or wait for a range to break.
Support is a price level that's stopped a fall more than once, like a floor. Resistance is a level that's stopped a rise more than once, like a ceiling. They're not exact lines — think of them as zones, and watch what happens when price returns to one: does it bounce again, or break through?`,
      cta: { text: "Open a chart and spot the trend", href: "markets.html" },
      demo: `<p class="fine">Open any instrument's chart on Markets. Ask yourself three questions: are the highs and lows mostly rising, falling, or sideways? Has price touched roughly the same level more than once? If it just broke through a level it bounced off before, that's often a bigger move starting.</p>`
    },
    {
      id: "riskreward",
      title: "7. Risk/reward and why you don't need to win every trade",
      body: `Your win rate (the % of trades that end in profit) isn't the whole story. What matters is expectancy: your win rate multiplied by your average win, minus your loss rate multiplied by your average loss. A trader who's right only 4 times in 10 can still profit overall, if their average win is meaningfully bigger than their average loss.
This is why lesson 4's stop-loss and take-profit habit matters so much — it's what lets you control the size of your average win and loss in the first place, before you even know which trades will work out.`,
      cta: { text: "Set a stop-loss and take-profit on a real trade", href: "markets.html" },
      demo: `<div class="tools-grid">
          <label>Win rate %<input type="number" class="demo-input" id="demo-wr" value="40" min="0" max="100" step="1"></label>
          <label>Avg win (KSh)<input type="number" class="demo-input" id="demo-aw" value="300" step="any"></label>
          <label>Avg loss (KSh)<input type="number" class="demo-input" id="demo-al" value="100" step="any"></label>
        </div>
        <p class="fine" id="demo-rr-out"></p>`,
      wire(card) {
        const update = () => {
          const wr = Number($("#demo-wr", card).value) / 100, aw = Number($("#demo-aw", card).value), al = Number($("#demo-al", card).value);
          const out = $("#demo-rr-out", card);
          if (!(aw > 0) || !(al > 0) || wr < 0 || wr > 1) { out.textContent = "Fill in all three fields."; return; }
          const exp = wr * aw - (1 - wr) * al;
          out.innerHTML = `Expectancy per trade: <span class="${exp >= 0 ? "ok" : "err"}">${exp >= 0 ? "+" : ""}KSh ${exp.toFixed(2)}</span> on average — ${exp >= 0 ? "profitable over many trades at this ratio, even though you lose more often than you win." : "a loser over time at this ratio, even though you win more often than you lose."}`;
        };
        ["demo-wr", "demo-aw", "demo-al"].forEach((id) => $("#" + id, card).addEventListener("input", update));
        update();
      }
    },
    {
      id: "patterns",
      title: "8. A few chart patterns worth knowing",
      body: `Patterns are just a shorthand for things buyers and sellers tend to do. A double top is price hitting a level twice and failing to break it both times — often a sign the uptrend is running out of buyers. A double bottom is the mirror image at a low. Higher highs and higher lows forming a staircase is a healthy uptrend; a series of lower highs with one level holding as support is often the calm before that support breaks.
Patterns aren't guarantees — they're probabilities. Treat them as one more piece of evidence alongside trend and your own risk rules, never as a signal to trade on by themselves.`,
      cta: { text: "Look for a pattern on a real chart", href: "markets.html" },
      demo: `<p class="fine">Double top: price rises, pulls back, rises to about the same level, then falls — like the letter M. Double bottom: the same shape upside down, like a W. Scan a few instruments on Markets and see if either shape jumps out at you.</p>`
    },
    {
      id: "psychology",
      title: "9. Trading psychology: your biggest risk is you",
      body: `Most blown accounts aren't caused by one bad trade — they're caused by a reaction to one. FOMO (fear of missing out) pushes you into a trade late, after the easy move is already gone. Revenge trading pushes you to immediately win back a loss, usually by breaking your own risk rules. Overconfidence after a winning streak pushes you to size up right before the market reminds you it's still risky.
The fix isn't willpower in the moment — it's the boring stuff from lessons 2 and 3: a written reason before every trade, and a risk size decided in advance. Discipline is what turns a good strategy into a profitable one; without it, even a good strategy fails.`,
      cta: { text: "Write an honest journal entry today", href: "journal.html" },
      demo: `<label class="fine">Which of these have you felt while trading or watching a market move?</label>
        <div class="cta-row" style="justify-content:flex-start;flex-wrap:wrap;margin:.6rem 0">
          <button type="button" class="btn btn-ghost" data-quiet data-act="psy-fomo">FOMO</button>
          <button type="button" class="btn btn-ghost" data-quiet data-act="psy-revenge">Revenge trading</button>
          <button type="button" class="btn btn-ghost" data-quiet data-act="psy-overconf">Overconfidence</button>
        </div>
        <p class="fine" id="demo-psy-out">Pick one to see how it usually plays out.</p>`,
      wire(card) {
        const notes = {
          fomo: "You see a big move already happening, jump in late out of fear of missing it, and the move often reverses right after you enter.",
          revenge: "A trade loses, so you immediately open another — bigger, faster, with no real reason — trying to win the loss back. It usually compounds the damage.",
          overconf: "A winning streak feels like skill, so position sizes creep up without a plan. The next normal loss then hurts far more than it should."
        };
        const out = $("#demo-psy-out", card);
        card.addEventListener("click", (e) => {
          const b = e.target.closest("[data-act]"); if (!b) return;
          const key = b.dataset.act.replace("psy-", "");
          out.textContent = notes[key] || "";
        });
      }
    },
    {
      id: "orders",
      title: "10. Order types, spread, and slippage",
      body: `A market order fills immediately at the best available price. A limit order only fills at a price you choose, or better — useful for entering at support/resistance instead of chasing price. The spread is the small gap between the buy price and the sell price; it's effectively a built-in cost you pay the moment you open a trade. Slippage is when your actual fill price differs from what you expected, usually because the price moved fast between you clicking and the order reaching the market.
None of this is unique to Modefx — every real broker works this way too. Getting comfortable with it here, where nothing real is at risk, means it won't surprise you later.`,
      cta: { text: "Check the spread on a real instrument", href: "markets.html" },
      demo: `<div class="tools-grid">
          <label>Bid (sell) price<input type="number" class="demo-input" id="demo-bid" value="1.0838" step="any"></label>
          <label>Ask (buy) price<input type="number" class="demo-input" id="demo-ask" value="1.0840" step="any"></label>
          <label>Quantity<input type="number" class="demo-input" id="demo-ord-qty" value="1000" step="any"></label>
        </div>
        <p class="fine" id="demo-ord-out"></p>`,
      wire(card) {
        const update = () => {
          const bid = Number($("#demo-bid", card).value), ask = Number($("#demo-ask", card).value), qty = Number($("#demo-ord-qty", card).value);
          const out = $("#demo-ord-out", card);
          if (!(bid > 0) || !(ask > 0) || !(qty > 0) || ask < bid) { out.textContent = "Enter a bid, an ask (ask ≥ bid), and a quantity."; return; }
          const spread = ask - bid;
          out.innerHTML = `Spread: <span>${spread.toFixed(5)}</span> per unit. Buying then immediately selling ${qty} units would cost about <span class="err">${(spread * qty).toFixed(2)}</span> in spread alone, before the price has even moved.`;
        };
        ["demo-bid", "demo-ask", "demo-ord-qty"].forEach((id) => $("#" + id, card).addEventListener("input", update));
        update();
      }
    }
  ];

  const DONE_KEY = "mfx-lessons-done";
  const getDone = () => { try { return JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch (_) { return []; } };
  const setDone = (arr) => { try { localStorage.setItem(DONE_KEY, JSON.stringify(arr)); } catch (_) {} };

  function renderLessons() {
    const done = getDone();
    $("#lessons-list").innerHTML = LESSONS.map((l) => {
      const isDone = done.includes(l.id);
      return `<article class="sheet lesson-card" data-lesson-id="${l.id}">
        <h2>${l.title}</h2>
        ${l.body.trim().split("\n").map((p) => `<p>${p.trim()}</p>`).join("")}
        <div class="demo-box">
          <p class="demo-label">Try it right here</p>
          ${l.demo}
        </div>
        <div class="lesson-foot">
          <a class="link" href="${l.cta.href}">${l.cta.text} &rarr;</a>
          <label class="check lesson-done"><input type="checkbox" data-lesson="${l.id}" ${isDone ? "checked" : ""}><span>Mark as done</span></label>
        </div>
      </article>`;
    }).join("");
    LESSONS.forEach((l) => { const card = document.querySelector(`[data-lesson-id="${l.id}"]`); if (card && l.wire) l.wire(card); });
    updateProgress();
  }
  function updateProgress() {
    const done = getDone().filter((id) => LESSONS.some((l) => l.id === id));
    $("#lessons-progress").textContent = `${done.length} of ${LESSONS.length} lessons done`;
  }
  document.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-lesson]"); if (!cb) return;
    let done = getDone();
    done = cb.checked ? [...new Set([...done, cb.dataset.lesson])] : done.filter((id) => id !== cb.dataset.lesson);
    setDone(done);
    updateProgress();
  });

  // ---------------- Gate: Starter must be unlocked ----------------
  let sb = null;
  async function getSB() {
    if (sb) return sb;
    if (!C.supabaseUrl || !C.supabaseAnonKey) return null;
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
    return sb;
  }
  const isUnlocked = (tiers, tierId) => {
    const e = (tiers || []).find((x) => x.tier === tierId);
    return !!e && (!e.expires_at || new Date(e.expires_at) > new Date());
  };

  (async () => {
    const gate = $("#lessons-gate");
    const client = await getSB();
    if (!client) { gate.textContent = "Sign-in isn't connected yet. Add your Supabase keys in config.js."; return; }
    const { data } = await client.auth.getSession();
    const session = data.session;
    if (!session) {
      gate.innerHTML = `Sign in and get Starter to unlock these lessons. <a class="link" href="account.html?mode=signup">Create an account</a>`;
      return;
    }
    let tiers = [];
    try { const r = await client.from("entitlements").select("tier, expires_at"); tiers = r.data || []; } catch (_) {}
    if (!isUnlocked(tiers, "starter")) {
      const everHad = tiers.some((x) => x.tier === "starter");
      gate.innerHTML = everHad
        ? `Your Starter access has locked. <a class="link" href="plans.html">Get Growth to unlock it again</a>, forever.`
        : `Get Starter to unlock these lessons. <a class="link" href="plans.html">View plans</a>`;
      return;
    }
    gate.textContent = "";
    $("#lessons-list").hidden = false;
    renderLessons();
  })();
})();
