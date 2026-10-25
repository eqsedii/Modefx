(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const M = window.MFXMarket;
  const LESSONS = window.MFX_PRO_LESSONS || [];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (n >= 0 ? "+" : "-") + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n) => (n * 100).toFixed(0) + "%";

  let sb = null, session = null, myName = "Trader";
  async function getSB() {
    if (sb) return sb;
    if (!C.supabaseUrl || !C.supabaseAnonKey) return null;
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
    return sb;
  }
  const isUnlocked = (tiers, id) => {
    const e = (tiers || []).find((x) => x.tier === id);
    return !!e && (!e.expires_at || new Date(e.expires_at) > new Date());
  };
  const say = (el, text, kind = "") => { el.textContent = text; el.className = "msg " + kind; };

  /* ===================== Tabs ===================== */
  const TABS = ["lessons", "analyst", "calendar", "strategies", "community"];
  const loaded = {};
  function showTab(name, { scroll = true } = {}) {
    if (!TABS.includes(name)) name = "lessons";
    $$("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== name; });
    if (!loaded[name]) { loaded[name] = true; ({ lessons: initLessons, analyst: initAnalyst, calendar: initCalendar, strategies: initStrategies, community: initCommunity })[name](); }
    if (scroll) { const t = $(".subtabs"); if (t) t.scrollIntoView({ block: "start", behavior: "smooth" }); }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) { history.replaceState(null, "", "#" + b.dataset.tab); showTab(b.dataset.tab, { scroll: false }); }
  });
  window.addEventListener("hashchange", () => { if (!$("#pro-app").hidden) showTab(location.hash.slice(1)); });

  /* ===================== Lessons ===================== */
  const DONE_KEY = "mfx-pro-done";
  const getDone = () => { try { return JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch (_) { return []; } };
  const setDone = (a) => { try { localStorage.setItem(DONE_KEY, JSON.stringify(a)); } catch (_) {} };
  function updateProgress() {
    const done = getDone().filter((id) => LESSONS.some((l) => l.id === id));
    $("#pro-progress").textContent = `${done.length} of ${LESSONS.length} Pro lessons done`;
  }
  function initLessons() {
    const done = getDone();
    const cats = [...new Set(LESSONS.map((l) => l.cat))];
    let n = 0;
    $("#pro-lessons").innerHTML = cats.map((cat) => `
      <h3 class="cat-head">${esc(cat)}</h3>
      ${LESSONS.filter((l) => l.cat === cat).map((l) => {
        n++;
        return `<details class="sheet lesson-card pro-lesson" data-lesson-id="${l.id}">
          <summary><span class="lnum">${n}</span><span class="ltitle">${esc(l.title)}</span><span class="ldone" ${done.includes(l.id) ? "" : "hidden"} aria-label="Done">&#10003;</span></summary>
          <div class="lbody">
            ${l.body.trim().split("\n").map((p) => `<p>${p.trim()}</p>`).join("")}
            ${l.diagram ? `<div class="diagram">${l.diagram}</div>` : ""}
            ${l.demo ? `<div class="demo-box"><p class="demo-label">Try it right here</p>${l.demo}</div>` : ""}
            <div class="lesson-foot">
              <a class="link" href="${l.cta.href}">${esc(l.cta.text)} &rarr;</a>
              <label class="check lesson-done"><input type="checkbox" data-lesson="${l.id}" ${done.includes(l.id) ? "checked" : ""}><span>Mark as done</span></label>
            </div>
          </div>
        </details>`;
      }).join("")}`).join("");
    // Calculators are wired the first time a lesson is opened.
    $$(".pro-lesson").forEach((card) => card.addEventListener("toggle", () => {
      if (!card.open || card.dataset.wired) return;
      card.dataset.wired = "1";
      const l = LESSONS.find((x) => x.id === card.dataset.lessonId);
      try { if (l && l.wire) l.wire(card); } catch (_) {}
    }));
    updateProgress();
  }
  document.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-lesson]"); if (!cb) return;
    let done = getDone();
    done = cb.checked ? [...new Set([...done, cb.dataset.lesson])] : done.filter((id) => id !== cb.dataset.lesson);
    setDone(done);
    const mark = $(`[data-lesson-id="${cb.dataset.lesson}"] .ldone`);
    if (mark) mark.hidden = !cb.checked;
    updateProgress();
  });

  /* ===================== Analyst: market explainer ===================== */
  function rsiOf(closes, n = 14) {
    if (closes.length <= n) return null;
    let g = 0, l = 0;
    for (let i = closes.length - n; i < closes.length; i++) { const d = closes[i] - closes[i - 1]; if (d >= 0) g += d; else l -= d; }
    return l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  function atrOf(bars, n = 14) {
    if (bars.length <= n) return null;
    let sum = 0;
    for (let i = bars.length - n; i < bars.length; i++) {
      const b = bars[i], pc = bars[i - 1].close;
      sum += Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
    }
    return sum / n;
  }
  function explain(sym) {
    const s = M.bySym(sym), f = (v) => M.fmtPrice(s, v);
    const bars = M.candlesFor(s, 3600000, 72), closes = bars.map((b) => b.close);
    const st = M.dailyStats(s), now = st.now;
    const s10 = M.sma(bars, 10), s20 = M.sma(bars, 20);
    const a10 = s10[s10.length - 1].value, a20 = s20[s20.length - 1].value, a20prev = s20[s20.length - 6].value;
    const rsi = rsiOf(closes), atr = atrOf(bars), atrLong = atrOf(bars.slice(0, -1), Math.min(60, bars.length - 2));
    const up = now > a20 && a10 > a20 && a20 > a20prev, down = now < a20 && a10 < a20 && a20 < a20prev;
    const trend = up ? "up" : down ? "down" : "sideways";
    const recent = bars.slice(-24);
    const swingHi = Math.max(...recent.map((b) => b.high)), swingLo = Math.min(...recent.map((b) => b.low));
    const posInRange = (now - st.lo) / Math.max(st.hi - st.lo, 1e-9);
    const volRatio = atr / atrLong;
    const stopDist = atr * 1.5;
    const real = M.isReal(sym);

    const trendTxt = up ? `The hourly trend is <strong class="ok">up</strong>. Price is above its 20-hour average, the faster 10-hour average is above the slower one, and the slow average is rising.`
      : down ? `The hourly trend is <strong class="err">down</strong>. Price is below its 20-hour average, the 10-hour average is under the 20-hour, and the slow average is falling.`
      : `The hourly trend is <strong>sideways or mixed</strong>. Price, the 10-hour and the 20-hour averages are not lined up in one direction, which usually means a range or a turning point.`;
    const rsiTxt = rsi == null ? "" : rsi >= 70 ? `Momentum is very strong (RSI ${rsi.toFixed(0)}). That is not a sell signal in a trend, but chasing here means a poor entry price, and a pullback is more likely than usual.`
      : rsi <= 30 ? `Momentum is very weak (RSI ${rsi.toFixed(0)}). Sellers have dominated, so late sellers risk a bounce, but weakness can persist in a downtrend.`
      : rsi >= 55 ? `Momentum leans positive (RSI ${rsi.toFixed(0)}).` : rsi <= 45 ? `Momentum leans negative (RSI ${rsi.toFixed(0)}).` : `Momentum is neutral (RSI ${rsi.toFixed(0)}).`;
    const volTxt = volRatio > 1.25 ? `Volatility is <strong>above normal</strong> (recent hourly ranges are ${((volRatio - 1) * 100).toFixed(0)}% larger than the 60-hour average). Use smaller size and wider stops.`
      : volRatio < 0.8 ? `Volatility is <strong>below normal</strong>. Quiet markets can stay quiet, or compress before a bigger move.` : `Volatility is about normal.`;
    const where = posInRange > 0.8 ? "near the top" : posInRange < 0.2 ? "near the bottom" : "in the middle";
    const plan = up ? `With the trend up, a careful trader looks for pullbacks toward the 20-hour average (${f(a20)}) or the recent low (${f(swingLo)}), and avoids buying into stretched moves. The idea is invalidated if price closes below ${f(swingLo)}.`
      : down ? `With the trend down, a careful trader looks for bounces toward the 20-hour average (${f(a20)}) or the recent high (${f(swingHi)}), and avoids selling into stretched moves. The idea is invalidated if price closes above ${f(swingHi)}.`
      : `With no clear trend, ranges are tradable only between clear edges (${f(swingLo)} and ${f(swingHi)}). A close beyond either edge is the first sign of a new direction.`;
    return `
      <div class="stat-grid">
        <div class="stat"><span>Price</span><strong>${f(now)}</strong></div>
        <div class="stat"><span>24h change</span><strong class="${st.chgPct >= 0 ? "ok" : "err"}">${st.chgPct >= 0 ? "+" : ""}${st.chgPct.toFixed(2)}%</strong></div>
        <div class="stat"><span>Day high</span><strong>${f(st.hi)}</strong></div>
        <div class="stat"><span>Day low</span><strong>${f(st.lo)}</strong></div>
      </div>
      <h3>What is happening</h3><p>${trendTxt} Price is ${where} of today's range.</p>
      <h3>Momentum</h3><p>${rsiTxt}</p>
      <h3>Volatility and stops</h3><p>${volTxt} The average hourly range (ATR) is ${f(atr)}. A stop 1.5 ATR away would sit about ${f(stopDist)} from entry, so size the position from that distance (see the sizing lesson).</p>
      <h3>What a careful trader watches</h3><p>${plan}</p>
      <p class="fine">Data source: ${real ? "a live quote for the current price, with simulated chart shape" : "simulated prices"}. This is an automated, rule-based summary for learning. It does not predict the future and is not financial advice.</p>`;
  }
  function initAnalyst() {
    const sel = $("#ex-sym");
    sel.innerHTML = M.SYMS.map((s) => `<option value="${esc(s.sym)}">${esc(s.sym)} (${esc(s.nm)})</option>`).join("");
    const run = () => { try { $("#ex-result").innerHTML = explain(sel.value); } catch (_) { $("#ex-result").textContent = "Couldn't build the explainer. Reload the page and try again."; } };
    sel.addEventListener("change", run); run();
    window.addEventListener("mfx:real-quotes", () => { if (!$("[data-panel=analyst]").hidden) run(); });
    $("#jr-run").addEventListener("click", runJournalReview);
  }

  /* ===================== Analyst: journal review ===================== */
  async function fetchClosedTrades() {
    const { data, error } = await sb.from("trades").select("*").eq("status", "closed").order("opened_at", { ascending: true });
    if (error) throw error;
    return (data || []).map((t) => ({
      ...t, pnl: Number(t.pnl || 0), qty: Number(t.qty), entry: Number(t.entry_price), exit: Number(t.exit_price),
      opened: new Date(t.opened_at).getTime(), closed: new Date(t.closed_at).getTime(),
      sl: t.stop_loss == null ? null : Number(t.stop_loss)
    }));
  }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const avg = (a) => (a.length ? sum(a) / a.length : 0);
  const fmtDur = (ms) => ms < 3600000 ? Math.max(1, Math.round(ms / 60000)) + " min" : (ms / 3600000).toFixed(1) + " h";
  function groupStats(trades, keyFn, minN = 1) {
    const g = {};
    trades.forEach((t) => { const k = keyFn(t); if (k == null || k === "") return; (g[k] = g[k] || []).push(t); });
    return Object.entries(g).filter(([, a]) => a.length >= minN).map(([k, a]) => ({ k, n: a.length, pnl: sum(a.map((t) => t.pnl)), win: a.filter((t) => t.pnl > 0).length / a.length }))
      .sort((x, y) => y.pnl - x.pnl);
  }
  function analyseTrades(tr) {
    const n = tr.length, wins = tr.filter((t) => t.pnl > 0), losses = tr.filter((t) => t.pnl < 0);
    const grossW = sum(wins.map((t) => t.pnl)), grossL = -sum(losses.map((t) => t.pnl));
    const winRate = wins.length / n, avgW = avg(wins.map((t) => t.pnl)), avgL = -avg(losses.map((t) => t.pnl));
    const expectancy = sum(tr.map((t) => t.pnl)) / n;
    const pf = grossL === 0 ? (grossW > 0 ? Infinity : 0) : grossW / grossL;
    // Equity curve, max drawdown, losing streak
    let eq = 0, peak = 0, mdd = 0, streak = 0, maxStreak = 0;
    tr.forEach((t) => {
      eq += t.pnl; peak = Math.max(peak, eq); mdd = Math.max(mdd, peak - eq);
      if (t.pnl < 0) { streak++; maxStreak = Math.max(maxStreak, streak); } else streak = 0;
    });
    // R multiples where a stop was set
    const rs = tr.filter((t) => t.sl != null && t.sl !== t.entry).map((t) => t.pnl / (Math.abs(t.entry - t.sl) * t.qty));
    const withStop = tr.filter((t) => t.sl != null).length / n;
    const withReason = tr.filter((t) => (t.reason_in || "").trim().length > 3).length / n;
    // Revenge: opened within 15 minutes after a losing close
    const rev = [], norm = [];
    const afterLoss = [], afterWin = [];
    for (let i = 1; i < n; i++) {
      const prev = tr[i - 1], t = tr[i], gap = t.opened - prev.closed;
      if (prev.pnl < 0 && gap >= 0 && gap <= 15 * 60000) rev.push(t); else norm.push(t);
      (prev.pnl < 0 ? afterLoss : afterWin).push(t);
    }
    const holdW = avg(wins.map((t) => t.closed - t.opened)), holdL = avg(losses.map((t) => t.closed - t.opened));
    const bySym = groupStats(tr, (t) => t.symbol, 3);
    const byStrat = groupStats(tr, (t) => (t.strategy || "").trim().toLowerCase(), 1);
    const byHour = groupStats(tr, (t) => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23" }).format(new Date(t.opened))), 3);
    const bySide = groupStats(tr, (t) => t.side, 3);
    return { n, wins, losses, winRate, avgW, avgL, expectancy, pf, mdd, maxStreak, rs, withStop, withReason, rev, norm, afterLoss, afterWin, holdW, holdL, bySym, byStrat, byHour, bySide, total: sum(tr.map((t) => t.pnl)) };
  }
  function findings(a) {
    const out = [];
    const add = (kind, text) => out.push({ kind, text });
    if (a.n < 10) add("info", `You have only ${a.n} closed trade${a.n === 1 ? "" : "s"}. Patterns below are early hints, not conclusions. Aim for 30 or more before trusting them.`);
    else if (a.n < 30) add("info", `${a.n} closed trades is a small sample. Treat the findings as hints and keep journaling.`);
    if (a.n >= 5) {
      if (a.expectancy > 0) add("good", `Positive expectancy: on average each trade made ${money(a.expectancy)}. The question is whether it holds over more trades.`);
      else add("warn", `Negative expectancy: each trade has lost ${money(Math.abs(a.expectancy)).slice(1)} on average. Either wins are too small, losses too big, or win rate too low. The next checks show which.`);
      if (a.avgL > 0 && a.avgW > 0) {
        const payoff = a.avgW / a.avgL, be = 1 / (1 + payoff);
        if (a.winRate < be) add("warn", `Your average win is ${payoff.toFixed(2)}x your average loss, so you need to win about ${pct(be)} of trades to break even. You are winning ${pct(a.winRate)}.`);
        else add("good", `Your average win is ${payoff.toFixed(2)}x your average loss. Breakeven win rate is ${pct(be)} and you are at ${pct(a.winRate)}.`);
        if (payoff < 0.8 && a.winRate > 0.55) add("warn", "You win often but your losses are bigger than your wins. That pattern usually means cutting winners early or letting losers run.");
      }
    }
    if (a.withStop < 0.7) add("warn", `Only ${pct(a.withStop)} of your trades had a stop-loss. Trading without a stop is the fastest route to an oversized loss. Set a stop on every trade.`);
    else if (a.n >= 5) add("good", `${pct(a.withStop)} of your trades had a stop-loss. Good discipline.`);
    if (a.withReason < 0.6) add("warn", `${pct(a.withReason)} of your trades have a clear reason written for the entry. A journal without reasons can't teach you much.`);
    if (a.rev.length >= 3) {
      const rp = avg(a.rev.map((t) => t.pnl)), np = avg(a.norm.map((t) => t.pnl));
      if (rp < np) add("warn", `${a.rev.length} trades were opened within 15 minutes of a loss. They averaged ${money(rp)} compared with ${money(np)} for your other trades. This looks like revenge trading. Try a 30 minute break after a loss.`);
      else add("info", `${a.rev.length} trades were opened within 15 minutes of a loss, and they did no worse than your others. Keep watching this.`);
    }
    if (a.afterLoss.length >= 3 && a.afterWin.length >= 3) {
      const ql = avg(a.afterLoss.map((t) => t.qty)), qw = avg(a.afterWin.map((t) => t.qty));
      if (ql > qw * 1.5) add("warn", `Position size jumps after losses (average ${ql.toFixed(2)} vs ${qw.toFixed(2)} after wins). Raising size to win it back is how small losses turn into big ones. Keep size tied to your stop and risk percentage.`);
      else if (qw > ql * 1.5) add("info", `Position size grows after wins (average ${qw.toFixed(2)} vs ${ql.toFixed(2)} after losses). Watch for overconfidence creeping in.`);
    }
    if (a.wins.length >= 3 && a.losses.length >= 3 && a.holdL > a.holdW * 1.5) add("warn", `Losing trades are held ${fmtDur(a.holdL)} on average, winners only ${fmtDur(a.holdW)}. This is the classic pattern of hoping on losers and taking profit too soon. Decide the exit before you enter.`);
    if (a.maxStreak >= 4) add("info", `Your longest losing streak is ${a.maxStreak} trades. Know in advance what you do at that point, for example stop for the day.`);
    if (a.rs.length >= 5) {
      const ar = avg(a.rs);
      add(ar > 0 ? "good" : "warn", `On trades with a stop, your average result is ${ar >= 0 ? "+" : ""}${ar.toFixed(2)}R (R = the amount you risked by the stop).`);
    }
    if (a.bySym.length >= 2) {
      const best = a.bySym[0], worst = a.bySym[a.bySym.length - 1];
      if (worst.pnl < 0) add("info", `Weakest market: ${worst.k} (${worst.n} trades, ${money(worst.pnl)}). Best: ${best.k} (${best.n} trades, ${money(best.pnl)}).`);
    }
    if (a.byHour.length >= 2) {
      const best = a.byHour[0], worst = a.byHour[a.byHour.length - 1];
      if (worst.pnl < 0) add("info", `Your weakest time to open trades is around ${String(worst.k).padStart(2, "0")}:00 your time (${worst.n} trades, ${money(worst.pnl)}). Strongest: ${String(best.k).padStart(2, "0")}:00 (${best.n} trades, ${money(best.pnl)}).`);
    }
    if (!out.some((o) => o.kind === "warn") && a.n >= 10) add("good", "No major warning signs in this data. Keep journaling and keep the sample growing.");
    return out;
  }
  const tableOf = (rows, head) => `<div class="table-scroll"><table class="admin-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  async function runJournalReview() {
    const msg = $("#jr-msg"), box = $("#jr-result"), btn = $("#jr-run");
    box.innerHTML = ""; say(msg, "Reading your trades...", "info"); btn.disabled = true;
    try {
      const tr = await fetchClosedTrades();
      if (tr.length < 3) { say(msg, "Close at least 3 practice trades first. The review gets useful from about 10.", "info"); return; }
      const a = analyseTrades(tr);
      say(msg, "");
      const icon = { good: "&#10003;", warn: "!", info: "i" };
      box.innerHTML = `
        <div class="stat-grid">
          <div class="stat"><span>Trades</span><strong>${a.n}</strong></div>
          <div class="stat"><span>Win rate</span><strong>${pct(a.winRate)}</strong></div>
          <div class="stat"><span>Total P/L</span><strong class="${a.total >= 0 ? "ok" : "err"}">${money(a.total)}</strong></div>
          <div class="stat"><span>Profit factor</span><strong>${a.pf === Infinity ? "n/a" : a.pf.toFixed(2)}</strong></div>
          <div class="stat"><span>Avg win</span><strong class="ok">${a.avgW ? money(a.avgW) : "-"}</strong></div>
          <div class="stat"><span>Avg loss</span><strong class="err">${a.avgL ? money(-a.avgL) : "-"}</strong></div>
          <div class="stat"><span>Max drawdown</span><strong class="err">${a.mdd ? "-" + a.mdd.toFixed(2) : "0.00"}</strong></div>
          <div class="stat"><span>Worst streak</span><strong>${a.maxStreak} losses</strong></div>
        </div>
        <h3>What your journal says</h3>
        <ul class="findings">${findings(a).map((f) => `<li class="finding ${f.kind}"><span class="ficon" aria-hidden="true">${icon[f.kind]}</span><span>${f.text}</span></li>`).join("")}</ul>
        ${a.bySym.length ? `<h3>By market</h3>${tableOf(a.bySym.map((x) => [esc(x.k), x.n, pct(x.win), `<span class="${x.pnl >= 0 ? "ok" : "err"}">${money(x.pnl)}</span>`]), ["Market", "Trades", "Win rate", "P/L"])}` : ""}
        ${a.byStrat.length ? `<h3>By strategy</h3>${tableOf(a.byStrat.map((x) => [esc(x.k), x.n, pct(x.win), `<span class="${x.pnl >= 0 ? "ok" : "err"}">${money(x.pnl)}</span>`]), ["Strategy", "Trades", "Win rate", "P/L"])}` : ""}
        ${a.byHour.length ? `<h3>By hour opened (your local time)</h3>${tableOf(a.byHour.sort((x, y) => x.k - y.k).map((x) => [String(x.k).padStart(2, "0") + ":00", x.n, pct(x.win), `<span class="${x.pnl >= 0 ? "ok" : "err"}">${money(x.pnl)}</span>`]), ["Hour", "Trades", "Win rate", "P/L"])}` : ""}
        <p class="fine">Automated, rule-based review of your simulated trades. It spots patterns in your data. It does not predict results and is not financial advice.</p>`;
    } catch (_) {
      say(msg, "Couldn't load your trades. Check your connection and try again.");
    } finally { btn.disabled = false; }
  }

  /* ===================== Calendar ===================== */
  function tzOffsetMs(tz, utcMs) {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(new Date(utcMs));
    const g = (t) => Number(f.find((p) => p.type === t).value);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - utcMs;
  }
  function zonedToUtc(y, m, d, h, mi, tz) {
    const guess = Date.UTC(y, m - 1, d, h, mi);
    const first = guess - tzOffsetMs(tz, guess);
    return guess - tzOffsetMs(tz, first);
  }
  const fmtEat = (ms) => new Date(ms).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const fmtEatDay = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  // Event types. "tags" decide which markets they matter for.
  const GUIDE = [
    { id: "fomc", name: "US Federal Reserve rate decision (FOMC)", tags: ["USD", "RISK"], impact: "High", when: "8 times a year, announced at 14:00 New York time, with a press conference 30 minutes later.",
      what: "The Fed decides the US interest rate and explains its thinking in a statement.",
      why: "US rates drive the dollar. The tone of the statement and the press conference often matters more than the decision itself, because markets already price in the expected move.",
      price: "Expect sharp, two-way moves in USD pairs, gold, indices and crypto, sometimes reversing within minutes. Spreads widen.",
      plan: "Stand aside or cut size before the statement. Wait through the press conference before judging direction." },
    { id: "nfp", name: "US jobs report (Non-Farm Payrolls)", tags: ["USD", "RISK"], impact: "High", when: "Usually the first Friday of the month at 08:30 New York time.",
      what: "How many jobs the US economy added last month, plus unemployment and wage growth.",
      why: "A strong jobs market can mean higher rates for longer, which tends to lift the dollar. A weak one points to cuts and a softer dollar. As always, the surprise versus the forecast matters.",
      price: "One of the most volatile releases of the month for USD pairs, gold and indices.",
      plan: "Avoid holding tight stops through the release. If you trade it, wait for the first spike to settle." },
    { id: "cpi", name: "US inflation (CPI)", tags: ["USD", "RISK"], impact: "High", when: "Monthly, usually between the 10th and 15th, at 08:30 New York time. Check the exact date.",
      what: "How fast consumer prices are rising.",
      why: "Inflation drives interest-rate expectations. Hotter than expected inflation pushes rate expectations up, usually supporting the dollar and pressuring stocks and gold.",
      price: "Fast moves in USD pairs, gold and indices at the release.",
      plan: "Same as jobs day: smaller size, wider stops, wait for confirmation." },
    { id: "ecb", name: "European Central Bank rate decision", tags: ["EUR"], impact: "High", when: "About every six weeks. The decision is at 14:15 Frankfurt time, with a press conference at 14:45.",
      what: "The ECB sets euro-area interest rates.",
      why: "It drives the euro. As with the Fed, guidance about future decisions often moves price more than the decision.",
      price: "EUR/USD can move 50 to 100 pips quickly around the decision and press conference.",
      plan: "Treat the decision and press conference as two separate events." },
    { id: "boe", name: "Bank of England rate decision", tags: ["GBP"], impact: "High", when: "Eight times a year, announced at 12:00 London time.",
      what: "The Bank of England sets UK interest rates, and the vote split of the committee is published.",
      why: "It drives the pound. The split in the vote shows how close the committee is to changing course.",
      price: "GBP pairs move sharply at the announcement.",
      plan: "Check the vote split as well as the rate." },
    { id: "cbk", name: "Central Bank of Kenya rate decision (MPC)", tags: ["KES"], impact: "Medium", when: "About every two months. The CBK announces the next date after each meeting on centralbank.go.ke.",
      what: "The Monetary Policy Committee sets the Central Bank Rate.",
      why: "It affects borrowing costs in Kenya, the shilling and Kenyan stocks such as Safaricom.",
      price: "USD/KES usually moves gradually, not in spikes, but bank and NSE stocks can react.",
      plan: "Read the statement for the CBK's view on inflation and the shilling." },
    { id: "knbs", name: "Kenya inflation (KNBS)", tags: ["KES"], impact: "Medium", when: "Monthly, usually near the end of the month.",
      what: "The Kenya National Bureau of Statistics reports how quickly consumer prices are rising.",
      why: "It guides the CBK's rate decisions and shows what everyday costs are doing.",
      price: "Rarely a sharp spike, but it shapes expectations for the shilling and local rates.",
      plan: "Use it to understand the trend, not to time a trade." },
    { id: "gdp", name: "GDP growth", tags: ["USD", "EUR", "GBP", "KES"], impact: "Medium", when: "Quarterly, with preliminary and revised estimates.",
      what: "The size of an economy and how fast it is growing.",
      why: "Strong growth supports a currency and stocks. A sharp slowdown raises recession fears.",
      price: "Moderate reaction unless it is a big surprise.", plan: "Look at the trend over several quarters." },
    { id: "pmi", name: "PMI surveys", tags: ["USD", "EUR", "GBP"], impact: "Medium", when: "Monthly, early in the month for manufacturing and a few days later for services.",
      what: "Surveys of purchasing managers. Above 50 means expansion, below 50 means contraction.",
      why: "An early read on economic health, released before hard data.", price: "Small to medium moves.", plan: "Good for context on the trend." },
    { id: "claims", name: "US weekly jobless claims", tags: ["USD"], impact: "Low", when: "Every Thursday at 08:30 New York time.",
      what: "How many people filed for unemployment benefits last week.",
      why: "A fast signal for the US labour market between the monthly reports.", price: "Usually small, bigger when it surprises.", plan: "Noise most weeks. Watch for sustained trends." },
    { id: "oil", name: "Oil and crypto events", tags: ["RISK"], impact: "Variable", when: "OPEC meetings, crypto upgrades, exchange news, ETF decisions.",
      what: "Events that move specific markets rather than whole economies.",
      why: "Oil affects inflation and some currencies. Crypto reacts to regulation and large flows.", price: "Can be sudden and very large, especially in crypto.", plan: "Keep size small when headline risk is high." }
  ];
  const TAGS = { "EUR/USD": ["USD", "EUR"], "USD/KES": ["USD", "KES"], "BTC/USD": ["USD", "RISK"], "XAU/USD": ["USD"], "SCOM": ["KES", "RISK"], "US100": ["USD", "RISK"] };

  function buildEvents() {
    const ev = [];
    const sched = (g, name, y, m, d, h, mi, tz, tags) => ev.push({ guide: g, name, utc: zonedToUtc(y, m, d, h, mi, tz), tags, kind: "Scheduled" });
    // Published central bank decision dates (verified 24 Oct 2026). Confirm on the bank's own site.
    sched("fomc", "US Fed rate decision", 2026, 10, 28, 14, 0, "America/New_York", ["USD", "RISK"]);
    sched("fomc", "US Fed rate decision", 2026, 12, 9, 14, 0, "America/New_York", ["USD", "RISK"]);
    sched("ecb", "ECB rate decision", 2026, 10, 29, 14, 15, "Europe/Berlin", ["EUR"]);
    sched("ecb", "ECB rate decision", 2026, 12, 17, 14, 15, "Europe/Berlin", ["EUR"]);
    sched("boe", "Bank of England rate decision", 2026, 11, 5, 12, 0, "Europe/London", ["GBP"]);
    sched("boe", "Bank of England rate decision", 2026, 12, 17, 12, 0, "Europe/London", ["GBP"]);
    // Typical-pattern events: computed from the usual rule.
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const y = now.getUTCFullYear() + Math.floor((now.getUTCMonth() + i) / 12), m = (now.getUTCMonth() + i) % 12;
      const dow = new Date(Date.UTC(y, m, 1)).getUTCDay();
      const first = 1 + ((5 - dow + 7) % 7);
      ev.push({ guide: "nfp", name: "US jobs report (NFP)", utc: zonedToUtc(y, m + 1, first, 8, 30, "America/New_York"), tags: ["USD", "RISK"], kind: "Typical" });
      // Kenya inflation: last weekday of the month (typical).
      let last = new Date(Date.UTC(y, m + 1, 0));
      while ([0, 6].includes(last.getUTCDay())) last = new Date(last.getTime() - 86400000);
      ev.push({ guide: "knbs", name: "Kenya inflation (KNBS)", utc: zonedToUtc(y, m + 1, last.getUTCDate(), 12, 0, "Africa/Nairobi"), tags: ["KES"], kind: "Typical", dayOnly: true });
    }
    const cutoff = Date.now() - 3 * 3600000;
    return ev.filter((e) => e.utc >= cutoff).sort((a, b) => a.utc - b.utc);
  }
  function initCalendar() {
    const sel = $("#cal-sym");
    sel.innerHTML = `<option value="">All markets</option>` + M.SYMS.map((s) => `<option value="${esc(s.sym)}">${esc(s.sym)}</option>`).join("");
    const events = buildEvents();
    const draw = () => {
      const want = sel.value ? TAGS[sel.value] || [] : null;
      const list = events.filter((e) => !want || e.tags.some((t) => want.includes(t))).slice(0, 14);
      $("#cal-list").innerHTML = list.length ? list.map((e) => {
        const g = GUIDE.find((x) => x.id === e.guide);
        const soon = e.utc - Date.now();
        const badge = soon < 0 ? `<span class="tag err">Happening now</span>` : soon < 48 * 3600000 ? `<span class="tag err">Within 48h</span>` : "";
        return `<details class="cal-item"><summary>
            <span class="cal-when">${e.dayOnly ? fmtEatDay(e.utc) : fmtEat(e.utc)}</span>
            <span class="cal-name">${esc(e.name)} ${badge}</span>
            <span class="tag ${g.impact === "High" ? "hi" : ""}">${esc(g.impact)}</span><span class="tag">${e.kind}</span>
          </summary>${guideBody(g)}</details>`;
      }).join("") : `<p class="fine">No upcoming events match this market.</p>`;
    };
    sel.addEventListener("change", draw); draw();
    $("#cal-guide").innerHTML = GUIDE.map((g) => `<details class="cal-item"><summary><span class="cal-name">${esc(g.name)}</span><span class="tag ${g.impact === "High" ? "hi" : ""}">${esc(g.impact)}</span></summary>${guideBody(g)}</details>`).join("");
  }
  const guideBody = (g) => `<div class="cal-body">
      <p><strong>When:</strong> ${esc(g.when)}</p><p><strong>What it is:</strong> ${esc(g.what)}</p>
      <p><strong>Why it matters:</strong> ${esc(g.why)}</p><p><strong>What price may do:</strong> ${esc(g.price)}</p>
      <p><strong>How to handle it:</strong> ${esc(g.plan)}</p></div>`;

  /* ===================== Strategies ===================== */
  const DEFAULT_CHECK = ["Is the higher-timeframe trend in my favour?", "Is price at a level that matters (zone, average, swing)?", "Do I have a clear entry trigger?", "Is my stop placed where the idea is wrong?", "Is the reward at least 1.5 times the risk after costs?", "Is my size set from the stop, within my risk limit?", "Is there news in the next 30 minutes?", "Am I calm, not chasing and not revenge trading?"].join("\n");
  const SFIELDS = [
    { k: "markets", label: "Markets I trade this on", type: "text", ph: "e.g. EUR/USD, XAU/USD" },
    { k: "timeframe", label: "Timeframes", type: "text", ph: "e.g. 1H for trend, 15m for entry" },
    { k: "style", label: "Style", type: "select", opts: ["Scalping", "Day trading", "Swing trading", "Position trading"] },
    { k: "edge", label: "The idea: why should this work?", type: "textarea", ph: "e.g. In a trend, pullbacks to the 20 average are bought by trend followers." },
    { k: "conditions", label: "Conditions that must be true (one per line)", type: "textarea", ph: "Higher-timeframe uptrend\nPrice pulls back to the 20 average\nRSI holds above 40" },
    { k: "entry", label: "Entry trigger", type: "textarea", ph: "e.g. A bullish candle closes back above the average." },
    { k: "stop", label: "Stop-loss rule", type: "textarea", ph: "e.g. Below the pullback low, plus a small buffer." },
    { k: "target", label: "Take-profit and exit rule", type: "textarea", ph: "e.g. Half at 1R, trail the rest below each higher low." },
    { k: "risk", label: "Risk per trade (%)", type: "number", ph: "1" },
    { k: "dailyLoss", label: "Daily loss limit (%)", type: "number", ph: "3" },
    { k: "noTrade", label: "When I do NOT trade (one per line)", type: "textarea", ph: "30 minutes before high-impact news\nAfter two losses in a row\nWhen I feel rushed" },
    { k: "checklist", label: "Pre-trade checklist (one per line)", type: "textarea", def: DEFAULT_CHECK },
    { k: "notes", label: "Notes and lessons", type: "textarea", ph: "What you have learned using this strategy." }
  ];
  let strategies = [], closedTrades = [], editingId = null;

  async function loadStrategies() {
    const { data, error } = await sb.from("strategies").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    strategies = data || [];
    try { closedTrades = await fetchClosedTrades(); } catch (_) { closedTrades = []; }
  }
  const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
  function stratStats(name) {
    const k = name.trim().toLowerCase();
    const t = closedTrades.filter((x) => (x.strategy || "").trim().toLowerCase() === k);
    if (!t.length) return null;
    return { n: t.length, win: t.filter((x) => x.pnl > 0).length / t.length, pnl: sum(t.map((x) => x.pnl)) };
  }
  function strategyText(s) {
    const d = s.data || {};
    const ul = (v) => lines(v).map((x) => "  - " + x).join("\n");
    return [`STRATEGY: ${s.name}`, `Markets: ${d.markets || "-"}`, `Timeframes: ${d.timeframe || "-"}`, `Style: ${d.style || "-"}`, `Idea: ${d.edge || "-"}`,
      `Conditions:\n${ul(d.conditions) || "  -"}`, `Entry: ${d.entry || "-"}`, `Stop-loss: ${d.stop || "-"}`, `Exit: ${d.target || "-"}`,
      `Risk per trade: ${d.risk || "-"}%   Daily loss limit: ${d.dailyLoss || "-"}%`, `Do not trade when:\n${ul(d.noTrade) || "  -"}`, `Checklist:\n${ul(d.checklist) || "  -"}`, `Notes: ${d.notes || "-"}`].join("\n");
  }
  function renderStrategies() {
    const box = $("#st-list");
    if (!strategies.length) { box.innerHTML = `<p class="fine">No strategies yet. Tap "New strategy" to write your first playbook.</p>`; return; }
    box.innerHTML = strategies.map((s) => {
      const d = s.data || {}, st = stratStats(s.name);
      const chk = lines(d.checklist);
      return `<details class="cal-item strat" data-id="${s.id}"><summary>
          <span class="cal-name">${esc(s.name)}</span>
          <span class="tag">${st ? `${st.n} trade${st.n === 1 ? "" : "s"}` : "no trades yet"}</span>
        </summary>
        <div class="cal-body">
          ${st ? `<p><strong>Journal results:</strong> win rate ${pct(st.win)}, total <span class="${st.pnl >= 0 ? "ok" : "err"}">${money(st.pnl)}</span> across ${st.n} closed trade${st.n === 1 ? "" : "s"} labelled "${esc(s.name)}".</p>` : `<p class="fine">Results appear here once you close practice trades with "${esc(s.name)}" typed in the Strategy box.</p>`}
          <p><strong>Markets:</strong> ${esc(d.markets || "-")} &middot; <strong>Timeframes:</strong> ${esc(d.timeframe || "-")} &middot; <strong>Style:</strong> ${esc(d.style || "-")}</p>
          ${d.edge ? `<p><strong>Idea:</strong> ${esc(d.edge)}</p>` : ""}
          ${lines(d.conditions).length ? `<p><strong>Conditions:</strong></p><ul class="plain-list">${lines(d.conditions).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
          ${d.entry ? `<p><strong>Entry:</strong> ${esc(d.entry)}</p>` : ""}${d.stop ? `<p><strong>Stop-loss:</strong> ${esc(d.stop)}</p>` : ""}${d.target ? `<p><strong>Exit:</strong> ${esc(d.target)}</p>` : ""}
          <p><strong>Risk:</strong> ${esc(d.risk || "-")}% per trade &middot; <strong>Daily limit:</strong> ${esc(d.dailyLoss || "-")}%</p>
          ${lines(d.noTrade).length ? `<p><strong>I do not trade when:</strong></p><ul class="plain-list">${lines(d.noTrade).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
          ${chk.length ? `<div class="demo-box"><p class="demo-label">Pre-trade checklist</p>${chk.map((x, i) => `<label class="check"><input type="checkbox" class="chk"><span>${esc(x)}</span></label>`).join("")}<p class="fine chk-out">Tick every box before you enter.</p></div>` : ""}
          ${d.notes ? `<p><strong>Notes:</strong> ${esc(d.notes)}</p>` : ""}
          <div class="btn-row"><button type="button" class="btn btn-ghost" data-act="edit">Edit</button><button type="button" class="btn btn-ghost" data-act="copy">Copy as text</button><button type="button" class="btn btn-ghost" data-act="del">Delete</button></div>
        </div></details>`;
    }).join("");
  }
  function openForm(s) {
    editingId = s ? s.id : null;
    const d = s ? s.data || {} : {};
    $("#st-form-title").textContent = s ? "Edit strategy" : "New strategy";
    $("#st-fields").innerHTML = `<div class="field-row"><label for="sf-name">Strategy name</label><input id="sf-name" class="demo-input" type="text" maxlength="80" value="${esc(s ? s.name : "")}" placeholder="e.g. Trend pullback"><p class="fine">Use this exact name in the Strategy box when you open a practice trade.</p></div>` +
      SFIELDS.map((f) => {
        const v = d[f.k] ?? f.def ?? "";
        const input = f.type === "textarea" ? `<textarea id="sf-${f.k}" class="demo-input" maxlength="1500" placeholder="${esc(f.ph || "")}">${esc(v)}</textarea>`
          : f.type === "select" ? `<select id="sf-${f.k}" class="demo-input">${f.opts.map((o) => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("")}</select>`
          : `<input id="sf-${f.k}" class="demo-input" type="${f.type}" ${f.type === "number" ? 'step="0.1" min="0" max="100"' : 'maxlength="160"'} value="${esc(v)}" placeholder="${esc(f.ph || "")}">`;
        return `<div class="field-row"><label for="sf-${f.k}">${f.label}</label>${input}</div>`;
      }).join("");
    $("#st-form").hidden = false;
    $("#st-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function initStrategies() {
    const msg = $("#st-msg");
    try { await loadStrategies(); renderStrategies(); } catch (_) { say(msg, "Couldn't load your strategies. Run supabase/pro.sql in Supabase, then reload."); }
    $("#st-new").addEventListener("click", () => openForm(null));
    $("#st-cancel").addEventListener("click", () => { $("#st-form").hidden = true; });
    $("#st-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#sf-name").value.trim();
      if (!name) return say(msg, "Give the strategy a name first.");
      const data = {};
      SFIELDS.forEach((f) => { data[f.k] = $("#sf-" + f.k).value.trim(); });
      const btn = $("#st-save"); btn.disabled = true;
      try {
        const row = { name, data, updated_at: new Date().toISOString() };
        const { error } = editingId ? await sb.from("strategies").update(row).eq("id", editingId)
          : await sb.from("strategies").insert({ ...row, user_id: session.user.id });
        if (error) throw error;
        $("#st-form").hidden = true; say(msg, "Saved.", "ok");
        await loadStrategies(); renderStrategies();
      } catch (_) { say(msg, "Couldn't save. Check your connection and that Pro is unlocked."); } finally { btn.disabled = false; }
    });
    $("#st-list").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const id = b.closest("[data-id]").dataset.id, s = strategies.find((x) => x.id === id);
      if (b.dataset.act === "edit") openForm(s);
      if (b.dataset.act === "copy") {
        try { await navigator.clipboard.writeText(strategyText(s)); say(msg, "Copied. Paste it into your notes.", "ok"); } catch (_) { say(msg, "Couldn't copy on this browser."); }
      }
      if (b.dataset.act === "del") {
        if (!confirm(`Delete "${s.name}"? This can't be undone.`)) return;
        const { error } = await sb.from("strategies").delete().eq("id", id);
        if (error) return say(msg, "Couldn't delete. Try again.");
        await loadStrategies(); renderStrategies(); say(msg, "Deleted.", "ok");
      }
    });
    $("#st-list").addEventListener("change", (e) => {
      const box = e.target.closest(".demo-box"); if (!box || !e.target.classList.contains("chk")) return;
      const all = $$(".chk", box), ticked = all.filter((c) => c.checked).length, out = $(".chk-out", box);
      out.innerHTML = ticked === all.length ? `<span class="ok">All ${all.length} checks passed. You may enter, with your stop set.</span>` : `${ticked} of ${all.length} ticked. ${all.length - ticked} left before you enter.`;
    });
  }

  /* ===================== Community ===================== */
  const NO_CONTACT = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|co|ke|io|me|net|org|xyz|ly)\b|\+?254[ -]?\d{6,}|\b0[17][\d -]{7,}|t\.me\/|whatsapp)/i;
  const ago = (iso) => {
    const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return Math.round(s / 86400) + " d ago";
  };
  let isMod = false;
  async function loadPosts() {
    const topic = $("#cm-filter").value;
    let q = sb.from("community_posts").select("*, community_comments(count)").order("created_at", { ascending: false }).limit(30);
    if (topic) q = q.eq("topic", topic);
    const { data, error } = await q;
    if (error) throw error;
    $("#cm-list").innerHTML = (data || []).length ? data.map((p) => {
      const c = (p.community_comments && p.community_comments[0] && p.community_comments[0].count) || 0;
      const mine = p.user_id === session.user.id;
      return `<article class="post" data-post="${p.id}">
        <div class="post-head"><strong>${esc(p.author_name)}</strong> <span class="fine">${ago(p.created_at)}</span> <span class="tag">${esc(p.topic)}</span></div>
        <h3>${esc(p.title)}</h3><p class="post-body">${esc(p.body)}</p>
        <div class="btn-row"><button type="button" class="link" data-act="comments">${c} comment${c === 1 ? "" : "s"}</button>${mine || isMod ? `<button type="button" class="link err-link" data-act="delpost">Delete</button>` : ""}</div>
        <div class="comments" hidden></div></article>`;
    }).join("") : `<p class="fine">No discussions yet. Be the first to post.</p>`;
  }
  async function loadComments(box, postId) {
    const { data, error } = await sb.from("community_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (error) { box.textContent = "Couldn't load comments."; return; }
    box.innerHTML = (data || []).map((c) => `<div class="comment" data-comment="${c.id}"><strong>${esc(c.author_name)}</strong> <span class="fine">${ago(c.created_at)}</span>${c.user_id === session.user.id || isMod ? ` <button type="button" class="link err-link" data-act="delcomment">Delete</button>` : ""}<p>${esc(c.body)}</p></div>`).join("") +
      `<form class="comment-form" novalidate><input class="demo-input" type="text" maxlength="1000" placeholder="Write a comment" aria-label="Comment"><button type="submit" class="btn btn-ghost">Reply</button><p class="msg" role="alert"></p></form>`;
  }
  async function initCommunity() {
    const msg = $("#cm-msg");
    try {
      const p = await sb.from("profiles").select("display_name, role").eq("id", session.user.id).maybeSingle();
      if (p.data) { myName = p.data.display_name || "Trader"; isMod = ["moderator", "admin"].includes(p.data.role); }
    } catch (_) {}
    $("#cm-name").textContent = myName;
    $("#cm-rename").addEventListener("click", async () => {
      const n = (prompt("Name shown on your posts (2 to 24 characters). Don't use your full name or contact details.", myName) || "").trim();
      if (!n) return;
      if (n.length < 2 || n.length > 24 || NO_CONTACT.test(n)) return say(msg, "Pick a name of 2 to 24 characters, without links or phone numbers.");
      const { error } = await sb.from("profiles").update({ display_name: n }).eq("id", session.user.id);
      if (error) return say(msg, "Couldn't change your name. Try again.");
      myName = n; $("#cm-name").textContent = n; say(msg, "Name updated. It applies to new posts.", "ok");
    });
    const refresh = async () => { try { await loadPosts(); } catch (_) { $("#cm-list").innerHTML = `<p class="msg">Couldn't load the board. Run supabase/pro.sql in Supabase, then reload.</p>`; } };
    $("#cm-filter").addEventListener("change", refresh);
    $("#cm-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = $("#cm-title").value.trim(), body = $("#cm-body").value.trim();
      if (title.length < 3) return say(msg, "Add a title of at least 3 characters.");
      if (!body) return say(msg, "Write a message.");
      if (NO_CONTACT.test(title + " " + body)) return say(msg, "Links, phone numbers and WhatsApp or Telegram handles aren't allowed.");
      const btn = $("#cm-post"); btn.disabled = true;
      try {
        const { error } = await sb.from("community_posts").insert({ user_id: session.user.id, topic: $("#cm-topic").value, title, body });
        if (error) throw error;
        $("#cm-title").value = ""; $("#cm-body").value = ""; say(msg, "Posted.", "ok"); await refresh();
      } catch (_) { say(msg, "Couldn't post. Links and phone numbers are blocked, and Pro must be unlocked."); } finally { btn.disabled = false; }
    });
    $("#cm-list").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const post = b.closest("[data-post]"), id = post.dataset.post, box = $(".comments", post);
      if (b.dataset.act === "comments") { box.hidden = !box.hidden; if (!box.hidden) await loadComments(box, id); }
      if (b.dataset.act === "delpost") { if (confirm("Delete this post?")) { await sb.from("community_posts").delete().eq("id", id); refresh(); } }
      if (b.dataset.act === "delcomment") { if (confirm("Delete this comment?")) { await sb.from("community_comments").delete().eq("id", b.closest("[data-comment]").dataset.comment); await loadComments(box, id); } }
    });
    $("#cm-list").addEventListener("submit", async (e) => {
      const f = e.target.closest(".comment-form"); if (!f) return;
      e.preventDefault();
      const input = $("input", f), m = $(".msg", f), post = f.closest("[data-post]"), text = input.value.trim();
      if (!text) return;
      if (NO_CONTACT.test(text)) { m.textContent = "Links and phone numbers aren't allowed."; return; }
      const { error } = await sb.from("community_comments").insert({ post_id: post.dataset.post, user_id: session.user.id, body: text });
      if (error) { m.textContent = "Couldn't post your comment."; return; }
      await loadComments($(".comments", post), post.dataset.post);
    });
    refresh();
  }

  /* ===================== Gate ===================== */
  (async () => {
    const gate = $("#pro-gate");
    const client = await getSB();
    if (!client) { gate.textContent = "Sign-in isn't connected yet. Add your Supabase keys in config.js."; return; }
    const { data } = await client.auth.getSession();
    session = data.session;
    if (!session) {
      gate.innerHTML = `Sign in and get Pro to unlock this area. <a class="link" href="account.html">Sign in</a>`;
      $("#pro-teaser").hidden = false; return;
    }
    let tiers = [];
    try { const r = await client.from("entitlements").select("tier, expires_at"); tiers = r.data || []; } catch (_) {}
    if (!isUnlocked(tiers, "pro")) {
      const hasGrowth = isUnlocked(tiers, "growth");
      gate.innerHTML = hasGrowth ? `Get Pro to unlock this area, forever. <a class="link" href="plans.html">View plans</a>` : `Pro needs Growth first. <a class="link" href="plans.html">View plans</a>`;
      $("#pro-teaser").hidden = false; return;
    }
    gate.textContent = "";
    $("#pro-app").hidden = false;
    showTab(location.hash.slice(1), { scroll: false });
  })();
})();
