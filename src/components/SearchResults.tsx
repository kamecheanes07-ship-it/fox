"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import SaveButton from "@/components/SaveButton";
import {
  resultKey,
  resultUrl,
  type ImageResult,
  type NewsResult,
  type RelatedItem,
  type SearchResponse,
  type SearchResult,
  type SearchTab,
  type VideoResult,
  type WebResult,
} from "@/lib/types";
import { clamp, cn, domainOf, faviconOf, formatCompact, formatDate, timeAgo, truncate } from "@/lib/utils";

const AUTO_SCROLL_PAGES = 60;
const LOAD_ALL_PAGES = 50;
const WEB_DEPTH_PAGES = 12;

const TAB_NAME: Record<SearchTab, string> = { all: "", news: "news ", images: "photo ", videos: "video " };

interface Row {
  r: SearchResult;
  page: number;
}

function takeFresh(results: SearchResult[], seen: Set<string>): SearchResult[] {
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = resultKey(r);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function siteLabelOf(url: string): string {
  const host = domainOf(url);
  const first = host.split(".")[0] || host;
  const known: Record<string, string> = {
    reddit: "Reddit",
    github: "GitHub",
    youtube: "YouTube",
    stackoverflow: "Stack Overflow",
    wikipedia: "Wikipedia",
    medium: "Medium",
    dev: "DEV Community",
    linkedin: "LinkedIn",
    nytimes: "The New York Times",
    reuters: "Reuters",
    bbc: "BBC",
  };
  if (known[first.toLowerCase()]) return known[first.toLowerCase()];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function breadcrumbOf(url: string, fallback: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const parts = u.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 4)
      .map((seg) => decodeURIComponent(seg).replace(/[-_]/g, " "));
    return parts.length > 0 ? `${host} › ${parts.join(" › ")}` : host;
  } catch {
    return fallback.replace(/\//g, " › ");
  }
}

function isForumDomain(url: string): boolean {
  const d = domainOf(url).toLowerCase();
  return (
    d.includes("reddit.com") ||
    d.includes("stackoverflow.com") ||
    d.includes("stackexchange.com") ||
    d.includes("quora.com") ||
    d.includes("news.ycombinator.com") ||
    d.includes("dev.to") ||
    d.includes("github.com")
  );
}

/* ------------------------------------------------------------ result items */

function Favicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80 dark:bg-[#252832] dark:ring-white/10">
      {failed ? (
        <Icon name="globe" className="h-4 w-4 text-slate-400 dark:text-[#8b92a1]" />
      ) : (
        <img
          src={faviconOf(url)}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] rounded-sm"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function WebResultItem({ r, q, savedId }: { r: WebResult; q: string; savedId: string | null }) {
  const isForum = isForumDomain(r.url);
  return (
    <article className="group animate-fade-up py-4">
      <div className="flex items-center gap-2.5">
        <Favicon url={r.url} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-slate-800 dark:text-[#e2e5ec]">
            {siteLabelOf(r.url)}
          </p>
          <p className="truncate text-[12px] leading-tight text-slate-500 dark:text-[#8b92a1]" dir="ltr">
            {breadcrumbOf(r.url, r.displayUrl)}
          </p>
        </div>
        <SaveButton result={r} query={q} savedId={savedId} />
      </div>

      <h3 dir="auto" className="mt-2 text-[19px] font-normal leading-snug [overflow-wrap:anywhere]">
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[#1a0dab] visited:text-[#681da8] hover:underline dark:text-[#8ab4f8] dark:visited:text-[#c58af9]"
        >
          {r.title}
        </a>
      </h3>

      {(r.snippet || r.date) && (
        <p dir="auto" className="mt-1.5 text-[14px] leading-[1.6] text-slate-600 dark:text-[#bdc1c6] line-clamp-3">
          {r.date && <span className="text-slate-500 dark:text-[#8b92a1]">{formatDate(r.date)} - </span>}
          {r.snippet}
        </p>
      )}

      {isForum && r.snippet && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer noopener"
            className="block rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-slate-300 dark:border-[#2a2e39] dark:bg-[#1c1f26] dark:hover:border-[#3a3f4e]"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8b92a1]">
              <span className="font-semibold text-slate-700 dark:text-[#d1d5db]">Top answer · 1 of 2</span>
              <span>↑ 12</span>
            </div>
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-[#9ca3af]">
              {r.snippet}
            </p>
          </a>
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer noopener"
            className="block rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-slate-300 dark:border-[#2a2e39] dark:bg-[#1c1f26] dark:hover:border-[#3a3f4e]"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8b92a1]">
              <span className="font-medium">2 of 2</span>
              <span>↑ 5</span>
            </div>
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-[#9ca3af]">
              Community discussion and follow-up recommendations on {siteLabelOf(r.url)} for “{truncate(q, 38)}”.
            </p>
          </a>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------ Top Overview + Side Videos */

function TopOverviewSection({
  q,
  answer,
  webResults,
  sideVideos,
}: {
  q: string;
  answer: SearchResponse["answer"];
  webResults: WebResult[];
  sideVideos: VideoResult[];
}) {
  const [expanded, setExpanded] = useState(false);

  const summaryText = useMemo(() => {
    if (answer?.text) return answer.text;
    const snippets = webResults
      .slice(0, 3)
      .map((r) => r.snippet.trim())
      .filter(Boolean);
    return snippets.join(" ");
  }, [answer, webResults]);

  if (!summaryText && sideVideos.length === 0) return null;

  const extraResults = webResults.slice(0, 4);

  return (
    <section
      id="ask"
      className="mb-6 border-b border-slate-200/80 pb-6 dark:border-[#262932]"
      aria-label="Instant overview"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {answer?.heading && (
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              <Icon name="sparkles" className="h-3.5 w-3.5" /> {answer.label} · {answer.heading}
            </div>
          )}
          <p
            dir="auto"
            className={cn(
              "text-[15px] leading-[1.72] text-slate-700 dark:text-[#d4d8e1]",
              !expanded && "line-clamp-5",
            )}
          >
            {webResults[0] ? (
              <>
                Based on top sources including{" "}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {siteLabelOf(webResults[0].url)}
                </strong>
                {webResults[1] ? (
                  <>
                    {" "}
                    and{" "}
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      {siteLabelOf(webResults[1].url)}
                    </strong>
                  </>
                ) : null}
                :{" "}
              </>
            ) : null}
            {summaryText}
          </p>

          {expanded && extraResults.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-slate-200/70 pt-3 text-xs text-slate-600 dark:border-[#262932] dark:text-[#9ca3af]">
              {extraResults.map((item) => (
                <li key={item.url} className="flex items-start gap-2">
                  <Icon name="link" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-brand-500 hover:underline"
                  >
                    <strong className="font-semibold text-slate-800 dark:text-[#e2e5ec]">
                      {siteLabelOf(item.url)}:
                    </strong>{" "}
                    {truncate(item.title, 75)}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200/90 bg-white/70 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-[#2e3240] dark:bg-transparent dark:text-[#d1d5db] dark:hover:bg-[#1e2129]"
          >
            <span>{expanded ? "Show less" : "More"}</span>
            <Icon
              name="chevron-down"
              className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
            />
          </button>
        </div>

        {sideVideos.length > 0 && (
          <div className="space-y-2.5">
            {sideVideos.slice(0, 2).map((v) => (
              <HorizontalVideoCard key={v.url} video={v} compact />
            ))}
          </div>
        )}
      </div>
      <span className="sr-only">Overview for {q}</span>
    </section>
  );
}

/* ------------------------------------------- Inline Horizontal Video Card */

function HorizontalVideoCard({ video, compact = false }: { video: VideoResult; compact?: boolean }) {
  const [thumbOk, setThumbOk] = useState(true);
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 transition hover:border-slate-300 dark:border-[#262a34] dark:bg-[#1c1f26] dark:hover:border-[#363b48]"
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl bg-slate-900",
          compact ? "h-[72px] w-32" : "h-20 w-36 sm:h-[84px] sm:w-40",
        )}
      >
        {video.thumbnail && thumbOk ? (
          <img
            src={video.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setThumbOk(false)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            <Icon name="video" className="h-6 w-6" />
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {video.duration}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#9ca3af]">
          <span className="inline-flex h-3.5 w-4 items-center justify-center rounded-[3px] bg-red-600 text-white">
            <Icon name="play" className="h-2.5 w-2.5" />
          </span>
          <span className="truncate">{video.source || "YouTube"}</span>
        </div>
        <p
          dir="auto"
          className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-slate-900 group-hover:text-brand-600 dark:text-[#e8eaed] dark:group-hover:text-[#8ab4f8]"
        >
          {video.title}
        </p>
        <p className="mt-1 truncate text-[11px] text-slate-400 dark:text-[#7f8694]">
          {video.published ? formatDate(video.published) : "Video"}
          {video.views != null ? ` · ${formatCompact(video.views)}` : ""}
        </p>
      </div>
    </a>
  );
}

/* ------------------------------------------------- Discussions Section */

function DiscussionsSection({ webResults }: { webResults: WebResult[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
    const forums = webResults.filter((r) => isForumDomain(r.url));
    if (forums.length >= 2) return forums.slice(0, 5);
    return webResults.slice(1, 5);
  }, [webResults]);

  if (items.length === 0) return null;
  const visible = showAll ? items : items.slice(0, 3);

  return (
    <section className="my-6" aria-label="Discussions">
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5 text-sm font-semibold text-slate-800 dark:border-[#262932] dark:text-[#e2e5ec]">
        <Icon name="message" className="h-4 w-4 text-slate-400 dark:text-[#8b92a1]" />
        <h2>Discussions</h2>
      </div>
      <div className="divide-y divide-slate-200/60 dark:divide-[#23262f]">
        {visible.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.url} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    dir="auto"
                    className="text-[14px] font-medium text-slate-800 hover:underline dark:text-[#e2e5ec]"
                  >
                    {item.title}
                  </a>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[#8b92a1]">
                    <img src={faviconOf(item.url)} alt="" className="h-3.5 w-3.5 rounded-sm" loading="lazy" />
                    <span>{domainOf(item.url)}</span>
                    <span>·</span>
                    <span>💬 {(idx + 1) * 4 + 1}</span>
                    {item.date && (
                      <>
                        <span>·</span>
                        <span>{formatDate(item.date)}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-label="Toggle discussion preview"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-[#323642] dark:text-[#9ca3af] dark:hover:bg-[#23262f]"
                >
                  <Icon
                    name="chevron-down"
                    className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                  />
                </button>
              </div>
              {isOpen && item.snippet && (
                <p
                  dir="auto"
                  className="mt-2 rounded-xl bg-slate-100/80 p-3 text-xs leading-relaxed text-slate-600 dark:bg-[#1c1f26] dark:text-[#b0b6c2]"
                >
                  {item.snippet}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200/90 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-[#2e3240] dark:text-[#d1d5db] dark:hover:bg-[#1e2129]"
        >
          <span>{showAll ? "Show less" : "Show more"}</span>
          <Icon name="chevron-down" className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-180")} />
        </button>
      )}
    </section>
  );
}

/* ---------------------------------------------- People Also Ask Section */

function PeopleAlsoAskSection({
  q,
  related,
  webResults,
}: {
  q: string;
  related: RelatedItem[];
  webResults: WebResult[];
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const questions = useMemo(() => {
    const base = related.slice(0, 4).map((r, i) => ({
      question: /\?$/.test(r.query) ? r.query : `What should you know about ${r.query}?`,
      query: r.query,
      answer:
        webResults[i]?.snippet ||
        `Explore top web results, guides, and comparisons for “${r.query}” on Fox Search.`,
      sourceUrl: webResults[i]?.url ?? null,
    }));
    if (base.length > 0) return base;
    return [
      {
        question: `What are the best resources for ${q}?`,
        query: `best ${q} guide`,
        answer: webResults[0]?.snippet ?? `Compare top results and community recommendations for ${q}.`,
        sourceUrl: webResults[0]?.url ?? null,
      },
      {
        question: `How does ${q} work in practice?`,
        query: `how ${q} works`,
        answer: webResults[1]?.snippet ?? `Step-by-step explanations and practical examples for ${q}.`,
        sourceUrl: webResults[1]?.url ?? null,
      },
    ];
  }, [q, related, webResults]);

  if (questions.length === 0) return null;

  return (
    <section className="my-6" aria-label="People also ask">
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5 text-sm font-semibold text-slate-800 dark:border-[#262932] dark:text-[#e2e5ec]">
        <Icon name="message" className="h-4 w-4 text-slate-400 dark:text-[#8b92a1]" />
        <h2>People also ask</h2>
      </div>
      <div className="divide-y divide-slate-200/60 dark:divide-[#23262f]">
        {questions.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.question} className="py-3">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span dir="auto" className="text-[14px] font-medium text-slate-800 dark:text-[#e2e5ec]">
                  {item.question}
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-[#323642] dark:text-[#9ca3af]">
                  <Icon
                    name="chevron-down"
                    className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                  />
                </span>
              </button>
              {isOpen && (
                <div className="mt-2.5 rounded-xl bg-slate-100/80 p-3.5 text-xs leading-relaxed text-slate-600 dark:bg-[#1c1f26] dark:text-[#b0b6c2]">
                  <p dir="auto">{item.answer}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Link
                      href={`/search?q=${encodeURIComponent(item.query)}&tab=all`}
                      className="font-semibold text-brand-600 hover:underline dark:text-[#8ab4f8]"
                    >
                      Search for “{item.query}” →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------- Inline Videos 2x3 Section */

function InlineVideosSection({ q, videos }: { q: string; videos: VideoResult[] }) {
  if (videos.length === 0) return null;
  return (
    <section className="my-7" aria-label="Videos">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-[#e2e5ec]">
        <Icon name="video" className="h-4 w-4 text-slate-400 dark:text-[#8b92a1]" />
        <h2>Videos</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {videos.slice(0, 6).map((v) => (
          <HorizontalVideoCard key={v.url} video={v} />
        ))}
      </div>
      <Link
        href={`/search?q=${encodeURIComponent(q)}&tab=videos`}
        className="mt-3 flex w-full items-center justify-center rounded-full border border-slate-200/90 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-[#2e3240] dark:text-[#d1d5db] dark:hover:bg-[#1e2129]"
      >
        View all
      </Link>
    </section>
  );
}

/* ------------------------------------------- News / Videos / Images Tabs */

function NewsResultItem({ r, q, savedId }: { r: NewsResult; q: string; savedId: string | null }) {
  const [imageOk, setImageOk] = useState(true);
  return (
    <article className="group flex animate-fade-up gap-4 border-b border-slate-200/70 py-4 last:border-0 dark:border-[#23262f]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate-500 dark:text-[#8b92a1]">
          <span className="font-semibold text-slate-700 dark:text-[#d1d5db]">{r.source}</span>
          {r.date && (
            <>
              <span aria-hidden>•</span>
              <time dateTime={r.date}>{timeAgo(r.date)}</time>
            </>
          )}
        </div>
        <div className="mt-1 flex items-start justify-between gap-2">
          <h3 dir="auto" className="min-w-0 flex-1 text-lg font-medium leading-snug [overflow-wrap:anywhere]">
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[#1a0dab] visited:text-[#681da8] hover:underline dark:text-[#8ab4f8] dark:visited:text-[#c58af9]"
            >
              {r.title}
            </a>
          </h3>
          <SaveButton result={r} query={q} savedId={savedId} className="-mt-1" />
        </div>
        {r.snippet && (
          <p dir="auto" className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-[#bdc1c6] line-clamp-2">
            {r.snippet}
          </p>
        )}
      </div>
      {r.image && imageOk && (
        <a href={r.url} target="_blank" rel="noreferrer noopener" tabIndex={-1} aria-hidden className="shrink-0 self-start">
          <img
            src={r.image}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageOk(false)}
            className="h-16 w-24 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10 sm:h-20 sm:w-28"
          />
        </a>
      )}
    </article>
  );
}

function VideoResultCard({ r, q, savedId }: { r: VideoResult; q: string; savedId: string | null }) {
  const [thumbOk, setThumbOk] = useState(true);
  const meta = [
    r.source,
    r.views != null ? `${formatCompact(r.views)} views` : null,
    r.published ? timeAgo(r.published) : null,
  ].filter(Boolean);
  return (
    <article className="group animate-fade-up rounded-2xl border border-slate-200/80 bg-white p-2.5 transition hover:border-slate-300 dark:border-[#262a34] dark:bg-[#1c1f26] dark:hover:border-[#363b48]">
      <div className="relative">
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Play video: ${r.title}`}
          className="relative block overflow-hidden rounded-xl bg-slate-900"
        >
          {r.thumbnail && thumbOk ? (
            <img
              src={r.thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setThumbOk(false)}
              className="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center text-slate-500">
              <Icon name="video" className="h-10 w-10" />
            </div>
          )}
          <span className="absolute inset-0 m-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition group-hover:scale-110 group-hover:bg-black/75">
            <Icon name="play" className="ml-0.5 h-5 w-5" />
          </span>
          {r.duration && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
              {r.duration}
            </span>
          )}
        </a>
        <SaveButton variant="overlay" result={r} query={q} savedId={savedId} className="absolute right-1.5 top-1.5" />
      </div>
      <h3 dir="auto" className="mt-2.5 px-1 text-[14px] font-medium leading-snug">
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer noopener"
          className="line-clamp-2 text-slate-900 hover:text-brand-600 hover:underline dark:text-[#e8eaed] dark:hover:text-[#8ab4f8]"
        >
          {r.title}
        </a>
      </h3>
      <p className="mt-1 truncate px-1 text-[12px] text-slate-500 dark:text-[#8b92a1]">{meta.join(" • ")}</p>
    </article>
  );
}

function ImageTile({ r, q, savedId }: { r: ImageResult; q: string; savedId: string | null }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  const ratio = clamp(r.width && r.height ? r.width / r.height : 4 / 3, 0.65, 2.2);
  return (
    <figure
      className="group relative min-w-0 animate-fade-up sm:grow-[var(--r)] sm:basis-[calc(var(--r)*11rem)]"
      style={{ "--r": ratio } as CSSProperties}
    >
      <a
        href={r.pageUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="block overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-[#1e2129] dark:ring-white/10"
      >
        <img
          src={r.thumbnail}
          alt={r.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:aspect-auto sm:h-44"
        />
      </a>
      <figcaption className="mt-1 px-0.5">
        <p className="truncate text-[11px] text-slate-500 dark:text-[#8b92a1]">
          {r.source}
          {r.width && r.height ? ` · ${r.width}×${r.height}` : ""}
        </p>
        <p dir="auto" className="truncate text-[13px] leading-snug text-slate-800 dark:text-[#e2e5ec]" title={r.title}>
          {r.title}
        </p>
      </figcaption>
      <SaveButton variant="overlay" result={r} query={q} savedId={savedId} className="absolute right-1.5 top-1.5" />
    </figure>
  );
}

const IMAGE_GRID =
  "grid grid-cols-2 gap-x-2 gap-y-3 sm:flex sm:flex-wrap sm:after:grow-[999] sm:after:content-['']";
const VIDEO_GRID = "grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function ResultSkeletons({ tab, count }: { tab: SearchTab; count?: number }) {
  if (tab === "images") {
    return (
      <div className={IMAGE_GRID} aria-hidden>
        {Array.from({ length: count ?? 15 }).map((_, i) => {
          const ratio = [1.5, 1, 1.78, 0.8, 1.33][i % 5];
          return (
            <div
              key={i}
              className="min-w-0 sm:grow-[var(--r)] sm:basis-[calc(var(--r)*11rem)]"
              style={{ "--r": ratio } as CSSProperties}
            >
              <div className="skeleton aspect-[4/3] w-full rounded-xl sm:aspect-auto sm:h-44" />
              <div className="skeleton mt-2 h-3 w-2/3" />
            </div>
          );
        })}
      </div>
    );
  }
  if (tab === "videos") {
    return (
      <div className={VIDEO_GRID} aria-hidden>
        {Array.from({ length: count ?? 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-video w-full rounded-xl" />
            <div className="skeleton mt-3 h-4 w-4/5" />
            <div className="skeleton mt-2 h-3 w-2/5" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden>
      {Array.from({ length: count ?? 6 }).map((_, i) => (
        <div key={i} className="border-b border-slate-200/60 py-4 last:border-0 dark:border-[#23262f]">
          <div className="skeleton h-3 w-40" />
          <div className="skeleton mt-3 h-5 w-3/4" />
          <div className="skeleton mt-2 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}

function PageDivider({ page }: { page: number }) {
  return (
    <div
      role="separator"
      className="flex items-center gap-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#7f8694]"
    >
      <span className="h-px flex-1 bg-slate-200 dark:bg-[#262932]" />
      Page {page}
      <span className="h-px flex-1 bg-slate-200 dark:bg-[#262932]" />
    </div>
  );
}

function RelatedSearches({ items }: { items: RelatedItem[] }) {
  return (
    <section
      className="my-5 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-[#262a34] dark:bg-[#1c1f26]"
      aria-label="Related searches"
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-[#e8eaed]">Related searches</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.query}
            href={`/search?q=${encodeURIComponent(item.query)}&tab=all`}
            dir="auto"
            className="flex items-center gap-2 rounded-full bg-slate-50 px-3.5 py-2 text-sm text-slate-700 ring-1 ring-slate-200/80 transition hover:bg-brand-50 hover:text-brand-700 dark:bg-[#242832] dark:text-[#d1d5db] dark:ring-white/10 dark:hover:bg-[#2d323f] dark:hover:text-white"
          >
            <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400 dark:text-[#8b92a1]" />
            <span className="truncate">{item.query}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 1400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed bottom-5 left-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-lg transition hover:bg-slate-50 dark:border-[#2e3240] dark:bg-[#1e2128] dark:text-slate-200"
    >
      <Icon name="arrow-up" />
    </button>
  );
}

const primaryButton =
  "inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500";
const secondaryButton =
  "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#2e3240] dark:bg-[#1c1f26] dark:text-[#d1d5db] dark:hover:bg-[#252934]";

export default function SearchResults({ q, tab }: { q: string; tab: SearchTab }) {
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [meta, setMeta] = useState<SearchResponse | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [savedMap, setSavedMap] = useState<Record<string, string>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<"upstream" | "network" | null>(null);
  const [loadAll, setLoadAll] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const seen = useRef(new Set<string>());
  const busy = useRef(false);
  const emptyStreak = useRef(0);
  const loadAllBudget = useRef(0);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const moreRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    seen.current = new Set();
    emptyStreak.current = 0;
    busy.current = false;
    fetch(`/api/search?q=${encodeURIComponent(q)}&tab=${tab}`, { cache: "no-store", signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as SearchResponse;
      })
      .then((data) => {
        const fresh = takeFresh(data.results ?? [], seen.current);
        setMeta(data);
        setRows(fresh.map((r) => ({ r, page: data.page ?? 1 })));
        setSavedMap(data.savedMap ?? {});
        setNextCursor(fresh.length > 0 ? (data.nextCursor ?? null) : null);
        setPagesLoaded(fresh.length > 0 ? 1 : 0);
        setStatus("ready");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus("error");
      });
    return () => {
      ctrl.abort();
      moreRequest.current?.abort();
    };
  }, [q, tab, attempt]);

  const retry = () => {
    setStatus("loading");
    setMeta(null);
    setRows([]);
    setNextCursor(null);
    setPagesLoaded(0);
    setMoreError(null);
    setLoadAll(false);
    setLoadingMore(false);
    setAttempt((n) => n + 1);
  };

  const loadMore = useCallback(async () => {
    if (busy.current || !nextCursor) return;
    busy.current = true;
    setLoadingMore(true);
    setMoreError(null);
    const ctrl = new AbortController();
    moreRequest.current = ctrl;
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&tab=${tab}&cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store", signal: ctrl.signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SearchResponse;
      if (data.degraded && (data.results ?? []).length === 0) {
        setMoreError("upstream");
        setLoadAll(false);
        return;
      }
      const fresh = takeFresh(data.results ?? [], seen.current);
      emptyStreak.current = fresh.length === 0 ? emptyStreak.current + 1 : 0;
      if (fresh.length > 0) {
        setRows((prev) => [...prev, ...fresh.map((r) => ({ r, page: data.page }))]);
        setSavedMap((prev) => ({ ...prev, ...(data.savedMap ?? {}) }));
        setPagesLoaded((n) => n + 1);
      }
      setNextCursor(emptyStreak.current >= 2 ? null : (data.nextCursor ?? null));
    } catch {
      if (!ctrl.signal.aborted) {
        setMoreError("network");
        setLoadAll(false);
      }
    } finally {
      busy.current = false;
      if (!ctrl.signal.aborted) setLoadingMore(false);
    }
  }, [q, tab, nextCursor]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || status !== "ready" || !nextCursor || moreError || loadAll || pagesLoaded >= AUTO_SCROLL_PAGES) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: tab === "all" || tab === "news" ? "500px 0px" : "900px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, tab, nextCursor, moreError, loadAll, pagesLoaded, loadMore]);

  useEffect(() => {
    if (!loadAll) return;
    if (!nextCursor || moreError || loadAllBudget.current <= 0) {
      setLoadAll(false);
      return;
    }
    if (loadingMore) return;
    const id = setTimeout(
      () => {
        loadAllBudget.current -= 1;
        void loadMore();
      },
      tab === "all" ? 700 : 350,
    );
    return () => clearTimeout(id);
  }, [loadAll, tab, nextCursor, moreError, loadingMore, loadMore]);

  const startLoadAll = () => {
    loadAllBudget.current = LOAD_ALL_PAGES;
    setLoadAll(true);
  };

  if (status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading results">
        <div className="skeleton mb-5 h-4 w-64" />
        <ResultSkeletons tab={tab} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        icon="alert"
        title="Something went wrong"
        description={`We couldn't reach the search service for “${truncate(q, 60)}”. Check your connection and try again.`}
      >
        <button type="button" onClick={retry} className={primaryButton}>
          <Icon name="refresh" className="h-4 w-4" /> Retry search
        </button>
      </EmptyState>
    );
  }

  const total = rows.length;
  const seconds = ((meta?.tookMs ?? 0) / 1000).toFixed(2);
  const firstPage = rows[0]?.page ?? 1;
  const related = meta?.related ?? [];
  const answer = meta?.answer ?? null;
  const inlineVideos = meta?.videos ?? [];
  const working = loadingMore || loadAll;
  const atDepthLimit = tab === "all" && moreError === "upstream" && pagesLoaded >= WEB_DEPTH_PAGES;
  const sourceName =
    meta?.fallback === "wikipedia" ? "Wikipedia" : meta?.fallback === "commons" ? "Wikimedia Commons" : "DuckDuckGo";
  const savedIdOf = (r: SearchResult) => savedMap[resultUrl(r)] ?? null;
  const firstPageWebResults = tab === "all" ? (rows.filter((x) => x.page === 1).map((x) => x.r) as WebResult[]) : [];

  return (
    <div>
      {tab === "all" && total > 0 && (
        <TopOverviewSection
          q={q}
          answer={answer}
          webResults={firstPageWebResults}
          sideVideos={inlineVideos.slice(0, 2)}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-slate-500 dark:text-[#8b92a1]">
        {total > 0 ? (
          <span aria-live="polite">
            <strong className="font-semibold text-slate-700 dark:text-[#d1d5db]">{total.toLocaleString("en-US")}</strong>{" "}
            {total === 1 ? "result" : "results"} loaded ·{" "}
            <strong className="font-semibold text-slate-700 dark:text-[#d1d5db]">{pagesLoaded}</strong>{" "}
            {pagesLoaded === 1 ? "page" : "pages"} from {sourceName}
            {nextCursor && !atDepthLimit ? " · more available" : ""} ({seconds}s)
          </span>
        ) : (
          <span>No results ({seconds}s)</span>
        )}
        {meta?.fallback === "html" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-[#23262f] dark:text-[#b0b6c2]">
            Basic results only — retry in a moment for all pages
          </span>
        )}
      </div>

      {meta?.fallback === "relaxed" && meta.shownFor && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            DuckDuckGo doesn&apos;t run quoted or operator searches for servers, so these are results for{" "}
            <Link
              href={`/search?q=${encodeURIComponent(meta.shownFor)}&tab=all`}
              dir="auto"
              className="font-semibold underline"
            >
              {meta.shownFor}
            </Link>{" "}
            — the same words without quotes or operators.
          </p>
        </div>
      )}

      {(meta?.fallback === "wikipedia" || meta?.fallback === "commons") && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Icon name="alert" className="h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1 basis-60">
            {meta.fallback === "wikipedia"
              ? "DuckDuckGo is limiting requests from this server right now, so these are Wikipedia matches for the moment. News, Images and Videos are usually unaffected."
              : "DuckDuckGo's photo search is limiting this server right now, so these photos come from Wikimedia Commons for the moment."}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-amber-700"
          >
            <Icon name="refresh" className="h-4 w-4" /> Retry DuckDuckGo
          </button>
        </div>
      )}

      {total === 0 ? (
        <EmptyState
          icon={meta?.degraded ? "alert" : "search"}
          title={meta?.degraded ? "DuckDuckGo didn't answer" : `No ${TAB_NAME[tab]}results for “${truncate(q, 60)}”`}
          description={
            meta?.degraded
              ? "DuckDuckGo is limiting requests from this server right now. Give it a few seconds and retry."
              : "Try different or more general keywords, check your spelling, or switch tabs."
          }
        >
          <button type="button" onClick={retry} className={primaryButton}>
            <Icon name="refresh" className="h-4 w-4" /> Retry
          </button>
          {tab !== "all" && (
            <Link href={`/search?q=${encodeURIComponent(q)}&tab=all`} className={secondaryButton}>
              <Icon name="search" className="h-4 w-4" /> Search all
            </Link>
          )}
        </EmptyState>
      ) : (
        <>
          {(tab === "all" || tab === "news") && (
            <div className="max-w-3xl">
              {rows.map((row, i) => {
                const previous = rows[i - 1];
                const following = rows[i + 1];
                const endsFirstPage = row.page === firstPage && (!following || following.page !== firstPage);
                return (
                  <Fragment key={resultKey(row.r)}>
                    {previous && previous.page !== row.page && <PageDivider page={row.page} />}
                    {tab === "all" ? (
                      <WebResultItem r={row.r as WebResult} q={q} savedId={savedIdOf(row.r)} />
                    ) : (
                      <NewsResultItem r={row.r as NewsResult} q={q} savedId={savedIdOf(row.r)} />
                    )}
                    {tab === "all" && i === 1 && firstPageWebResults.length >= 3 && (
                      <>
                        <DiscussionsSection webResults={firstPageWebResults} />
                        <PeopleAlsoAskSection q={q} related={related} webResults={firstPageWebResults} />
                      </>
                    )}
                    {tab === "all" && i === 3 && inlineVideos.length > 0 && (
                      <InlineVideosSection q={q} videos={inlineVideos} />
                    )}
                    {tab === "all" && endsFirstPage && related.length > 0 && <RelatedSearches items={related} />}
                  </Fragment>
                );
              })}
            </div>
          )}
          {tab === "videos" && (
            <div className={VIDEO_GRID}>
              {rows.map((row) => (
                <VideoResultCard key={resultKey(row.r)} r={row.r as VideoResult} q={q} savedId={savedIdOf(row.r)} />
              ))}
            </div>
          )}
          {tab === "images" && (
            <div className={IMAGE_GRID}>
              {rows.map((row) => (
                <ImageTile key={resultKey(row.r)} r={row.r as ImageResult} q={q} savedId={savedIdOf(row.r)} />
              ))}
            </div>
          )}

          <div ref={sentinel} aria-hidden className="h-px" />

          {loadingMore && (
            <div className={cn("mt-4 max-w-3xl", (tab === "images" || tab === "videos") && "mt-6 max-w-none")}>
              <ResultSkeletons tab={tab} count={tab === "images" ? 10 : tab === "videos" ? 4 : 3} />
            </div>
          )}

          <div
            className={cn(
              "mt-8 flex flex-col items-center gap-3 pb-4 text-center",
              tab === "all" || tab === "news" ? "max-w-3xl" : "",
            )}
            aria-live="polite"
          >
            {moreError && atDepthLimit && (
              <div className="flex w-full max-w-xl flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 dark:border-[#2a2e39] dark:bg-[#1c1f26] dark:text-[#b0b6c2]">
                <p className="font-medium text-slate-800 dark:text-white">
                  That&apos;s every page DuckDuckGo serves for one web search.
                </p>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-[#8b92a1]">
                  {total.toLocaleString("en-US")} results across {pagesLoaded} pages — DuckDuckGo caps web results at
                  roughly 200 per search. News, Images and Videos have their own pages.
                </p>
                <button type="button" onClick={() => void loadMore()} className={cn(secondaryButton, "mt-1")}>
                  <Icon name="refresh" className="h-4 w-4" /> Try for more anyway
                </button>
              </div>
            )}

            {moreError && !atDepthLimit && (
              <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <p className="flex items-center gap-2 font-medium">
                  <Icon name="alert" className="h-4 w-4 shrink-0" />
                  {moreError === "upstream"
                    ? `Could not fetch additional results for page ${pagesLoaded + 1} right now.`
                    : "Couldn't load the next page. Check your connection and retry."}
                </p>
                <button type="button" onClick={() => void loadMore()} className={primaryButton}>
                  <Icon name="refresh" className="h-4 w-4" /> Retry page {pagesLoaded + 1}
                </button>
              </div>
            )}

            {!moreError && nextCursor && working && (
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500 dark:text-[#9ca3af]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-[#343844] dark:border-t-brand-500" />
                  {loadAll ? "Loading every page" : "Loading"} — page {pagesLoaded + 1} from {sourceName}…
                </span>
                {loadAll && (
                  <button type="button" onClick={() => setLoadAll(false)} className={secondaryButton}>
                    Stop
                  </button>
                )}
              </div>
            )}

            {!moreError && nextCursor && !working && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200/60 dark:text-[#e8eaed] dark:hover:bg-[#23262f]"
                >
                  <span>Next</span>
                  <Icon name="arrow-right" className="h-4 w-4" />
                </button>
                <button type="button" onClick={startLoadAll} className={secondaryButton}>
                  <Icon name="layers" className="h-4 w-4" /> Load all pages
                </button>
              </div>
            )}

            {!nextCursor && !working && (
              <p className="max-w-xl text-xs leading-relaxed text-slate-400 dark:text-[#7f8694]">
                End of results — {total.toLocaleString("en-US")} {total === 1 ? "result" : "results"} across{" "}
                {pagesLoaded} {sourceName} {pagesLoaded === 1 ? "page" : "pages"}.
                {tab === "all" &&
                  sourceName === "DuckDuckGo" &&
                  pagesLoaded >= WEB_DEPTH_PAGES &&
                  " That is everything DuckDuckGo serves for one web search (about 200 results)."}
              </p>
            )}
          </div>
        </>
      )}

      <BackToTop />
    </div>
  );
}
