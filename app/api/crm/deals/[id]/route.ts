import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { updateCrmDealStage } from "@/src/lib/crm/deals";

const schema = z.object({ stage: z.string().min(1) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getWorkspaceContext();
    if (!context) throw new Error("Sign in before updating deals.");
    const { id } = await params;
    const input = schema.parse(await request.json());
    return ok(await updateCrmDealStage({ workspaceId: context.workspaceId, userId: context.userId, dealId: id, stage: input.stage }));
  } catch (error) {
    return fail(error);
  }
}
