import type { Metadata } from "next";
import HistoryTable from "@/components/dashboard/HistoryTable";
import { listHistory } from "@/lib/storage";

export const metadata: Metadata = { title: "Search history" };
export const dynamic = "force-dynamic";

export default async function SearchesPage() {
  const items = await listHistory(300);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Search history</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#9ca3af]">
          Every search you run on Fox is recorded here — re-run or clean it up anytime.
        </p>
      </div>
      <HistoryTable initial={items} />
    </div>
  );
}
