import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getEnv, getSupabaseProjectUrl } from "@/lib/security/env";

export function createServiceClient() {
  const env = getEnv();

  return createClient(getSupabaseProjectUrl(), env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;
