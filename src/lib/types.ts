export type SearchTab = "all" | "news" | "images" | "videos";

export const SEARCH_TABS: SearchTab[] = ["all", "news", "images", "videos"];

export function normalizeTab(value: string | null | undefined): SearchTab {
  if (value === "photos" || value === "images") return "images";
  if (value === "video" || value === "videos") return "videos";
  if (value === "news") return "news";
  return "all";
}

export interface WebResult {
  kind: "web";
  title: string;
  url: string;
  snippet: string;
  displayUrl: string;
  date: string | null;
}

export interface NewsResult {
  kind: "news";
  title: string;
  url: string;
  snippet: string;
  source: string;
  date: string | null;
  image: string | null;
}

export interface ImageResult {
  kind: "image";
  title: string;
  pageUrl: string;
  image: string;
  thumbnail: string;
  width: number | null;
  height: number | null;
  source: string;
}

export interface VideoResult {
  kind: "video";
  title: string;
  url: string;
  snippet: string;
  thumbnail: string | null;
  duration: string | null;
  views: number | null;
  published: string | null;
  source: string;
}

export type SearchResult = WebResult | NewsResult | ImageResult | VideoResult;

/** Identity used to de-duplicate results across DuckDuckGo pages. */
export function resultKey(r: SearchResult): string {
  return r.kind === "image" ? r.image : r.url;
}

/** URL persisted when a result is saved (photos are saved by their source page). */
export function resultUrl(r: SearchResult): string {
  return r.kind === "image" ? r.pageUrl : r.url;
}

export interface InstantAnswer {
  heading: string | null;
  text: string;
  url: string | null;
  image: string | null;
  label: string;
}

export interface RelatedItem {
  /** Label shown on the chip. */
  text: string;
  /** Query to run inside NexGO when the chip is clicked. */
  query: string;
}

export interface SearchResponse {
  q: string;
  tab: SearchTab;
  /** 1-based DuckDuckGo page number this payload came from. */
  page: number;
  tookMs: number;
  /** DuckDuckGo refused or failed this page; the same cursor can be retried. */
  degraded: boolean;
  fallback: string | null;
  /** With fallback "relaxed": the simplified query these results are actually for. */
  shownFor: string | null;
  results: SearchResult[];
  /** Inline video previews attached to page 1 of the "All" tab. */
  videos?: VideoResult[];
  answer: InstantAnswer | null;
  related: RelatedItem[];
  /** Opaque cursor for the following page, or null when DuckDuckGo has no more. */
  nextCursor: string | null;
  savedMap: Record<string, string>;
}

export interface SavePayload {
  kind: string;
  title: string;
  url: string;
  snippet?: string;
  thumbnail?: string;
  source?: string;
  query?: string;
  collectionId?: string | null;
  note?: string;
}

export interface SavedItemDTO {
  id: string;
  kind: string;
  title: string;
  url: string;
  snippet: string;
  thumbnail: string;
  source: string;
  query: string;
  note: string;
  collectionId: string | null;
  collectionName: string | null;
  collectionColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDTO {
  id: string;
  name: string;
  description: string;
  color: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryDTO {
  id: string;
  query: string;
  tab: string;
  resultCount: number;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
