import { and, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { collections, savedItems, searchHistory, users } from "@/db/schema";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { hashPassword } from "@/lib/password";

const HOURS = 3600 * 1000;
const DAYS = 24 * HOURS;

function ago(n: number, unit: "h" | "d" = "h"): Date {
  return new Date(Date.now() - n * (unit === "d" ? DAYS : HOURS));
}

interface ItemSeed {
  kind: "web" | "news" | "image" | "video";
  title: string;
  url: string;
  snippet: string;
  thumbnail: string;
  source: string;
  query: string;
  note?: string;
}

/*
 * Demo bookmarks. Every link is a real page that was checked to resolve, and
 * thumbnails come from stable hosts (YouTube, Wikimedia). Web results carry no
 * thumbnail, exactly like results saved from the "All" tab.
 */
const ITEMS = {
  nextDocs: {
    kind: "web",
    title: "Next.js Docs: App Router",
    url: "https://nextjs.org/docs/app",
    snippet:
      "The App Router is a file-system based router that uses React's latest features such as Server Components, Suspense and Server Functions.",
    thumbnail: "",
    source: "nextjs.org",
    query: "nextjs 16 app router tutorial",
    note: "Read the routing + data fetching sections before Friday.",
  },
  nextRepo: {
    kind: "web",
    title: "vercel/next.js: The React Framework",
    url: "https://github.com/vercel/next.js",
    snippet: "The React Framework. Contribute to vercel/next.js development by creating an account on GitHub.",
    thumbnail: "",
    source: "github.com",
    query: "nextjs github repository",
  },
  nextCourse: {
    kind: "video",
    title: "Next.js 16 Full Course | Build and Deploy a Production-Ready Full Stack App",
    url: "https://www.youtube.com/watch?v=I1V9YWqRIeI",
    snippet: "Project-based course: build and deploy a production-ready full stack app with Next.js 16.",
    thumbnail: "https://i.ytimg.com/vi/I1V9YWqRIeI/hqdefault.jpg",
    source: "JavaScript Mastery",
    query: "nextjs full course video",
    note: "Watch at 1.25x, take notes on caching.",
  },
  nextCourseLong: {
    kind: "video",
    title: "Master Next.js in One Video | 7 Hour Complete Course + Project",
    url: "https://www.youtube.com/watch?v=yKuBE7TJm7M",
    snippet: "A complete seven-hour Next.js course that finishes with a full project.",
    thumbnail: "https://i.ytimg.com/vi/yKuBE7TJm7M/hqdefault.jpg",
    source: "Mohit Decodes",
    query: "nextjs full course video",
  },
  mdnMap: {
    kind: "web",
    title: "Array.prototype.map() - JavaScript | MDN",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
    snippet:
      "The map() method of Array instances creates a new array populated with the results of calling a provided function on every element in the calling array.",
    thumbnail: "",
    source: "developer.mozilla.org",
    query: "mdn array map javascript",
  },
  drizzle: {
    kind: "web",
    title: "Drizzle ORM - Overview",
    url: "https://orm.drizzle.team/docs/overview",
    snippet: "Drizzle is a headless TypeScript ORM with a relational and an SQL-like query API, built to stay lightweight and type-safe.",
    thumbnail: "",
    source: "orm.drizzle.team",
    query: "drizzle orm postgres tutorial",
  },
  useEffect: {
    kind: "web",
    title: "useEffect – React",
    url: "https://react.dev/reference/react/useEffect",
    snippet: "useEffect is a React Hook that lets you synchronize a component with an external system.",
    thumbnail: "",
    source: "react.dev",
    query: "react hooks useeffect explained",
  },
  kyoto: {
    kind: "web",
    title: "Kyoto Travel Guide - What to do in Kyoto City",
    url: "https://www.japan-guide.com/e/e2158.html",
    snippet: "Temples, gardens, bamboo groves and geisha districts: what to see and do in Japan's former capital.",
    thumbnail: "",
    source: "japan-guide.com",
    query: "kyoto travel guide itinerary",
    note: "Book the ryokan in Gion early.",
  },
  aurora: {
    kind: "image",
    title: "Aurora Borealis - Iceland - 2 Nov. 2013",
    url: "https://commons.wikimedia.org/wiki/File:Aurora_Borealis_-_Iceland_-_2_Nov._2013.jpg",
    snippet: "commons.wikimedia.org · 6016×4016",
    thumbnail:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Aurora_Borealis_-_Iceland_-_2_Nov._2013.jpg/500px-Aurora_Borealis_-_Iceland_-_2_Nov._2013.jpg",
    source: "commons.wikimedia.org",
    query: "northern lights iceland photos",
  },
  corgi: {
    kind: "image",
    title: "Pembroke Welsh Corgi Puppy",
    url: "https://commons.wikimedia.org/wiki/File:Pembroke_Welsh_Corgi_Puppy.jpg",
    snippet: "commons.wikimedia.org · 3456×2300",
    thumbnail:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Pembroke_Welsh_Corgi_Puppy.jpg/500px-Pembroke_Welsh_Corgi_Puppy.jpg",
    source: "commons.wikimedia.org",
    query: "cute corgi photos",
  },
  sourdough: {
    kind: "web",
    title: "Extra-Tangy Sourdough Bread Recipe | King Arthur Baking",
    url: "https://www.kingarthurbaking.com/recipes/extra-tangy-sourdough-bread-recipe",
    snippet: "A crusty, chewy loaf with an assertively sour flavor from a long, slow fermentation.",
    thumbnail: "",
    source: "kingarthurbaking.com",
    query: "sourdough bread recipe beginner",
  },
  ramen: {
    kind: "video",
    title: "How to Make Authentic Shoyu Ramen at Home (Beginner-Friendly Japanese Classic)",
    url: "https://www.youtube.com/watch?v=cnvomlflES4",
    snippet: "A beginner-friendly walkthrough of classic shoyu ramen made at home.",
    thumbnail: "https://i.ytimg.com/vi/cnvomlflES4/hqdefault.jpg",
    source: "Sudachi | Japanese Recipes | Yuto Omura",
    query: "easy ramen recipe video",
  },
  reuters: {
    kind: "news",
    title: "Markets News | Reuters",
    url: "https://www.reuters.com/markets/",
    snippet: "The latest financial markets coverage: stocks, bonds, currencies and commodities.",
    thumbnail: "",
    source: "Reuters",
    query: "stock market news today",
  },
  sleepNews: {
    kind: "news",
    title: "Sleep Disorder Research News",
    url: "https://www.sciencedaily.com/news/health_medicine/sleep_disorders/",
    snippet: "Sleeping disorder information. Learn about insomnia and sleep disorders like sleep walking and snoring.",
    thumbnail: "",
    source: "Science Daily",
    query: "how much sleep do we need",
  },
  searchUi: {
    kind: "web",
    title: "search-ui · GitHub Topics",
    url: "https://github.com/topics/search-ui",
    snippet: "Open-source repositories tagged search-ui: components and patterns for building search interfaces.",
    thumbnail: "",
    source: "github.com",
    query: "search ui project ideas",
  },
} satisfies Record<string, ItemSeed>;

const DEMO_COLLECTIONS = [
  { name: "Dev & Learning", description: "Frameworks, docs and tutorials worth revisiting.", color: "#4285f4" },
  { name: "Travel ideas", description: "Places and itineraries for the next trip.", color: "#34a853" },
  { name: "Recipes", description: "Weeknight dinners and baking projects.", color: "#fbbc05" },
  { name: "Reading list", description: "Long-form articles saved for the weekend.", color: "#a142f4" },
];

// Newest first: [collection name or null, bookmark].
const DEMO_SAVED: Array<[string | null, ItemSeed]> = [
  ["Dev & Learning", ITEMS.nextDocs],
  [null, ITEMS.corgi],
  ["Dev & Learning", ITEMS.nextCourse],
  ["Reading list", ITEMS.reuters],
  ["Travel ideas", ITEMS.kyoto],
  ["Travel ideas", ITEMS.aurora],
  ["Recipes", ITEMS.sourdough],
  ["Recipes", ITEMS.ramen],
  ["Reading list", ITEMS.sleepNews],
  ["Dev & Learning", ITEMS.drizzle],
  [null, ITEMS.nextCourseLong],
  ["Dev & Learning", ITEMS.nextRepo],
  [null, ITEMS.useEffect],
  ["Dev & Learning", ITEMS.mdnMap],
];

const DEMO_HISTORY: Array<[string, string, number, number, "h" | "d"]> = [
  ["nextjs 16 app router tutorial", "all", 10, 2, "h"],
  ["cute corgi photos", "images", 100, 5, "h"],
  ["nextjs full course video", "videos", 60, 9, "h"],
  ["stock market news today", "news", 29, 1, "d"],
  ["how much sleep do we need", "news", 28, 26, "h"],
  ["kyoto travel guide itinerary", "all", 10, 30, "h"],
  ["northern lights iceland photos", "images", 100, 2, "d"],
  ["sourdough bread recipe beginner", "all", 10, 2, "d"],
  ["easy ramen recipe video", "videos", 60, 3, "d"],
  ["marathon training plan beginners", "all", 10, 3, "d"],
  ["drizzle orm postgres tutorial", "all", 10, 4, "d"],
  ["lofi music study stream", "videos", 60, 4, "d"],
  ["best coffee shops in seattle", "all", 10, 5, "d"],
  ["weather in tokyo this week", "all", 10, 5, "d"],
  ["electric cars 2027", "news", 28, 6, "d"],
  ["react hooks useeffect explained", "all", 10, 6, "d"],
  ["tailwind css v4 new features", "all", 10, 7, "d"],
  ["how to make pasta carbonara", "all", 10, 7, "d"],
  ["cheap flights to lisbon", "all", 10, 8, "d"],
  ["postgres full text search guide", "all", 10, 9, "d"],
  ["inspirational quotes for monday", "images", 100, 10, "d"],
  ["world cup qualifiers results", "news", 29, 11, "d"],
  ["docker compose for beginners", "all", 10, 12, "d"],
  ["best mechanical keyboards 2026", "all", 10, 13, "d"],
  ["meditation for beginners video", "videos", 60, 14, "d"],
  ["duckduckgo vs google privacy", "all", 10, 14, "d"],
];

async function createDemoUser(): Promise<void> {
  const [demo] = await db
    .insert(users)
    .values({ name: "Ava Chen", email: DEMO_EMAIL, passwordHash: hashPassword(DEMO_PASSWORD) })
    .returning();

  const created = await db
    .insert(collections)
    .values(DEMO_COLLECTIONS.map((c) => ({ ...c, userId: demo.id })))
    .returning();
  const collectionId = (name: string | null) => created.find((c) => c.name === name)?.id ?? null;

  await db.insert(savedItems).values(
    DEMO_SAVED.map(([collection, item], index) => ({
      userId: demo.id,
      collectionId: collectionId(collection),
      kind: item.kind,
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      thumbnail: item.thumbnail,
      source: item.source,
      query: item.query,
      note: item.note ?? "",
      // Staggered so "recently saved" has a stable, believable order.
      createdAt: ago(index * 9 + 1),
      updatedAt: ago(index * 9 + 1),
    })),
  );

  await db.insert(searchHistory).values(
    DEMO_HISTORY.map(([query, tab, resultCount, n, unit]) => ({
      userId: demo.id,
      query,
      tab,
      resultCount,
      createdAt: ago(n, unit),
    })),
  );
}

async function createGuestUser(): Promise<void> {
  const [guest] = await db
    .insert(users)
    .values({ name: "Marcus Reid", email: "marcus@nexgo.app", passwordHash: hashPassword("password123") })
    .returning();
  const [sideProjects] = await db
    .insert(collections)
    .values({ userId: guest.id, name: "Side projects", description: "Ideas to build next quarter.", color: "#ff6d00" })
    .returning();
  await db.insert(savedItems).values({ ...ITEMS.searchUi, userId: guest.id, collectionId: sideProjects.id });
  await db.insert(searchHistory).values([
    { userId: guest.id, query: "search ui project ideas", tab: "all", resultCount: 10, createdAt: ago(3, "d") },
    { userId: guest.id, query: "open source dashboard templates", tab: "all", resultCount: 10, createdAt: ago(1, "d") },
  ]);
}

/**
 * Seeds an empty database, and re-creates the public demo account if it has
 * gone missing, so the advertised demo sign-in always works.
 */
export async function seedDemoData(): Promise<void> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  if (Number(count) === 0) await createGuestUser();

  const demo = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (demo.length === 0) await createDemoUser();
}

/*
 * The first release seeded a few placeholder links that do not resolve, with
 * random stock thumbnails. Databases created back then are repaired in place:
 * only untouched seed rows (same URL *and* title) are rewritten, so anything a
 * user edited is left alone. Runs as a single cheap query once repaired.
 */
const LEGACY_THUMBNAIL = "https://picsum.photos/seed/nexgo-%";

const REPAIRS: Array<{ url: string; title: string; item: ItemSeed }> = [
  { url: "https://www.japan-guide.com/travel/kyoto", title: "Kyoto Travel Guide 2026 — 10 days in Kansai", item: ITEMS.kyoto },
  { url: "https://unsplash.com/photos/northern-lights-iceland", title: "Northern lights over Kirkjufell, Iceland", item: ITEMS.aurora },
  { url: "https://unsplash.com/photos/corgi-puppy", title: "Corgi puppy in a flower field", item: ITEMS.corgi },
  { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Next.js 16 Crash Course — Full Tutorial for Beginners", item: ITEMS.nextCourse },
  { url: "https://www.youtube.com/watch?v=ramen-20-minutes", title: "Perfect Weeknight Ramen in 20 Minutes", item: ITEMS.ramen },
  { url: "https://www.youtube.com/watch?v=jfKfPfyJRdk", title: "Lo-fi hip hop radio — beats to relax/study to", item: ITEMS.nextCourseLong },
  { url: "https://www.bbc.com/future/article/sleep-science", title: "The science of sleep: why 7 hours isn't a myth", item: ITEMS.sleepNews },
  { url: "https://www.reuters.com/markets/", title: "Markets rally as tech stocks surge to record highs", item: ITEMS.reuters },
  { url: "https://www.runnersworld.com/training/marathon/", title: "The Ultimate Marathon Training Plan for Beginners", item: ITEMS.useEffect },
];

export async function repairLegacySeedData(): Promise<void> {
  const stale = await db
    .select({ id: savedItems.id })
    .from(savedItems)
    .where(like(savedItems.thumbnail, LEGACY_THUMBNAIL))
    .limit(1);
  if (stale.length === 0) return;

  for (const fix of REPAIRS) {
    const rows = await db
      .select({ id: savedItems.id })
      .from(savedItems)
      .where(and(eq(savedItems.url, fix.url), eq(savedItems.title, fix.title)));
    for (const row of rows) {
      try {
        await db
          .update(savedItems)
          .set({
            kind: fix.item.kind,
            title: fix.item.title,
            url: fix.item.url,
            snippet: fix.item.snippet,
            thumbnail: fix.item.thumbnail,
            source: fix.item.source,
            query: fix.item.query,
          })
          .where(eq(savedItems.id, row.id));
      } catch {
        // The owner already bookmarked the real page: the placeholder is redundant.
        await db.delete(savedItems).where(eq(savedItems.id, row.id)).catch(() => undefined);
      }
    }
  }
  await db.update(savedItems).set({ thumbnail: "" }).where(like(savedItems.thumbnail, LEGACY_THUMBNAIL));
}
