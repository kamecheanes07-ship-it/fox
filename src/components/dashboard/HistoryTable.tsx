"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import TimeAgo from "@/components/TimeAgo";
import { TabBadge } from "@/components/dashboard/OverviewWidgets";
import { useToast } from "@/components/Toast";
import { api, restoreAt } from "@/lib/client";
import type { HistoryDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "any", label: "Everything" },
  { key: "all", label: "Web" },
  { key: "news", label: "News" },
  { key: "images", label: "Images" },
  { key: "videos", label: "Videos" },
];

export default function HistoryTable({ initial }: { initial: HistoryDTO[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState("any");
  const [text, setText] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    [],
  );

  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return items.filter(
      (i) => (filter === "any" || i.tab === filter) && (!needle || i.query.toLowerCase().includes(needle)),
    );
  }, [items, filter, text]);

  const remove = async (item: HistoryDTO) => {
    const index = items.findIndex((i) => i.id === item.id);
    setItems((cur) => cur.filter((i) => i.id !== item.id));
    const res = await api(`/api/history/${item.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      setItems((cur) => restoreAt(cur, item, index));
      toast(res.error ?? "Could not delete this entry.", "error");
    }
  };

  const clearAll = async () => {
    if (clearing) return;
    if (!confirmClear) {
      setConfirmClear(true);
      confirmTimer.current = setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmClear(false);
    setClearing(true);
    const snapshot = items;
    setItems([]);
    const res = await api("/api/history", { method: "DELETE" });
    setClearing(false);
    if (!res.ok) {
      setItems(snapshot);
      toast(res.error ?? "Could not clear history.", "error");
      return;
    }
    toast("Search history cleared");
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1 dark:border-[#2a2e39] dark:bg-[#1c1f26]">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[13px] font-medium transition",
                filter === f.key
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-[#b0b6c2] dark:hover:bg-[#262a34]",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-[#2a2e39] dark:bg-[#1c1f26] sm:max-w-xs">
          <Icon name="search" className="h-4 w-4 text-slate-400" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Filter history…"
            aria-label="Filter history"
            dir="auto"
            className="w-full min-w-0 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-[#e8eaed] dark:placeholder:text-[#7f8694]"
          />
        </label>
        <span className="text-xs text-slate-400 dark:text-[#7f8694]">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </span>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            disabled={clearing}
            className={cn(
              "ml-auto rounded-full px-3.5 py-1.5 text-[13px] font-medium transition disabled:opacity-50",
              confirmClear
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 dark:border-[#2a2e39] dark:bg-[#1c1f26] dark:text-[#b0b6c2] dark:hover:bg-red-500/15 dark:hover:text-red-400",
            )}
          >
            {confirmClear ? "Click again to delete everything" : "Clear all history"}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-[#262a34] dark:bg-[#1c1f26]">
          <EmptyState
            icon="history"
            title={items.length === 0 ? "No search history yet" : "Nothing matches these filters"}
            description={
              items.length === 0
                ? "Run a search from the home page and it will show up here automatically."
                : "Try a different tab or clear the text filter."
            }
          >
            {items.length === 0 ? (
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
              >
                <Icon name="search" className="h-4 w-4" /> Search now
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFilter("any");
                  setText("");
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#2a2e39] dark:bg-[#23262f] dark:text-[#e2e5ec]"
              >
                Reset filters
              </button>
            )}
          </EmptyState>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#262a34] dark:bg-[#1c1f26]">
          <table className="w-full table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400 dark:border-[#262a34] dark:bg-[#16181f] dark:text-[#7f8694]">
                <th className="px-4 py-3 font-medium">Query</th>
                <th className="hidden w-24 px-4 py-3 font-medium sm:table-cell">Tab</th>
                <th className="hidden w-24 px-4 py-3 font-medium md:table-cell">Results</th>
                <th className="hidden w-32 px-4 py-3 font-medium lg:table-cell">When</th>
                <th className="w-24 px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#262a34]">
              {filtered.map((item) => {
                const href = `/search?q=${encodeURIComponent(item.query)}&tab=${item.tab}`;
                return (
                  <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-[#22262f]">
                    <td className="px-4 py-3">
                      <Link
                        href={href}
                        dir="auto"
                        className="block truncate font-medium text-slate-800 hover:text-brand-600 hover:underline dark:text-[#e2e5ec] dark:hover:text-brand-400"
                        title={item.query}
                      >
                        {item.query}
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 dark:text-[#7f8694] lg:hidden">
                        <span className="sm:hidden">
                          <TabBadge tab={item.tab} />
                        </span>
                        <TimeAgo date={item.createdAt} />
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <TabBadge tab={item.tab} />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 dark:text-[#9ca3af] md:table-cell">
                      {item.resultCount}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 dark:text-[#9ca3af] lg:table-cell">
                      <TimeAgo date={item.createdAt} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={href}
                          className="rounded-full p-1.5 text-slate-400 transition hover:bg-brand-500/15 hover:text-brand-500"
                          aria-label={`Search "${item.query}" again`}
                          title="Search again"
                        >
                          <Icon name="refresh" className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          className="rounded-full p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                          aria-label={`Delete "${item.query}" from history`}
                          title="Delete"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
