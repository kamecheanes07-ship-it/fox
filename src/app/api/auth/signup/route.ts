import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, setSessionCookie, toPublicUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TAKEN = "An account with this email already exists.";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 80);
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(body?.password ?? "");

  if (!name) return Response.json({ error: "Please enter your name." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (password.length > 200) {
    return Response.json({ error: "Password is too long." }, { status: 400 });
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return Response.json({ error: TAKEN }, { status: 409 });

  let user: typeof users.$inferSelect;
  try {
    [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: hashPassword(password) })
      .returning();
  } catch (err) {
    // Two sign-ups racing for the same address: the unique index decides the winner.
    if ((err as { code?: string } | null)?.code === "23505") {
      return Response.json({ error: TAKEN }, { status: 409 });
    }
    throw err;
  }
  const token = await createSession(user.id);
  await setSessionCookie(token);
  return Response.json({ user: toPublicUser(user) }, { status: 201 });
}
