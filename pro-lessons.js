/* Pro lesson library. Educational content only: nothing here is financial advice or a profit promise.
   Each lesson: { id, cat, title, body (one paragraph per line), diagram?, demo?, wire?(card), cta } */
window.MFX_PRO_LESSONS = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const T = (x, y, t, extra = "") => `<text x="${x}" y="${y}" fill="#a6b3d0" font-size="10" font-family="Figtree, sans-serif" ${extra}>${t}</text>`;
  const num = (card, id) => Number($("#" + id, card).value);
  const field = (id, label, val, step = "any", min = "0") =>
    `<label>${label}<input type="number" class="demo-input" id="${id}" value="${val}" step="${step}" min="${min}"></label>`;
  // Wire a set of inputs to one update function and run it once.
  const live = (card, ids, fn) => { ids.forEach((id) => $("#" + id, card).addEventListener("input", () => fn(card))); fn(card); };
  const out = (card, id, html) => { $("#" + id, card).innerHTML = html; };
  const bad = (card, id, t = "Fill in every box with a number above zero.") => out(card, id, `<span class="err">${t}</span>`);

  const L = [];

  /* ======================= STRUCTURE ======================= */
  L.push({
    id: "structure", cat: "Market structure",
    title: "Market structure: read the trend from swing highs and lows",
    body: `Price moves in waves. Each wave leaves a swing high (a peak) and a swing low (a trough). In an uptrend, every new swing high and swing low is higher than the last one. In a downtrend, both are lower. When neither pattern holds, the market is ranging, which means it is moving sideways between a ceiling and a floor.
A trend is considered intact until price breaks its last important swing in the opposite direction. In an uptrend, that is a close below the most recent higher low. That event is called a break of structure. It does not guarantee a reversal, but it tells you the old pattern has stopped working and your approach should change.
Practical use: before you look at any indicator, mark the last three swing highs and lows on a higher timeframe. If they are stair-stepping up, you look for buys on pullbacks. If they are stair-stepping down, you look for sells on bounces. If they are flat, you trade the edges of the range or you stay out.`,
    cta: { text: "Mark swings on a real chart", href: "markets.html" },
    diagram: `<svg viewBox="0 0 300 130" role="img" aria-label="Rising zig-zag line with higher highs and higher lows marked, then a break below the last higher low">
      <polyline points="8,110 38,84 58,98 98,56 118,72 160,30 182,52 214,52 244,92" fill="none" stroke="#22d3ff" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="118" y1="72" x2="290" y2="72" stroke="#ffd166" stroke-width="1" stroke-dasharray="4 3"/>
      ${T(8, 14, "Higher highs and higher lows = uptrend")}
      ${T(206, 66, "last higher low", 'fill="#ffd166"')}
      ${T(228, 108, "break of structure", 'fill="#ff7a88"')}
    </svg>`,
    demo: `<p class="fine">Quick check. Swing highs in order: 1.0820, 1.0850, 1.0835. Swing lows: 1.0790, 1.0805, 1.0798. The last high (1.0835) is lower than the one before it, and the last low (1.0798) is lower than the one before it. That is the first sign the uptrend is weakening. A break below 1.0805 would confirm a break of structure.</p>`
  });

  L.push({
    id: "sr", cat: "Market structure",
    title: "Support, resistance and zones (not exact lines)",
    body: `Support is a price area where buyers have stepped in before. Resistance is an area where sellers have. They form because many traders remember the same turning points and place orders near them.
Treat them as zones, not exact lines. A level that held at 1.0850 may be tested at 1.0846 or 1.0856. Draw a band about as thick as a typical candle's wick, and expect price to poke through it before it reacts.
Levels flip. When resistance breaks and price comes back to retest it from above, the old ceiling often acts as a new floor. The more times a zone has been tested, the weaker it tends to get, because each test uses up some of the orders waiting there.
A level means more when it lines up with something else: a round number, a previous daily high or low, a trend line, or a higher-timeframe swing. One reason is a hint. Three reasons together is a zone worth planning around.`,
    cta: { text: "Find zones on a real chart", href: "markets.html" },
    diagram: `<svg viewBox="0 0 300 130" role="img" aria-label="Price rising to a resistance zone, breaking above it, then retesting it from above as support">
      <rect x="4" y="38" width="292" height="16" fill="#ffd166" opacity=".16"/>
      <polyline points="8,112 40,92 62,100 100,66 124,76 156,46 180,60 214,28 236,42 258,34 292,14" fill="none" stroke="#22d3ff" stroke-width="2.5" stroke-linejoin="round"/>
      ${T(8, 32, "zone: old resistance, now support after the breakout", 'fill="#ffd166"')}
    </svg>`
  });

  L.push({
    id: "patterns", cat: "Market structure",
    title: "Chart patterns: flags, triangles, double tops and head and shoulders",
    body: `Patterns are repeated shapes that show how buyers and sellers are balancing. They are continuation patterns, which usually resolve in the direction of the prior trend, or reversal patterns, which signal a possible change of direction.
Continuation: a flag is a sharp move followed by a small, tight pullback. A triangle is a squeeze where highs get lower and lows get higher until price breaks out of it. Reversal: a double top is two failed attempts at the same high. A head and shoulders is a peak with a higher middle peak and a lower low after it. The neckline is the level connecting the lows. A break of it is the signal.
Be honest about their limits. Patterns are subjective, two traders can draw different ones on the same chart, and many fail. A breakout often retests the level it broke, and some are fakeouts. Wait for a candle to close beyond the pattern boundary, place the stop on the other side of the pattern, and measure the target as the pattern's height projected from the break.`,
    cta: { text: "Look for patterns on a real chart", href: "markets.html" },
    diagram: `<svg viewBox="0 0 300 130" role="img" aria-label="Double top: two peaks at the same level with a neckline underneath and a break below it">
      <polyline points="8,110 50,60 86,86 130,30 166,30 204,86 236,100 292,122" fill="none" stroke="#22d3ff" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="20" y1="86" x2="292" y2="86" stroke="#ffd166" stroke-width="1" stroke-dasharray="4 3"/>
      ${T(8, 14, "Double top: two failed pushes, then a break of the neckline")}
      ${T(214, 80, "neckline", 'fill="#ffd166"')}
    </svg>`
  });

  L.push({
    id: "candles-pro", cat: "Market structure",
    title: "Candlestick signals that only matter in context",
    body: `A single candle is a small story: where price opened, how far it travelled, and where it closed. The useful ones show a rejection. A pin bar has a long wick and a small body, which means price went somewhere and was pushed back. An engulfing candle has a body that fully covers the previous candle's body, which shows one side taking control. An inside bar sits entirely within the previous candle's range, which shows a pause before a move.
Context decides everything. A bullish pin bar at a well-tested support zone in an uptrend is meaningful. The same candle in the middle of nowhere is noise. Ask three questions before acting on any candle: where is it (at a level?), what came before it (a trend or a range?), and what would prove it wrong (where is the stop)?
Wait for the candle to close before you judge it. A candle that looks like a pin bar halfway through can finish as a completely different shape.`,
    cta: { text: "Study candles on a real chart", href: "markets.html" }
  });

  /* ======================= INDICATORS ======================= */
  L.push({
    id: "ma", cat: "Indicators",
    title: "Moving averages: smoothing the trend (and why they always lag)",
    body: `A moving average replaces noisy prices with a smoothed line. A simple moving average (SMA) gives every candle in the window the same weight. An exponential moving average (EMA) gives recent candles more weight, so it reacts faster.
Common uses: price above a rising 50 or 200 period average suggests an uptrend; the average can act as a dynamic support or resistance zone on pullbacks; and a crossover of a fast average over a slow one is a popular entry signal.
The cost is lag. A moving average only describes what already happened. In a range it produces many false crossovers, which traders call whipsaws. That is why it works better as a trend filter (are we above or below the 200?) than as a standalone entry trigger.`,
    cta: { text: "Compare trends across timeframes", href: "markets.html" },
    demo: `<div class="tools-grid">${field("ma-n", "EMA period", 20, "1", "1")}</div>
      <p class="fine" id="ma-out"></p>`,
    wire(card) {
      live(card, ["ma-n"], (c) => {
        const n = num(c, "ma-n");
        if (!(n >= 1)) return bad(c, "ma-out", "Enter a period of 1 or more.");
        const a = 2 / (n + 1);
        out(c, "ma-out", `An EMA with period <strong>${n}</strong> weights the newest candle at <span class="ok">${(a * 100).toFixed(1)}%</span> and the rest of the history at ${(100 - a * 100).toFixed(1)}%. Smaller period means faster but noisier. Larger period means smoother but later.`);
      });
    }
  });

  L.push({
    id: "rsi", cat: "Indicators",
    title: "RSI and momentum: strength, not a sell button",
    body: `The Relative Strength Index (RSI) compares the average gain to the average loss over a window, usually 14 candles, and squeezes the result into a 0 to 100 scale. Above 70 is conventionally called overbought and below 30 oversold.
The common mistake is treating 70 as "sell now". In a strong trend, RSI can stay above 70 for a long time while price keeps climbing. A better reading: in uptrends, RSI tends to hold between about 40 and 80, and dips toward 40 can mark pullback entries. In downtrends the zone shifts down to roughly 20 to 60.
Divergence is the more useful signal. If price makes a new high but RSI makes a lower high, momentum is fading even though price has not turned yet. It is a warning to tighten up or wait for structure to break, not a reason to short on its own.`,
    cta: { text: "Watch momentum on a real chart", href: "markets.html" },
    demo: `<div class="tools-grid">${field("rsi-g", "Average gain per candle", 0.6)}${field("rsi-l", "Average loss per candle", 0.4)}</div>
      <p class="fine" id="rsi-out"></p>`,
    wire(card) {
      live(card, ["rsi-g", "rsi-l"], (c) => {
        const g = num(c, "rsi-g"), l = num(c, "rsi-l");
        if (!(g >= 0) || !(l >= 0) || g + l === 0) return bad(c, "rsi-out", "Enter the average gain and loss (not both zero).");
        const rsi = l === 0 ? 100 : 100 - 100 / (1 + g / l);
        const zone = rsi >= 70 ? "overbought zone" : rsi <= 30 ? "oversold zone" : "neutral zone";
        out(c, "rsi-out", `RSI = 100 - 100 / (1 + gain/loss) = <strong>${rsi.toFixed(1)}</strong> (${zone}).`);
      });
    }
  });

  L.push({
    id: "macd", cat: "Indicators",
    title: "MACD: trend and momentum in one view",
    body: `MACD takes the difference between a fast EMA (usually 12) and a slow EMA (usually 26). That difference is the MACD line. A 9-period EMA of the MACD line is the signal line, and the gap between the two is drawn as a histogram.
When the MACD line crosses above the signal line, short-term momentum is turning up. When the histogram shrinks, the current move is losing steam even before the lines cross. When the MACD line sits above zero, the fast average is above the slow one, which is a simple trend confirmation.
Like every indicator built from past prices, it lags and whipsaws in ranges. Use it to confirm what the structure already shows, such as a higher-timeframe uptrend with a MACD turning back up on the pullback, instead of trading each crossover.`,
    cta: { text: "See trend and momentum together", href: "markets.html" }
  });

  L.push({
    id: "atr-bb", cat: "Indicators",
    title: "ATR and Bollinger Bands: measure volatility instead of guessing",
    body: `Average True Range (ATR) is the average size of a candle's full range over a window, usually 14. It answers a practical question: how far does this market normally move? Place a stop closer than about one ATR and ordinary noise can knock you out. Place it at 1.5 to 2 ATR beyond the level you are protecting, and you give the trade room to breathe.
Bollinger Bands draw a moving average with bands about two standard deviations above and below. When the bands squeeze tight, volatility is low and a bigger move often follows (the direction is unknown). When price rides the upper band in a strong trend, that is strength, not a sell signal. Touching a band is only a reason to look closer.
The link to risk: when ATR is large, use a wider stop and a smaller position size so the money at risk stays the same. The calculator turns that into numbers.`,
    cta: { text: "Compare volatility on different markets", href: "markets.html" },
    diagram: `<svg viewBox="0 0 300 120" role="img" aria-label="Bollinger bands narrowing in a squeeze, then widening as price breaks out upward">
      <path d="M8 44 Q80 52 140 56 T190 50 T292 8" fill="none" stroke="#a6b3d0" stroke-width="1.4"/>
      <path d="M8 76 Q80 68 140 64 T190 70 T292 56" fill="none" stroke="#a6b3d0" stroke-width="1.4"/>
      <polyline points="8,60 40,56 70,64 100,58 130,62 160,58 190,56 214,44 240,30 270,24 292,14" fill="none" stroke="#22d3ff" stroke-width="2.4" stroke-linejoin="round"/>
      ${T(8, 108, "Squeeze (quiet) then expansion (breakout)")}
    </svg>`,
    demo: `<div class="tools-grid">
        ${field("atr-bal", "Account balance", 10000)}${field("atr-risk", "Risk per trade (%)", 1)}
        ${field("atr-atr", "ATR (price units)", 0.0012)}${field("atr-mult", "Stop distance (x ATR)", 1.5)}
      </div><p class="fine" id="atr-out"></p>`,
    wire(card) {
      live(card, ["atr-bal", "atr-risk", "atr-atr", "atr-mult"], (c) => {
        const bal = num(c, "atr-bal"), r = num(c, "atr-risk"), a = num(c, "atr-atr"), m = num(c, "atr-mult");
        if (![bal, r, a, m].every((v) => v > 0)) return bad(c, "atr-out");
        const money = bal * r / 100, stop = a * m, size = money / stop;
        out(c, "atr-out", `Money at risk: <strong>${money.toFixed(2)}</strong>. Stop distance: <strong>${stop.toPrecision(3)}</strong> price units. Position size: <span class="ok">${size.toFixed(size < 10 ? 2 : 0)}</span> units. If ATR doubles, the size must halve to keep the same risk.`);
      });
    }
  });

  L.push({
    id: "fib", cat: "Indicators",
    title: "Fibonacci retracements: where pullbacks often pause",
    body: `After a strong move, price often retraces part of it before continuing. Fibonacci retracement levels (23.6%, 38.2%, 50%, 61.8% and 78.6%) are drawn from the swing low to the swing high of the move to mark likely pause points. The 38.2% to 61.8% band is watched most closely.
These levels are not a law of nature. They work partly because so many traders watch them, which makes them self-fulfilling at times. The way to use them honestly is as a confluence tool: a 50% retracement that also sits on a previous support zone and a rising moving average is far more interesting than a bare Fibonacci line.
Always define what proves you wrong. If price retraces past 78.6% of the move, the trend idea is probably damaged and your stop belongs just beyond that level.`,
    cta: { text: "Measure a pullback on a real chart", href: "markets.html" },
    diagram: `<svg viewBox="0 0 300 130" role="img" aria-label="An up move from a swing low to a swing high with horizontal retracement lines at 38.2, 50 and 61.8 percent">
      <polyline points="8,116 70,20" fill="none" stroke="#22d3ff" stroke-width="2.5"/>
      <polyline points="70,20 110,64 150,48 190,66 230,34 280,12" fill="none" stroke="#3ddc97" stroke-width="2.2" stroke-linejoin="round"/>
      <line x1="70" y1="57" x2="292" y2="57" stroke="#ffd166" stroke-width="1" stroke-dasharray="4 3"/>
      <line x1="70" y1="68" x2="292" y2="68" stroke="#ffd166" stroke-width="1" stroke-dasharray="4 3"/>
      <line x1="70" y1="79" x2="292" y2="79" stroke="#ffd166" stroke-width="1" stroke-dasharray="4 3"/>
      ${T(242, 53, "38.2%")}${T(242, 64, "50%")}${T(242, 75, "61.8%")}
    </svg>`,
    demo: `<div class="tools-grid">${field("fib-lo", "Swing low", 1.0800, "0.0001")}${field("fib-hi", "Swing high", 1.0900, "0.0001")}</div>
      <p class="fine" id="fib-out"></p>`,
    wire(card) {
      live(card, ["fib-lo", "fib-hi"], (c) => {
        const lo = num(c, "fib-lo"), hi = num(c, "fib-hi");
        if (!(lo > 0) || !(hi > lo)) return bad(c, "fib-out", "The swing high must be above the swing low (uptrend example).");
        const d = hi - lo, dp = hi >= 100 ? 2 : 4;
        const lv = [0.236, 0.382, 0.5, 0.618, 0.786].map((p) => `${(p * 100).toFixed(1)}% at <strong>${(hi - d * p).toFixed(dp)}</strong>`);
        out(c, "fib-out", `Pullback levels: ${lv.join(" &middot; ")}.`);
      });
    }
  });

  /* ======================= RISK & MATH ======================= */
  L.push({
    id: "expectancy", cat: "Risk and math",
    title: "Risk to reward and expectancy: the math behind staying profitable",
    body: `Risk to reward compares what you stand to make with what you stand to lose. If you risk 1 unit to make 2, the ratio is 1:2, and you call that 2R. Losses are measured in R too: a stopped-out trade is -1R.
Win rate alone says nothing. A trader winning 40% of trades at 2R average wins and 1R average losses has an expectancy of 0.4 x 2 - 0.6 x 1 = +0.2R per trade. A trader winning 70% but with 0.3R average wins and 1R losses loses money. Expectancy is the number that matters: expectancy = win rate x average win - loss rate x average loss.
The breakeven win rate for a given reward ratio is 1 / (1 + reward ratio). At 1:2 you only need to win more than 33.3% of trades to break even before costs. That is why journaling your actual R results matters more than counting wins.`,
    cta: { text: "Plan a trade with a stop and target", href: "markets.html" },
    diagram: `<svg viewBox="0 0 300 120" role="img" aria-label="A trade with an entry line, a stop one unit below and a target two units above">
      <line x1="20" y1="60" x2="290" y2="60" stroke="#a6b3d0" stroke-width="1.5"/>
      <rect x="20" y="60" width="270" height="30" fill="#ff7a88" opacity=".2"/>
      <rect x="20" y="0" width="270" height="60" fill="#3ddc97" opacity=".14"/>
      ${T(26, 54, "Entry")}${T(26, 84, "Stop: -1R", 'fill="#ff7a88"')}${T(26, 14, "Target: +2R", 'fill="#3ddc97"')}
    </svg>`,
    demo: `<div class="tools-grid">
        ${field("ex-wr", "Win rate (%)", 45, "1")}${field("ex-rr", "Average win (in R)", 2)}
        ${field("ex-al", "Average loss (in R)", 1)}${field("ex-n", "Number of trades", 100, "1")}
      </div><p class="fine" id="ex-out"></p>`,
    wire(card) {
      live(card, ["ex-wr", "ex-rr", "ex-al", "ex-n"], (c) => {
        const w = num(c, "ex-wr") / 100, rw = num(c, "ex-rr"), rl = num(c, "ex-al"), n = num(c, "ex-n");
        if (!(w > 0 && w < 1) || !(rw > 0) || !(rl > 0) || !(n > 0)) return bad(c, "ex-out", "Enter a win rate between 0 and 100 and positive R values.");
        const e = w * rw - (1 - w) * rl, be = rl / (rl + rw);
        out(c, "ex-out", `Expectancy: <span class="${e >= 0 ? "ok" : "err"}">${e >= 0 ? "+" : ""}${e.toFixed(2)}R</span> per trade, about <strong>${e >= 0 ? "+" : ""}${(e * n).toFixed(1)}R</strong> over ${n} trades (before costs). Breakeven win rate for these R values: <strong>${(be * 100).toFixed(1)}%</strong>.`);
      });
    }
  });

  L.push({
    id: "sizing", cat: "Risk and math",
    title: "Position sizing from the stop: let the stop decide the size",
    body: `Beginners choose a size first and then wonder where to put the stop. Professionals reverse it. The chart decides where the stop belongs (beyond the level that would prove the idea wrong), and the size is whatever makes that distance cost a fixed percentage of the account.
Size = money you are willing to lose / distance from entry to stop. Risk 1% of a 10,000 account and the loss on a stopped-out trade is 100, whether the stop is 5 points or 50 points away. Wider stop, smaller size. Tighter stop, bigger size.
Never widen a stop after entering to avoid a loss, because it breaks the rule that made the size correct. If the stop the chart requires makes the size too small to be worth it, the answer is to skip the trade.`,
    cta: { text: "Open a practice trade and set a stop", href: "markets.html" },
    demo: `<div class="tools-grid">
        ${field("sz-bal", "Balance", 10000)}${field("sz-risk", "Risk (%)", 1)}
        ${field("sz-en", "Entry price", 1.0850, "0.0001")}${field("sz-st", "Stop price", 1.0820, "0.0001")}
        ${field("sz-tp", "Target price", 1.0910, "0.0001")}
      </div><p class="fine" id="sz-out"></p>`,
    wire(card) {
      live(card, ["sz-bal", "sz-risk", "sz-en", "sz-st", "sz-tp"], (c) => {
        const bal = num(c, "sz-bal"), r = num(c, "sz-risk"), en = num(c, "sz-en"), st = num(c, "sz-st"), tp = num(c, "sz-tp");
        if (![bal, r, en, st, tp].every((v) => v > 0) || en === st) return bad(c, "sz-out", "Enter all prices. The stop must differ from the entry.");
        const long = en > st, okTp = long ? tp > en : tp < en;
        const risk = bal * r / 100, dist = Math.abs(en - st), size = risk / dist, rr = Math.abs(tp - en) / dist;
        out(c, "sz-out", `${long ? "Buy" : "Sell"} <strong>${size.toFixed(size < 10 ? 2 : 0)}</strong> units to risk <strong>${risk.toFixed(2)}</strong>. ${okTp ? `Reward to risk: <span class="${rr >= 1.5 ? "ok" : "err"}">1:${rr.toFixed(2)}</span>.` : `<span class="err">The target is on the wrong side of the entry.</span>`}`);
      });
    }
  });

  L.push({
    id: "leverage", cat: "Risk and math",
    title: "Leverage and margin: how a small move becomes a big loss",
    body: `Leverage lets you control a position larger than your cash. With 1:100 leverage, 100 of your own money controls a 10,000 position. It does not change the market, it only magnifies the result of the same move on your balance, in both directions.
A 1% move against a position equal to your whole account is a 1% loss. Open a position 20 times your account and the same 1% move is a 20% loss. Margin is the part of your balance set aside to hold the position open. If losses eat into the rest of the balance, the broker closes you out. That is a stop out or margin call.
The safe habit: size from your stop (see the previous lesson), not from the maximum leverage on offer. High leverage is only dangerous when it makes the position large relative to the account.`,
    cta: { text: "Practice small sizes on the simulator", href: "markets.html" },
    demo: `<div class="tools-grid">
        ${field("lv-bal", "Account balance", 1000)}${field("lv-pos", "Position size (value)", 20000)}
        ${field("lv-mv", "Price move against you (%)", 1, "0.1")}
      </div><p class="fine" id="lv-out"></p>`,
    wire(card) {
      live(card, ["lv-bal", "lv-pos", "lv-mv"], (c) => {
        const bal = num(c, "lv-bal"), pos = num(c, "lv-pos"), mv = num(c, "lv-mv");
        if (![bal, pos, mv].every((v) => v > 0)) return bad(c, "lv-out");
        const loss = pos * mv / 100, lev = pos / bal, wipe = bal / pos * 100;
        out(c, "lv-out", `Effective leverage: <strong>${lev.toFixed(1)}x</strong>. A ${mv}% adverse move costs <span class="err">${loss.toFixed(2)}</span> (${(loss / bal * 100).toFixed(1)}% of your account). A move of just <strong>${wipe.toFixed(2)}%</strong> would wipe the whole balance.`);
      });
    }
  });

  L.push({
    id: "costs", cat: "Risk and math",
    title: "Spreads, commission, swap and slippage: the costs that eat edge",
    body: `Every trade pays to exist. The spread is the gap between the buy and sell price. You pay it the moment you open a position. Commission is a fixed fee some brokers add. Swap or overnight financing is charged or paid for holding a position past the daily rollover. Slippage is the difference between the price you expected and the price you got, which grows in fast markets and around news.
Costs matter most for small targets. If the spread is 1.2 pips and your target is 6 pips, costs already take a fifth of the reward before the market does anything. Scalping strategies need tight spreads and quick fills. Swing strategies care more about swap and care less about the spread.
Always work in net R: subtract the costs from the target and add them to the loss. If the numbers stop working after costs, the setup does not have an edge at that size.`,
    cta: { text: "Compare costs across markets", href: "markets.html" },
    demo: `<div class="tools-grid">
        ${field("co-tp", "Target distance (pips or points)", 10, "0.1")}${field("co-sl", "Stop distance (same units)", 10, "0.1")}
        ${field("co-sp", "Spread (same units)", 1.2, "0.1")}
      </div><p class="fine" id="co-out"></p>`,
    wire(card) {
      live(card, ["co-tp", "co-sl", "co-sp"], (c) => {
        const tp = num(c, "co-tp"), sl = num(c, "co-sl"), sp = num(c, "co-sp");
        if (![tp, sl].every((v) => v > 0) || !(sp >= 0)) return bad(c, "co-out");
        const gross = tp / sl, net = (tp - sp) / (sl + sp);
        out(c, "co-out", `Before costs: <strong>1:${gross.toFixed(2)}</strong>. After the spread: <span class="${net >= 1 ? "ok" : "err"}">1:${net.toFixed(2)}</span>. The spread takes <strong>${(sp / tp * 100).toFixed(0)}%</strong> of your target.`);
      });
    }
  });

  L.push({
    id: "correlation", cat: "Risk and math",
    title: "Correlation: two trades can be one trade in disguise",
    body: `Markets move together more than people expect. EUR/USD and GBP/USD tend to rise and fall together because both are quoted against the US dollar. Buying EUR/USD and selling USD/CHF are effectively the same bet. Bitcoin and tech indices often react to the same risk-on and risk-off waves.
If you risk 1% on each of three highly correlated positions, you are not risking 1% three times in different places. You are risking close to 3% on a single idea. If that idea is wrong, all three stops hit together.
Practical rules: count correlated positions as one when you set a total risk cap (for example 3% of the account across all open trades), and before adding a second position ask what the first one already says about the same driver. Diversification only works when positions respond to different things.`,
    cta: { text: "Check your open positions", href: "positions.html" },
    demo: `<div class="tools-grid">
        ${field("cr-n", "Number of similar positions", 3, "1", "1")}${field("cr-r", "Risk on each (%)", 1, "0.1")}
        ${field("cr-c", "How correlated (0 to 100%)", 80, "5", "0")}
      </div><p class="fine" id="cr-out"></p>`,
    wire(card) {
      live(card, ["cr-n", "cr-r", "cr-c"], (c) => {
        const n = num(c, "cr-n"), r = num(c, "cr-r"), rho = num(c, "cr-c") / 100;
        if (!(n >= 1) || !(r > 0) || rho < 0 || rho > 1) return bad(c, "cr-out", "Enter 1 or more positions, a positive risk, and a correlation from 0 to 100.");
        // Portfolio risk for n equal positions with a common correlation: r * sqrt(n + n(n-1) rho)
        const eff = r * Math.sqrt(n + n * (n - 1) * rho);
        out(c, "cr-out", `Added up, the risk is ${(n * r).toFixed(1)}%. With ${(rho * 100).toFixed(0)}% correlation your effective portfolio risk is about <span class="${eff > 2.5 ? "err" : "ok"}">${eff.toFixed(2)}%</span>. In a bad run where they all move together, you can lose the full ${(n * r).toFixed(1)}% at once.`);
      });
    }
  });

  L.push({
    id: "management", cat: "Execution",
    title: "Trade management: breakeven stops, partials, trailing and time stops",
    body: `Entering is the easy part. What you do between entry and exit decides most of your results. Four tools:
Partial profits: close part of the position at the first target, say half at 1R, and let the rest run. You bank something and reduce the stress of holding. The cost is a smaller win if the trade runs all the way.
Breakeven stop: after price has moved well in your favour, move the stop to your entry. Do it too early, at 0.3R for instance, and normal noise will take you out of good trades. A common compromise is to wait for a new swing or about 1R.
Trailing stop: move the stop behind price, either below each new higher low, or a multiple of ATR behind the highest price. It lets trends pay you without a fixed target.
Time stop: if a trade has not worked within a set number of candles, exit. Capital stuck in a dead trade is capital you cannot use.
Decide the plan before you enter and write it down. Changing the rules mid-trade, when emotions are running, is how small plans turn into big losses.`,
    cta: { text: "Practice SL and TP on a simulated trade", href: "markets.html" },
    diagram: `<svg viewBox="0 0 300 130" role="img" aria-label="Price rising in steps with a stop-loss line that moves up below each higher low">
      <polyline points="8,104 52,76 76,88 128,46 152,58 206,22 236,34 284,12" fill="none" stroke="#22d3ff" stroke-width="2.4" stroke-linejoin="round"/>
      <polyline points="8,118 52,118 76,118 76,100 152,100 152,68 236,68 236,52 292,52" fill="none" stroke="#ffd166" stroke-width="1.6" stroke-dasharray="4 3"/>
      ${T(8, 14, "Stop trails below each higher low")}
    </svg>`
  });

  L.push({
    id: "sessions", cat: "Execution",
    title: "Trading sessions and liquidity, in your local time",
    body: `Forex trades around the clock on weekdays, but activity moves between four main centres: Sydney, Tokyo, London and New York. Liquidity (how many orders are available) and volatility are highest when sessions overlap, so spreads are usually tighter and moves are cleaner then. The London and New York overlap is the busiest part of the day for EUR/USD and gold.
London and New York change their clocks twice a year, so the time each session opens in your own time zone can shift by an hour. The tool below reads each city's real local time and shows which sessions are open right now, in your time.
Rules of thumb: quiet Asian-session hours suit range trading in some pairs. The first hour after the London open often brings the day's first strong move. Late Friday and the minutes around major news have thin liquidity and wider spreads. Match your strategy to the hours it was designed for.`,
    cta: { text: "Watch a market live", href: "markets.html" },
    demo: `<p class="fine" id="ss-out">Checking sessions...</p>`,
    wire(card) {
      const SESS = [
        { n: "Sydney", tz: "Australia/Sydney", o: 8, c: 17 },
        { n: "Tokyo", tz: "Asia/Tokyo", o: 9, c: 18 },
        { n: "London", tz: "Europe/London", o: 8, c: 17 },
        { n: "New York", tz: "America/New_York", o: 8, c: 17 }
      ];
      const parts = (tz, d) => {
        const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", minute: "numeric", weekday: "short", hourCycle: "h23" }).formatToParts(d);
        const g = (t) => f.find((p) => p.type === t).value;
        return { h: Number(g("hour")), m: Number(g("minute")), wd: g("weekday") };
      };
      const eat = (d) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
      // Find your local clock time of an open or close by scanning today's minutes in UTC.
      const localOf = (s, hour) => {
        const base = new Date(); base.setUTCMinutes(0, 0, 0);
        for (let i = 0; i < 24 * 2; i++) {
          const d = new Date(base.getTime() - 24 * 3600000 + i * 1800000);
          const p = parts(s.tz, d);
          if (p.h === hour && p.m === 0) return eat(d);
        }
        return "?";
      };
      const draw = () => {
        const now = new Date();
        const rows = SESS.map((s) => {
          const p = parts(s.tz, now);
          const weekday = !["Sat", "Sun"].includes(p.wd);
          const open = weekday && p.h >= s.o && p.h < s.c;
          return `<li><strong>${s.n}</strong>: <span class="${open ? "ok" : "err"}">${open ? "open" : "closed"}</span> <span class="fine">(opens ${localOf(s, s.o)}, closes ${localOf(s, s.c)} your time)</span></li>`;
        }).join("");
        $("#ss-out", card).innerHTML = `<ul class="plain-list">${rows}</ul><span class="fine">Now: ${eat(now)} your time. Hours shown are 08:00 to 17:00 local (Tokyo 09:00 to 18:00), and are approximate.</span>`;
      };
      draw(); setInterval(draw, 30000);
    }
  });

  /* ======================= MARKETS ======================= */
  L.push({
    id: "fundamentals", cat: "Markets and news",
    title: "Fundamentals: why markets move on rates, inflation and jobs",
    body: `Technical analysis studies price. Fundamental analysis studies why price should be moving. For currencies, the biggest driver is interest rates. Higher rates, or expectations of higher rates, tend to attract money into a currency and strengthen it. Central banks set rates mainly in response to inflation and employment.
The data to know: inflation (CPI), jobs reports (the US Non-Farm Payrolls, NFP), GDP growth, retail sales, and central bank rate decisions and statements. Markets move on the surprise: the gap between the number and what was expected. A rise in inflation that was fully expected may do nothing. A smaller rise than forecast can move price sharply.
Closer to home, your own central bank's rate decisions, your national statistics office's inflation numbers and your currency's moves against the dollar shape the pairs you trade. For individual stocks, earnings, dividends and market-wide sentiment matter most.
You do not need to forecast the data. You need to know when it is coming so you are not surprised by a sudden spike.`,
    cta: { text: "See upcoming event types", href: "#calendar" }
  });

  L.push({
    id: "news", cat: "Markets and news",
    title: "Trading around news: protect yourself first",
    body: `High-impact news creates fast moves, wider spreads and slippage. Stops can fill far from where you set them, and a price that spikes one way can reverse seconds later.
Three sane approaches. 1) Stand aside: close or reduce positions before the release and wait for the dust to settle. 2) Trade the reaction, not the number: wait 15 to 30 minutes for the first spike to finish and trade the direction that structure confirms. 3) Hold through it only if your position is small enough that a gap past your stop is survivable.
Never add to a losing position into a news release hoping the number will rescue it. Check the calendar every morning, mark the events that affect the markets you trade, and write the plan for them in advance.`,
    cta: { text: "Check the economic calendar", href: "#calendar" }
  });

  L.push({
    id: "regulation", cat: "Markets and news",
    title: "Choosing a broker anywhere: regulation, scams and staying safe",
    body: `Real-money trading is done with a broker, not on Modefx. Before you ever deposit, check the broker's regulation. Each country has its own financial regulator, for example the FCA in the UK, ASIC in Australia, the SEC and CFTC in the US, CySEC in Cyprus and the CMA in Kenya. Look the firm up on your regulator's own website, not in an ad. Many online brokers operate offshore, so read their terms, confirm they accept clients from your country and know where your money is held.
Red flags: guaranteed returns, "signals" for a fee with fake profit screenshots, anyone asking you to deposit into a private person's account or mobile wallet, pressure to deposit quickly, and recovery services that charge up front after you lost money.
Be honest about the odds too. Regulators in several countries publish disclosures showing that a majority of retail leveraged-trading accounts lose money. Practice here first, trade only money you can afford to lose, keep records, and ask a tax professional how profits are treated for you. Modefx does not provide financial or tax advice.`,
    cta: { text: "Read how Modefx handles real money", href: "help.html" }
  });

  /* ======================= MINDSET & PROCESS ======================= */
  L.push({
    id: "psychology", cat: "Mindset and process",
    title: "Psychology: FOMO, revenge trading and the daily loss limit",
    body: `Most trading mistakes are emotional, not analytical. The usual ones: FOMO, which is chasing a move that already happened. Revenge trading, which is taking an oversized or low-quality trade right after a loss to "win it back". Loss aversion, which is holding a loser too long because closing it makes the loss real. Overconfidence after a winning streak, which quietly grows position sizes.
You cannot out-think emotions in the moment, so build rules that act before you do. A daily loss limit stops the day when you have lost a set amount (many traders use 2 to 3 times their per-trade risk). A maximum trades per day cap stops overtrading. A cooling-off rule, such as 30 minutes away from the screen after two losses in a row, breaks the revenge loop.
The Analyst tab in this Pro area flags quick re-entries after losses and size creep in your own journal, so you can see these patterns in your data, not just in theory.`,
    cta: { text: "Review your own journal habits", href: "#analyst" },
    demo: `<div class="tools-grid">
        ${field("ps-bal", "Account balance", 10000)}${field("ps-risk", "Risk per trade (%)", 1)}
        ${field("ps-mult", "Daily limit (x per-trade risk)", 3, "1", "1")}
      </div><p class="fine" id="ps-out"></p>`,
    wire(card) {
      live(card, ["ps-bal", "ps-risk", "ps-mult"], (c) => {
        const bal = num(c, "ps-bal"), r = num(c, "ps-risk"), m = num(c, "ps-mult");
        if (![bal, r, m].every((v) => v > 0)) return bad(c, "ps-out");
        out(c, "ps-out", `Per-trade risk: <strong>${(bal * r / 100).toFixed(2)}</strong>. Daily loss limit: <span class="err">${(bal * r / 100 * m).toFixed(2)}</span> (${(r * m).toFixed(1)}% of the account). When it is hit, you are done for the day, no exceptions.`);
      });
    }
  });

  L.push({
    id: "backtest", cat: "Mindset and process",
    title: "Testing a strategy: sample size, overfitting and forward testing",
    body: `A strategy that "worked" on five trades proved nothing. Small samples produce lucky results. The calculator below shows how wide the uncertainty on a win rate really is: with 20 trades, an observed 55% win rate is compatible with a true rate anywhere from roughly 34% to 74%.
Backtesting means applying your rules to past data. Do it honestly: write the rules first, apply them without adjusting after seeing results, and include costs. Overfitting is tuning rules so tightly to past data that they only describe the past. If a strategy needs seven special conditions to look good, it is probably curve-fitted.
Then forward test: trade the exact rules on the simulator, in real time, for at least 30 to 50 trades, and journal every one. Only after that does a result deserve some trust, and even then, markets change.`,
    cta: { text: "Forward test in the simulator", href: "markets.html" },
    demo: `<div class="tools-grid">
        ${field("bt-wr", "Observed win rate (%)", 55, "1")}${field("bt-n", "Number of trades", 20, "1", "1")}
      </div><p class="fine" id="bt-out"></p>`,
    wire(card) {
      live(card, ["bt-wr", "bt-n"], (c) => {
        const p = num(c, "bt-wr") / 100, n = num(c, "bt-n");
        if (!(p > 0 && p < 1) || !(n >= 1)) return bad(c, "bt-out", "Enter a win rate between 0 and 100 and at least 1 trade.");
        // Wilson score interval, 95%
        const z = 1.96, d = 1 + z * z / n, ctr = (p + z * z / (2 * n)) / d, w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
        out(c, "bt-out", `With ${n} trades, a ${(p * 100).toFixed(0)}% observed win rate is consistent with a true rate between <strong>${Math.max(0, (ctr - w) * 100).toFixed(0)}%</strong> and <strong>${Math.min(100, (ctr + w) * 100).toFixed(0)}%</strong> (95% interval). ${n < 30 ? '<span class="err">Too few trades to trust.</span>' : n < 100 ? "Getting useful, keep collecting." : "A reasonable sample."}`);
      });
    }
  });

  L.push({
    id: "plan", cat: "Mindset and process",
    title: "Writing a strategy playbook and a pre-trade checklist",
    body: `A strategy you cannot write down is not a strategy. A complete playbook has: the market and timeframe, the conditions that must be true before you look for a trade, the exact entry trigger, where the stop goes and why, how you take profit, how much you risk, and what makes you stand aside. Add a short list of questions to answer right before every entry. That is your pre-trade checklist.
Documenting rules turns your journal into a feedback loop: each trade is either "followed the plan" or "broke the plan", and you can measure the two groups separately. Many traders discover that their rule-following trades are profitable and their rule-breaking trades are what hurts them.
The Strategies tab in this Pro area gives you a template, saves your playbooks to your account, and shows the performance of any strategy whose name matches the "strategy" field on your journal trades.`,
    cta: { text: "Open the Strategies tab", href: "#strategies" }
  });

  return L;
})();
