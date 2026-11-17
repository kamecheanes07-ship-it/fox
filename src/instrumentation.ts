export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureBootstrapped } = await import("@/db/bootstrap");
    await ensureBootstrapped();
  } catch (err) {
    console.error("[nexgo] instrumentation bootstrap error:", err);
  }
}
