"use client";

import { useSyncExternalStore } from "react";
import { formatDate, timeAgo } from "@/lib/utils";

// One shared minute tick keeps every relative label on the page fresh.
function subscribe(onTick: () => void): () => void {
  const id = setInterval(onTick, 60_000);
  return () => clearInterval(id);
}

/**
 * Relative time ("5 min ago") that is safe to server-render: the server and the
 * hydration pass both emit the same absolute UTC date, and the browser swaps in
 * the relative label afterwards. That avoids hydration mismatches caused by the
 * visitor's clock or time zone differing from the server's.
 */
export default function TimeAgo({ date, className }: { date: string; className?: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => timeAgo(date),
    () => formatDate(date),
  );
  return (
    <time dateTime={date} className={className}>
      {label}
    </time>
  );
}
