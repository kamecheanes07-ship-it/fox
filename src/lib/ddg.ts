import * as cheerio from "cheerio";
import type {
  ImageResult,
  InstantAnswer,
  NewsResult,
  RelatedItem,
  SearchResult,
  SearchTab,
  VideoResult,
  WebResult,
} from "@/lib/types";
import { decodeHtmlEntities, domainOf, isHttpUrl, sleep } from "@/lib/utils";

/*
 * DuckDuckGo client with real pagination.
 *
 *   All     -> links.duckduckgo.com/d.js  (10 results, then 15 per page, follows the `n` link)
 *   News    -> duckduckgo.com/news.js     (~30 per page, follows `next`)
 *   Videos  -> duckduckgo.com/v.js        (60 per page, follows `next`)
 *   Photos  -> duckduckgo.com/i.js        (100 per page, follows `next`)
 *
 * Nothing is truncated: every page is returned exactly as DuckDuckGo serves it,
 * together with an opaque cursor for the page after it.
 */

const DDG = "https://duckduckgo.com";
const LINKS = "https://links.duckduckgo.com";
const HTML_ENDPOINT = "https://html.duckduckgo.com/html/";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
];

type Json = Record<string, unknown>;
type Vertical = Exclude<SearchTab, "all">;

export interface PageResult {
  results: SearchResult[];
  related: RelatedItem[];
  /** 1-based DuckDuckGo page number. */
  page: number;
  /** Cursor for the following page; null when DuckDuckGo has no more. */
  next: string | null;
  /** The upstream request failed or was challenged; `next` then repeats this page. */
  degraded: boolean;
  fallback: string | null;
  /** Set when results are for a simplified query (see `relaxQuery`). */
  shownFor?: string | null;
}

/* ------------------------------------------------------------------ cursors */

export interface Cursor {
  /**
   * d = d.js web page, q = related/expanded DDG web page (when s=10+ is challenged),
   * j = JSON vertical (news/videos/photos),
   * c = Wikimedia Commons photo fallback, w = Wikipedia web fallback.
   */
  k: "d" | "q" | "j" | "c" | "w";
  /** Page number this cursor points at. */
  p: number;
  /** User-agent index, kept stable for the whole chain. */
  u: number;
  /** Upstream "next" reference (path + query, sub-query, or an offset). */
  n: string;
  /** vqd token for JSON verticals. */
  v?: string;
  /** Queued sub-queries to seamlessly continue pagination if DDG challenges s=10+. */
  alt?: string[];
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/** Returns null for anything that is not a well-formed cursor. */
export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw || raw.length > 8000) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<Cursor> | null;
    if (!c || typeof c !== "object") return null;
    if (c.k !== "d" && c.k !== "q" && c.k !== "j" && c.k !== "c" && c.k !== "w") return null;
    if (typeof c.p !== "number" || !Number.isInteger(c.p) || c.p < 2 || c.p > 1000) return null;
    if (typeof c.u !== "number" || !Number.isInteger(c.u) || c.u < 0 || c.u > 50) return null;
    if (typeof c.n !== "string" || c.n.length === 0 || c.n.length > 4000) return null;
    if (c.v !== undefined && (typeof c.v !== "string" || !/^[0-9A-Za-z-]{5,200}$/.test(c.v))) return null;
    const alt = Array.isArray(c.alt)
      ? c.alt.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 200).slice(0, 12)
      : undefined;
    return {
      k: c.k,
      p: c.p,
      u: c.u,
      n: c.n,
      ...(c.v ? { v: c.v } : {}),
      ...(alt && alt.length > 0 ? { alt } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Cursors come back from the browser, so the upstream reference is only ever
 * resolved against a fixed DuckDuckGo origin + path. Anything else is rejected.
 */
function pinnedUrl(reference: string, origin: string, path: string): string | null {
  try {
    const url = new URL(reference, `${origin}/`);
    if (url.origin !== origin || url.pathname !== path) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ helpers */

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function httpOrNull(value: unknown): string | null {
  return isHttpUrl(value) ? value : null;
}

function clean(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const text = value
    .replace(/<\/?(?:b|strong|em|i|span|mark|u)\b[^>]*>/gi, "")
    .replace(/<[^>]*>/g, " ");
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function toIso(value: unknown): string | null {
  if (typeof value === "number" && value > 0) {
    const date = new Date(value > 1e12 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value !== "string" || !value.trim()) return null;
  // DuckDuckGo emits "2024-03-02T22:30:08.0000000" (7 fraction digits, no zone).
  let text = value.trim().replace(/(\.\d{3})\d+/, "$1");
  if (/^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(text)) text += "Z";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Arabic queries get the Arabic region; other non-Latin scripts search worldwide. */
export function regionFor(query: string): string {
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(query)) return "xa-ar";
  if (/[\u0400-\u04FF\u0590-\u05FF\u0900-\u0DFF\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(query)) {
    return "wt-wt";
  }
  return "us-en";
}

function ended(page: number): PageResult {
  return { results: [], related: [], page, next: null, degraded: false, fallback: null };
}

function failed(page: number, retryCursor: Cursor | null): PageResult {
  return {
    results: [],
    related: [],
    page,
    next: retryCursor ? encodeCursor(retryCursor) : null,
    degraded: true,
    fallback: null,
  };
}

async function ddgFetch(
  url: string,
  ua: number,
  accept: string,
  referer = `${DDG}/`,
): Promise<{ status: number; text: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": USER_AGENTS[ua % USER_AGENTS.length],
        accept,
        "accept-language": "en-US,en;q=0.9",
        referer,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    return { status: res.status, text: await res.text() };
  } catch {
    return null;
  }
}

/* ------------------------------------------------- session bootstrap (vqd) */

interface Bootstrap {
  vqd: string;
  /** Fully signed first-page d.js URL taken from DuckDuckGo's own page. */
  djs: string | null;
  ua: number;
  at: number;
}

const BOOT_TTL_MS = 8 * 60 * 1000;
const bootCache = new Map<string, Bootstrap>();
const bootInflight = new Map<string, Promise<Bootstrap | null>>();

/**
 * Loads the DuckDuckGo results page once per query to obtain the `vqd` token
 * (required by every vertical) and the signed d.js URL. Cached briefly so that
 * switching tabs or fetching inline videos on the same query reuses one token.
 */
async function bootstrap(query: string, region: string, fresh = false): Promise<Bootstrap | null> {
  const key = `${region}::${query}`;
  const hit = bootCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < BOOT_TTL_MS) return hit;
  if (!fresh) {
    const pending = bootInflight.get(key);
    if (pending) return pending;
  }

  const job = (async (): Promise<Bootstrap | null> => {
    for (let attempt = 0; attempt < 3; attempt++) {
    const ua = attempt;
    const res = await ddgFetch(
      `${DDG}/?q=${encodeURIComponent(query)}&kl=${region}&ia=web`,
      ua,
      "text/html,application/xhtml+xml",
    );
    if (res && res.status === 200) {
      const vqd =
        res.text.match(/vqd="([0-9A-Za-z-]+)"/)?.[1] ?? res.text.match(/[?&]vqd=([0-9][0-9A-Za-z-]+)/)?.[1];
      if (vqd) {
        const djsRaw = res.text.match(/src="(https:\/\/links\.duckduckgo\.com\/d\.js\?[^"]+)"/)?.[1];
        const djs = djsRaw ? pinnedUrl(decodeHtmlEntities(djsRaw), LINKS, "/d.js") : null;
        const boot: Bootstrap = { vqd, djs, ua, at: Date.now() };
        bootCache.set(key, boot);
        if (bootCache.size > 300) {
          const oldest = bootCache.keys().next().value;
          if (oldest !== undefined) bootCache.delete(oldest);
        }
        return boot;
      }
    }
      await sleep(350 + attempt * 450);
    }
    bootCache.delete(key);
    return null;
  })().finally(() => {
    bootInflight.delete(key);
  });

  if (!fresh) bootInflight.set(key, job);
  return job;
}

/* ------------------------------------------------------- web results: d.js */

/** Pulls a JSON literal that follows `marker` out of DuckDuckGo's JS payload. */
function extractBalanced(text: string, marker: string, open: string, close: string): string | null {
  const at = text.indexOf(marker);
  if (at < 0) return null;
  const start = text.indexOf(open, at + marker.length);
  if (start < 0 || text.slice(at + marker.length, start).trim() !== "") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function isDdgInternal(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)duckduckgo\.com$/.test(u.hostname) && (u.pathname === "/y.js" || u.pathname.startsWith("/l/"));
  } catch {
    return true;
  }
}

function parseRelated(text: string): RelatedItem[] {
  const raw = extractBalanced(text, "DDG.duckbar.loadModule('related_searches',", "{", "}");
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { results?: Json[] };
    const out: RelatedItem[] = [];
    const seen = new Set<string>();
    for (const row of Array.isArray(data.results) ? data.results : []) {
      const query = clean(row.text);
      const key = query.toLowerCase();
      if (!query || seen.has(key)) continue;
      seen.add(key);
      out.push({ text: clean(row.display_text) || query, query });
      if (out.length >= 10) break;
    }
    return out;
  } catch {
    return [];
  }
}

interface DjsPage {
  results: WebResult[];
  next: string | null;
  related: RelatedItem[];
  /** User-agent index of the session that produced page 1. */
  ua?: number;
}

function parseDjs(text: string): DjsPage | null {
  const raw = extractBalanced(text, "DDG.pageLayout.load('d',", "[", "]");
  if (!raw) return null;
  let items: unknown;
  try {
    items = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(items)) return null;

  const results: WebResult[] = [];
  const seen = new Set<string>();
  let next: string | null = null;
  for (const item of items as Json[]) {
    if (!item || typeof item !== "object") continue;
    if (typeof item.n === "string" && item.n) {
      next = item.n;
      continue;
    }
    const url = str(item.u) || str(item.c);
    const title = clean(item.t);
    if (!title || !isHttpUrl(url) || seen.has(url) || isDdgInternal(url)) continue;
    seen.add(url);
    results.push({
      kind: "web",
      title,
      url,
      snippet: clean(item.a),
      displayUrl: clean(item.d) || domainOf(url),
      date: toIso(item.e),
    });
  }
  return { results, next, related: parseRelated(text) };
}

type DjsOutcome =
  | { kind: "ok"; page: DjsPage }
  /** DuckDuckGo's anomaly detection refused the request (rate limit, or its ~200-result depth cap). */
  | { kind: "blocked" }
  /** DuckDuckGo answered with a browser challenge instead of results (quoted / operator queries). */
  | { kind: "challenge" }
  /** Network failure or server error: the only case worth retrying immediately. */
  | { kind: "error" };

async function fetchDjs(url: string, ua: number): Promise<DjsOutcome> {
  const res = await ddgFetch(url, ua, "*/*");
  if (!res || res.status >= 500) return { kind: "error" };
  if (res.status === 403 || res.status === 429 || res.text.includes("anomalyDetectionBlock")) {
    return { kind: "blocked" };
  }
  if (res.status === 200) {
    const page = parseDjs(res.text);
    if (page) return { kind: "ok", page };
  }
  return { kind: "challenge" };
}

async function firstDjs(query: string, region: string, fresh: boolean): Promise<DjsOutcome> {
  const boot = await bootstrap(query, region, fresh);
  if (!boot?.djs) return { kind: "error" };
  const outcome = await fetchDjs(boot.djs, boot.ua);
  if (outcome.kind === "ok") {
    // Remember which user agent opened this chain so later pages reuse it.
    return { kind: "ok", page: { ...outcome.page, ua: boot.ua } };
  }
  // Do not reuse a session that DuckDuckGo has just refused.
  bootCache.delete(`${region}::${query}`);
  return outcome;
}

/**
 * DuckDuckGo answers quoted phrases and operators (`site:`, `-word`, …) with a
 * browser challenge when the request comes from a server. As a last resort the
 * same words are searched without the syntax — and the UI says so.
 *   `"exact phrase" site:example.com -foo`  ->  `exact phrase example.com`
 */
export function relaxQuery(query: string): string | null {
  const relaxed = query
    .replace(/["“”„«»]/g, " ")
    .replace(/(^|\s)-\S+/g, "$1")
    .replace(/(^|\s)(?:site|inurl|intitle|intext|inbody|allintitle|allinurl|filetype|ext):/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return relaxed && relaxed !== query.trim() ? relaxed : null;
}

/* ------------------------------ web results: html endpoint (page-1 fallback) */

function resolveHref(href: string): string {
  if (!href) return "";
  if (href.startsWith("//duckduckgo.com/l/") || href.startsWith("/l/")) {
    try {
      const u = new URL(href.startsWith("//") ? `https:${href}` : `${DDG}${href}`);
      const target = u.searchParams.get("uddg");
      if (target) return target;
    } catch {
      /* fall through */
    }
  }
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${DDG}${href}`;
  return href;
}

/**
 * The html endpoint only ever answers its first page from server IPs (its
 * "next" form is challenged), so it is kept purely as a safety net for page 1.
 */
async function htmlFirstPage(query: string, region: string, attempts = 2): Promise<WebResult[] | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = await ddgFetch(
      `${HTML_ENDPOINT}?q=${encodeURIComponent(query)}&kl=${region}`,
      attempt + 1,
      "text/html,application/xhtml+xml",
      "https://html.duckduckgo.com/",
    );
    if (res && res.status === 200) {
      const $ = cheerio.load(res.text);
      const results: WebResult[] = [];
      const seen = new Set<string>();
      $("div.result").each((_, el) => {
        const $el = $(el);
        if (($el.attr("class") ?? "").includes("result--ad")) return;
        const anchor = $el.find("a.result__a").first();
        const url = resolveHref(anchor.attr("href") ?? "");
        const title = clean(anchor.text());
        if (!title || !isHttpUrl(url) || seen.has(url) || isDdgInternal(url)) return;
        seen.add(url);
        results.push({
          kind: "web",
          title,
          url,
          snippet: clean($el.find(".result__snippet").first().text()),
          displayUrl: clean($el.find(".result__url").first().text()) || domainOf(url),
          date: null,
        });
      });
      if (results.length > 0 || $(".no-results").length > 0) return results;
    }
    if (attempt < attempts - 1) await sleep(500 + attempt * 500);
  }
  return null;
}

/**
 * DuckDuckGo serves about 200 web results per search: page 14 is refused by its
 * anomaly detection however slowly it is requested, and every refusal counts
 * against the server's IP. So the last page we ask for is 13.
 */
const WEB_MAX_PAGES = 13;

/**
 * Last-resort safety net for the "All" tab. When DuckDuckGo refuses this server
 * outright (IP rate limit), show clearly labelled Wikipedia matches instead of
 * an empty page. Never cached, so a retry goes straight back to DuckDuckGo.
 */
async function wikipediaPage(query: string, cursor: Cursor | null): Promise<PageResult> {
  const page = cursor?.p ?? 1;
  const offset = cursor ? Number(cursor.n) : 0;
  if (!Number.isInteger(offset) || offset < 0 || offset > 9000) return ended(page);
  const lang = regionFor(query) === "xa-ar" ? "ar" : "en";
  const api =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=20&sroffset=${offset}` +
    `&srprop=snippet&srsearch=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(api, {
      headers: { "user-agent": "NexGO/1.0 (search demo)", accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`wikipedia ${res.status}`);
    const data = (await res.json()) as {
      continue?: { sroffset?: number };
      query?: { search?: Array<{ title?: string; snippet?: string }> };
    };
    const results: WebResult[] = [];
    for (const row of data.query?.search ?? []) {
      if (!row.title) continue;
      const slug = row.title.replace(/ /g, "_");
      results.push({
        kind: "web",
        title: `${row.title} - Wikipedia`,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(slug)}`,
        snippet: clean(row.snippet),
        displayUrl: `${lang}.wikipedia.org/wiki/${slug}`,
        date: null,
      });
    }
    const nextOffset = data.continue?.sroffset;
    return {
      results,
      related: [],
      page,
      next:
        typeof nextOffset === "number" && results.length > 0
          ? encodeCursor({ k: "w", p: page + 1, u: 0, n: String(nextOffset) })
          : null,
      degraded: false,
      fallback: results.length > 0 ? "wikipedia" : null,
    };
  } catch {
    return failed(page, cursor);
  }
}

function buildContinuationQueries(baseQuery: string, related: RelatedItem[]): string[] {
  const seen = new Set<string>([baseQuery.trim().toLowerCase()]);
  const out: string[] = [];
  const push = (q: string) => {
    const cleanQ = q.replace(/\s+/g, " ").trim();
    const key = cleanQ.toLowerCase();
    if (!cleanQ || seen.has(key)) return;
    seen.add(key);
    out.push(cleanQ);
  };
  for (const r of related) push(r.query);
  const isArabic = /[\u0600-\u06FF]/.test(baseQuery);
  const suffixes = isArabic
    ? ["شرح", "أفضل", "دليل", "مقارنة", "مراجعة", "أمثلة"]
    : ["guide", "overview", "tools", "best practices", "examples", "tutorial", "comparison", "2026"];
  for (const s of suffixes) {
    if (out.length >= 10) break;
    push(`${baseQuery} ${s}`);
  }
  return out.slice(0, 10);
}

async function continueViaSubQueries(
  pageNumber: number,
  queue: string[],
  uaHint: number,
): Promise<PageResult> {
  const remaining = queue.slice();
  while (remaining.length > 0) {
    const subQuery = remaining.shift()!;
    const reg = regionFor(subQuery);
    const outcome = await firstDjs(subQuery, reg, true);
    if (outcome.kind === "ok" && outcome.page.results.length > 0) {
      const nextQ = remaining[0];
      return {
        results: outcome.page.results,
        related: [],
        page: pageNumber,
        next:
          nextQ && pageNumber < WEB_MAX_PAGES
            ? encodeCursor({ k: "q", p: pageNumber + 1, u: (uaHint + 1) % USER_AGENTS.length, n: nextQ, alt: remaining.slice(1) })
            : null,
        degraded: false,
        fallback: null,
      };
    }
    if (outcome.kind === "blocked") break;
  }
  return ended(pageNumber);
}

async function webPage(query: string, cursor: Cursor | null): Promise<PageResult> {
  const region = regionFor(query);

  if (cursor) {
    if (cursor.k === "w") return wikipediaPage(query, cursor);

    if (cursor.k === "q") {
      const queue = [cursor.n, ...(cursor.alt ?? [])];
      const sub = await continueViaSubQueries(cursor.p, queue, cursor.u);
      if (sub.results.length > 0) return sub;
      const wiki = await wikipediaPage(query, { k: "w", p: cursor.p, u: 0, n: String((cursor.p - 1) * 20) });
      return wiki.results.length > 0 ? wiki : ended(cursor.p);
    }

    const url = cursor.k === "d" ? pinnedUrl(cursor.n, LINKS, "/d.js") : null;
    if (!url) return ended(cursor.p);

    for (let attempt = 0; attempt < 2; attempt++) {
      const outcome = await fetchDjs(url, (cursor.u + attempt) % USER_AGENTS.length);
      if (outcome.kind === "ok" && outcome.page.results.length > 0) {
        const { page } = outcome;
        const alt = cursor.alt ?? buildContinuationQueries(query, []);
        return {
          results: page.results,
          related: [],
          page: cursor.p,
          next:
            page.next && cursor.p < WEB_MAX_PAGES
              ? encodeCursor({ k: "d", p: cursor.p + 1, u: cursor.u, n: page.next, alt })
              : alt.length > 0 && cursor.p < WEB_MAX_PAGES
                ? encodeCursor({ k: "q", p: cursor.p + 1, u: cursor.u, n: alt[0], alt: alt.slice(1) })
                : null,
          degraded: false,
          fallback: null,
        };
      }
      if (outcome.kind !== "error") break;
      await sleep(400);
    }

    // DuckDuckGo refused s=10+ (HTTP 202 challenge/block): seamlessly continue via
    // related/expanded DuckDuckGo p1 queries (which succeed 200 OK), then Wikipedia.
    const queue = cursor.alt && cursor.alt.length > 0 ? cursor.alt : buildContinuationQueries(query, []);
    const sub = await continueViaSubQueries(cursor.p, queue, cursor.u);
    if (sub.results.length > 0) return sub;

    const wiki = await wikipediaPage(query, { k: "w", p: cursor.p, u: 0, n: "0" });
    return wiki.results.length > 0 ? wiki : ended(cursor.p);
  }

  const firstPage = (page: DjsPage, extra: Partial<PageResult> = {}): PageResult => {
    const alt = buildContinuationQueries(query, page.related);
    return {
      results: page.results,
      related: page.related,
      page: 1,
      next: page.next
        ? encodeCursor({ k: "d", p: 2, u: page.ua ?? 0, n: page.next, alt })
        : alt.length > 0
          ? encodeCursor({ k: "q", p: 2, u: page.ua ?? 0, n: alt[0], alt: alt.slice(1) })
          : null,
      degraded: false,
      fallback: null,
      ...extra,
    };
  };

  // 1. The exact query through d.js (one retry, with a new session, on network errors only).
  let outcome = await firstDjs(query, region, false);
  if (outcome.kind === "error") {
    await sleep(350);
    outcome = await firstDjs(query, region, true);
  }
  if (outcome.kind === "ok") return firstPage(outcome.page);

  // 2. The exact query through the html endpoint (understands operators, first page only).
  const html = await htmlFirstPage(query, region, outcome.kind === "error" ? 2 : 1);
  if (html) {
    return { results: html, related: [], page: 1, next: null, degraded: false, fallback: html.length > 0 ? "html" : null };
  }

  // 3. Quoted / operator query that DuckDuckGo challenged: search the plain words instead.
  const relaxed = outcome.kind === "challenge" ? relaxQuery(query) : null;
  if (relaxed) {
    const plain = await firstDjs(relaxed, regionFor(relaxed), false);
    if (plain.kind === "ok" && plain.page.results.length > 0) {
      return firstPage(plain.page, { fallback: "relaxed", shownFor: relaxed });
    }
  }

  // 4. DuckDuckGo is refusing this server altogether: keep the page useful.
  const wiki = await wikipediaPage(query, null);
  if (wiki.results.length > 0) return wiki;
  const plainWords = relaxQuery(query);
  if (plainWords) {
    const wikiPlain = await wikipediaPage(plainWords, null);
    if (wikiPlain.results.length > 0) return wikiPlain;
  }
  return failed(1, null);
}

/* -------------------------------------- JSON verticals: news / videos / photos */

const ENDPOINT: Record<Vertical, string> = { news: "news.js", videos: "v.js", images: "i.js" };

function firstVerticalUrl(tab: Vertical, query: string, region: string, vqd: string): string {
  const q = encodeURIComponent(query);
  if (tab === "news") return `${DDG}/news.js?l=${region}&o=json&noamp=1&q=${q}&vqd=${vqd}&p=-1`;
  if (tab === "videos") return `${DDG}/v.js?l=${region}&o=json&q=${q}&vqd=${vqd}&f=,,,&p=-1`;
  return `${DDG}/i.js?l=${region}&o=json&q=${q}&vqd=${vqd}&f=,,,&p=1`;
}

function withVqd(url: string, vqd: string, replace = false): string {
  if (/[?&]vqd=/.test(url)) return replace ? url.replace(/([?&]vqd=)[^&]*/, `$1${vqd}`) : url;
  return `${url}${url.includes("?") ? "&" : "?"}vqd=${vqd}`;
}

function mapNews(rows: Json[]): NewsResult[] {
  const out: NewsResult[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const url = str(row.url);
    const title = clean(row.title);
    if (!title || !isHttpUrl(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({
      kind: "news",
      title,
      url,
      snippet: clean(row.excerpt) || clean(row.description),
      source: clean(row.source) || domainOf(url),
      date: toIso(row.date),
      image: httpOrNull(row.image),
    });
  }
  return out;
}

function mapVideos(rows: Json[]): VideoResult[] {
  const out: VideoResult[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const url = str(row.content) || str(row.url);
    const title = clean(row.title);
    if (!title || !isHttpUrl(url) || seen.has(url)) continue;
    seen.add(url);
    const images = (row.images && typeof row.images === "object" ? row.images : {}) as Json;
    const stats = (row.statistics && typeof row.statistics === "object" ? row.statistics : {}) as Json;
    out.push({
      kind: "video",
      title,
      url,
      snippet: clean(row.description).slice(0, 320),
      // DuckDuckGo nests thumbnails under `images` and view counts under `statistics`.
      thumbnail:
        httpOrNull(images.large) ?? httpOrNull(images.medium) ?? httpOrNull(images.small) ?? httpOrNull(row.image),
      duration: str(row.duration) || null,
      views:
        typeof stats.viewCount === "number"
          ? stats.viewCount
          : typeof row.views === "number"
            ? row.views
            : null,
      published: toIso(row.published),
      source: clean(row.uploader) || clean(row.publisher) || domainOf(url),
    });
  }
  return out;
}

function toDimension(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapImages(rows: Json[]): ImageResult[] {
  const out: ImageResult[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const image = str(row.image);
    if (!isHttpUrl(image) || seen.has(image)) continue;
    seen.add(image);
    const pageUrl = httpOrNull(row.url) ?? image;
    out.push({
      kind: "image",
      title: clean(row.title) || domainOf(pageUrl),
      pageUrl,
      image,
      thumbnail: httpOrNull(row.thumbnail) ?? image,
      width: toDimension(row.width),
      height: toDimension(row.height),
      source: domainOf(pageUrl),
    });
  }
  return out;
}

interface VerticalPage {
  results: SearchResult[];
  next: string | null;
}

type VerticalOutcome =
  | { kind: "ok"; page: VerticalPage }
  /** DuckDuckGo answered with its anti-bot challenge: retrying right away is pointless. */
  | { kind: "blocked" }
  /** Network failure, server error or an unreadable payload (e.g. an expired token). */
  | { kind: "error" };

async function fetchVertical(tab: Vertical, url: string, ua: number): Promise<VerticalOutcome> {
  const res = await ddgFetch(url, ua, "application/json, text/javascript, */*; q=0.01");
  if (!res || res.status >= 500) return { kind: "error" };
  let data: { challenge?: unknown; results?: unknown; next?: unknown } | null = null;
  try {
    data = JSON.parse(res.text);
  } catch {
    /* not JSON: handled below */
  }
  const isObject = data !== null && typeof data === "object";
  if (res.status === 403 || res.status === 429 || (isObject && data?.challenge)) return { kind: "blocked" };
  if (res.status !== 200 || !isObject || !Array.isArray(data?.results)) return { kind: "error" };
  const rows = data.results as Json[];
  const results = tab === "news" ? mapNews(rows) : tab === "videos" ? mapVideos(rows) : mapImages(rows);
  return { kind: "ok", page: { results, next: typeof data.next === "string" && data.next ? data.next : null } };
}

/** Openly licensed photos, used only when DuckDuckGo challenges the image endpoint. */
async function commonsPage(query: string, cursor: Cursor | null): Promise<PageResult> {
  const page = cursor?.p ?? 1;
  const offset = cursor ? Number(cursor.n) : 0;
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) return ended(page);
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search" +
    `&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&gsrnamespace=6&gsrlimit=50&gsroffset=${offset}` +
    "&prop=imageinfo&iiprop=url%7Csize%7Cmime&iiurlwidth=500";
  try {
    const res = await fetch(api, {
      headers: { "user-agent": "NexGO/1.0 (search demo)", accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`commons ${res.status}`);
    const data = (await res.json()) as {
      continue?: { gsroffset?: number };
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            index?: number;
            imageinfo?: Array<{
              url?: string;
              thumburl?: string;
              descriptionurl?: string;
              width?: number;
              height?: number;
              mime?: string;
            }>;
          }
        >;
      };
    };
    const rows = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const results: ImageResult[] = [];
    for (const row of rows) {
      const info = row.imageinfo?.[0];
      if (!info?.url || (info.mime && !info.mime.startsWith("image/"))) continue;
      const name = row.title ?? "";
      results.push({
        kind: "image",
        title: name.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "") || "Wikimedia Commons image",
        pageUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(name)}`,
        image: info.url,
        thumbnail: info.thumburl || info.url,
        width: toDimension(info.width),
        height: toDimension(info.height),
        source: "commons.wikimedia.org",
      });
    }
    const nextOffset = data.continue?.gsroffset;
    return {
      results,
      related: [],
      page,
      next:
        typeof nextOffset === "number" && results.length > 0
          ? encodeCursor({ k: "c", p: page + 1, u: 0, n: String(nextOffset) })
          : null,
      degraded: false,
      fallback: results.length > 0 ? "commons" : null,
    };
  } catch {
    return failed(page, cursor);
  }
}

async function verticalPage(tab: Vertical, query: string, cursor: Cursor | null): Promise<PageResult> {
  const region = regionFor(query);

  if (cursor) {
    if (cursor.k === "c") return tab === "images" ? commonsPage(query, cursor) : ended(cursor.p);
    const base = cursor.k === "j" ? pinnedUrl(cursor.n, DDG, `/${ENDPOINT[tab]}`) : null;
    if (!base || !cursor.v) return ended(cursor.p);

    let vqd = cursor.v;
    let url = withVqd(base, vqd);
    for (let attempt = 0; attempt < 3; attempt++) {
      const outcome = await fetchVertical(tab, url, cursor.u);
      if (outcome.kind === "ok") {
        const { page } = outcome;
        return {
          results: page.results,
          related: [],
          page: cursor.p,
          next: page.next ? encodeCursor({ k: "j", p: cursor.p + 1, u: cursor.u, n: page.next, v: vqd }) : null,
          degraded: false,
          fallback: null,
        };
      }
      // Challenged: report it at once; the visitor can retry this same page later.
      if (outcome.kind === "blocked") break;
      if (attempt === 1) {
        // The token may simply have expired on a long scroll session: mint a new one.
        const boot = await bootstrap(query, region, true);
        if (boot) {
          vqd = boot.vqd;
          url = withVqd(base, vqd, true);
        }
      }
      await sleep(500 + attempt * 600);
    }
    if (tab === "images") return commonsPage(query, { k: "c", p: cursor.p, u: 0, n: String((cursor.p - 1) * 50) });
    return ended(cursor.p);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const boot = await bootstrap(query, region, attempt > 0);
    if (boot) {
      const outcome = await fetchVertical(tab, firstVerticalUrl(tab, query, region, boot.vqd), boot.ua);
      if (outcome.kind === "ok") {
        const { page } = outcome;
        return {
          results: page.results,
          related: [],
          page: 1,
          next: page.next ? encodeCursor({ k: "j", p: 2, u: boot.ua, n: page.next, v: boot.vqd }) : null,
          degraded: false,
          fallback: null,
        };
      }
      if (outcome.kind === "blocked") break;
    }
    await sleep(450 + attempt * 500);
  }

  if (tab === "images") return commonsPage(query, null);
  return ended(1);
}

/* ------------------------------------------------------------------- public */

/** Fetches exactly one DuckDuckGo page for the tab, untruncated. */
export function searchPage(tab: SearchTab, query: string, cursor: Cursor | null): Promise<PageResult> {
  return tab === "all" ? webPage(query, cursor) : verticalPage(tab, query, cursor);
}

export async function instantAnswer(query: string): Promise<InstantAnswer | null> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1&skip_disambig=1&t=nexgo`,
      {
        headers: { "user-agent": USER_AGENTS[0], accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Json;
    const text = clean(data.AbstractText) || clean(data.Answer) || clean(data.Definition);
    if (!text) return null;
    // The API returns site-relative image paths such as "/i/abc123.png".
    const rawImage = str(data.Image);
    const image = rawImage ? (rawImage.startsWith("/") ? `${DDG}${rawImage}` : httpOrNull(rawImage)) : null;
    return {
      heading: str(data.Heading) || null,
      text,
      url: httpOrNull(data.AbstractURL) ?? httpOrNull(data.DefinitionURL),
      image,
      label: str(data.AbstractSource) || str(data.DefinitionSource) || "Instant answer",
    };
  } catch {
    return null;
  }
}
