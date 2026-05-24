import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { createCrmDeal } from "@/src/lib/crm/deals";

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext();
    if (!context) throw new Error("Sign in before creating deals.");
    const body = await request.json();
    return ok(await createCrmDeal({ ...body, workspaceId: context.workspaceId, userId: context.userId }), 201);
  } catch (error) {
    return fail(error);
  }
}
