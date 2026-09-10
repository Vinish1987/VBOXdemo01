# VBOX — Streaming Platform Backend

This is the **engine** of VBOX: the part that runs on a server and decides who
can watch what, who has paid, when to show ads, and how money comes in. It has
no fancy screens yet — that's the next phase. Think of this as the foundation of
a house: not much to look at, but everything else is built on top of it.

It's written to be run and understood by someone non-technical, then handed to a
developer (or deployed to AWS) when you're ready. Every important file has plain
comments explaining what it does.

---

## What it does (in plain English)

VBOX makes money three ways, and this backend already handles all three:

1. **Subscriptions** — a **Premium** plan (₹299/month) that is ad-free and
   unlocks every episode. There's also a **Free** plan that shows ads.
2. **Ads** — free-tier viewers get a pre-roll ad before an episode and, on
   longer episodes, a mid-roll or two. The system picks the ads, avoids
   repeating the same one, and records every view so you can see the revenue.
3. **VBOX Credits** — viewers can buy credits and unlock a single episode or a
   whole season without subscribing (your original "episode 1 free, pay for the
   rest" idea).

The heart of it is one rule, applied every single time someone hits **play**:

> *Is this viewer allowed to watch this episode — and if so, do we show ads?*

That rule lives in `src/lib/entitlement.ts`. It's deliberately simple and is
covered by automated tests, because it's the piece that protects your revenue.

---

## Run it on your computer (about 10 minutes)

You need two free tools installed first: **Node.js** (v20+) and **Docker
Desktop** (Docker runs the database for you so you don't have to install one).

```bash
# 1. Install the code's dependencies
npm install

# 2. Start the database (Docker does this in the background)
docker compose up -d

# 3. Create the database tables
npm run db:migrate      # when it asks for a name, type: init

# 4. Fill it with sample series, plans, ads, and demo logins
npm run db:seed

# 5. Start the server
npm run dev
```

Now open **http://localhost:3000** — you'll see a status page listing every
part of the system. The server is live.

**Demo logins** (password for both is `password123`):
- `viewer@vbox.test` — a normal viewer, starts with 60 VBOX Credits
- `creator@vbox.test` — owns the sample catalog (the Creator Studio side)

> No Docker? You can instead create a free cloud database at **neon.tech** or
> **supabase.com**, copy its connection string into the `.env` file as
> `DATABASE_URL`, and skip step 2. Everything else is the same.

---

## See it work (copy-paste these)

Once the server is running, try the whole money flow from a terminal:

```bash
# Log in as the demo viewer and grab a token
TOKEN=$(curl -s localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"viewer@vbox.test","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Browse the catalog
curl -s localhost:3000/api/catalog | head

# Try to play episode 1 of a series (free — you'll get a stream + an ad plan)
# (replace EPISODE_ID with an id from the catalog call above)
curl -s -X POST localhost:3000/api/playback/EPISODE_ID -H "authorization: Bearer $TOKEN"

# Try a locked episode — you'll get "402 locked" with how to unlock
# Unlock it with credits:
curl -s -X POST localhost:3000/api/wallet/unlock \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"episodeId":"EPISODE_ID"}'
```

You'll watch the free episode play (with an ad), get blocked on a paid one, pay
with credits, and then watch it — the exact loop your product is built around.

---

## What's inside (the map)

```
prisma/
  schema.prisma      ← the database design (every table, explained in comments)
  seed.ts            ← sample data + demo logins
src/lib/
  entitlement.ts     ← THE paywall brain: who can watch what
  ads.ts             ← which ads to show, where, and revenue estimate
  auth.ts            ← passwords + login tokens
  playback.ts        ← short-lived "tickets" that stop link-sharing
  subscription.ts    ← reads a user's current plan
  db.ts / http.ts    ← plumbing
src/app/api/         ← the endpoints the apps/website will call
  auth/…             ← register, login, "who am I"
  catalog/…          ← browse + series detail
  playback/…         ← the play gate (the most important one)
  subscriptions/…    ← plans + subscribe
  wallet/…           ← credits: balance, buy, unlock
  creator/…          ← creators upload episodes
  ads/…              ← record a finished ad view (revenue)
  payments/webhook   ← where real payments will confirm
test/                ← automated tests for the engine (run: npm test)
```

Run `npm test` any time to confirm the core rules still work (19 checks).

---

## What's built vs. what's next

**Built now (this foundation):**
- Accounts + secure login
- The full paywall/entitlement engine, tested
- Subscriptions (Free + Premium), with ad-free as a plan feature
- Ad selection with frequency-capping + revenue tracking
- VBOX Credits wallet: buy packs, unlock episodes, season passes
- Creator episode uploads (metadata)
- Playback "tickets" (the anti-piracy pattern from the architecture plan)

**Deliberately mocked for now (so it runs without external accounts):**
- **Payments** activate instantly with a fake provider. Real money means
  connecting **Razorpay/Cashfree** — the slot is ready in
  `src/app/api/payments/webhook`.
- **Video** isn't transcoded or streamed yet. That's the AWS piece from the
  architecture plan (S3 + MediaConvert + CloudFront). Right now `playback`
  hands back a placeholder stream URL with a real, working access ticket.

**Natural next steps:**
1. Connect a real payment provider (Razorpay) for subscriptions + credit packs.
2. Wire up video: upload → transcode → serve through CloudFront signed URLs.
3. Build the viewer + creator screens (the landscape UI) on top of these APIs.
4. Deploy to AWS.

---

## A note from your (AI) CTO

This is a real, working backend, not a throwaway — but it's an MVP foundation,
not a finished Netflix. It's structured so a developer can pick it up and keep
going, and so the money-critical logic (the paywall) is small, readable, and
tested. When you're ready to bring on a developer or deploy, this is a clean
starting point that will save weeks. Anything here can be changed — it's yours.
