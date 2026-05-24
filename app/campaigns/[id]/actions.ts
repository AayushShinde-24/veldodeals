"use server";

import { redirect } from "next/navigation";
import { runSendGateAgent } from "@/lib/agents/send-gate-agent";
import { getCurrentUser } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";

export async function updatePersonalizedDraftApprovalAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const campaignId = String(formData.get("campaign_id") ?? "");
  const leadId = String(formData.get("lead_id") ?? "");
  const approved = String(formData.get("approved") ?? "true") === "true";
  if (!campaignId || !leadId) throw new Error("campaign_id and lead_id are required.");

  const db = createServiceClient();
  const { error } = await db.from("personalized_emails").update({
    approval_status: approved ? "approved" : "rejected",
    approved_at: approved ? new Date().toISOString() : null,
  }).eq("user_id", user.id).eq("campaign_id", campaignId).eq("lead_id", leadId);
  if (error) throw new Error(error.message);

  await runSendGateAgent({}, { userId: user.id, campaignId, leadId });
  redirect(`/campaigns/${campaignId}?draft=${approved ? "approved" : "rejected"}`);
}
