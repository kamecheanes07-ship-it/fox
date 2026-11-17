"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { FoxMark } from "@/components/Logo";
import type { SearchTab } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SearchBar({
  initial = "",
  tab = "all",
  compact = false,
  autoFocus = false,
  className,
}: {
  initial?: string;
  /** A new query stays on the tab the user is already looking at. */
  tab?: SearchTab;
  compact?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runSearch = (targetTab: SearchTab = tab) => {
    const q = value.replace(/\s+/g, " ").trim();
    if (!q) return;
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(q)}&tab=${targetTab}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(tab);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      className={cn(
        "group flex w-full items-center transition",
        compact
          ? "h-11 rounded-full border border-slate-200/90 bg-white pl-5 pr-1.5 shadow-sm focus-within:border-brand-500/60 focus-within:ring-2 focus-within:ring-brand-500/15 dark:border-[#2e323d] dark:bg-[#23262e] dark:shadow-none dark:focus-within:border-[#454b5c] sm:h-12"
          : "h-13 rounded-2xl border border-slate-200/90 bg-white/95 pl-4 pr-2 shadow-[0_16px_44px_rgba(15,23,42,0.10)] backdrop-blur-xl focus-within:border-brand-500/60 focus-within:shadow-[0_18px_50px_rgba(234,88,12,0.16)] dark:border-white/10 dark:bg-[#1e2028]/90 dark:shadow-[0_20px_55px_rgba(0,0,0,0.6)] sm:h-14",
        className,
      )}
    >
      {!compact && (
        <FoxMark className="mr-3 h-6 w-6 select-none" />
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={compact ? "Search Fox or type a query…" : "Ask anything, find anything..."}
        aria-label="Search query"
        dir="auto"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={200}
        className={cn(
          "w-full min-w-0 flex-1 appearance-none bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-[#e8eaed] dark:placeholder:text-[#7f8694] [&::-webkit-search-cancel-button]:hidden",
          compact ? "text-[15px]" : "text-[15px] sm:text-base",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-[#8b92a1] dark:hover:bg-[#2f333e] dark:hover:text-white"
          aria-label="Clear"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
      {compact ? (
        <div className="ml-1 flex items-center gap-1">
          <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-[#353945]" aria-hidden />
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-[#b0b6c2] dark:hover:bg-[#2f333e] dark:hover:text-white"
            aria-label="Search"
            title="Search"
          >
            <Icon name="search" className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => runSearch("all")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-brand-600 transition hover:bg-brand-50 disabled:opacity-40 dark:bg-[#343844] dark:text-[#c4cad6] dark:hover:bg-[#3f4452] dark:hover:text-white"
            aria-label="Instant Answer Summary"
            title="Ask Fox Summary"
          >
            <Icon name="sparkles" className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!value.trim()}
          className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500 disabled:opacity-40"
          aria-label="Search"
        >
          <Icon name="search" className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
