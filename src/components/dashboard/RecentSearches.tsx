"use client";

import Link from "next/link";
import { useState } from "react";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import TimeAgo from "@/components/TimeAgo";
import { TabBadge } from "@/components/dashboard/OverviewWidgets";
import { useToast } from "@/components/Toast";
import { api, restoreAt } from "@/lib/client";
import type { HistoryDTO } from "@/lib/types";

export default function RecentSearches({ initial }: { initial: HistoryDTO[] }) {
  const [items, setItems] = useState(initial);
  const { toast } = useToast();

  const remove = async (item: HistoryDTO) => {
    const index = items.findIndex((i) => i.id === item.id);
    setItems((cur) => cur.filter((i) => i.id !== item.id));
    const res = await api(`/api/history/${item.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      setItems((cur) => restoreAt(cur, item, index));
      toast(res.error ?? "Could not delete this entry.", "error");
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon="history"
        title="No searches yet"
        description="Your search history will appear here. Every query you run on Fox is saved privately to your account."
        className="py-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
        >
          <Icon name="search" className="h-4 w-4" /> Start searching
        </Link>
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-[#262a34]">
      {items.map((item) => (
        <li key={item.id} className="group flex items-center gap-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-[#252832] dark:text-[#8b92a1]">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <Link
            href={`/search?q=${encodeURIComponent(item.query)}&tab=${item.tab}`}
            dir="auto"
            className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 hover:text-brand-600 hover:underline dark:text-[#e2e5ec] dark:hover:text-brand-400"
            title={item.query}
          >
            {item.query}
          </Link>
          <TabBadge tab={item.tab} />
          <TimeAgo date={item.createdAt} className="hidden shrink-0 text-xs text-slate-400 dark:text-[#7f8694] sm:inline" />
          <button
            type="button"
            onClick={() => remove(item)}
            className="reveal-on-hover rounded-full p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
            aria-label={`Delete search "${item.query}"`}
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
