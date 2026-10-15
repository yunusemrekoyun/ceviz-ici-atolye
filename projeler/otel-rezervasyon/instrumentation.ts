// Runs once when the server process starts (Next.js instrumentation hook).
export async function register() {
  // Node runtime only — skip on the Edge runtime where these vars don't apply.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnv } = await import('@/lib/env');
    assertEnv();
  }
}
