import "server-only";

import { getEnv, hasSecret } from "@/lib/security/env";
import { withRetry } from "@/lib/integrations/retry";

export type ZeroBounceStatus = "valid" | "invalid" | "catch-all" | "spamtrap" | "abuse" | "do_not_mail" | "unknown";

export async function verifyWithZeroBounce(email: string, userId: string, campaignId?: string, leadId?: string) {
  const env = getEnv();
  if (!hasSecret("ZEROBOUNCE_API_KEY")) {
    throw new Error("ZEROBOUNCE_API_KEY is required for email verification.");
  }

  return withRetry(
    async () => {
      const params = new URLSearchParams({
        api_key: env.ZEROBOUNCE_API_KEY ?? "",
        email,
      });
      const res = await fetch(`https://api.zerobounce.net/v2/validate?${params.toString()}`);
      if (!res.ok) throw new Error(`ZeroBounce request failed with ${res.status}`);
      return res.json() as Promise<{ status?: ZeroBounceStatus; sub_status?: string } & Record<string, unknown>>;
    },
    { provider: "zerobounce", endpoint: "/v2/validate", userId, campaignId, leadId },
  );
}

export function mapZeroBounceDecision(status?: ZeroBounceStatus, subStatus?: string) {
  if (status === "valid") return { status: "valid" as const, send_decision: "send" as const, reason: "Mailbox validated." };
  if (status === "catch-all") return { status: "catch_all" as const, send_decision: "review" as const, reason: "Catch-all mailbox needs review." };
  if (status === "unknown") return { status: "unknown" as const, send_decision: "review" as const, reason: subStatus ?? "Verification returned unknown." };
  if (status === "spamtrap" || status === "abuse" || status === "do_not_mail") {
    return { status: "risky" as const, send_decision: "skip" as const, reason: subStatus ?? "Address is risky." };
  }
  return { status: "invalid" as const, send_decision: "skip" as const, reason: subStatus ?? "Address is invalid." };
}
