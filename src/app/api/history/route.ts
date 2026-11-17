import { clearAllHistory, listHistory } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listHistory(300);
  return Response.json({ items });
}

export async function DELETE() {
  await clearAllHistory();
  return Response.json({ ok: true });
}
