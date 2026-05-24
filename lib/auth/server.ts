import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getEnv, getSupabaseProjectUrl } from "@/lib/security/env";
import { isMissingSchemaError } from "@/src/lib/workspace/context";

export type AuthProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  plan: string;
  credits_balance: number;
  workspace_id?: string | null;
  workspace_name?: string | null;
  workspace_role?: string | null;
};

export async function createAuthClient() {
  const cookieStore = await cookies();
  const env = getEnv();

  return createServerClient(getSupabaseProjectUrl(), env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components cannot always set cookies; middleware/actions handle refresh writes.
        }
      },
    },
  });
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    if (!(await hasAuthCookie())) return null;
    const supabase = await createAuthClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const db = createServiceClient();
  const fallbackName = user.user_metadata?.full_name;
  const fallbackCompany = user.user_metadata?.company_name;
  await db.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: typeof fallbackName === "string" ? fallbackName : null,
      company_name: typeof fallbackCompany === "string" ? fallbackCompany : null,
    },
    { onConflict: "id" },
  );

  const { data } = await db.from("users").select("*").eq("id", user.id).maybeSingle();
  const workspace = await ensureWorkspaceProfile(db, {
    userId: user.id,
    email: data?.email ?? user.email ?? null,
    fullName: data?.full_name ?? (typeof fallbackName === "string" ? fallbackName : null),
    companyName: data?.company_name ?? (typeof fallbackCompany === "string" ? fallbackCompany : null),
    plan: data?.plan ?? "free",
  }).catch(() => null);

  return {
    id: user.id,
    email: data?.email ?? user.email ?? null,
    full_name: data?.full_name ?? (typeof fallbackName === "string" ? fallbackName : null),
    company_name: data?.company_name ?? (typeof fallbackCompany === "string" ? fallbackCompany : null),
    plan: data?.plan ?? "free",
    credits_balance: data?.credits_balance ?? 0,
    workspace_id: workspace?.id ?? null,
    workspace_name: workspace?.name ?? null,
    workspace_role: workspace?.role ?? null,
  };
}

async function ensureWorkspaceProfile(
  db: ReturnType<typeof createServiceClient>,
  input: { userId: string; email: string | null; fullName: string | null; companyName: string | null; plan: string },
) {
  const profile = await db.from("profiles").upsert({
    user_id: input.userId,
    name: input.fullName,
    company: input.companyName,
  }, { onConflict: "user_id" });
  if (profile.error) return null;

  const membership = await db
    .from("workspace_members")
    .select("role, workspaces(id,name,plan)")
    .eq("user_id", input.userId)
    .limit(1)
    .maybeSingle();
  if (membership.error) return null;

  const existingWorkspace = Array.isArray(membership.data?.workspaces)
    ? membership.data?.workspaces[0]
    : membership.data?.workspaces;
  if (existingWorkspace?.id) {
    return {
      id: String(existingWorkspace.id),
      name: String(existingWorkspace.name ?? "Veldo Workspace"),
      role: String(membership.data?.role ?? "member"),
    };
  }

  const workspaceName = input.companyName || (input.email ? input.email.split("@")[0] : "Veldo Workspace");
  const created = await db
    .from("workspaces")
    .insert({ name: workspaceName, owner_id: input.userId, plan: input.plan })
    .select("id,name,plan")
    .single();

  if (created.error && isMissingSchemaError(created.error)) return null;
  if (created.error || !created.data) return null;
  await db.from("workspace_members").upsert({
    workspace_id: created.data.id,
    user_id: input.userId,
    role: "owner",
  }, { onConflict: "workspace_id,user_id" });
  await db.from("settings").upsert({
    workspace_id: created.data.id,
    sending: {},
    security: {},
    preferences: {},
  }, { onConflict: "workspace_id" });

  return { id: created.data.id, name: created.data.name, role: "owner" };
}

async function hasAuthCookie() {
  const cookieStore = await cookies();
  return cookieStore.getAll().some((cookie) => {
    const name = cookie.name.toLowerCase();
    return name === "supabase-auth-token" || (name.startsWith("sb-") && name.includes("auth-token"));
  });
}
