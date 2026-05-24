"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { writeAuditLog } from "@/src/lib/audit/log";

export async function saveWorkspaceAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/login");
  await createServiceClient().from("workspaces").update({
    name: String(formData.get("name") ?? ""),
    website: String(formData.get("website") ?? "") || null,
    industry: String(formData.get("industry") ?? "") || null,
    company_size: String(formData.get("company_size") ?? "") || null,
    icp_json: {
      roles: String(formData.get("roles") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      industries: String(formData.get("industries") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    },
  }).eq("id", context.workspaceId);
  await writeAuditLog({ workspaceId: context.workspaceId, userId: context.userId, action: "workspace.updated" });
  redirect("/workspace?saved=1");
}
