import { type NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";
import { createServiceClient } from "@/lib/integrations/supabase";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const db = createServiceClient();

    // Get workspace
    const { data: membership } = await db
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!membership?.workspace_id) {
      return ok({ members: [], invites: [] });
    }

    const workspaceId = membership.workspace_id;

    // Fetch all workspace members with user details
    const { data: rawMembers } = await db
      .from("workspace_members")
      .select("user_id, role, users(email, full_name)")
      .eq("workspace_id", workspaceId);

    const members = (rawMembers ?? []).map((m) => {
      const user = Array.isArray(m.users) ? m.users[0] : m.users;
      return {
        id: String(m.user_id),
        email: user?.email ?? null,
        full_name: user?.full_name ?? null,
        role: String(m.role ?? "member"),
      };
    });

    // Fetch pending invites
    const { data: invites } = await db
      .from("workspace_invites")
      .select("id, email, role, expires_at, created_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return ok({ members, invites: invites ?? [] });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const body = await readJson<{ member_id?: string; role?: string }>(request);
    if (!body.member_id || !body.role) return fail("member_id and role are required.", 400);
    if (!["admin", "member", "viewer"].includes(body.role)) return fail("Invalid role.", 400);
    const db = createServiceClient();
    const membership = await requireTeamAdmin(userId);
    const { error } = await db
      .from("workspace_members")
      .update({ role: body.role })
      .eq("workspace_id", membership.workspaceId)
      .eq("user_id", body.member_id);
    if (error) return fail(error.message);
    return ok({ updated: true });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const body = await readJson<{ member_id?: string }>(request);
    if (!body.member_id) return fail("member_id is required.", 400);
    if (body.member_id === userId) return fail("You cannot remove yourself from the workspace.", 400);
    const db = createServiceClient();
    const membership = await requireTeamAdmin(userId);
    const { error } = await db
      .from("workspace_members")
      .delete()
      .eq("workspace_id", membership.workspaceId)
      .eq("user_id", body.member_id);
    if (error) return fail(error.message);
    return ok({ removed: true });
  } catch (error) {
    return fail(error);
  }
}

async function requireTeamAdmin(userId: string): Promise<{ workspaceId: string }> {
  const db = createServiceClient();
  const { data } = await db
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!data?.workspace_id) throw new Error("Workspace not found.");
  if (!["owner", "admin"].includes(String(data.role ?? ""))) {
    throw new Error("Only workspace owners and admins can manage members.");
  }
  return { workspaceId: String(data.workspace_id) };
}
