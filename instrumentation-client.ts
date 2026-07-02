// Client-side Sentry init. No-ops unless NEXT_PUBLIC_SENTRY_DSN is set.
import { initSentry } from "@/lib/observability/sentry";

initSentry("client");

// Required by Next.js for client-side navigation instrumentation when Sentry is on.
export { captureRouterTransitionStart as onRouterTransitionStart } from "@sentry/nextjs";
