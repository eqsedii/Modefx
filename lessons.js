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
