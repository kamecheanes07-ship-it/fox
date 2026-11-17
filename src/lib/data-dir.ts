import { accessSync, existsSync, constants } from "fs";
import path from "path";

/*
 * Where the local JSON store lives.
 *
 * Hugging Face Docker Spaces mount *persistent* storage at `/data` (only when
 * the Space was created with persistent storage enabled) and everything else in
 * the container is ephemeral. So we prefer, in order:
 *
 *   1. FOX_DATA_DIR              — explicit override, always wins.
 *   2. /data                     — HF Spaces persistent storage (survives restarts).
 *   3. /app/data                 — writable folder baked into the image.
 *   4. /tmp                      — last resort (works everywhere, lost on restart).
 *
 * The directory is created on first write by `src/lib/storage.ts`.
 */
export const DATA_FILE_NAME = "fox-data.json";

function isWritableDir(dir: string): boolean {
  try {
    if (!existsSync(dir)) return false;
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveDataDir(): string {
  const override = process.env.FOX_DATA_DIR?.trim();
  if (override) return override;
  for (const candidate of ["/data", "/app/data"]) {
    if (isWritableDir(candidate)) return candidate;
  }
  return "/tmp";
}

export const DATA_DIR = resolveDataDir();
export const DATA_FILE = path.join(DATA_DIR, DATA_FILE_NAME);

/** True when running inside a Hugging Face Space (the platform sets SPACE_ID). */
export const IS_HF_SPACE = Boolean(process.env.SPACE_ID || process.env.HF_SPACE_ID);

/** True when the JSON store is on a mounted volume (kept across restarts). */
export const IS_PERSISTENT_DIR = DATA_DIR === "/data" || Boolean(process.env.FOX_DATA_DIR?.trim());
