import type { NextRequest } from "next/server";
import { decodeCursor, instantAnswer, searchPage, type Cursor } from "@/lib/ddg";
import { getSavedMapForUrls, recordSearchHistory } from "@/lib/storage";
import { normalizeTab, resultUrl, type SearchResponse, type SearchTab } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Payload = Omit<SearchResponse, "q" | "savedMap">;

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 400;

const cache = new Map<string, { at: number; payload: Payload }>();
const inflight = new Map<string, Promise<Payload>>();

function softTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

async function compute(q: string, tab: SearchTab, cursor: Cursor | null): Promise<Payload> {
  const started = Date.now();
  const isAllFirstPage = tab === "all" && !cursor;
  const [page, answer, videoPage] = await Promise.all([
    searchPage(tab, q, cursor),
    isAllFirstPage ? softTimeout(instantAnswer(q), 2500, null) : Promise.resolve(null),
    isAllFirstPage ? softTimeout(searchPage("videos", q, null), 3200, null) : Promise.resolve(null),
  ]);
  const videos =
    videoPage && !videoPage.degraded
      ? (videoPage.results.filter((r) => r.kind === "video").slice(0, 8) as SearchResponse["videos"])
      : [];
  return {
    tab,
    page: page.page,
    tookMs: Date.now() - started,
    degraded: page.degraded,
    fallback: page.fallback,
    shownFor: page.shownFor ?? null,
    results: page.results,
    videos,
    answer,
    related: page.related,
    nextCursor: page.next,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const tab = normalizeTab(sp.get("tab"));
  if (!q) {
    return Response.json({ error: "Missing query parameter `q`." }, { status: 400 });
  }

  const rawCursor = sp.get("cursor");
  let cursor: Cursor | null = null;
  if (rawCursor) {
    cursor = decodeCursor(rawCursor);
    if (!cursor) return Response.json({ error: "Invalid page cursor." }, { status: 400 });
  }

  const key = `${tab}::${q.toLowerCase()}::${rawCursor ?? ""}`;
  let payload: Payload | undefined;
  const hit = cache.get(key);
  if (hit) {
    if (Date.now() - hit.at < CACHE_TTL_MS) payload = hit.payload;
    else cache.delete(key);
  }

  if (!payload) {
    let job = inflight.get(key);
    if (!job) {
      job = compute(q, tab, cursor).finally(() => inflight.delete(key));
      inflight.set(key, job);
    }
    try {
      payload = await job;
    } catch (err) {
      console.error("[search] upstream failure:", err);
      return Response.json({ error: "Search failed. Please try again." }, { status: 502 });
    }
    const cacheable = payload.fallback === null || payload.fallback === "relaxed";
    if (!payload.degraded && payload.results.length > 0 && cacheable) {
      cache.set(key, { at: Date.now(), payload });
      while (cache.size > CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
    }
  }

  let savedMap: Record<string, string> = {};
  try {
    const videoUrls = (payload.videos ?? []).map((v) => v.url);
    const urls = [...new Set([...payload.results.map(resultUrl), ...videoUrls].filter(Boolean))];
    savedMap = await getSavedMapForUrls(urls);
    if (!cursor) await recordSearchHistory(q, tab, payload.results.length);
  } catch (err) {
    console.error("[search] failed to attach workspace data:", err);
  }

  const body: SearchResponse = { ...payload, q, savedMap };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
