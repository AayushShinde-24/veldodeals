import "server-only";

import { getEnv } from "@/lib/security/env";

export function getEnrichStatus() {
  return { configured: Boolean(getEnv().ENRICH_API_KEY ?? getEnv().ENRICH_KEY), provider: "enrich" };
}
