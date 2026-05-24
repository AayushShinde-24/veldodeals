import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";
import { getCurrentUser } from "@/lib/auth/server";

export type WorkspaceContext = {
  userId: string;
  workspaceId: string;
  workspace: Record<string, unknown>;
  role: string;
  schemaMode: "workspace" | "legacy";
};

export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return ensureDefaultWorkspace(user.id, user.email ?? null, user.user_metadata ?? {});
}

export async function ensureDefaultWorkspace(
  userId: string,
  email?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<WorkspaceContext> {
  const db = createServiceClient();
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : null;
  const companyName = typeof metadata.company_name === "string" ? metadata.company_name : null;

  await db.from("users").upsert({
    id: userId,
    email,
    full_name: fullName,
    company_name: companyName,
  }, { onConflict: "id" });

  const profile = await db.from("profiles").upsert({
    user_id: userId,
    name: fullName,
    company: companyName,
  }, { onConflict: "user_id" });
  if (profile.error && !isMissingSchemaError(profile.error)) throw new Error(profile.error.message);

  const existing = await db
    .from("workspace_members")
    .select("role, workspaces(*)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (existing.error && isMissingSchemaError(existing.error)) {
    return legacyWorkspace(userId, companyName, email);
  }
  if (existing.error) throw new Error(existing.error.message);

  const workspace = Array.isArray(existing.data?.workspaces)
    ? existing.data?.workspaces[0]
    : existing.data?.workspaces;
  if (workspace?.id) {
    return {
      userId,
      workspaceId: String(workspace.id),
      workspace: workspace as Record<string, unknown>,
      role: String(existing.data?.role ?? "member"),
      schemaMode: "workspace",
    };
  }

  const workspaceName = companyName || (email ? email.split("@")[0] : "Veldo Workspace");
  const created = await db
    .from("workspaces")
    .insert({ name: workspaceName, owner_id: userId, plan: "free" })
    .select("*")
    .single();
  if (created.error && isMissingSchemaError(created.error)) {
    return legacyWorkspace(userId, companyName, email);
  }
  if (created.error) throw new Error(created.error.message);

  await db.from("workspace_members").upsert({
    workspace_id: created.data.id,
    user_id: userId,
    role: "owner",
  }, { onConflict: "workspace_id,user_id" });

  await db.from("settings").upsert({
    workspace_id: created.data.id,
    sending: {},
    security: {},
    preferences: {},
  }, { onConflict: "workspace_id" });

  return {
    userId,
    workspaceId: created.data.id,
    workspace: created.data,
    role: "owner",
    schemaMode: "workspace",
  };
}

export function isMissingSchemaError(error: unknown) {
  const message = typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : String(error ?? "");
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  return code === "42P01" || code === "42703" || /schema cache|does not exist|could not find the table|could not find .* column|relation .* does not exist/iu.test(message);
}

function legacyWorkspace(userId: string, companyName: string | null, email?: string | null): WorkspaceContext {
  const name = companyName || (email ? email.split("@")[0] : "Veldo Workspace");
  return {
    userId,
    workspaceId: userId,
    workspace: { id: userId, name, owner_id: userId, plan: "free", legacy_schema: true },
    role: "owner",
    schemaMode: "legacy",
  };
}
