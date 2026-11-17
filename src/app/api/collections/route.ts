import { createCollection, listCollections } from "@/lib/storage";
import { COLLECTION_COLORS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export async function GET() {
  const items = await listCollections();
  return Response.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 60);
  if (!name) return Response.json({ error: "Collection name is required." }, { status: 400 });
  const description = String(body?.description ?? "").trim().slice(0, 300);
  const color = COLOR_RE.test(String(body?.color ?? "")) ? String(body.color) : COLLECTION_COLORS[0];

  const dto = await createCollection({ name, description, color });
  return Response.json({ item: dto }, { status: 201 });
}
