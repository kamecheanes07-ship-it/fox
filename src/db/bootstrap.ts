import { pool } from "@/db";
import { migrate } from "@/db/migrate";
import { repairLegacySeedData, seedDemoData } from "@/db/seed";
import { isDemoEnabled } from "@/lib/demo";

declare global {
  var __nexgoBootstrapped: Promise<void> | undefined;
}

const BOOTSTRAP_LOCK_KEY = 918_273_645;

async function bootstrap(): Promise<void> {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [BOOTSTRAP_LOCK_KEY]);
    await migrate();
    if (isDemoEnabled()) {
      await seedDemoData();
      await repairLegacySeedData();
    }
  } finally {
    await client.query("select pg_advisory_unlock($1)", [BOOTSTRAP_LOCK_KEY]).catch(() => undefined);
    client.release();
  }
}

export function ensureBootstrapped(): Promise<void> {
  if (!pool) return Promise.resolve();
  if (!globalThis.__nexgoBootstrapped) {
    globalThis.__nexgoBootstrapped = bootstrap().catch((err) => {
      console.error("[fox] bootstrap failed:", err);
      globalThis.__nexgoBootstrapped = undefined;
    });
  }
  return globalThis.__nexgoBootstrapped;
}
