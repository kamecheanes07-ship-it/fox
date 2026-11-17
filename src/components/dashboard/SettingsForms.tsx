"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

export default function SettingsForms({ storageMode }: { storageMode: string }) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const clearHistory = async () => {
    if (clearing) return;
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setClearing(true);
    const res = await api("/api/history", { method: "DELETE" });
    setClearing(false);
    setConfirmClear(false);
    if (!res.ok) {
      toast(res.error ?? "Could not clear search history.", "error");
      return;
    }
    toast("Search history cleared");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262a34] dark:bg-[#1c1f26] sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Appearance</h2>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-[#9ca3af]">
          Choose between Dark Mode and Light Mode. Your preference is saved in your browser.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
              theme === "dark"
                ? "border-brand-500 bg-brand-500/15 text-brand-500"
                : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-[#2e3240] dark:text-[#d1d5db] dark:hover:bg-[#252934]",
            )}
          >
            <Icon name="moon" className="h-4 w-4" /> Dark Mode
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
              theme === "light"
                ? "border-brand-500 bg-brand-500/15 text-brand-600"
                : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-[#2e3240] dark:text-[#d1d5db] dark:hover:bg-[#252934]",
            )}
          >
            <Icon name="sun" className="h-4 w-4" /> Light Mode
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262a34] dark:bg-[#1c1f26] sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Search Engine &amp; Storage</h2>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-[#9ca3af]">
          Fox works directly with no account or login required.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-[#2a2e39] dark:bg-[#14161a]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#7f8694]">
              Storage backend
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{storageMode}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-[#2a2e39] dark:bg-[#14161a]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#7f8694]">
              Authentication
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Disabled (Open access)</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-500/30 dark:bg-[#1c1f26] sm:p-6">
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Clear search history</h2>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-[#9ca3af]">
          Remove all recorded search queries from the workspace. Saved items and collections are kept.
        </p>
        <button
          type="button"
          onClick={clearHistory}
          disabled={clearing}
          className={cn(
            "mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50",
            confirmClear
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/15",
          )}
        >
          <Icon name="trash" className="h-4 w-4" />
          {confirmClear ? "Click again to confirm clearing all history" : "Clear all search history"}
        </button>
      </section>
    </div>
  );
}
