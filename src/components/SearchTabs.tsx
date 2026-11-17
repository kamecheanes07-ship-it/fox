import Link from "next/link";
import Icon from "@/components/Icon";
import type { SearchTab } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: Array<{ key: SearchTab; label: string; ariaLabel?: string }> = [
  { key: "all", label: "All" },
  { key: "images", label: "Images", ariaLabel: "Images and Photos" },
  { key: "news", label: "News" },
  { key: "videos", label: "Videos" },
];

export default function SearchTabs({ q, active }: { q: string; active: SearchTab }) {
  const qs = `q=${encodeURIComponent(q)}`;
  return (
    <div className="flex items-center justify-between gap-4">
      <nav
        className="no-scrollbar -mx-2 flex items-center gap-1 overflow-x-auto px-2 sm:gap-2"
        aria-label="Search categories"
      >
        <Link
          href={`/search?${qs}&tab=all#ask`}
          className="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900 dark:text-[#9aa0ac] dark:hover:text-white"
        >
          Ask
        </Link>
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={`/search?${qs}&tab=${t.key}`}
              aria-current={isActive ? "page" : undefined}
              aria-label={t.ariaLabel ?? t.label}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-3 py-2.5 text-[13px] transition",
                isActive
                  ? "font-semibold text-slate-950 dark:text-white"
                  : "font-medium text-slate-500 hover:text-slate-900 dark:text-[#9aa0ac] dark:hover:text-white",
              )}
            >
              {t.label}
              {t.key === "images" && <span className="sr-only"> (Photos)</span>}
              {isActive && (
                <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-brand-500 dark:bg-white" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="hidden items-center gap-2 text-xs text-slate-400 dark:text-[#7f8694] sm:flex">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-[#9aa0ac]">
          <Icon name="sliders" className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
