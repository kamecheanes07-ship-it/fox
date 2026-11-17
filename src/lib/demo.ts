// Shared demo-account constants. Safe to import from client components.
export const DEMO_EMAIL = "demo@nexgo.app";
export const DEMO_PASSWORD = "demo1234";

/**
 * Server-side only. Set SEED_DEMO=false to run without the public demo account:
 * nothing is seeded, the demo sign-in button disappears and the account is no
 * longer treated specially.
 */
export function isDemoEnabled(): boolean {
  return process.env.SEED_DEMO !== "false";
}
