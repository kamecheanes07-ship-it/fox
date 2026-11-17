import type { Metadata } from "next";
import CollectionsManager from "@/components/dashboard/CollectionsManager";
import { listCollections } from "@/lib/storage";

export const metadata: Metadata = { title: "Collections" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const items = await listCollections();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Collections</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#9ca3af]">
          Organize saved results into colored collections. Deleting a collection keeps its saved items.
        </p>
      </div>
      <CollectionsManager initial={items} />
    </div>
  );
}
