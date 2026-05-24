import "server-only";

import { getEnv, hasSecret } from "@/lib/security/env";
import { withRetry } from "@/lib/integrations/retry";

export async function fetchApolloPeople(params: Record<string, unknown>, userId: string) {
  const env = getEnv();
  if (!hasSecret("APOLLO_API_KEY")) {
    throw new Error("APOLLO_API_KEY is required to import Apollo leads.");
  }

  return withRetry(
    async () => {
      const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": env.APOLLO_API_KEY ?? "",
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`Apollo request failed with ${res.status}`);
      return res.json() as Promise<Record<string, unknown>>;
    },
    { provider: "apollo", endpoint: "/v1/mixed_people/search", userId },
  );
}
