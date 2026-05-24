import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { writeAuditLog } from "@/src/lib/audit/log";

const schema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  bio: z.string().optional(),
  emailSignature: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const context = await getWorkspaceContext();
    if (!context) throw new Error("Sign in before updating profile.");
    const input = schema.parse(await request.json());
    const { data, error } = await createServiceClient().from("profiles").upsert({
      user_id: context.userId,
      name: input.name,
      role: input.role,
      company: input.company,
      phone: input.phone,
      timezone: input.timezone,
      language: input.language,
      bio: input.bio,
      email_signature: input.emailSignature,
    }, { onConflict: "user_id" }).select("*").single();
    if (error) throw new Error(error.message);
    await writeAuditLog({ workspaceId: context.workspaceId, userId: context.userId, action: "profile.updated" });
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
