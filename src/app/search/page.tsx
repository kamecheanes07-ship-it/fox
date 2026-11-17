import Link from "next/link";
import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import SearchResults from "@/components/SearchResults";
import SearchTabs from "@/components/SearchTabs";
import { ThemeToggle } from "@/components/ThemeProvider";
import { normalizeTab } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function readQuery(value: string | string[] | undefined): string {
  return first(value).replace(/\s+/g, " ").trim().slice(0, 200);
}

export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const q = readQuery((await searchParams).q);
  return { title: q ? `${q} — Fox Search` : "Search" };
}

export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const q = readQuery(sp.q);
  const tab = normalizeTab(first(sp.tab));

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900 dark:bg-[#14161a] dark:text-[#e8eaed]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f6f7f9]/95 backdrop-blur dark:border-[#262932] dark:bg-[#14161a]/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2.5 px-4 pt-3.5 pb-2 sm:flex-nowrap sm:gap-6 sm:px-6">
          <Logo size="md" href="/" className="shrink-0" />
          <SearchBar
            compact
            initial={q}
            tab={tab}
            className="order-last sm:order-none sm:max-w-[650px] sm:flex-1"
          />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard/saved"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#2e3240] dark:bg-[#1e2128] dark:text-[#e2e5ec] dark:hover:bg-[#282c36] sm:inline-flex"
            >
              <Icon name="bookmark" className="h-4 w-4 text-brand-500" />
              <span>Saved</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#2e3240] dark:bg-[#1e2128] dark:text-[#e2e5ec] dark:hover:bg-[#282c36]"
            >
              <Icon name="grid" className="h-4 w-4 text-brand-500" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
        {q && (
          <div className="mx-auto max-w-7xl px-4 sm:pl-[154px] sm:pr-6">
            <SearchTabs q={q} active={tab} />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:pl-[154px] sm:pr-6">
        {q ? (
          <SearchResults key={`${tab}:${q}`} q={q} tab={tab} />
        ) : (
          <EmptyState
            icon="search"
            title="What are you looking for?"
            description="Type a query above — results come live from DuckDuckGo across web, images, news and videos."
          />
        )}
      </main>

      <footer className="border-t border-slate-200/70 py-5 text-center text-xs text-slate-400 dark:border-[#23262f] dark:text-[#7f8694]">
        Fox Search · results powered by DuckDuckGo
      </footer>
    </div>
  );
}
