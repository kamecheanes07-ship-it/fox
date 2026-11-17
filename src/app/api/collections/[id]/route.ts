import { deleteCollection, updateCollection } from "@/lib/storage";
import { isUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patch: { name?: string; description?: string; color?: string } = {};
  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 60);
    if (!name) return Response.json({ error: "Name cannot be empty." }, { status: 400 });
    patch.name = name;
  }
  if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 300);
  if (typeof body.color === "string") {
    if (!COLOR_RE.test(body.color)) return Response.json({ error: "Invalid color." }, { status: 400 });
    patch.color = body.color;
  }

  const updated = await updateCollection(id, patch);
  if (!updated) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ item: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const ok = await deleteCollection(id);
  if (!ok) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
