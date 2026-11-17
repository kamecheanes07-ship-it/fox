"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import { ThemeToggle } from "@/components/ThemeProvider";
import type { NewsResult, SearchResponse } from "@/lib/types";
import { cn, faviconOf, timeAgo } from "@/lib/utils";

const SHORTCUTS_PAGE_1 = [
  { label: "Google Ge…", query: "Google Gemini AI", url: "https://gemini.google.com" },
  { label: "GitHub", query: "github trending repositories", url: "https://github.com" },
  { label: "Outlook", query: "outlook mail", url: "https://outlook.live.com" },
  { label: "YouTube", query: "youtube trending videos", url: "https://www.youtube.com" },
  { label: "Instagram", query: "instagram", url: "https://www.instagram.com" },
  { label: "deepseek.c…", query: "DeepSeek AI R1", url: "https://www.deepseek.com" },
  { label: "Claude", query: "Claude AI Anthropic", url: "https://claude.ai" },
];

const SHORTCUTS_PAGE_2 = [
  { label: "Reddit", query: "reddit technology discussions", url: "https://www.reddit.com" },
  { label: "Wikipedia", query: "wikipedia featured article", url: "https://www.wikipedia.org" },
  { label: "Next.js", query: "nextjs 16 documentation", url: "https://nextjs.org" },
  { label: "HackerNews", query: "hacker news top stories", url: "https://news.ycombinator.com" },
  { label: "MDN Docs", query: "mdn web docs javascript", url: "https://developer.mozilla.org" },
  { label: "StackOver…", query: "stack overflow", url: "https://stackoverflow.com" },
  { label: "Reuters", query: "reuters world news", url: "https://www.reuters.com" },
];

interface FeedChannel {
  id: string;
  label: string;
  category: string;
  query: string;
}

const CHANNELS: FeedChannel[] = [
  { id: "for-you", label: "For You", category: "Top Stories", query: "artificial intelligence technology world news" },
  { id: "following", label: "Following", category: "Film & Tech", query: "entertainment technology science news" },
  { id: "tech", label: "Technology", category: "Technology", query: "latest technology AI software news" },
  { id: "science", label: "Science", category: "Science & Space", query: "space exploration science discoveries news" },
  { id: "world", label: "World", category: "World News", query: "global economy world headlines today" },
  { id: "gaming", label: "Gaming", category: "Gaming & Culture", query: "pc gaming console releases news" },
];

const INITIAL_NEWS: NewsResult[] = [
  {
    kind: "news",
    title: "Next-Generation AI Assistants Bring Privacy-First Screen Intelligence to Every Workflow",
    url: "https://www.theverge.com/tech",
    snippet:
      "On-device and ephemeral models let developers and teams analyze complex workflows without storing personal data in the cloud.",
    source: "TechRadar",
    date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Aurora_Borealis_-_Iceland_-_2_Nov._2013.jpg/500px-Aurora_Borealis_-_Iceland_-_2_Nov._2013.jpg",
  },
  {
    kind: "news",
    title: "Open-Source Web Frameworks Set New Benchmarks for Edge Rendering and Instant Search",
    url: "https://nextjs.org/blog",
    snippet:
      "Modern full-stack applications combine streaming server rendering with multi-page search indexing.",
    source: "Ars Technica",
    date: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    image: "https://i.ytimg.com/vi/I1V9YWqRIeI/hqdefault.jpg",
  },
  {
    kind: "news",
    title: "How Authentic Weeknight Ramen & Sourdough Techniques Took Over Home Kitchens",
    url: "https://www.kingarthurbaking.com/recipes/extra-tangy-sourdough-bread-recipe",
    snippet: "Simple fermentation and rich umami broths make restaurant-grade meals achievable in 20 minutes.",
    source: "Allrecipes",
    date: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    image: "https://i.ytimg.com/vi/cnvomlflES4/hqdefault.jpg",
  },
  {
    kind: "news",
    title: "Global Markets Rally as Clean Energy and Semiconductor Investments Hit Record Highs",
    url: "https://www.reuters.com/markets/",
    snippet: "Analysts point to surging demand for efficient compute and battery storage across Europe, Asia and the US.",
    source: "Reuters",
    date: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Pembroke_Welsh_Corgi_Puppy.jpg/500px-Pembroke_Welsh_Corgi_Puppy.jpg",
  },
];

export default function HomeExperience({
  recent,
  suggestions,
  totalSearches,
}: {
  recent: string[];
  suggestions: string[];
  totalSearches: number;
}) {
  const [shortcutPage, setShortcutPage] = useState<0 | 1>(0);
  const [activeChannelId, setActiveChannelId] = useState<string>("following");
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [news, setNews] = useState<NewsResult[]>(INITIAL_NEWS);
  const [loadingNews, setLoadingNews] = useState(false);

  const activeChannel = CHANNELS.find((c) => c.id === activeChannelId) ?? CHANNELS[1];
  const shortcuts = shortcutPage === 0 ? SHORTCUTS_PAGE_1 : SHORTCUTS_PAGE_2;

  const fetchChannelNews = useCallback(async (channel: FeedChannel) => {
    setLoadingNews(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(channel.query)}&tab=news`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as SearchResponse;
      const items = (data.results ?? []).filter((r): r is NewsResult => r.kind === "news");
      if (items.length > 0) {
        setNews(items.slice(0, 14));
      }
    } catch {
      /* keep fallback articles if offline */
    } finally {
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    void fetchChannelNews(activeChannel);
  }, [activeChannel, fetchChannelNews]);

  const featuredStory = news[0] ?? INITIAL_NEWS[0];
  const trackersBlocked = 31_931 + totalSearches * 14;
  const bandwidthSavedMb = (693.9 + totalSearches * 0.8).toFixed(1);
  const minutesSaved = 27 + Math.floor(totalSearches / 3);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f4f6fa] text-slate-900 dark:bg-[#0e1015] dark:text-[#e8eaed]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden opacity-40 dark:opacity-90"
      >
        <div className="absolute -top-28 left-1/4 h-[420px] w-[420px] rounded-full bg-brand-600/20 blur-[130px]" />
        <div className="absolute top-1/4 right-10 h-[460px] w-[460px] rounded-full bg-indigo-600/25 blur-[140px]" />
        <div className="absolute bottom-0 left-10 h-[360px] w-[360px] rounded-full bg-blue-600/15 blur-[130px]" />
      </div>

      {/* Top Navigation (No Login / Signup) */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo size="md" href="/" />
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/dashboard/saved"
            className="hidden items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/85 px-3.5 py-2 text-xs font-semibold text-slate-700 backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-[#1c1f26]/85 dark:text-[#d1d5db] dark:hover:bg-[#262a34] sm:inline-flex"
          >
            <Icon name="bookmark" className="h-3.5 w-3.5 text-brand-500" />
            <span>Saved</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-[#1c1f26]/90 dark:text-[#e8eaed] dark:hover:bg-[#262a34]"
          >
            <Icon name="grid" className="h-4 w-4 text-brand-500" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/dashboard/settings"
            aria-label="Settings"
            title="Settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-[#1c1f26]/80 dark:text-[#b0b6c2] dark:hover:bg-[#262a34] dark:hover:text-white"
          >
            <Icon name="settings" className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pt-2 pb-12 sm:px-8">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {shortcuts.map((s) => (
            <Link
              key={s.label}
              href={`/search?q=${encodeURIComponent(s.query)}&tab=all`}
              className="group flex w-[72px] flex-col items-center gap-1.5 text-center sm:w-20"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-md transition group-hover:-translate-y-0.5 group-hover:border-brand-500/50 group-hover:shadow-md dark:border-white/10 dark:bg-[#262934]/80 dark:group-hover:bg-[#303443]">
                <img
                  src={faviconOf(s.url)}
                  alt=""
                  className="h-7 w-7 rounded-md object-contain"
                  loading="lazy"
                />
              </span>
              <span className="w-full truncate text-[11px] font-medium text-slate-700 dark:text-[#d1d5db]">
                {s.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-1.5" role="tablist" aria-label="Shortcut pages">
          <button
            type="button"
            onClick={() => setShortcutPage(0)}
            aria-label="Shortcuts page 1"
            className={cn(
              "h-2 rounded-full transition-all",
              shortcutPage === 0
                ? "w-4 bg-slate-800 dark:bg-white"
                : "w-2 bg-slate-400/50 hover:bg-slate-500 dark:bg-white/35",
            )}
          />
          <button
            type="button"
            onClick={() => setShortcutPage(1)}
            aria-label="Shortcuts page 2"
            className={cn(
              "h-2 rounded-full transition-all",
              shortcutPage === 1
                ? "w-4 bg-slate-800 dark:bg-white"
                : "w-2 bg-slate-400/50 hover:bg-slate-500 dark:bg-white/35",
            )}
          />
        </div>

        <h1 className="mt-6 flex justify-center">
          <Logo size="lg" href="/" />
        </h1>

        <SearchBar autoFocus className="mt-5 max-w-xl" />

        <div className="mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {recent.slice(0, 3).map((q) => (
            <Link
              key={`rec-${q}`}
              href={`/search?q=${encodeURIComponent(q)}&tab=all`}
              dir="auto"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs text-slate-700 backdrop-blur transition hover:border-brand-500/50 hover:text-brand-600 dark:border-white/10 dark:bg-[#1c1f26]/80 dark:text-[#c4cad6] dark:hover:border-brand-500/50 dark:hover:text-white"
            >
              <Icon name="history" className="h-3 w-3 text-brand-500" />
              {q}
            </Link>
          ))}
          {suggestions.map((q) => (
            <Link
              key={q}
              href={`/search?q=${encodeURIComponent(q)}&tab=all`}
              dir="auto"
              className="rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs text-slate-600 backdrop-blur transition hover:border-brand-500/50 hover:text-brand-600 dark:border-white/10 dark:bg-[#1c1f26]/70 dark:text-[#b0b6c2] dark:hover:border-white/25 dark:hover:text-white"
            >
              {q}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid w-full gap-4 lg:grid-cols-3">
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#14161d]/85">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8b92a1]">
              STATS
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xl font-bold tracking-tight text-[#ff6b2b] sm:text-2xl">
                  {trackersBlocked.toLocaleString("en-US")}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9ca3af]">
                  Trackers &amp; ads blocked
                </p>
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-indigo-600 dark:text-[#7c9cff] sm:text-2xl">
                  {bandwidthSavedMb} <span className="text-sm font-semibold">MB</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9ca3af]">Bandwidth saved</p>
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  {minutesSaved} <span className="text-sm font-semibold">Minutes</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9ca3af]">Time saved</p>
              </div>
            </div>
          </div>

          <a
            href={featuredStory.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:border-brand-500/40 dark:border-white/10 dark:bg-[#14161d]/85"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8b92a1]">
                NEWS
              </p>
              <span className="text-[11px] text-brand-500 group-hover:underline">Scroll for feed ↓</span>
            </div>
            <div className="mt-3 flex items-center gap-3.5">
              {featuredStory.image && (
                <img
                  src={featuredStory.image}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-14 w-24 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-slate-500 dark:text-[#9ca3af]">
                  {featuredStory.source} • {activeChannel.category}
                </p>
                <p
                  dir="auto"
                  className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400"
                >
                  {featuredStory.title}
                </p>
              </div>
            </div>
          </a>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#14161d]/85">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                <Icon name="shield" className="h-3.5 w-3.5 text-brand-500" /> FOX SHIELD
              </span>
              <span className="text-[11px] text-slate-400 dark:text-[#7f8694]">No account required</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <ul className="space-y-1 text-[11px] text-slate-600 dark:text-[#b0b6c2]">
                <li className="flex items-center gap-1.5">
                  <Icon name="check" className="h-3.5 w-3.5 text-brand-500" /> Extra privacy &amp; security online
                </li>
                <li className="flex items-center gap-1.5">
                  <Icon name="check" className="h-3.5 w-3.5 text-brand-500" /> Multi-page results without profiling
                </li>
                <li className="flex items-center gap-1.5">
                  <Icon name="check" className="h-3.5 w-3.5 text-brand-500" /> Save &amp; organize collections
                </li>
              </ul>
              <Link
                href="/dashboard"
                className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-[#272b36] dark:hover:bg-[#323746]"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        <section id="discover-feed" className="mt-14 w-full">
          <div className="grid gap-6 lg:grid-cols-[240px_1fr_80px]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#171920]/90">
                <div className="space-y-1">
                  {CHANNELS.slice(0, 2).map((ch) => {
                    const active = ch.id === activeChannelId;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setActiveChannelId(ch.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition",
                          active
                            ? "bg-slate-900 text-white dark:bg-[#2a2e39] dark:text-white"
                            : "text-slate-600 hover:bg-slate-100 dark:text-[#c4cad6] dark:hover:bg-white/5",
                        )}
                      >
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 border-t border-slate-200/70 pt-2 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setChannelsOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-[#e2e5ec] dark:hover:bg-white/5"
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon
                        name="chevron-down"
                        className={cn("h-3.5 w-3.5 transition-transform", !channelsOpen && "-rotate-90")}
                      />
                      Channels
                    </span>
                    <Icon name="plus" className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                  {channelsOpen && (
                    <div className="mt-1 space-y-0.5 pl-3">
                      {CHANNELS.slice(2).map((ch) => {
                        const active = ch.id === activeChannelId;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => setActiveChannelId(ch.id)}
                            className={cn(
                              "flex w-full items-center rounded-lg px-3 py-1.5 text-left text-xs transition",
                              active
                                ? "bg-brand-500/15 font-semibold text-brand-600 dark:text-brand-400"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#9ca3af] dark:hover:bg-white/5 dark:hover:text-white",
                            )}
                          >
                            {ch.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-2 space-y-1 border-t border-slate-200/70 pt-2 dark:border-white/10">
                  <Link
                    href="/search?q=reuters%20associated%20press%20bbc&tab=news"
                    className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-[#b0b6c2] dark:hover:bg-white/5"
                  >
                    <span>Top Sources</span>
                  </Link>
                  <Link
                    href="/search?q=technology%20science%20publishers&tab=news"
                    className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-[#b0b6c2] dark:hover:bg-white/5"
                  >
                    <span>Publishers</span>
                    <Icon name="plus" className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            </aside>

            <div className="mx-auto w-full max-w-2xl space-y-4">
              {news.map((item, idx) => {
                const isHero = idx % 3 === 0 && Boolean(item.image);
                return isHero ? (
                  <article
                    key={item.url}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-xl transition hover:border-slate-300 dark:border-white/10 dark:bg-[#171920]/90 dark:hover:border-white/20"
                  >
                    {item.image && (
                      <a href={item.url} target="_blank" rel="noreferrer noopener" className="block overflow-hidden rounded-xl">
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          className="aspect-[16/9] w-full object-cover transition duration-300 hover:scale-[1.02]"
                        />
                      </a>
                    )}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-[#9ca3af]">
                      <span>
                        {item.source} • {activeChannel.category}
                        {item.date ? ` • ${timeAgo(item.date)}` : ""}
                      </span>
                      <Link
                        href={`/search?q=${encodeURIComponent(item.title)}&tab=news`}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        title="More on this story"
                      >
                        •••
                      </Link>
                    </div>
                    <h3 dir="auto" className="mt-1.5 text-base font-bold leading-snug text-slate-900 dark:text-white">
                      <a href={item.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                        {item.title}
                      </a>
                    </h3>
                  </article>
                ) : (
                  <article
                    key={item.url}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-xl transition hover:border-slate-300 dark:border-white/10 dark:bg-[#171920]/90 dark:hover:border-white/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 dark:text-[#9ca3af]">
                        {item.source} • {activeChannel.category}
                        {item.date ? ` • ${timeAgo(item.date)}` : ""}
                      </p>
                      <h3 dir="auto" className="mt-1 text-sm font-bold leading-snug text-slate-900 dark:text-white">
                        <a href={item.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                          {item.title}
                        </a>
                      </h3>
                    </div>
                    {item.image && (
                      <a href={item.url} target="_blank" rel="noreferrer noopener" className="shrink-0">
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          className="h-16 w-24 rounded-xl object-cover ring-1 ring-white/10"
                        />
                      </a>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="hidden lg:flex lg:items-end lg:justify-end">
              <div className="sticky bottom-6 flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 p-1.5 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#1c1f26]/90">
                <Link
                  href="/dashboard/settings"
                  title="Workspace settings"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b0b6c2] dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Icon name="settings" className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => void fetchChannelNews(activeChannel)}
                  disabled={loadingNews}
                  title="Refresh feed"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-[#b0b6c2] dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Icon name="refresh" className={cn("h-4 w-4", loadingNews && "animate-spin")} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200/70 px-4 py-5 text-center text-xs text-slate-400 dark:border-white/10 dark:text-[#7f8694]">
        Fox · Private Search Engine powered by DuckDuckGo
      </footer>
    </div>
  );
}
