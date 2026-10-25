(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const M = window.MFXMarket;

  const GROWTH_LESSONS = [
    {
      id: "mtf",
      title: "1. Multi-timeframe analysis: zoom out before you zoom in",
      body: `A single timeframe only tells you part of the story. A 5-minute chart might show a sharp drop — but if the 1-hour chart behind it is in a clear, established uptrend, that drop is probably just a pullback inside a bigger move, not a reversal. Traders who only ever look at one timeframe keep mistaking noise for signal.
The method: check a higher timeframe first to find the trend (is it rising, falling, or ranging?), then drop to a lower timeframe only to time your entry in that same direction. A buy signal on the 5-minute chart means a lot more when the 1-hour chart agrees with it than when it's fighting it.`,
      cta: { text: "Switch timeframes on a real chart", href: "markets.html" },
      diagram: `<svg viewBox="0 0 300 130" role="img" aria-label="Higher timeframe shows a steady uptrend; lower timeframe zooms into one pullback leg of it">
          <text x="4" y="14" fill="#a6b3d0" font-size="10" font-family="Figtree, sans-serif">Higher timeframe (1H) — the trend</text>
          <polyline points="4,70 40,58 76,62 112,40 148,46 184,22 220,28 260,10" fill="none" stroke="#22d3ff" stroke-width="2.5"/>
          <rect x="176" y="14" width="52" height="48" fill="none" stroke="#a6b3d0" stroke-width="1" stroke-dasharray="3 3"/>
          <text x="4" y="98" fill="#a6b3d0" font-size="10" font-family="Figtree, sans-serif">Lower timeframe (5m) — zoomed into the boxed pullback</text>
          <polyline points="4,120 40,110 76,122 112,108 148,116 184,98 220,104 260,88" fill="none" stroke="#3ddc97" stroke-width="2.5"/>
        </svg>`,
      demo: `<p class="fine"><strong>Worked example:</strong> EUR/USD on the 1H chart shows higher highs and higher lows — a clear uptrend. On the 5m chart, price pulls back toward a level it bounced off before. Taken alone, that 5m pullback looks like a sell. Read alongside the 1H trend, it looks like a buy-the-dip opportunity instead — same candles, opposite conclusion, depending on which timeframe you trusted.</p>
        <p class="fine"><strong>Practical:</strong> Open any instrument and use the 1m / 5m / 15m / 1H switcher on its chart. Note the 1H trend direction first, then check whether the 5m or 15m view agrees with it or is just a pullback inside it.</p>`
    },
    {
      id: "ruin",
      title: "2. Risk of ruin: why losing streaks hurt more than the math first suggests",
      body: `Losses and gains aren't symmetric. If your balance drops 10%, you only need an 11.1% gain to get back to even. But if it drops 50%, you need a 100% gain — you have to double what's left just to break even. The bigger the drawdown, the disproportionately harder the climb back out, which is exactly why risking a small, fixed percentage per trade (lesson 3 in your Starter lessons) matters more as your account grows, not less.
This is also why five small consecutive losses at 1% risk each barely dent an account, while two or three oversized losses can put it in a hole that takes dozens of winning trades to climb out of. Protecting against ruin isn't pessimism — it's what keeps you in the game long enough for your edge, if you have one, to show up in the numbers.`,
      cta: { text: "Review your risk % on a real trade", href: "markets.html" },
      diagram: `<svg viewBox="0 0 300 130" role="img" aria-label="Chart showing required recovery percentage rising much faster than the loss percentage that caused it">
          <line x1="30" y1="110" x2="290" y2="110" stroke="#a6b3d0" stroke-width="1"/>
          <line x1="30" y1="10" x2="30" y2="110" stroke="#a6b3d0" stroke-width="1"/>
          <text x="2" y="14" fill="#a6b3d0" font-size="9" font-family="Figtree, sans-serif">Gain needed to recover</text>
          <rect x="48" y="99" width="28" height="11" fill="#3ddc97"/><text x="48" y="124" fill="#a6b3d0" font-size="9">-10%</text>
          <rect x="108" y="77" width="28" height="33" fill="#ffd166"/><text x="106" y="124" fill="#a6b3d0" font-size="9">-25%</text>
          <rect x="168" y="44" width="28" height="66" fill="#ff7a88"/><text x="166" y="124" fill="#a6b3d0" font-size="9">-50%</text>
          <rect x="228" y="12" width="28" height="98" fill="#ff7a88"/><text x="224" y="124" fill="#a6b3d0" font-size="9">-75%</text>
        </svg>`,
      demo: `<div class="tools-grid">
          <label>Loss so far (% of balance)<input type="number" class="demo-input" id="demo-ruin-loss" value="25" min="0" max="99" step="1"></label>
        </div>
        <p class="fine" id="demo-ruin-out"></p>`,
      wire(card) {
        const update = () => {
          const loss = Number($("#demo-ruin-loss", card).value);
          const out = $("#demo-ruin-out", card);
          if (!(loss > 0) || loss >= 100) { out.textContent = "Enter a loss between 0 and 99%."; return; }
          const recovery = (loss / (100 - loss)) * 100;
          out.innerHTML = `After losing <span class="err">${loss}%</span> of your balance, you need a <span class="err">+${recovery.toFixed(1)}%</span> gain just to get back to where you started — not ${loss}%.`;
        };
        $("#demo-ruin-loss", card).addEventListener("input", update);
        update();
      }
    },
    {
      id: "volatility",
      title: "3. Volatility-aware sizing: the same stop means different risk on different instruments",
      body: `Not every instrument moves the same amount in a day. BTC/USD can easily swing several percent while a major forex pair like EUR/USD might move a fraction of one. If you use the same stop-loss distance on both without adjusting, you're taking wildly different real risk even though the number "looks" the same.
A simple fix: before sizing a trade, check that instrument's own typical daily range — its today's high minus today's low is a quick proxy. A stop placed well inside that normal range is more likely to get hit by ordinary noise; a stop placed sensibly outside it, combined with the position-sizing math from Starter lesson 3, keeps your risk consistent no matter which instrument you're trading.`,
      cta: { text: "Check today's high/low on a real instrument", href: "markets.html" },
      diagram: `<svg viewBox="0 0 300 90" role="img" aria-label="Two horizontal bars comparing a wide daily range on BTC/USD against a narrow daily range on EUR/USD">
          <text x="4" y="16" fill="#a6b3d0" font-size="10" font-family="Figtree, sans-serif">BTC/USD — today's range</text>
          <rect x="4" y="22" width="270" height="14" rx="4" fill="#22d3ff" opacity=".85"/>
          <text x="4" y="58" fill="#a6b3d0" font-size="10" font-family="Figtree, sans-serif">EUR/USD — today's range</text>
          <rect x="4" y="64" width="46" height="14" rx="4" fill="#3ddc97" opacity=".85"/>
        </svg>`,
      demo: `<div class="tools-grid">
          <label>Today's high<input type="number" class="demo-input" id="demo-vol-hi" value="68420" step="any"></label>
          <label>Today's low<input type="number" class="demo-input" id="demo-vol-lo" value="66100" step="any"></label>
        </div>
        <p class="fine" id="demo-vol-out"></p>`,
      wire(card) {
        const update = () => {
          const hi = Number($("#demo-vol-hi", card).value), lo = Number($("#demo-vol-lo", card).value);
          const out = $("#demo-vol-out", card);
          if (!(hi > lo)) { out.textContent = "High must be greater than low."; return; }
          const range = hi - lo;
          out.innerHTML = `Today's range so far: <span>${range.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>. A stop placed only a tiny fraction of that away is sitting inside normal daily noise; most traders look to stops that are a meaningful chunk of this range, then size their quantity so that distance still only risks their fixed 1–2% from lesson 3.</p>`;
        };
        ["demo-vol-hi", "demo-vol-lo"].forEach((id) => $("#" + id, card).addEventListener("input", update));
        update();
      }
    },
    {
      id: "reversals",
      title: "4. Three reversal candles worth recognizing on sight",
      body: `A pin bar has a long wick and a small body at one end — it shows price reached further and got firmly rejected, pushed back by the opposite side. A doji has almost no body at all — open and close nearly equal — showing genuine indecision, often right before a trend pauses or turns. An engulfing candle is a small candle followed immediately by a larger one that completely swallows it in the opposite color — a sign the other side just took control.
None of these guarantee a reversal on their own. They're strongest at a level that already matters — a support/resistance zone from Starter lesson 6, or after a long trend has clearly stretched. A doji in the middle of nowhere is just noise; a doji at a level price has respected three times before is worth paying attention to.`,
      cta: { text: "Look for one of these on a live chart", href: "markets.html" },
      diagram: `<svg viewBox="0 0 300 110" role="img" aria-label="Three candlestick illustrations: a pin bar, a doji, and an engulfing pair">
          <text x="18" y="14" fill="#a6b3d0" font-size="10" font-family="Figtree, sans-serif" text-anchor="middle">Pin bar</text>
          <line x1="30" y1="20" x2="30" y2="95" stroke="#3ddc97" stroke-width="2"/>
          <rect x="24" y="78" width="12" height="14" fill="#3ddc97"/>
          <text x="118" y="14" fill="#a6b3d0" font-size="10" font-family="Figtree, sans-serif" text-anchor="middle">Doji</text>
          <line x1="118" y1="30" x2="118" y2="90" stroke="#a6b3d0" stroke-width="2"/>
          <rect x="112" y="58" width="12" height="3" fill="#a6b3d0"/>
          <text x="230" y="14" fill="#a6b3d0" font-size="10" font-family="Figtree, sans-serif" text-anchor="middle">Engulfing pair</text>
          <rect x="204" y="48" width="14" height="22" fill="#ff7a88"/>
          <rect x="224" y="34" width="26" height="50" fill="#3ddc97"/>
        </svg>`,
      demo: `<p class="fine">Pin bar: long wick, small body at one end — rejection. Doji: almost no body — indecision. Engulfing: a small candle fully swallowed by the next, opposite-colored one — a shift in control. Open a chart on Markets and scroll back through recent candles looking for any of the three.</p>`
    },
    {
      id: "plan",
      title: "5. Writing a trading plan: rules that remove decisions in the moment",
      body: `A trading plan is a short, written set of rules you decide on calmly, in advance, so you're not improvising while a trade is live and your emotions are involved. A useful plan is specific: what setup are you looking for (e.g. a bounce off support in the direction of the higher-timeframe trend from lesson 1), how much you risk per trade, how many trades you'll allow yourself in a session, and when you'll stop for the day regardless of outcome.
The plan only works if you actually check your trades against it. That's the real link between this lesson and your Journal — every entry reason you write (Starter lesson 2) is either inside your plan's rules or it isn't, and being honest about that gap is where real improvement comes from.`,
      cta: { text: "Compare your plan against real trades", href: "journal.html" },
      demo: `<label class="fine">Write a short trading plan — your setup, your risk per trade, your daily limit</label>
        <textarea class="demo-input" id="demo-plan-text" rows="4" placeholder="e.g. Only buy pullbacks to support in an uptrend confirmed on 1H. Risk 1% per trade. Stop after 2 losses in a day."></textarea>
        <div class="cta-row" style="justify-content:flex-start;margin:.6rem 0">
          <button type="button" class="btn btn-ghost" data-quiet data-act="save-plan">Save your plan</button>
        </div>
        <p class="fine" id="demo-plan-out"></p>`,
      wire(card) {
        const KEY = "mfx-trading-plan";
        const ta = $("#demo-plan-text", card), out = $("#demo-plan-out", card);
        try { const saved = localStorage.getItem(KEY); if (saved) { ta.value = saved; out.textContent = "Loaded your last saved plan."; } } catch (_) {}
        $('[data-act="save-plan"]', card).addEventListener("click", () => {
          const txt = ta.value.trim();
          if (!txt) { out.textContent = "Write something first — even a rough first draft is worth saving."; return; }
          try { localStorage.setItem(KEY, txt); out.textContent = "Saved on this device. Next time you open a trade, check it against this before you click."; }
          catch (_) { out.textContent = "Couldn't save on this device, but you can still copy it somewhere of your own."; }
        });
      }
    },
    {
      id: "analytics",
      title: "6. Reading your own journal: win rate isn't the whole picture",
      body: `A 70% win rate sounds great until you learn the loser is usually three times the size of the average win — that account is still losing money. What actually matters is the combination from Starter lesson 7: win rate together with the average size of wins versus losses. Two traders can have the same win rate and opposite results, purely based on that ratio.
Drawdown — the largest drop from a peak balance to a later low point — matters just as much as total return, because it's what you have to emotionally and financially survive along the way. A strategy that returns 50% a year but drawdown 40% at some point is far harder to stick with than one that returns 20% with a 10% drawdown, even though the first number looks better on paper.`,
      cta: { text: "Open your Journal and do the math on your last 10 trades", href: "journal.html" },
      demo: `<div class="tools-grid">
          <label>Winning trades<input type="number" class="demo-input" id="demo-an-w" value="7" min="0" step="1"></label>
          <label>Losing trades<input type="number" class="demo-input" id="demo-an-l" value="3" min="0" step="1"></label>
        </div>
        <p class="fine" id="demo-an-out"></p>
        <p class="fine">Your Journal lists every closed trade with its P/L — add up your wins and losses from the real table there and put the counts in above.</p>`,
      wire(card) {
        const update = () => {
          const w = Number($("#demo-an-w", card).value), l = Number($("#demo-an-l", card).value);
          const out = $("#demo-an-out", card);
          const total = w + l;
          if (total <= 0) { out.textContent = "Enter at least one trade."; return; }
          const rate = (w / total) * 100;
          out.innerHTML = `Win rate: <span>${rate.toFixed(1)}%</span> across ${total} trades. On its own this tells you almost nothing — pair it with lesson 7's expectancy calculator (your average win vs. average loss in KSh) to know whether this win rate is actually profitable.`;
        };
        ["demo-an-w", "demo-an-l"].forEach((id) => $("#" + id, card).addEventListener("input", update));
        update();
      }
    }
  ];

  const DONE_KEY = "mfx-growth-done";
  const getDone = () => { try { return JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch (_) { return []; } };
  const setDone = (arr) => { try { localStorage.setItem(DONE_KEY, JSON.stringify(arr)); } catch (_) {} };

  function renderLessons() {
    const done = getDone();
    $("#growth-list").innerHTML = GROWTH_LESSONS.map((l) => {
      const isDone = done.includes(l.id);
      return `<article class="sheet lesson-card" data-lesson-id="${l.id}">
        <h2>${l.title}</h2>
        ${l.body.trim().split("\n").map((p) => `<p>${p.trim()}</p>`).join("")}
        ${l.diagram ? `<div class="diagram">${l.diagram}</div>` : ""}
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
    GROWTH_LESSONS.forEach((l) => { const card = document.querySelector(`[data-lesson-id="${l.id}"]`); if (card && l.wire) l.wire(card); });
    updateProgress();
  }
  function updateProgress() {
    const done = getDone().filter((id) => GROWTH_LESSONS.some((l) => l.id === id));
    $("#growth-progress").textContent = `${done.length} of ${GROWTH_LESSONS.length} Growth lessons done`;
  }
  document.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-lesson]"); if (!cb) return;
    let done = getDone();
    done = cb.checked ? [...new Set([...done, cb.dataset.lesson])] : done.filter((id) => id !== cb.dataset.lesson);
    setDone(done);
    updateProgress();
  });

  // ---------------- Gate: Growth must be unlocked ----------------
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
    const gate = $("#growth-gate");
    const client = await getSB();
    if (!client) { gate.textContent = "Sign-in isn't connected yet. Add your Supabase keys in config.js."; return; }
    const { data } = await client.auth.getSession();
    const session = data.session;
    if (!session) {
      gate.innerHTML = `Sign in and get Growth to unlock these lessons. <a class="link" href="account.html?mode=signup">Create an account</a>`;
      return;
    }
    let tiers = [];
    try { const r = await client.from("entitlements").select("tier, expires_at"); tiers = r.data || []; } catch (_) {}
    if (!isUnlocked(tiers, "growth")) {
      gate.innerHTML = `Get Growth to unlock these six deeper lessons, forever. <a class="link" href="plans.html">View plans</a>`;
      return;
    }
    gate.textContent = "";
    $("#growth-list").hidden = false;
    renderLessons();
  })();
})();
