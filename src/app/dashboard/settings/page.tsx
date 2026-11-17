import type { Metadata } from "next";
import { hasDatabase } from "@/db";
import SettingsForms from "@/components/dashboard/SettingsForms";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const storageMode = hasDatabase ? "PostgreSQL (DATABASE_URL)" : "Local JSON store (/tmp/fox-data.json)";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#9ca3af]">
          Customize appearance, storage, and workspace preferences.
        </p>
      </div>
      <SettingsForms storageMode={storageMode} />
    </div>
  );
}
