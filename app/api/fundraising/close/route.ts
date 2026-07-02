import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/server";
import { recordFundraisingClose } from "@/lib/fundraising/outreach";

const schema = z.object({ amount: z.number().positive(), investorId: z.string().optional() });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before recording a raise.");
    const profile = await getCurrentProfile();
    const input = schema.parse(await request.json());
    return ok(
      await recordFundraisingClose({
        userId: user.id,
        workspaceId: profile?.workspace_id ?? null,
        amount: input.amount,
        investorId: input.investorId ?? null,
      })
    );
  } catch (error) {
    return fail(error);
  }
}
