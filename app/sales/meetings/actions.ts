"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { writeAuditLog } from "@/src/lib/audit/log";
import { getWorkspaceContext } from "@/src/lib/workspace/context";

// Approve an AI-proposed meeting: books it onto the meetings table at the chosen
// slot. In demo mode (no DB) the action succeeds without persisting so the full
// approval flow stays exercisable.
export async function approveMeetingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "Sales meeting");
  const slot = String(formData.get("slot") ?? new Date().toISOString());
  const replyId = String(formData.get("reply_id") ?? "");

  const { isDemoMode } = await import("@/lib/demo/mode");
  if (!isDemoMode()) {
    try {
      const db = createServiceClient();
      await db.from("meetings").insert({
        user_id: user.id,
        title,
        created_at: slot,
      });
      const context = await getWorkspaceContext(user.id);
      if (context) {
        await writeAuditLog({
          workspaceId: context.workspaceId,
          userId: user.id,
          action: `meeting.approved.${replyId || "manual"}`,
        });
      }
    } catch {
      redirect("/sales/meetings?error=1");
    }
  }
  redirect(`/sales/meetings?approved=${encodeURIComponent(title)}`);
}

// Decline a proposal: audit-logged so Vel can learn the founder's threshold.
export async function declineMeetingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const replyId = String(formData.get("reply_id") ?? "");
  const { isDemoMode } = await import("@/lib/demo/mode");
  if (!isDemoMode()) {
    try {
      const context = await getWorkspaceContext(user.id);
      if (context) {
        await writeAuditLog({
          workspaceId: context.workspaceId,
          userId: user.id,
          action: `meeting.declined.${replyId || "manual"}`,
        });
      }
    } catch {
      // Non-fatal: declining must never error out the UI.
    }
  }
  redirect("/sales/meetings?declined=1");
}
