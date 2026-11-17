import { sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabase) {
    return Response.json({ ok: true, mode: "local" });
  }
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, mode: "postgres" });
  } catch {
    return Response.json({ ok: true, mode: "local-fallback" });
  }
}
