import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 "proxy" convention.
// Keeps CSRF protection on state-changing API requests while allowing open access without login.
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const method = req.method.toUpperCase();
    const isWrite = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
    if (isWrite && req.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
