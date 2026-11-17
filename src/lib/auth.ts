import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import type { PublicUser } from "@/lib/types";

export const SESSION_COOKIE = "nexgo_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function toPublicUser(row: { id: string; name: string; email: string; createdAt: Date }): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ userId, token, expiresAt });
  return token;
}

/**
 * Cookie attributes are derived from the request that is being answered:
 *
 *  - `Secure` whenever the visitor reached us over HTTPS (proxy header or the
 *    browser's Origin), so plain-HTTP self-hosting and localhost keep working.
 *  - `SameSite=Lax` normally. When the page reports that it is embedded in a
 *    cross-origin frame (hosted previews), browsers drop Lax cookies, so we
 *    issue a partitioned `SameSite=None; Secure` cookie instead. Cross-site
 *    writes are rejected separately in `src/proxy.ts`.
 */
async function cookieOptions(maxAgeSeconds: number) {
  const h = await headers();
  const forwardedProto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase();
  const origin = (h.get("origin") ?? h.get("referer") ?? "").toLowerCase();
  const https = forwardedProto === "https" || origin.startsWith("https://");
  const framed = h.get("x-nexgo-context") === "framed";
  const base = { httpOnly: true, path: "/", maxAge: maxAgeSeconds };
  if (framed && https) {
    return { ...base, sameSite: "none" as const, secure: true, partitioned: true };
  }
  return { ...base, sameSite: "lax" as const, secure: https };
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, await cookieOptions(Math.floor(SESSION_TTL_MS / 1000)));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", await cookieOptions(0));
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  try {
    const token = await getSessionToken();
    if (!token) return null;
    const rows = await db
      .select({ user: users, session: sessions })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.token, token))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (row.session.expiresAt.getTime() < Date.now()) {
      await db.delete(sessions).where(eq(sessions.id, row.session.id)).catch(() => undefined);
      return null;
    }
    return toPublicUser(row.user);
  } catch {
    return null;
  }
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token)).catch(() => undefined);
}
