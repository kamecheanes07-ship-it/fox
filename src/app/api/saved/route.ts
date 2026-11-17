import { collectionExists, listSaved, upsertSavedItem } from "@/lib/storage";
import { isHttpUrl, isUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KINDS = ["web", "news", "image", "video"];

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind");
  const collectionId = sp.get("collectionId");

  if (collectionId && collectionId !== "none" && !isUuid(collectionId)) {
    return Response.json({ items: [] });
  }

  const items = await listSaved({ kind, collectionId });
  return Response.json({ items });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : "web";
  const title = String(body.title ?? "").trim().slice(0, 300);
  const url = String(body.url ?? "").trim().slice(0, 2000);
  if (!title) return Response.json({ error: "Title is required." }, { status: 400 });
  if (!isHttpUrl(url)) return Response.json({ error: "A valid http(s) URL is required." }, { status: 400 });

  const collectionProvided = "collectionId" in body;
  let collectionId: string | null = null;
  if (collectionProvided && body.collectionId !== null && body.collectionId !== "" && body.collectionId !== "none") {
    if (!isUuid(body.collectionId) || !(await collectionExists(body.collectionId))) {
      return Response.json({ error: "Collection not found." }, { status: 400 });
    }
    collectionId = body.collectionId;
  }

  const sent = (field: string) => typeof body[field] === "string";
  const res = await upsertSavedItem({
    kind,
    title,
    url,
    snippet: String(body.snippet ?? ""),
    thumbnail: String(body.thumbnail ?? ""),
    source: String(body.source ?? ""),
    query: String(body.query ?? ""),
    note: sent("note") ? String(body.note) : "",
    collectionId,
    collectionProvided,
    noteProvided: sent("note"),
    sentFields: {
      snippet: sent("snippet"),
      thumbnail: sent("thumbnail"),
      source: sent("source"),
    },
  });

  return Response.json(res, { status: res.alreadySaved ? 200 : 201 });
}
