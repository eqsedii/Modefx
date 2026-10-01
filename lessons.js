(() => {
  "use strict";
  const C = window.MODEFX_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);

  const LESSONS = [
    {
      id: "candles",
      title: "1. Reading a candlestick",
      body: `Every candle on your chart covers one slice of time. Its body shows where the price opened and closed; the thin lines above and below — the wicks — show how far it reached before settling.
A green candle closed higher than it opened. A red one closed lower. The blue line running through your chart is a moving average — it's just the average of the last 10 closes, smoothed into a line, so you can see the overall direction without the noise of every single candle.`,
      cta: { text: "Open any market and watch the candles form", href: "markets.html" }
    },
    {
      id: "journal",
      title: "2. Why Modefx makes you write a reason",
      body: `Notice that Modefx won't let you open or close a trade without saying why. That's not a form field for its own sake — it's the single habit that separates traders who improve from traders who just guess.
After a few trades, open your Journal and read your own reasons back. You'll start noticing patterns: trades you entered out of boredom versus trades you entered because you actually saw something. That difference is worth more than any tip anyone can give you.`,
      cta: { text: "Review your trades so far", href: "journal.html" }
    },
    {
      id: "sizing",
      title: "3. Position sizing: the boring skill that matters most",
      body: `New traders obsess over which direction to trade. Experienced ones obsess over how much to risk. If you only ever risk a small, consistent slice of your balance on each trade — many traders use around 1% — one bad trade can't hurt you badly, and you stay in the game long enough to get better.
Open any market's full-screen view and tap "Tools" — Modefx's position size calculator does this math for you: tell it your risk percentage and how far your stop-loss is from your entry, and it suggests a quantity.`,
      cta: { text: "Try the position size calculator", href: "markets.html" }
    },
    {
      id: "sltp",
      title: "4. Stop-loss and take-profit: deciding your exit before you enter",
      body: `A stop-loss is the price where you admit a trade isn't working and exit automatically. A take-profit is the price where you lock in a win instead of hoping for more. Deciding both before you enter — not while you're watching the price move and feeling anxious — is one of the clearest signs of a disciplined trader.
On Modefx, you can set both when you open a trade. One honest limit: they only trigger while you have the app open and polling the price, not while you're away — a real broker's servers watch prices continuously, which is part of what separates practice from the real thing.`,
      cta: { text: "Place a trade with a stop-loss set", href: "markets.html" }
    },
    {
      id: "longshort",
      title: "5. Buying and selling: profiting either direction",
      body: `"Buy" means you profit if the price rises — you're betting the thing you bought becomes worth more. "Sell" (also called shorting) means you profit if the price falls — you're betting it becomes worth less, and most practice platforms let you do this without ever owning the asset.
Example: if you buy 1 unit of EUR/USD at 1.0840 and it rises to 1.0860, you've gained 0.0020 — on a sell at the same levels, you'd have lost that same amount, and vice versa if price fell instead.`,
      cta: { text: "Try both a Buy and a Sell", href: "markets.html" }
    }
  ];

  const DONE_KEY = "mfx-lessons-done";
  const getDone = () => { try { return JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch (_) { return []; } };
  const setDone = (arr) => { try { localStorage.setItem(DONE_KEY, JSON.stringify(arr)); } catch (_) {} };

  function renderLessons() {
    const done = getDone();
    $("#lessons-list").innerHTML = LESSONS.map((l) => {
      const isDone = done.includes(l.id);
      return `<article class="sheet lesson-card">
        <h2>${l.title}</h2>
        ${l.body.trim().split("\n").map((p) => `<p>${p.trim()}</p>`).join("")}
        <div class="lesson-foot">
          <a class="link" href="${l.cta.href}">${l.cta.text} &rarr;</a>
          <label class="check lesson-done"><input type="checkbox" data-lesson="${l.id}" ${isDone ? "checked" : ""}><span>Mark as done</span></label>
        </div>
      </article>`;
    }).join("");
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
