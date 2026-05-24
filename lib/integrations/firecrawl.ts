import "server-only";

import { getEnv, hasSecret } from "@/lib/security/env";
import { withRetry } from "@/lib/integrations/retry";

export async function crawlCompanyWebsite(url: string, userId: string, campaignId?: string, leadId?: string) {
  const env = getEnv();
  if (!hasSecret("FIRECRAWL_API_KEY")) {
    throw new Error("FIRECRAWL_API_KEY is required for company research.");
  }

  return withRetry(
    async () => {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      if (!res.ok) throw new Error(`Firecrawl request failed with ${res.status}`);
      return res.json() as Promise<Record<string, unknown>>;
    },
    { provider: "firecrawl", endpoint: "/v1/scrape", userId, campaignId, leadId },
  );
}
