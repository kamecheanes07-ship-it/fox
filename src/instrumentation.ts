import { randomUUID } from "crypto";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { DATA_DIR, IS_HF_SPACE } from "@/lib/data-dir";

/*
 * Runs once per server process (Next.js `instrumentation` hook) on the Node
 * runtime. Beyond checking the data directory it powers the startup log that
 * Hugging Face Spaces shows in the "Logs" tab, so a cold Space is easy to debug.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Make sure the JSON store has a home before the first request needs it.
  // Hugging Face mounts persistent storage at /data; when it is missing or
  // read-only we fall back to /app/data or /tmp (see src/lib/data-dir.ts).
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const probe = path.join(DATA_DIR, `.fox-write-test-${randomUUID()}`);
    writeFileSync(probe, "ok", "utf8");
    rmSync(probe, { force: true });
  } catch (err) {
    console.warn(`[fox] data directory ${DATA_DIR} is not writable:`, err);
  }

  const hasDb = Boolean(process.env.DATABASE_URL?.trim());
  console.log(
    [
      "[fox] starting",
      `\n  storage      : ${hasDb ? "PostgreSQL (DATABASE_URL)" : `local JSON store (${DATA_DIR}/fox-data.json)`}`,
      `\n  hugging face : ${IS_HF_SPACE ? "yes (Docker Space)" : "no"}`,
      `\n  port         : ${process.env.PORT ?? "3000"}`,
      `\n  node         : ${process.version}`,
    ].join(""),
  );

  if (hasDb) {
    try {
      const { ensureBootstrapped } = await import("@/db/bootstrap");
      await ensureBootstrapped();
    } catch (err) {
      // A broken DATABASE_URL must never stop the Space from booting: the app
      // simply keeps serving with the local JSON store.
      console.error("[fox] database bootstrap failed, continuing with local storage:", err);
    }
  }
}
