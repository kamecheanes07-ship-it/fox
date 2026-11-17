import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { ensureBootstrapped } from "@/db/bootstrap";
import { collections, savedItems, searchHistory, users } from "@/db/schema";
import { DATA_FILE } from "@/lib/data-dir";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { hashPassword } from "@/lib/password";
import type { CollectionDTO, HistoryDTO, SavePayload, SavedItemDTO, SearchTab } from "@/lib/types";
import { COLLECTION_COLORS, domainOf } from "@/lib/utils";

/*
 * Unified persistence layer:
 *  - Uses PostgreSQL via Drizzle ORM when DATABASE_URL is configured and reachable.
 *  - Otherwise falls back to a local JSON store. The location is resolved by
 *    `src/lib/data-dir.ts`, which prefers Hugging Face Spaces persistent storage
 *    (`/data`), then `/app/data`, then `/tmp`.
 */


const HISTORY_DEDUPE_MS = 15 * 60 * 1000;

interface LocalCollection {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalSavedItem {
  id: string;
  collectionId: string | null;
  kind: string;
  title: string;
  url: string;
  snippet: string;
  thumbnail: string;
  source: string;
  query: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalHistory {
  id: string;
  query: string;
  tab: string;
  resultCount: number;
  createdAt: string;
}

interface LocalStore {
  collections: LocalCollection[];
  saved: LocalSavedItem[];
  history: LocalHistory[];
}

function agoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

function initialLocalStore(): LocalStore {
  const c1 = randomUUID();
  const c2 = randomUUID();
  const c3 = randomUUID();
  return {
    collections: [
      { id: c1, name: "Dev & Learning", description: "Frameworks, docs and tutorials worth revisiting.", color: "#4285f4", createdAt: agoIso(120), updatedAt: agoIso(120) },
      { id: c2, name: "Travel ideas", description: "Places and itineraries for the next trip.", color: "#34a853", createdAt: agoIso(96), updatedAt: agoIso(96) },
      { id: c3, name: "Recipes", description: "Weeknight dinners and baking projects.", color: "#fbbc05", createdAt: agoIso(72), updatedAt: agoIso(72) },
    ],
    saved: [
      {
        id: randomUUID(),
        collectionId: c1,
        kind: "web",
        title: "Next.js Docs: App Router",
        url: "https://nextjs.org/docs/app",
        snippet: "The App Router is a file-system based router that uses React's latest features such as Server Components, Suspense and Server Functions.",
        thumbnail: "",
        source: "nextjs.org",
        query: "nextjs 16 app router tutorial",
        note: "Read the routing + data fetching sections.",
        createdAt: agoIso(2),
        updatedAt: agoIso(2),
      },
      {
        id: randomUUID(),
        collectionId: c1,
        kind: "video",
        title: "Next.js 16 Full Course | Build and Deploy a Production-Ready Full Stack App",
        url: "https://www.youtube.com/watch?v=I1V9YWqRIeI",
        snippet: "Project-based course: build and deploy a production-ready full stack app with Next.js 16.",
        thumbnail: "https://i.ytimg.com/vi/I1V9YWqRIeI/hqdefault.jpg",
        source: "JavaScript Mastery",
        query: "nextjs full course video",
        note: "",
        createdAt: agoIso(8),
        updatedAt: agoIso(8),
      },
      {
        id: randomUUID(),
        collectionId: c2,
        kind: "image",
        title: "Aurora Borealis - Iceland - 2 Nov. 2013",
        url: "https://commons.wikimedia.org/wiki/File:Aurora_Borealis_-_Iceland_-_2_Nov._2013.jpg",
        snippet: "commons.wikimedia.org · 6016×4016",
        thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Aurora_Borealis_-_Iceland_-_2_Nov._2013.jpg/500px-Aurora_Borealis_-_Iceland_-_2_Nov._2013.jpg",
        source: "commons.wikimedia.org",
        query: "northern lights iceland photos",
        note: "",
        createdAt: agoIso(14),
        updatedAt: agoIso(14),
      },
      {
        id: randomUUID(),
        collectionId: c3,
        kind: "video",
        title: "How to Make Authentic Shoyu Ramen at Home",
        url: "https://www.youtube.com/watch?v=cnvomlflES4",
        snippet: "A beginner-friendly walkthrough of classic shoyu ramen made at home.",
        thumbnail: "https://i.ytimg.com/vi/cnvomlflES4/hqdefault.jpg",
        source: "Sudachi | Japanese Recipes",
        query: "easy ramen recipe video",
        note: "",
        createdAt: agoIso(24),
        updatedAt: agoIso(24),
      },
    ],
    history: [
      { id: randomUUID(), query: "Best AI screen login", tab: "all", resultCount: 10, createdAt: agoIso(1) },
      { id: randomUUID(), query: "nextjs 16 app router tutorial", tab: "all", resultCount: 10, createdAt: agoIso(3) },
      { id: randomUUID(), query: "northern lights iceland photos", tab: "images", resultCount: 100, createdAt: agoIso(8) },
      { id: randomUUID(), query: "electric cars 2027", tab: "news", resultCount: 28, createdAt: agoIso(20) },
      { id: randomUUID(), query: "easy ramen recipe video", tab: "videos", resultCount: 60, createdAt: agoIso(36) },
    ],
  };
}

let memoryStore: LocalStore | null = null;

function readLocal(): LocalStore {
  if (memoryStore) return memoryStore;
  try {
    if (existsSync(DATA_FILE)) {
      const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as LocalStore;
      if (parsed && Array.isArray(parsed.collections) && Array.isArray(parsed.saved) && Array.isArray(parsed.history)) {
        memoryStore = parsed;
        return parsed;
      }
    }
  } catch {
    /* ignore corrupt file */
  }
  memoryStore = initialLocalStore();
  writeLocal(memoryStore);
  return memoryStore;
}

function writeLocal(store: LocalStore): void {
  memoryStore = store;
  try {
    const dir = path.dirname(DATA_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store), "utf8");
  } catch {
    /* keep in memory if fs is read-only */
  }
}

async function getWorkspaceUserId(): Promise<string | null> {
  if (!hasDatabase) return null;
  try {
    await ensureBootstrapped();
    const [demo] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
    if (demo) return demo.id;
    const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
    if (anyUser) return anyUser.id;
    const [created] = await db
      .insert(users)
      .values({ name: "Fox Workspace", email: DEMO_EMAIL, passwordHash: hashPassword(DEMO_PASSWORD) })
      .returning({ id: users.id });
    return created.id;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------- Public */

export async function getRecentQueries(limit = 6): Promise<{ recent: string[]; totalSearches: number }> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const [rows, [{ count }]] = await Promise.all([
      db.select({ query: searchHistory.query }).from(searchHistory).where(eq(searchHistory.userId, userId)).orderBy(desc(searchHistory.createdAt)).limit(20),
      db.select({ count: sql<number>`count(*)::int` }).from(searchHistory).where(eq(searchHistory.userId, userId)),
    ]);
    return {
      recent: [...new Set(rows.map((r) => r.query))].slice(0, limit),
      totalSearches: Number(count) || 0,
    };
  }
  const store = readLocal();
  const recent = [...new Set(store.history.map((h) => h.query))].slice(0, limit);
  return { recent, totalSearches: store.history.length };
}

export async function getSavedMapForUrls(urls: string[]): Promise<Record<string, string>> {
  if (urls.length === 0) return {};
  const userId = await getWorkspaceUserId();
  if (userId) {
    const rows = await db
      .select({ id: savedItems.id, url: savedItems.url })
      .from(savedItems)
      .where(and(eq(savedItems.userId, userId), inArray(savedItems.url, urls)));
    return Object.fromEntries(rows.map((r) => [r.url, r.id]));
  }
  const set = new Set(urls);
  const store = readLocal();
  const out: Record<string, string> = {};
  for (const item of store.saved) {
    if (set.has(item.url)) out[item.url] = item.id;
  }
  return out;
}

export async function recordSearchHistory(q: string, tab: SearchTab, resultCount: number): Promise<void> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const since = new Date(Date.now() - HISTORY_DEDUPE_MS);
    const [recent] = await db
      .select({ id: searchHistory.id })
      .from(searchHistory)
      .where(
        and(
          eq(searchHistory.userId, userId),
          eq(searchHistory.tab, tab),
          gt(searchHistory.createdAt, since),
          sql`lower(${searchHistory.query}) = ${q.toLowerCase()}`,
        ),
      )
      .orderBy(desc(searchHistory.createdAt))
      .limit(1);
    if (recent) {
      await db.update(searchHistory).set({ createdAt: new Date(), resultCount }).where(eq(searchHistory.id, recent.id));
      return;
    }
    await db.insert(searchHistory).values({ userId, query: q, tab, resultCount });
    return;
  }

  const store = readLocal();
  const cutoff = Date.now() - HISTORY_DEDUPE_MS;
  const idx = store.history.findIndex(
    (h) => h.tab === tab && h.query.toLowerCase() === q.toLowerCase() && new Date(h.createdAt).getTime() > cutoff,
  );
  const now = new Date().toISOString();
  if (idx >= 0) {
    const existing = store.history[idx];
    store.history.splice(idx, 1);
    store.history.unshift({ ...existing, resultCount, createdAt: now });
  } else {
    store.history.unshift({ id: randomUUID(), query: q, tab, resultCount, createdAt: now });
    if (store.history.length > 500) store.history.length = 500;
  }
  writeLocal(store);
}

export async function listHistory(limit = 300): Promise<HistoryDTO[]> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const rows = await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      query: r.query,
      tab: r.tab,
      resultCount: r.resultCount,
      createdAt: r.createdAt.toISOString(),
    }));
  }
  return readLocal().history.slice(0, limit);
}

export async function deleteHistoryItem(id: string): Promise<boolean> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const res = await db
      .delete(searchHistory)
      .where(and(eq(searchHistory.id, id), eq(searchHistory.userId, userId)))
      .returning({ id: searchHistory.id });
    return res.length > 0;
  }
  const store = readLocal();
  const before = store.history.length;
  store.history = store.history.filter((h) => h.id !== id);
  if (store.history.length === before) return false;
  writeLocal(store);
  return true;
}

export async function clearAllHistory(): Promise<void> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
    return;
  }
  const store = readLocal();
  store.history = [];
  writeLocal(store);
}

export async function listSaved(filters?: { kind?: string | null; collectionId?: string | null }): Promise<SavedItemDTO[]> {
  const userId = await getWorkspaceUserId();
  const kind = filters?.kind && ["web", "news", "image", "video"].includes(filters.kind) ? filters.kind : null;
  const colId = filters?.collectionId ?? null;

  if (userId) {
    const conditions = [eq(savedItems.userId, userId)];
    if (kind) conditions.push(eq(savedItems.kind, kind));
    if (colId === "none") conditions.push(isNull(savedItems.collectionId));
    else if (colId) conditions.push(eq(savedItems.collectionId, colId));

    const rows = await db
      .select({
        id: savedItems.id,
        kind: savedItems.kind,
        title: savedItems.title,
        url: savedItems.url,
        snippet: savedItems.snippet,
        thumbnail: savedItems.thumbnail,
        source: savedItems.source,
        query: savedItems.query,
        note: savedItems.note,
        collectionId: savedItems.collectionId,
        createdAt: savedItems.createdAt,
        updatedAt: savedItems.updatedAt,
        collectionName: collections.name,
        collectionColor: collections.color,
      })
      .from(savedItems)
      .leftJoin(collections, eq(collections.id, savedItems.collectionId))
      .where(and(...conditions))
      .orderBy(desc(savedItems.createdAt))
      .limit(1000);
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
  }

  const store = readLocal();
  const colMap = new Map(store.collections.map((c) => [c.id, c]));
  return store.saved
    .filter((item) => {
      if (kind && item.kind !== kind) return false;
      if (colId === "none" && item.collectionId !== null) return false;
      if (colId && colId !== "none" && item.collectionId !== colId) return false;
      return true;
    })
    .map((item) => {
      const c = item.collectionId ? colMap.get(item.collectionId) : undefined;
      return {
        ...item,
        collectionName: c?.name ?? null,
        collectionColor: c?.color ?? null,
      };
    });
}

export async function upsertSavedItem(
  payload: SavePayload & { collectionProvided?: boolean; noteProvided?: boolean; sentFields?: Record<string, boolean> },
): Promise<{ item: Omit<SavedItemDTO, "collectionName" | "collectionColor">; alreadySaved: boolean }> {
  const userId = await getWorkspaceUserId();
  const kind = ["web", "news", "image", "video"].includes(payload.kind) ? payload.kind : "web";
  const title = payload.title.trim().slice(0, 300);
  const url = payload.url.trim().slice(0, 2000);
  const snippet = (payload.snippet ?? "").slice(0, 2000);
  const thumbnail = (payload.thumbnail ?? "").slice(0, 2000);
  const source = (payload.source ?? domainOf(url)).slice(0, 200);
  const query = (payload.query ?? "").slice(0, 300);
  const note = (payload.note ?? "").slice(0, 2000);
  const collectionId = payload.collectionId ?? null;

  if (userId) {
    const existing = await db
      .select({ id: savedItems.id })
      .from(savedItems)
      .where(and(eq(savedItems.userId, userId), eq(savedItems.url, url)))
      .limit(1);

    const [item] = await db
      .insert(savedItems)
      .values({ userId, collectionId, kind, title, url, snippet, thumbnail, source, query, note })
      .onConflictDoUpdate({
        target: [savedItems.userId, savedItems.url],
        set: {
          kind,
          title,
          ...(payload.sentFields?.snippet ? { snippet } : {}),
          ...(payload.sentFields?.thumbnail ? { thumbnail } : {}),
          ...(payload.sentFields?.source ? { source } : {}),
          ...(query ? { query } : {}),
          ...(payload.noteProvided ? { note } : {}),
          ...(payload.collectionProvided ? { collectionId } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      item: { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() },
      alreadySaved: existing.length > 0,
    };
  }

  const store = readLocal();
  const now = new Date().toISOString();
  const idx = store.saved.findIndex((s) => s.url === url);
  if (idx >= 0) {
    const cur = store.saved[idx];
    const updated: LocalSavedItem = {
      ...cur,
      kind,
      title,
      snippet: payload.sentFields?.snippet ? snippet : cur.snippet,
      thumbnail: payload.sentFields?.thumbnail ? thumbnail : cur.thumbnail,
      source: payload.sentFields?.source ? source : cur.source,
      query: query || cur.query,
      note: payload.noteProvided ? note : cur.note,
      collectionId: payload.collectionProvided ? collectionId : cur.collectionId,
      updatedAt: now,
    };
    store.saved.splice(idx, 1);
    store.saved.unshift(updated);
    writeLocal(store);
    return { item: updated, alreadySaved: true };
  }
  const created: LocalSavedItem = {
    id: randomUUID(),
    collectionId,
    kind,
    title,
    url,
    snippet,
    thumbnail,
    source,
    query,
    note,
    createdAt: now,
    updatedAt: now,
  };
  store.saved.unshift(created);
  writeLocal(store);
  return { item: created, alreadySaved: false };
}

export async function updateSavedItem(
  id: string,
  patch: { title?: string; note?: string; snippet?: string; collectionId?: string | null },
): Promise<Omit<SavedItemDTO, "collectionName" | "collectionColor"> | null> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.title !== undefined) set.title = patch.title;
    if (patch.note !== undefined) set.note = patch.note;
    if (patch.snippet !== undefined) set.snippet = patch.snippet;
    if ("collectionId" in patch) set.collectionId = patch.collectionId ?? null;
    const [item] = await db
      .update(savedItems)
      .set(set)
      .where(and(eq(savedItems.id, id), eq(savedItems.userId, userId)))
      .returning();
    if (!item) return null;
    return { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }

  const store = readLocal();
  const idx = store.saved.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const cur = store.saved[idx];
  const updated: LocalSavedItem = {
    ...cur,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.note !== undefined ? { note: patch.note } : {}),
    ...(patch.snippet !== undefined ? { snippet: patch.snippet } : {}),
    ...("collectionId" in patch ? { collectionId: patch.collectionId ?? null } : {}),
    updatedAt: new Date().toISOString(),
  };
  store.saved[idx] = updated;
  writeLocal(store);
  return updated;
}

export async function deleteSavedItem(id: string): Promise<boolean> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const res = await db
      .delete(savedItems)
      .where(and(eq(savedItems.id, id), eq(savedItems.userId, userId)))
      .returning({ id: savedItems.id });
    return res.length > 0;
  }
  const store = readLocal();
  const before = store.saved.length;
  store.saved = store.saved.filter((s) => s.id !== id);
  if (store.saved.length === before) return false;
  writeLocal(store);
  return true;
}

export async function listCollections(): Promise<CollectionDTO[]> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const rows = await db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        color: collections.color,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        itemCount: sql<number>`count(${savedItems.id})::int`,
      })
      .from(collections)
      .leftJoin(savedItems, eq(savedItems.collectionId, collections.id))
      .where(eq(collections.userId, userId))
      .groupBy(collections.id)
      .orderBy(desc(collections.createdAt));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      color: r.color,
      itemCount: Number(r.itemCount) || 0,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }
  const store = readLocal();
  return store.collections.map((c) => ({
    ...c,
    itemCount: store.saved.filter((s) => s.collectionId === c.id).length,
  }));
}

export async function createCollection(input: { name: string; description: string; color: string }): Promise<CollectionDTO> {
  const userId = await getWorkspaceUserId();
  const color = /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : COLLECTION_COLORS[0];
  if (userId) {
    const [created] = await db
      .insert(collections)
      .values({ userId, name: input.name, description: input.description, color })
      .returning();
    return {
      id: created.id,
      name: created.name,
      description: created.description,
      color: created.color,
      itemCount: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }
  const store = readLocal();
  const now = new Date().toISOString();
  const created: LocalCollection = {
    id: randomUUID(),
    name: input.name,
    description: input.description,
    color,
    createdAt: now,
    updatedAt: now,
  };
  store.collections.unshift(created);
  writeLocal(store);
  return { ...created, itemCount: 0 };
}

export async function updateCollection(
  id: string,
  patch: { name?: string; description?: string; color?: string },
): Promise<Omit<CollectionDTO, "itemCount"> | null> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.description !== undefined) set.description = patch.description;
    if (patch.color !== undefined) set.color = patch.color;
    const [updated] = await db
      .update(collections)
      .set(set)
      .where(and(eq(collections.id, id), eq(collections.userId, userId)))
      .returning();
    if (!updated) return null;
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      color: updated.color,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
  const store = readLocal();
  const idx = store.collections.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const cur = store.collections[idx];
  const updated: LocalCollection = {
    ...cur,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.color !== undefined ? { color: patch.color } : {}),
    updatedAt: new Date().toISOString(),
  };
  store.collections[idx] = updated;
  writeLocal(store);
  return updated;
}

export async function deleteCollection(id: string): Promise<boolean> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const owned = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.userId, userId)))
      .limit(1);
    if (owned.length === 0) return false;
    await db
      .update(savedItems)
      .set({ collectionId: null, updatedAt: new Date() })
      .where(and(eq(savedItems.collectionId, id), eq(savedItems.userId, userId)));
    await db.delete(collections).where(and(eq(collections.id, id), eq(collections.userId, userId)));
    return true;
  }
  const store = readLocal();
  const before = store.collections.length;
  store.collections = store.collections.filter((c) => c.id !== id);
  if (store.collections.length === before) return false;
  store.saved = store.saved.map((s) => (s.collectionId === id ? { ...s, collectionId: null } : s));
  writeLocal(store);
  return true;
}

export async function collectionExists(id: string): Promise<boolean> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const owned = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.userId, userId)))
      .limit(1);
    return owned.length > 0;
  }
  return readLocal().collections.some((c) => c.id === id);
}

export async function getOverviewStats(): Promise<{
  historyCount: number;
  savedCount: number;
  collectionCount: number;
  days: Array<{ label: string; count: number }>;
  topQueries: Array<{ query: string; count: number }>;
  recent: HistoryDTO[];
  recentSaved: Array<{ id: string; title: string; url: string; thumbnail: string; createdAt: string }>;
}> {
  const userId = await getWorkspaceUserId();
  if (userId) {
    const [[historyCount], [savedCount], [collectionCount], chartResult, topQueries, recentRows, recentSavedRows] =
      await Promise.all([
        db.select({ c: sql<number>`count(*)::int` }).from(searchHistory).where(eq(searchHistory.userId, userId)),
        db.select({ c: sql<number>`count(*)::int` }).from(savedItems).where(eq(savedItems.userId, userId)),
        db.select({ c: sql<number>`count(*)::int` }).from(collections).where(eq(collections.userId, userId)),
        db.execute<{ day: string; count: number }>(
          sql`select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as count
              from search_history
              where user_id = ${userId} and created_at > now() - interval '14 days'
              group by 1 order by 1`,
        ),
        db
          .select({ query: searchHistory.query, count: sql<number>`count(*)::int` })
          .from(searchHistory)
          .where(eq(searchHistory.userId, userId))
          .groupBy(searchHistory.query)
          .orderBy(desc(sql`count(*)`), desc(sql`max(${searchHistory.createdAt})`))
          .limit(8),
        db
          .select()
          .from(searchHistory)
          .where(eq(searchHistory.userId, userId))
          .orderBy(desc(searchHistory.createdAt))
          .limit(8),
        db
          .select({
            id: savedItems.id,
            title: savedItems.title,
            url: savedItems.url,
            thumbnail: savedItems.thumbnail,
            createdAt: savedItems.createdAt,
          })
          .from(savedItems)
          .where(eq(savedItems.userId, userId))
          .orderBy(desc(savedItems.createdAt))
          .limit(5),
      ]);

    const dayMap = new Map(chartResult.rows.map((r) => [r.day, Number(r.count)]));
    const days: Array<{ label: string; count: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      days.push({
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        count: dayMap.get(d.toISOString().slice(0, 10)) ?? 0,
      });
    }

    return {
      historyCount: Number(historyCount.c) || 0,
      savedCount: Number(savedCount.c) || 0,
      collectionCount: Number(collectionCount.c) || 0,
      days,
      topQueries: topQueries.map((t) => ({ query: t.query, count: Number(t.count) })),
      recent: recentRows.map((r) => ({
        id: r.id,
        query: r.query,
        tab: r.tab,
        resultCount: r.resultCount,
        createdAt: r.createdAt.toISOString(),
      })),
      recentSaved: recentSavedRows.map((r) => ({
        id: r.id,
        title: r.title,
        url: r.url,
        thumbnail: r.thumbnail,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  const store = readLocal();
  const dayCounts = new Map<string, number>();
  const queryCounts = new Map<string, number>();
  for (const h of store.history) {
    const dayKey = h.createdAt.slice(0, 10);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
    queryCounts.set(h.query, (queryCounts.get(h.query) ?? 0) + 1);
  }
  const days: Array<{ label: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    days.push({
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      count: dayCounts.get(d.toISOString().slice(0, 10)) ?? 0,
    });
  }
  const topQueries = [...queryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([query, count]) => ({ query, count }));

  return {
    historyCount: store.history.length,
    savedCount: store.saved.length,
    collectionCount: store.collections.length,
    days,
    topQueries,
    recent: store.history.slice(0, 8),
    recentSaved: store.saved.slice(0, 5).map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      thumbnail: s.thumbnail,
      createdAt: s.createdAt,
    })),
  };
}
