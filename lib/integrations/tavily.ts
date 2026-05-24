import "server-only";

import { getEnv, hasSecret } from "@/lib/security/env";
import { withRetry } from "@/lib/integrations/retry";

export async function searchPublicSignals(query: string, userId: string, campaignId?: string, leadId?: string) {
  const env = getEnv();
  if (!hasSecret("TAVILY_API_KEY")) {
    throw new Error("TAVILY_API_KEY is required for public signal research.");
  }

  return withRetry(
    async () => {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: env.TAVILY_API_KEY,
          query,
          max_results: 5,
          search_depth: "advanced",
          include_answer: false,
        }),
      });

      if (!res.ok) throw new Error(`Tavily request failed with ${res.status}`);
      return res.json() as Promise<Record<string, unknown>>;
    },
    { provider: "tavily", endpoint: "/search", userId, campaignId, leadId },
  );
}
