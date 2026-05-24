import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";
import { createAuthClient, getCurrentUser } from "@/lib/auth/server";

export { createAuthClient, createServiceClient, getCurrentUser };

export type SupabaseService = ReturnType<typeof createServiceClient>;
