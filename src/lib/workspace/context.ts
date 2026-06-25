import { createServiceClient } from "@/lib/integrations/supabase";

export interface WorkspaceContext {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  plan: string;
  credits: number;
  membersCount: number;
  workspace: { id: string; name: string; website?: string | null; industry?: string | null; company_size?: string | null };
  profile: { full_name?: string | null; email?: string | null; company_name?: string | null };
}

export async function getWorkspaceContext(): Promise<WorkspaceContext | null>;
export async function getWorkspaceContext(userId: string): Promise<WorkspaceContext | null>;
export async function getWorkspaceContext(userId?: string): Promise<WorkspaceContext | null> {
  const { isDemoMode, DEMO_USER_ID } = await import("@/lib/demo/mode");
  if (isDemoMode()) {
    return {
      userId: DEMO_USER_ID,
      workspaceId: "demo-workspace",
      workspaceName: "Acme Growth Co",
      plan: "team_engine",
      credits: 18420,
      membersCount: 3,
      workspace: { id: "demo-workspace", name: "Acme Growth Co", website: "https://acme.demo", industry: "B2B SaaS", company_size: "11-50" },
      profile: { full_name: "Demo Founder", email: "founder@acme.demo", company_name: "Acme Growth Co" },
    };
  }

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const { getCurrentUser } = await import("@/lib/auth/server");
    const user = await getCurrentUser();
    if (!user) return null;
    resolvedUserId = user.id;
  }

  const db = createServiceClient();
  const { data } = await db
    .from("profiles")
    .select("id, workspace_id, workspace_name, plan, credits, full_name, email, company_name")
    .eq("id", resolvedUserId)
    .maybeSingle();

  if (!data?.workspace_id) return null;

  const { count } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", data.workspace_id);

  return {
    userId: data.id,
    workspaceId: data.workspace_id,
    workspaceName: data.workspace_name ?? "Workspace",
    plan: data.plan ?? "free",
    credits: data.credits ?? 0,
    membersCount: count ?? 1,
    workspace: { id: data.workspace_id, name: data.workspace_name ?? "Workspace" },
    profile: { full_name: data.full_name ?? null, email: data.email ?? null, company_name: data.company_name ?? null },
  };
}

export async function ensureDefaultWorkspace(
  userId: string,
  email: string,
  metadata: Record<string, unknown>
) {
  const db = createServiceClient();

  // Check if profile already has a workspace
  const { data: existing } = await db
    .from("profiles")
    .select("id, workspace_id, workspace_name")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.workspace_id) return { id: existing.workspace_id, name: existing.workspace_name };

  // Check if a workspace exists for this user
  const { data: workspace } = await db
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", userId)
    .maybeSingle();

  if (workspace) {
    await db
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: String(metadata.full_name ?? ""),
          company_name: String(metadata.company_name ?? ""),
          workspace_id: workspace.id,
          workspace_name: workspace.name,
          plan: "free",
          credits: 50,
        },
        { onConflict: "id" }
      );
    return workspace;
  }

  // Create new workspace
  const workspaceName = String(
    metadata.company_name ||
      (metadata.full_name ? `${metadata.full_name}'s Workspace` : null) ||
      email.split("@")[0] ||
      "My Workspace"
  );

  const { data: newWorkspace, error } = await db
    .from("workspaces")
    .insert({ name: workspaceName, owner_id: userId, plan: "free", credits: 50 })
    .select("id, name")
    .single();

  if (error || !newWorkspace) {
    console.error("[workspace] Failed to create workspace:", error?.message);
    return null;
  }

  await db.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: String(metadata.full_name ?? ""),
      company_name: String(metadata.company_name ?? ""),
      workspace_id: newWorkspace.id,
      workspace_name: newWorkspace.name,
      plan: "free",
      credits: 50,
    },
    { onConflict: "id" }
  );

  return newWorkspace;
}
