import { clearSessionCookie, destroySession, getSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = await getSessionToken();
  if (token) await destroySession(token);
  await clearSessionCookie();
  return Response.json({ ok: true });
}
