import { DATA_DIR, IS_HF_SPACE } from "@/lib/data-dir";
import { hasDatabase } from "@/db";

/*
 * Runtime information used by the UI (Settings page) and by /api/health.
 * Read-only, no secrets: never expose DATABASE_URL itself.
 */

export interface RuntimeInfo {
  /** Where search results, collections and history are stored. */
  storage: "postgres" | "json";
  /** Human-readable storage target shown in Settings. */
  storageLabel: string;
  /** True when the JSON store sits on a volume that survives restarts. */
  persistent: boolean;
  /** True when running inside a Hugging Face Space. */
  huggingFace: boolean;
  port: string;
}

export function runtimeInfo(): RuntimeInfo {
  if (hasDatabase) {
    return {
      storage: "postgres",
      storageLabel: "PostgreSQL (DATABASE_URL)",
      persistent: true,
      huggingFace: IS_HF_SPACE,
      port: process.env.PORT ?? "3000",
    };
  }
  const persistent = DATA_DIR === "/data" && IS_HF_SPACE;
  return {
    storage: "json",
    storageLabel: persistent
      ? `Local JSON store (${DATA_DIR}/fox-data.json — Space persistent storage)`
      : `Local JSON store (${DATA_DIR}/fox-data.json — not persistent)`,
    persistent,
    huggingFace: IS_HF_SPACE,
    port: process.env.PORT ?? "3000",
  };
}
