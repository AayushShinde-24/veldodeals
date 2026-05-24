import "server-only";

import { getEnv } from "@/lib/security/env";

export function getMe5Status() {
  return { configured: Boolean(getEnv().ME5_API_KEY), provider: "me5" };
}
