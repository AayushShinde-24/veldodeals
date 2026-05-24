import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { writeAuditLog } from "@/src/lib/audit/log";

const schema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  icp: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const context = await getWorkspaceContext();
    if (!context) throw new Error("Sign in before updating workspace.");
    const input = schema.parse(await request.json());
    const { data, error } = await createServiceClient()
      .from("workspaces")
      .update({
        name: input.name,
        website: input.website,
        industry: input.industry,
        company_size: input.companySize,
        icp_json: input.icp,
      })
      .eq("id", context.workspaceId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAuditLog({ workspaceId: context.workspaceId, userId: context.userId, action: "workspace.updated" });
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
