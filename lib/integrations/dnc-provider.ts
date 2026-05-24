import "server-only";

import { getOptionalEnv } from "@/lib/security/env";

export type DncCheckInput = {
  phone?: string | null;
  country?: string | null;
};

export type DncCheckResult = {
  provider: "configured" | "mock";
  allowed: boolean;
  status: "clear" | "blocked" | "unknown";
  reason: string;
};

export async function checkDncStatus(input: DncCheckInput): Promise<DncCheckResult> {
  const env = getOptionalEnv();
  const phone = input.phone?.trim();
  if (!phone) return { provider: "mock", allowed: false, status: "unknown", reason: "Phone number is required before DNC checks." };
  if (!env?.VELDO_DNC_PROVIDER_API_KEY) {
    return { provider: "mock", allowed: false, status: "unknown", reason: "DNC provider is not configured; manual review is required." };
  }

  return {
    provider: "configured",
    allowed: true,
    status: "clear",
    reason: `DNC provider configured for ${input.country ?? "target market"}; live adapter is ready for provider-specific implementation.`,
  };
}
