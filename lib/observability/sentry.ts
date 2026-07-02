// Thin Sentry wrapper. No-ops unless SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is set,
// so local/dev/CI builds stay clean while production gets full error tracking.
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

let initialized = false;

export function initSentry(runtime: "server" | "client" | "edge"): void {
  if (initialized || !DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Don't send PII; Veldo handles lead/customer data.
    sendDefaultPii: false,
    initialScope: { tags: { runtime } },
  });
  initialized = true;
}

/** Central capture used by error boundaries, the agent runner, and logError. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export const sentryEnabled = Boolean(DSN);
