import "server-only";

import { getEnv } from "@/lib/security/env";

export function getClayStatus() {
  return { configured: Boolean(getEnv().CLAY_API_KEY), provider: "clay" };
}
