"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/client";
import type { SavePayload, SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const PENDING = "__pending__";

export function savePayloadOf(result: SearchResult, query: string): SavePayload {
  switch (result.kind) {
    case "image":
      return {
        kind: "image",
        title: result.title,
        url: result.pageUrl,
        snippet: `${result.source}${result.width && result.height ? ` · ${result.width}×${result.height}` : ""}`,
        thumbnail: result.thumbnail || result.image,
        source: result.source,
        query,
      };
    case "video":
      return {
        kind: "video",
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        thumbnail: result.thumbnail ?? "",
        source: result.source,
        query,
      };
    case "news":
      return {
        kind: "news",
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        thumbnail: result.image ?? "",
        source: result.source,
        query,
      };
    default:
      return {
        kind: "web",
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        thumbnail: "",
        source: result.displayUrl,
        query,
      };
  }
}

export default function SaveButton({
  result,
  query,
  savedId,
  variant = "inline",
  className,
}: {
  result: SearchResult;
  query: string;
  savedId: string | null;
  variant?: "inline" | "overlay";
  className?: string;
}) {
  const { toast } = useToast();
  const [id, setId] = useState<string | null>(savedId);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (pending) return;
    const previous = id;
    setId(previous ? null : PENDING);
    setPending(true);

    let error: string | null = null;
    let settled = false;
    let nextId: string | null = null;
    let message = "";

    if (previous) {
      const res = await api(`/api/saved/${previous}`, { method: "DELETE" });
      error = res.error;
      if (res.ok || res.status === 404) {
        settled = true;
        message = "Removed from saved results";
      }
    } else {
      const res = await api<{ item: { id: string }; alreadySaved: boolean }>("/api/saved", {
        method: "POST",
        body: savePayloadOf(result, query),
      });
      error = res.error;
      if (res.ok && res.data?.item?.id) {
        settled = true;
        nextId = res.data.item.id;
        message = res.data.alreadySaved ? "Already in your saved results" : "Saved — find it in your dashboard";
      }
    }
    setPending(false);

    if (settled) {
      setId(nextId);
      toast(message);
      return;
    }
    setId(previous);
    toast(error ?? "Couldn't update saved result. Please try again.", "error");
  };

  const filled = id !== null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={filled ? "Saved — click to remove" : "Save result"}
      aria-label={filled ? "Remove from saved results" : "Save result"}
      aria-pressed={filled}
      className={cn(
        "shrink-0 rounded-full p-2 transition disabled:opacity-60",
        variant === "overlay" &&
          "bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white dark:bg-[#1c1f26]/90 dark:hover:bg-[#252934]",
        filled ? "text-brand-500" : "text-slate-400 hover:text-brand-500",
        variant === "inline" && (filled ? "hover:bg-brand-500/10" : "hover:bg-slate-100 dark:hover:bg-[#23262f]"),
        !filled && "reveal-on-hover",
        className,
      )}
    >
      <Icon name={filled ? "bookmark-fill" : "bookmark"} className={cn("h-5 w-5", pending && "animate-pulse")} />
    </button>
  );
}
