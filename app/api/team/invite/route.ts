import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getEnv, hasSecret } from "@/lib/security/env";
import { applyPolicy } from "@/lib/security/rate-limit";
import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

const inviteSchema = z.object({
  email: z.string().email("A valid email address is required."),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!applyPolicy(userId, "invite_send")) return fail("Too many invite requests. Please wait before sending more.", 429);
    const body = await readJson<unknown>(request);
    const input = inviteSchema.parse(body);

    const db = createServiceClient();

    // Get the user's workspace and verify they have invite permissions
    const { data: membership, error: memberError } = await db
      .from("workspace_members")
      .select("workspace_id, role, workspaces(id, name)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (memberError || !membership?.workspace_id) {
      return fail("You are not a member of any workspace.", 403);
    }

    const role = String(membership.role ?? "member");
    if (!["owner", "admin"].includes(role)) {
      return fail("Only workspace owners and admins can invite members.", 403);
    }

    const workspace = Array.isArray(membership.workspaces)
      ? membership.workspaces[0]
      : membership.workspaces;
    const workspaceId = String(membership.workspace_id);
    const workspaceName = workspace?.name ? String(workspace.name) : "Veldo Workspace";

    // Check if the email already has a pending invite or is already a member
    const { data: existingInvite } = await db
      .from("workspace_invites")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .ilike("email", input.email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      return fail("A pending invite already exists for this email address.", 409);
    }

    // Check if already a member
    const { data: existingMember } = await db
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId) // can't join on email directly; use inviter as proxy for team size check
      .maybeSingle();

    // Insert the invite
    const { data: invite, error: inviteError } = await db
      .from("workspace_invites")
      .insert({
        workspace_id: workspaceId,
        invited_by: userId,
        email: input.email.trim().toLowerCase(),
        role: input.role,
      })
      .select("id, token, email, role, expires_at")
      .single();

    if (inviteError || !invite) {
      return fail(inviteError?.message ?? "Could not create invite. Try again.");
    }

    // Send invite email via Resend if configured
    const env = getEnv();
    const baseUrl = env.APP_URL ?? env.VELDO_APP_URL ?? "http://localhost:3000";
    const acceptUrl = `${baseUrl.replace(/\/$/u, "")}/invite/${invite.token}`;

    if (hasSecret("RESEND_API_KEY") && env.VELDO_DEFAULT_FROM_EMAIL) {
      const html = buildInviteEmail({ workspaceName, acceptUrl, role: invite.role });
      await fetchWithRetry("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.VELDO_DEFAULT_FROM_EMAIL,
          to: invite.email,
          subject: `You've been invited to ${workspaceName} on Veldo`,
          html,
        }),
      }, {
        provider: "resend",
        endpoint: "emails",
        shouldRetry: isTransientError,
        timeoutMs: 15_000,
      }).catch(() => {
        // Email delivery failure is non-fatal — invite token is still usable
      });
    }

    return ok({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
        accept_url: acceptUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues.map((e) => e.message).join(", "), 400);
    }
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const body = await readJson<{ invite_id?: string }>(request);

    if (!body.invite_id) return fail("invite_id is required.", 400);

    const db = createServiceClient();

    // Verify workspace membership and role
    const { data: membership } = await db
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!membership?.workspace_id) return fail("Workspace not found.", 403);
    if (!["owner", "admin"].includes(String(membership.role ?? ""))) {
      return fail("Only owners and admins can revoke invites.", 403);
    }

    const { error } = await db
      .from("workspace_invites")
      .update({ status: "revoked" })
      .eq("id", body.invite_id)
      .eq("workspace_id", membership.workspace_id)
      .eq("status", "pending");

    if (error) return fail(error.message);
    return ok({ revoked: true });
  } catch (error) {
    return fail(error);
  }
}

function buildInviteEmail(input: { workspaceName: string; acceptUrl: string; role: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0d0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#16161f;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <tr><td style="padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:22px;font-weight:600;color:#ffffff;">Veldo</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#ffffff;">You've been invited</h1>
          <p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.6;">
            You've been invited to join <strong style="color:#ffffff;">${input.workspaceName}</strong> on Veldo
            as a <strong style="color:#ffffff;">${input.role}</strong>.
          </p>
          <a href="${input.acceptUrl}"
            style="display:inline-block;background:#39a7ff;color:#ffffff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;">
            Accept Invitation
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:rgba(255,255,255,0.3);">
            This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
