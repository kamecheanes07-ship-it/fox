"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import { ThemeToggle } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "grid" },
  { href: "/dashboard/searches", label: "Search history", icon: "history" },
  { href: "/dashboard/saved", label: "Saved results", icon: "bookmark" },
  { href: "/dashboard/collections", label: "Collections", icon: "folder" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-[#262932] dark:bg-[#181a20]">
      <div className="px-5 pb-4 pt-5">
        <Logo size="md" href="/" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Dashboard">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b0b6c2] dark:hover:bg-[#22262f] dark:hover:text-white",
              )}
            >
              <Icon
                name={item.icon}
                className={cn("h-[18px] w-[18px]", active ? "text-brand-500" : "text-slate-400 dark:text-[#7f8694]")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-4 dark:border-[#262932]">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl bg-slate-100/80 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200/70 dark:bg-[#22262f] dark:text-[#d1d5db] dark:hover:bg-[#2a2f3a]"
        >
          <Icon name="search" className="h-4 w-4 text-brand-500" />
          <span>Back to Fox Search</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900 dark:bg-[#14161a] dark:text-[#e8eaed]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-pop shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f6f7f9]/90 backdrop-blur dark:border-[#262932] dark:bg-[#14161a]/90">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-[#b0b6c2] dark:hover:bg-[#23262f] lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>
            <Logo size="sm" href="/" className="hidden shrink-0 sm:inline-flex lg:hidden" />
            <SearchBar compact className="mx-auto max-w-xl" />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

        <footer className="border-t border-slate-200/70 py-6 text-center text-xs text-slate-400 dark:border-[#23262f] dark:text-[#7f8694]">
          Fox · results powered by DuckDuckGo
        </footer>
      </div>
    </div>
  );
}
