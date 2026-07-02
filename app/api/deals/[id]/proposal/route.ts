import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { generateProposal, sendForSignature } from "@/lib/deals/proposals";

const schema = z.object({ action: z.enum(["generate", "send"]).default("generate"), signerEmail: z.string().email().optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before managing proposals.");
    const { id } = await params;
    const input = schema.parse(await request.json().catch(() => ({})));

    if (input.action === "send") {
      const proposal = await generateProposal({ userId: user.id, dealId: id });
      return ok(await sendForSignature({ userId: user.id, proposalId: proposal.id, signerEmail: input.signerEmail }));
    }
    return ok(await generateProposal({ userId: user.id, dealId: id }));
  } catch (error) {
    return fail(error);
  }
}
