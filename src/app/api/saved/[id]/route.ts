import { collectionExists, deleteSavedItem, updateSavedItem } from "@/lib/storage";
import { isUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patch: { title?: string; note?: string; snippet?: string; collectionId?: string | null } = {};
  if (typeof body.title === "string") {
    const title = body.title.trim().slice(0, 300);
    if (!title) return Response.json({ error: "Title cannot be empty." }, { status: 400 });
    patch.title = title;
  }
  if (typeof body.note === "string") patch.note = body.note.slice(0, 2000);
  if (typeof body.snippet === "string") patch.snippet = body.snippet.slice(0, 2000);
  if ("collectionId" in body) {
    const cid = body.collectionId;
    if (cid === null || cid === "" || cid === "none") {
      patch.collectionId = null;
    } else {
      if (!isUuid(cid) || !(await collectionExists(cid))) {
        return Response.json({ error: "Collection not found." }, { status: 400 });
      }
      patch.collectionId = cid;
    }
  }

  const item = await updateSavedItem(id, patch);
  if (!item) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ item });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const deleted = await deleteSavedItem(id);
  if (!deleted) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
