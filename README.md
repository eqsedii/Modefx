# Modefx

Simulated trading and learning platform for Kenya. Practice with virtual money, keep a journal, learn the markets.
Modefx is **not** a broker: it holds no client money and places no real trades. Real-money trading is a link out to Deriv.

## What's in this first drop

- Landing page (`index.html`) with intro video, click-loader video, sign in / sign up (email + Google), plans, FAQ, risk notice
- Transparent logo and icons in `assets/`
- Supabase schema with row-level security (`supabase/schema.sql`)
- M-Pesa subscriptions through PayHero (`api/`), confirmed server-side only

Not built yet: dashboard, trading arena, journal, lessons, XP, community, admin panel, light theme
(the logo is white and silver, so a light theme needs a dark logo variant).

## Cost: $0 setup

| Piece | Free option |
|---|---|
| Hosting + serverless API | Vercel Hobby (personal, non-commercial terms: check before taking payments) or Cloudflare Pages |
| Database + auth + Google login | Supabase free tier |
| Payments | PayHero (per-transaction fees, no monthly cost) |
| Charts (later) | TradingView Lightweight Charts (open source) |

## Setup

1. **Supabase**: create a project. SQL Editor: paste and run `supabase/schema.sql`.
   Authentication > Providers: enable Email (keep "Confirm email" on) and Google (needs a Google Cloud OAuth client).
   Authentication > URL Configuration: add your site URL and `http://localhost:3000`.
2. **config.js**: fill `supabaseUrl` and `supabaseAnonKey`. Add `supportEmail` / `supportWhatsApp` to show the Support section.
3. **PayHero**: create an account, link your payment channel, note the channel ID and Basic auth token.
4. **Vercel**: import the GitHub repo. Add the variables from `.env.example`. Deploy.
5. **Test with KSh 99** on a real phone. Then open the PayHero dashboard and compare a real callback with the fields read in `api/payhero-webhook.js` (marked TODO).

## How payments stay safe

- The browser sends only a plan id and phone number. The amount comes from `api/_plans.js`.
- A plan is activated only inside `api/payhero-webhook.js`, after PayHero reports success, the amount matches, and a secret token in the callback URL checks out.
- Callbacks are idempotent: a repeated callback cannot activate a plan twice.
- Users can read their own payments and subscriptions but cannot write to them (see RLS in the schema).

## Before you launch

- Add Terms and a Privacy Policy page. Kenya's Data Protection Act applies; check whether you need to register with the ODPC.
- Decide your refund policy and put it in the FAQ.
- Deriv link: confirm Deriv's terms allow clients from Kenya, and if you use an affiliate link, disclose it next to the button.
- Keep every simulated number labelled as simulated or demo.
