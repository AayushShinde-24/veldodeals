import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { draftInvestorOutreach } from "@/lib/fundraising/outreach";

const schema = z.object({
  campaignId: z.string().optional(),
  investorName: z.string().min(1),
  firm: z.string().optional(),
  thesis: z.string().optional(),
  startupSummary: z.string().min(1),
  channel: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before drafting investor outreach.");
    const input = schema.parse(await request.json());
    return ok(await draftInvestorOutreach({ userId: user.id, ...input }));
  } catch (error) {
    return fail(error);
  }
}
