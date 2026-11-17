import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { DEMO_EMAIL, isDemoEnabled } from "@/lib/demo";
import { hashPassword, verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  // The demo login is public: letting one visitor change it would lock everyone else out.
  if (isDemoEnabled() && user.email === DEMO_EMAIL) {
    return Response.json(
      { error: "The shared demo account's password can't be changed. Create your own account to try this." },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => null);
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return Response.json({ error: "Both current and new password are required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }
  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const row = rows[0];
  if (!row || !verifyPassword(currentPassword, row.passwordHash)) {
    return Response.json({ error: "Current password is incorrect." }, { status: 401 });
  }
  await db
    .update(users)
    .set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  return Response.json({ ok: true });
}
