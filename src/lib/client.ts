// Browser-side helpers shared by every client component.

export interface ApiResult<T> {
  ok: boolean;
  /** HTTP status, or 0 when the request never reached the server. */
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * True when the app runs inside a cross-origin iframe (e.g. an embedded
 * preview). The server uses this to issue a partitioned SameSite=None session
 * cookie, because browsers refuse SameSite=Lax cookies in that context.
 */
export function isFramed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.self === window.top) return false;
    // Reading a cross-origin parent's location throws; a same-origin parent
    // keeps normal first-party cookie behaviour.
    void window.top?.location.href;
    return false;
  } catch {
    return true;
  }
}

/**
 * fetch wrapper that never throws: network failures and non-2xx responses both
 * come back as `{ ok: false, error }`, so optimistic updates can always roll back.
 */
export async function api<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {
      accept: "application/json",
      "x-nexgo-context": isFramed() ? "framed" : "top",
    };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      cache: "no-store",
      credentials: "same-origin",
      signal: options.signal,
    });
    const parsed: unknown = await res.json().catch(() => null);
    if (res.ok) return { ok: true, status: res.status, data: parsed as T, error: null };
    const message =
      parsed && typeof parsed === "object" && typeof (parsed as { error?: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : `Request failed (${res.status}).`;
    return { ok: false, status: res.status, data: null, error: message };
  } catch {
    return { ok: false, status: 0, data: null, error: "Network error — check your connection and try again." };
  }
}

/** Put an optimistically removed item back where it was (no-op if it is already there). */
export function restoreAt<T extends { id: string }>(list: T[], item: T, index: number): T[] {
  if (list.some((entry) => entry.id === item.id)) return list;
  const next = list.slice();
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
  return next;
}
