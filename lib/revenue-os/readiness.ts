import "server-only";

import { getOptionalEnv } from "@/lib/security/env";

export type ReadinessItem = {
  area: string;
  status: "ready" | "mocked" | "blocked";
  owner: "you" | "codex" | "both";
  detail: string;
};

export function getLaunchReadiness(): ReadinessItem[] {
  const env = getOptionalEnv();
  const has = (key: string) => Boolean((env as Record<string, unknown> | null)?.[key] || process.env[key]);
  return [
    item("Billing checkout", has("STRIPE_SECRET_KEY") ? "ready" : "mocked", "you", has("STRIPE_SECRET_KEY") ? "Stripe key is configured." : "Stripe adapter is built; add keys and price ids to go live."),
    item("Monthly credits", "ready", "codex", "Credit ledger and reset primitives are implemented."),
    item("Email sending", has("GOOGLE_CLIENT_ID") && has("TOKEN_ENCRYPTION_KEY") ? "ready" : "blocked", "you", "Requires mailbox OAuth and token encryption before real sends."),
    item("AI voice calls", has("VELDO_VOICE_PROVIDER_API_KEY") ? "ready" : "mocked", "you", "Voice adapter is built; missing provider key keeps calls review-only."),
    item("DNC checks", has("VELDO_DNC_PROVIDER_API_KEY") ? "ready" : "mocked", "you", "DNC adapter is built; missing provider key blocks autonomous dialing."),
    item("Investor sourcing", has("APIFY_API_KEY") || has("APIFY_KEY") ? "ready" : "mocked", "both", "Investor sourcing adapter returns mock candidates until Apify actors are configured."),
    item("Lead enrichment", has("APOLLO_API_KEY") ? "ready" : "blocked", "you", "Apollo is required for production-grade contact sourcing."),
    item("Fundraising compliance", "ready", "codex", "Schemas and legal-review gates block unsafe fundraising claims."),
    item("Production preflight", "ready", "codex", "Preflight script fails closed when launch env is incomplete."),
    item("Observability", has("SENTRY_DSN") || has("POSTHOG_KEY") ? "ready" : "blocked", "you", "Add telemetry keys for production failure monitoring."),
  ];
}

function item(area: string, status: ReadinessItem["status"], owner: ReadinessItem["owner"], detail: string): ReadinessItem {
  return { area, status, owner, detail };
}
