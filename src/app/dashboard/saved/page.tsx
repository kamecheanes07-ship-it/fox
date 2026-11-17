import type { Metadata } from "next";
import SavedManager from "@/components/dashboard/SavedManager";
import { listCollections, listSaved } from "@/lib/storage";

export const metadata: Metadata = { title: "Saved results" };
export const dynamic = "force-dynamic";

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const [items, cols] = await Promise.all([listSaved(), listCollections()]);

  const requested = typeof sp.collection === "string" ? sp.collection : "";
  const initialCollection = requested === "none" || cols.some((c) => c.id === requested) ? requested : "all";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Saved results</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#9ca3af]">
          Everything you bookmarked while searching — edit notes, file into collections, or remove.
        </p>
      </div>
      <SavedManager
        key={initialCollection}
        initialItems={items}
        collections={cols}
        initialCollection={initialCollection}
      />
    </div>
  );
}
