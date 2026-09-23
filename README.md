# Modefx

Simulated trading and learning platform for Kenya. Practice with virtual money, keep a journal, learn the markets.
Modefx is **not** a broker: it holds no client money and places no real trades. Real-money trading is a link out to Deriv.

## Pricing: a required ladder, not separate plans

| Tier | Price | Unlocks | Requires |
|---|---|---|---|
| Starter | KSh 99 | Simulated account, basic journal, daily summary, 5 lessons | — |
| Growth | KSh 599 | Live market status, full journal + analytics, challenges, full lessons — and makes Starter permanent | Starter |
| Pro | KSh 2,999 | AI explainers, economic calendar, community | Growth |
| Golden | KSh 5,999 | Deriv account link, AI market predictions | Pro |

Rules, enforced on the server (never trust the browser for money):
- A tier can only be bought once its prerequisite is owned. You can't skip ahead.
- Starter locks 7 days after purchase **unless** Growth has been bought — M-Pesa can't auto-charge, so there is no silent renewal; the site just shows a "get Growth to unlock again" prompt.
- Once Growth is bought, both Starter and Growth stay unlocked forever. Same for Pro and Golden — every tier past Starter is permanent from the moment it's bought.

## What's in this drop

- 5 pages: Home, Markets, Plans (the ladder above), Help, Account — with a bottom tab bar on phones
- Sign in / sign up with email or Google (Supabase Auth)
- M-Pesa payment via PayHero, unlocking a tier only after the server confirms payment
- Background video, intro video, and a loading video on every button tap

Not built yet: the actual trading arena, journal, lessons, community and admin panel — this drop wires up accounts and payments so those can be added behind the tiers above.

## Go-live checklist

### 1. Supabase (accounts + database) — free
1. Go to supabase.com, create a free account, then **New project**.
2. Once it's ready, open **SQL Editor** (left sidebar) → **New query**.
3. Open `supabase/schema.sql` from this repo, copy all of it, paste it in, and click **Run**.
   You should see "Success. No rows returned."
4. Open **Authentication → Providers**. Make sure **Email** is turned on, with "Confirm email" turned on.
5. To add Google sign-in: still in Providers, turn on **Google**. It will show you a callback URL — you need a Google Cloud OAuth client to paste into this page. If you want, tell me when you're at this screen and I'll walk you through Google Cloud step by step.
6. Open **Authentication → URL Configuration**. Under "Redirect URLs", add your GitHub Pages address, e.g. `https://eqsedii.github.io/Modefx/account.html`.
7. Open **Project Settings → API**. You'll need two values from this page in Step 3 below: **Project URL** and the **anon public** key.
8. Also on that page, note the **service_role** key — keep this secret, never put it in `config.js` or GitHub. It goes only in Vercel (Step 4).

### 2. PayHero (M-Pesa payments) — pay-per-transaction, no monthly cost
1. Go to payhero.co.ke and create an account.
2. Set up a payment channel (their dashboard walks you through linking M-Pesa). Note the **Channel ID**.
3. Find your API credentials (Basic Auth token) in their dashboard — usually under API/Settings.
4. Keep these three values for Step 4: the Basic Auth token, the Channel ID, and access to their callback/webhook logs (you'll need these later to confirm Step 6 below).

### 3. Fill in `config.js`
Open `config.js` in this repo and fill in:
- `supabaseUrl` — the Project URL from Supabase Step 1.7
- `supabaseAnonKey` — the anon public key from the same page
Commit the change on GitHub the same way as before (edit the file, commit).
This file has no secrets in it — the anon key is meant to be public.

### 4. Deploy the API to Vercel — free
GitHub Pages can only serve static files; it cannot run the M-Pesa payment code in `api/`. That code needs to run on Vercel.
1. Go to vercel.com, sign up (you can use your GitHub account).
2. **Add New → Project**, import your `Modefx` GitHub repo.
3. Before deploying, open **Environment Variables** and add each of these (values from Steps 1 and 2):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PAYHERO_BASIC_AUTH`
   - `PAYHERO_CHANNEL_ID`
   - `PAYHERO_WEBHOOK_TOKEN` — make up a long random password yourself, e.g. 40 random letters/numbers
   - `PUBLIC_BASE_URL` — your Vercel project's URL, e.g. `https://modefx.vercel.app` (Vercel shows this after first deploy; you can add this variable after deploying once, then redeploy)
4. Click **Deploy**.
5. Once deployed, copy the Vercel URL. Go back to `config.js` on GitHub and set `apiBase` to that URL (e.g. `"https://modefx.vercel.app"`). Commit.

### 5. Test with a real KSh 99 payment
1. Open your live GitHub Pages site on your phone.
2. Create an account, verify your email, and buy Starter with your own M-Pesa number.
3. Approve the prompt. Watch whether the site shows "Payment received."
4. If it hangs on "waiting for confirmation," open your PayHero dashboard's callback logs, find the real callback Modefx received, and compare its field names to what `api/payhero-webhook.js` expects (marked with a `TODO` comment). PayHero's exact field names can vary by account, so this file may need small adjustments — send me what the log shows and I'll fix it precisely.

## Before you take this to real customers
- Add a Terms of Service and Privacy Policy page. Kenya's Data Protection Act applies to any site collecting personal data — check whether you need to register with the ODPC (odpc.go.ke).
- Decide and publish a refund policy.
- Confirm Deriv's terms allow Kenyan clients, and disclose clearly if you use an affiliate link.
- Keep every simulated number and feature clearly labeled as such.
