"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { writeAuditLog } from "@/src/lib/audit/log";

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
