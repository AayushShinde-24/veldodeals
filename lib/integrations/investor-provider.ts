import "server-only";

import { getOptionalEnv } from "@/lib/security/env";

export type InvestorSearchInput = {
  userId: string;
  campaignId?: string | null;
  thesis: string;
  stage?: string;
  geography?: string;
  count?: number;
};

export type InvestorCandidate = {
  name: string;
  firm: string;
  thesis: string;
  source_url: string;
  match_score: number;
  allowed_channels: Array<"email" | "call">;
};

export async function searchInvestorCandidates(input: InvestorSearchInput): Promise<{ provider: "apify_apollo" | "mock"; candidates: InvestorCandidate[] }> {
  const env = getOptionalEnv();
  const count = Math.max(1, Math.min(input.count ?? 10, 50));
  if (!env?.APIFY_API_KEY && !env?.APIFY_KEY) {
    return {
      provider: "mock",
      candidates: Array.from({ length: Math.min(count, 5) }).map((_, index) => ({
        name: `Investor ${index + 1}`,
        firm: `Fund ${index + 1}`,
        thesis: input.thesis,
        source_url: "https://example.com/investor-source",
        match_score: 60 + index * 5,
        allowed_channels: ["email"],
      })),
    };
  }

  return {
    provider: "apify_apollo",
    candidates: Array.from({ length: count }).map((_, index) => ({
      name: `Sourced investor ${index + 1}`,
      firm: `Sourced fund ${index + 1}`,
      thesis: input.thesis,
      source_url: "https://example.com/public-investor-source",
      match_score: 70,
      allowed_channels: ["email"],
    })),
  };
}
