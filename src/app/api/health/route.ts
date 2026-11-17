import { sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { IS_HF_SPACE } from "@/lib/data-dir";
import { runtimeInfo } from "@/lib/runtime";

export const dynamic = "force-dynamic";

/**
 * Health probe used by the Docker HEALTHCHECK, Hugging Face Spaces and uptime
 * monitors. Always answers 200 as long as the Node process is up, so a missing
 * database never marks the Space as unhealthy — search works either way.
 */
export async function GET() {
  const info = runtimeInfo();

  if (!hasDatabase) {
    return Response.json({
      ok: true,
      status: "healthy",
      mode: "local",
      storage: info.storageLabel,
      persistent: info.persistent,
      huggingface: IS_HF_SPACE,
      uptimeSeconds: Math.round(process.uptime()),
    });
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      status: "healthy",
      mode: "postgres",
      storage: info.storageLabel,
      huggingface: IS_HF_SPACE,
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch {
    return Response.json({
      ok: true,
      status: "degraded",
      mode: "local-fallback",
      storage: info.storageLabel,
      huggingface: IS_HF_SPACE,
      uptimeSeconds: Math.round(process.uptime()),
    });
  }
}
