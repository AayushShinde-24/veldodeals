"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { writeAuditLog } from "@/src/lib/audit/log";
import { isDemoMode } from "@/lib/demo/mode";
import { isAutonomyMode } from "@/lib/autonomy/modes";

export async function saveAutonomyModeAction(formData: FormData) {
  const raw = String(formData.get("mode") ?? "auto");
  const mode = isAutonomyMode(raw) ? raw : "auto";
  const next = String(formData.get("next") ?? "/dashboard");
  if (isDemoMode()) redirect(next);

  const context = await getWorkspaceContext();
  if (!context) redirect("/login");
  try {
    await createServiceClient()
      .from("workspaces")
      .update({ autonomy_mode: mode })
      .eq("id", context.workspaceId);
    await writeAuditLog({ workspaceId: context.workspaceId, userId: context.userId, action: `autonomy.set.${mode}` });
  } catch {
    // autonomy_mode column may not exist until the migration is applied — non-fatal.
  }
  redirect(next);
}

export async function saveOnboardingAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/login");

  const name = String(formData.get("workspace_name") ?? "").trim() || "Veldo Workspace";
  const website = String(formData.get("website") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const companySize = String(formData.get("company_size") ?? "").trim();
  const icpRoles = String(formData.get("icp_roles") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const icpIndustries = String(formData.get("icp_industries") ?? "").split(",").map((item) => item.trim()).filter(Boolean);

  await createServiceClient().from("workspaces").update({
    name,
    website: website || null,
    industry: industry || null,
    company_size: companySize || null,
    icp_json: { roles: icpRoles, industries: icpIndustries },
  }).eq("id", context.workspaceId);

  await writeAuditLog({ workspaceId: context.workspaceId, userId: context.userId, action: "onboarding.completed" });
  redirect("/dashboard");
}
