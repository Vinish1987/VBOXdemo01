// Fills a fresh database with realistic sample data so you can log in and see
// the whole thing work. Safe to re-run — it upserts by unique keys.
//
//   Run:  npm run db:seed
//
// Demo logins (password for both:  password123):
//   viewer@vbox.test   — a normal viewer, starts with 60 VBOX Credits
//   creator@vbox.test  — owns the catalog below (Creator Studio)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SERIES = [
  { slug: "crimson-vows", title: "Crimson Vows", genre: "Drama", color: "rose", tags: ["Revenge", "Billionaire"], rating: 4.8 },
  { slug: "ceos-secret-bride", title: "The CEO's Secret Bride", genre: "Romance", color: "gold", tags: ["Billionaire", "Contract"], rating: 4.6 },
  { slug: "reborn-heiress", title: "Reborn as the Heiress", genre: "Fantasy", color: "violet", tags: ["Rebirth", "Revenge"], rating: 4.9 },
  { slug: "midnight-mumbai", title: "Midnight in Mumbai", genre: "Thriller", color: "blue", tags: ["Crime", "Twist"], rating: 4.5 },
  { slug: "married-to-the-beast", title: "Married to the Beast", genre: "Fantasy", color: "teal", tags: ["Werewolf", "Fated"], rating: 4.7 },
  { slug: "fake-husband", title: "My Boss, My Fake Husband", genre: "Comedy", color: "ember", tags: ["Office", "Fake dating"], rating: 4.4 },
];
const HOOKS = ["The wedding that wasn't", "A face he never forgot", "The hidden clause", "She remembers everything", "No one leaves this house", "The photograph", "Blood in the ballroom", "The last vow"];
const EPISODES_PER_SERIES = 8;

async function main() {
  console.log("Seeding VBOX…");

  // ── Plans ──────────────────────────────────────────────────────
  await prisma.plan.upsert({
    where: { code: "FREE" },
    update: {},
    create: { code: "FREE", name: "Free (ad-supported)", price: 0, interval: "NONE", adFree: false, grantsAllEpisodes: false, maxQuality: "480p" },
  });
  await prisma.plan.upsert({
    where: { code: "PREMIUM_MONTHLY" },
    update: {},
    create: { code: "PREMIUM_MONTHLY", name: "Premium (Monthly)", price: 29900, interval: "MONTH", adFree: true, grantsAllEpisodes: true, maxQuality: "1080p" },
  });
  await prisma.plan.upsert({
    where: { code: "PREMIUM_ANNUAL" },
    update: {},
    create: { code: "PREMIUM_ANNUAL", name: "Premium (Annual)", price: 249900, interval: "YEAR", adFree: true, grantsAllEpisodes: true, maxQuality: "1080p" },
  });

  // ── Credit packs ───────────────────────────────────────────────
  const packs = [
    { code: "PACK_100", credits: 100, bonus: 0, price: 9900 },
    { code: "PACK_300", credits: 300, bonus: 30, price: 27900 },
    { code: "PACK_700", credits: 700, bonus: 100, price: 59900 },
    { code: "PACK_1500", credits: 1500, bonus: 300, price: 119900 },
  ];
  for (const p of packs) {
    await prisma.creditPack.upsert({ where: { code: p.code }, update: {}, create: p });
  }

  // ── Ad inventory ───────────────────────────────────────────────
  const ads = [
    { title: "Ride the Future — EV Launch", advertiser: "Volt Motors", type: "PRE_ROLL" as const, durationSec: 15, weight: 3, cpmMicros: 140000 },
    { title: "UPI Cashback Days", advertiser: "PayNimbus", type: "PRE_ROLL" as const, durationSec: 10, weight: 2, cpmMicros: 110000 },
    { title: "Monsoon Fashion Sale", advertiser: "Kavya Style", type: "MID_ROLL" as const, durationSec: 20, weight: 2, cpmMicros: 160000 },
    { title: "Learn to Code in 90 Days", advertiser: "ByteCamp", type: "MID_ROLL" as const, durationSec: 15, weight: 1, cpmMicros: 130000 },
    { title: "Order in 10 Minutes", advertiser: "QuickCart", type: "PRE_ROLL" as const, durationSec: 12, weight: 2, cpmMicros: 120000 },
  ];
  // Ads have no natural unique key in the schema; reset + insert for a clean set.
  await prisma.adImpression.deleteMany({});
  await prisma.ad.deleteMany({});
  await prisma.ad.createMany({ data: ads });

  // ── Users ──────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 10);
  const creator = await prisma.user.upsert({
    where: { email: "creator@vbox.test" },
    update: {},
    create: { email: "creator@vbox.test", name: "Quantloop Originals", role: "CREATOR", passwordHash },
  });
  await prisma.user.upsert({
    where: { email: "viewer@vbox.test" },
    update: { creditsBalance: 60 },
    create: { email: "viewer@vbox.test", name: "Demo Viewer", role: "VIEWER", passwordHash, creditsBalance: 60 },
  });

  // ── Catalog ────────────────────────────────────────────────────
  for (const s of SERIES) {
    const series = await prisma.series.upsert({
      where: { slug: s.slug },
      update: { creatorId: creator.id },
      create: {
        slug: s.slug,
        title: s.title,
        synopsis: `${s.title} — a ${s.genre.toLowerCase()} web series. Episode 1 is free; the rest unlock with a Premium plan or VBOX Credits.`,
        genre: s.genre,
        tags: s.tags,
        heroColor: s.color,
        rating: s.rating,
        creatorId: creator.id,
      },
    });

    for (let n = 1; n <= EPISODES_PER_SERIES; n++) {
      await prisma.episode.upsert({
        where: { seriesId_number: { seriesId: series.id, number: n } },
        update: {},
        create: {
          seriesId: series.id,
          number: n,
          title: HOOKS[(n - 1) % HOOKS.length],
          synopsis: n === 1 ? "The free opening episode that starts the story." : "The story tightens.",
          durationSec: 1200, // ~20 min web-series episodes (exercises mid-roll ads)
          isFree: n === 1, // Episode 1 free — everything else locked
          unlockCredits: 30,
          videoKey: `${s.slug}/ep${String(n).padStart(3, "0")}`,
          status: "PUBLISHED",
        },
      });
    }
  }

  const counts = {
    plans: await prisma.plan.count(),
    packs: await prisma.creditPack.count(),
    ads: await prisma.ad.count(),
    series: await prisma.series.count(),
    episodes: await prisma.episode.count(),
  };
  console.log("Done:", counts);
  console.log("Login as viewer@vbox.test / creator@vbox.test — password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
