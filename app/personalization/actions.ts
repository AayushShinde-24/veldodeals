"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { approveGeneratedEmail } from "@/src/lib/mvp/sending";

export async function approveDraftAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const generatedEmailId = String(formData.get("generated_email_id") ?? "");
  if (!generatedEmailId) return;
  await approveGeneratedEmail({ userId: user.id, generatedEmailId });
  revalidatePath("/personalization");
  revalidatePath("/dashboard");
}

export async function rejectDraftAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const generatedEmailId = String(formData.get("generated_email_id") ?? "");
  if (!generatedEmailId) return;
  await createServiceClient()
    .from("generated_emails")
    .update({
      status: "needs_review",
      approval_status: "rejected",
      safety_status: "blocked",
      safety_issues: ["Rejected by human reviewer."],
    })
    .eq("id", generatedEmailId)
    .eq("user_id", user.id);
  revalidatePath("/personalization");
  revalidatePath("/dashboard");
}
