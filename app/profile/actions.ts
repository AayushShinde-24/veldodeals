"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { writeAuditLog } from "@/src/lib/audit/log";

export async function saveProfileAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!context) redirect("/login");
  await createServiceClient().from("profiles").upsert({
    user_id: context.userId,
    name: String(formData.get("name") ?? ""),
    role: String(formData.get("role") ?? ""),
    company: String(formData.get("company") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    language: String(formData.get("language") ?? "en"),
    bio: String(formData.get("bio") ?? ""),
    email_signature: String(formData.get("email_signature") ?? ""),
  }, { onConflict: "user_id" });
  await writeAuditLog({ workspaceId: context.workspaceId, userId: context.userId, action: "profile.updated" });
  redirect("/profile?saved=1");
}
