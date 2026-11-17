/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import Icon from "@/components/Icon";
import TimeAgo from "@/components/TimeAgo";
import RecentSearches from "@/components/dashboard/RecentSearches";
import { SearchChart, StatCard } from "@/components/dashboard/OverviewWidgets";
import { getOverviewStats } from "@/lib/storage";
import { faviconOf } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const { historyCount, savedCount, collectionCount, days, topQueries, recent, recentSaved } =
    await getOverviewStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fox Workspace
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#9ca3af]">
            Private search history, bookmarked results, and organized collections.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          <Icon name="search" className="h-4 w-4" /> New search
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total searches" value={historyCount} icon="history" hint="all time" />
        <StatCard label="Saved results" value={savedCount} icon="bookmark" hint="across all collections" />
        <StatCard label="Collections" value={collectionCount} icon="folder" hint="your folders" />
        <StatCard label="Search engine" value="Fox" icon="sparkles" hint="powered by DuckDuckGo" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SearchChart data={days} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262a34] dark:bg-[#1c1f26] lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Top queries</h2>
          {topQueries.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-[#7f8694]">No queries yet.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {topQueries.map((t) => (
                <Link
                  key={t.query}
                  href={`/search?q=${encodeURIComponent(t.query)}&tab=all`}
                  dir="auto"
                  className="max-w-full truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 transition hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-brand-600 dark:border-[#2e3240] dark:bg-[#23262f] dark:text-[#d1d5db] dark:hover:text-white"
                  title={`${t.count} ${t.count === 1 ? "search" : "searches"}`}
                >
                  {t.query} <span className="text-xs text-slate-400 dark:text-[#8b92a1]">×{t.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262a34] dark:bg-[#1c1f26] lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent searches</h2>
            <Link href="/dashboard/searches" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              View all
            </Link>
          </div>
          <div className="mt-2">
            <RecentSearches initial={recent} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262a34] dark:bg-[#1c1f26] lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recently saved</h2>
            <Link href="/dashboard/saved" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              View all
            </Link>
          </div>
          {recentSaved.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-[#7f8694]">
              Nothing saved yet — bookmark results while searching.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-[#262a34]">
              {recentSaved.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 dark:bg-[#252832] dark:ring-white/10">
                    <img
                      src={item.thumbnail || faviconOf(item.url)}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className={item.thumbnail ? "h-full w-full object-cover" : "h-4 w-4"}
                    />
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    dir="auto"
                    className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 hover:text-brand-600 hover:underline dark:text-[#e2e5ec] dark:hover:text-brand-400"
                    title={item.title}
                  >
                    {item.title}
                  </a>
                  <TimeAgo date={item.createdAt} className="shrink-0 text-xs text-slate-400 dark:text-[#7f8694]" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
