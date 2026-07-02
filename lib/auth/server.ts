import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/integrations/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type AuthProfile = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  workspace_name: string | null;
  workspace_id: string | null;
  plan: string;
  credits: number;
  avatar_url: string | null;
};

export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Read-only context (middleware) — ignore
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const { isDemoMode, demoUser } = await import("@/lib/demo/mode");
  if (isDemoMode()) return demoUser() as unknown as Awaited<ReturnType<typeof getRealUser>>;
  return getRealUser();
}

async function getRealUser() {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const { isDemoMode, demoProfile } = await import("@/lib/demo/mode");
  if (isDemoMode()) return demoProfile() as AuthProfile;
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const db = createServiceClient();
    const { data: profile } = await db
      .from("profiles")
      .select(
        "id, email, full_name, company_name, workspace_name, workspace_id, plan, credits, avatar_url"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profile) return profile as AuthProfile;

    return {
      id: user.id,
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name as string | null) ?? null,
      company_name: (user.user_metadata?.company_name as string | null) ?? null,
      workspace_name: null,
      workspace_id: null,
      plan: "free",
      credits: 0,
      avatar_url: null,
    };
  } catch {
    return null;
  }
}
