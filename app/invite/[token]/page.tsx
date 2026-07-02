import { redirect } from "next/navigation";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getCurrentUser } from "@/lib/auth/server";
import { GlassCard, PageShell } from "@/components/premium";

interface Props {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params;

  const db = createServiceClient();

  // Look up the invite
  const { data: invite, error } = await db
    .from("workspace_invites")
    .select("id, workspace_id, email, role, status, expires_at, workspaces(name)")
    .eq("token", token)
    .maybeSingle();

  // Invalid or not found
  if (error || !invite) {
    return <InviteResult status="invalid" />;
  }

  // Already used or revoked
  if (invite.status !== "pending") {
    return <InviteResult status={invite.status as "accepted" | "revoked"} />;
  }

  // Expired
  if (new Date(invite.expires_at) < new Date()) {
    return <InviteResult status="expired" />;
  }

  // Check if user is logged in
  const user = await getCurrentUser();

  if (!user) {
    // Redirect to login with return URL
    redirect(`/login?redirect=/invite/${token}`);
  }

  // Accept the invite
  try {
    // Add user to workspace
    const { error: memberError } = await db
      .from("workspace_members")
      .upsert(
        {
          workspace_id: invite.workspace_id,
          user_id: user.id,
          role: invite.role,
        },
        { onConflict: "workspace_id,user_id" },
      );

    if (memberError) throw new Error(memberError.message);

    // Mark invite as accepted
    await db
      .from("workspace_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    // Redirect to dashboard
    redirect("/dashboard?invited=1");
  } catch {
    return <InviteResult status="error" />;
  }
}

function InviteResult({ status }: { status: "invalid" | "accepted" | "revoked" | "expired" | "error" }) {
  const configs = {
    invalid: {
      icon: <XCircle size={32} color="var(--danger)" />,
      title: "Invalid invite link",
      message: "This invite link is not valid or may have been removed. Please ask your workspace admin to send a new invite.",
    },
    accepted: {
      icon: <CheckCircle size={32} color="var(--ok)" />,
      title: "Invite already used",
      message: "This invite link has already been accepted. Head to the dashboard to get started.",
    },
    revoked: {
      icon: <XCircle size={32} color="var(--danger)" />,
      title: "Invite revoked",
      message: "This invite has been revoked by the workspace admin. Please request a new invite.",
    },
    expired: {
      icon: <Clock size={32} color="var(--accent)" />,
      title: "Invite expired",
      message: "This invite link expired after 7 days. Ask your workspace admin to send a fresh invite.",
    },
    error: {
      icon: <XCircle size={32} color="var(--danger)" />,
      title: "Something went wrong",
      message: "We could not process this invite. Please try again or contact support.",
    },
  };

  const cfg = configs[status];

  return (
    <PageShell>
      <div style={{ maxWidth: 480, margin: "80px auto" }}>
        <GlassCard>
          <div style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ marginBottom: 16 }}>{cfg.icon}</div>
            <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 600 }}>{cfg.title}</h2>
            <p style={{ margin: "0 0 28px", color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
              {cfg.message}
            </p>
            <a href="/dashboard" className="btn primary" style={{ display: "inline-block" }}>
              Go to Dashboard
            </a>
          </div>
        </GlassCard>
      </div>
    </PageShell>
  );
}
