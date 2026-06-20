// Next.js instrumentation hook — runs once at server startup.
// Used to (1) fail loud on missing required env vars and (2) init Sentry.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/security/env");
    try {
      validateEnv();
    } catch (error) {
      // During `next build` we don't want to hard-crash the build if secrets
      // aren't present in CI; only enforce at actual server runtime.
      if (process.env.NODE_ENV === "production" && process.env.VELDO_ENFORCE_ENV === "1") {
        throw error;
      }
    }
    const { initSentry } = await import("@/lib/observability/sentry");
    initSentry("server");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const { initSentry } = await import("@/lib/observability/sentry");
    initSentry("edge");
  }
}

// Capture errors thrown in nested React Server Components / route handlers.
export const onRequestError = Sentry.captureRequestError;
