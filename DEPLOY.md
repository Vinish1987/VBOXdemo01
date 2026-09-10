# Deploying VBOX to Vercel (step by step)

Vercel runs your code, but it does **not** include a database. So there are two
parts: a free hosted Postgres database, and the Vercel deployment that talks to
it. About 20 minutes. No prior experience needed — just follow along.

---

## Part 1 — Get a free database (Neon)

1. Go to **neon.tech**, sign up (free), and create a project.
2. On the project dashboard, find **Connection string**. Neon gives you two —
   copy **both** and keep them in a notepad for a minute:
   - the **Pooled** connection string (has `-pooler` in it) → the app uses this
   - the **Direct** connection string (no `-pooler`) → used once to build tables

That's it for now.

---

## Part 2 — Put the code on GitHub

Vercel deploys from GitHub. Easiest path if you're not a git person:

1. Install **GitHub Desktop** (desktop.github.com), sign in.
2. **File → Add Local Repository**, choose this `vbox-platform` folder
   (if it says it's not a repository, click **Create a repository** here).
3. Click **Publish repository** (keep it **Private**).

Your code is now on GitHub. (The `.env` file with local secrets is
automatically excluded — good.)

---

## Part 3 — Deploy on Vercel

1. Go to **vercel.com**, sign up with your GitHub account.
2. **Add New → Project**, and import the `vbox-platform` repo.
3. Before clicking Deploy, open **Environment Variables** and add these five
   (name on the left, value on the right):

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | your Neon **Pooled** string (from Part 1) |
   | `JWT_SECRET` | any long random string, e.g. 40+ random characters |
   | `PLAYBACK_TICKET_TTL_SECONDS` | `300` |
   | `CDN_BASE_URL` | `https://cdn.vbox.example` (placeholder for now) |
   | `WEBHOOK_SECRET` | any random string |

4. Click **Deploy**. Wait for it to finish (~2 minutes). It will build
   successfully — but the database has no tables yet, so the next part makes it
   actually work.

---

## Part 4 — Create the tables + sample data (one time)

Your database is empty. Fill it from your own computer, pointed at Neon. In a
terminal, inside the `vbox-platform` folder, run these two commands — paste your
Neon **Direct** connection string where shown:

```bash
# 1. Create all the tables
DATABASE_URL="PASTE_NEON_DIRECT_STRING_HERE" npx prisma db push

# 2. Add sample series, plans, ads, and the demo logins
DATABASE_URL="PASTE_NEON_DIRECT_STRING_HERE" npm run db:seed
```

(On Windows use the “Git Bash” terminal that comes with GitHub Desktop, or ask
me for the Windows PowerShell version of these two lines.)

---

## Part 5 — Check it's live

Open your Vercel URL (something like `https://vbox-platform.vercel.app`):

- The home page lists all the API endpoints → the server is up.
- Visit `/api/health` → you should see a small `ok: true` response.
- `/api/catalog` → you should see the sample series (proof the database works).

Log in with the demo account (`viewer@vbox.test` / `password123`) using the
same test commands from `README.md`, pointed at your Vercel URL instead of
localhost.

---

## If a deploy goes red

- **"Environment variable DATABASE_URL not found"** → you missed a variable in
  Part 3; add it and redeploy.
- **Something about the database / relation does not exist** → you haven't run
  Part 4 yet (create tables + seed).
- **Anything else** → copy the error text from Vercel's build log and send it to
  me; these first-deploy issues are quick to fix.

---

## A note on going further

This gets VBOX **live and testable** on the internet — perfect for a first
check. Two things are intentionally still simple, and are the natural next
steps after roles:

- Payments are mocked (real money = connect Razorpay).
- Video is a placeholder URL (real streaming = the AWS pipeline).

When you deploy heavy video later, the app stays on Vercel but the **video**
moves to AWS (S3 + MediaConvert + CloudFront), exactly as the architecture plan
lays out. Vercel now, AWS for video later — they work together.
