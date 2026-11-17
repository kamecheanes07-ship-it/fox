import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clearSessionCookie, getCurrentUser, toPublicUser } from "@/lib/auth";
import { DEMO_EMAIL, isDemoEnabled } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  return Response.json({ user });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 80);
  if (!name) return Response.json({ error: "Name cannot be empty." }, { status: 400 });
  const [updated] = await db
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();
  if (!updated) return Response.json({ error: "Not authenticated." }, { status: 401 });
  return Response.json({ user: toPublicUser(updated) });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  // The demo login is public: one visitor must not be able to remove it for everyone.
  if (isDemoEnabled() && user.email === DEMO_EMAIL) {
    return Response.json(
      { error: "The shared demo account can't be deleted. Create your own account to try this." },
      { status: 403 },
    );
  }
  // Sessions, history, saved results and collections go with the user (ON DELETE CASCADE).
  await db.delete(users).where(eq(users.id, user.id));
  await clearSessionCookie();
  return Response.json({ ok: true });
}
