import { createServiceClient } from "@/lib/integrations/supabase";
import { generateText } from "@/lib/ai/router";
import { recordDealClose } from "@/lib/billing/deal-fees";

// Fundraising outreach must never make securities-law-violating claims (guaranteed
// returns, fabricated traction). Anything matching these is force-flagged for legal review.
const PROHIBITED = /\b(guarantee[ds]?|risk[\s-]?free|riskless|assured returns?|can'?t lose|will (?:double|triple|\d+x)|promised returns?)\b/iu;

/** Pure: does the draft contain prohibited securities claims? (unit-testable) */
export function containsProhibitedClaims(text: string): boolean {
  return PROHIBITED.test(text ?? "");
}

export interface InvestorOutreachResult {
  taskId: string | null;
  body: string;
  needsLegalReview: boolean;
}

/**
 * Draft compliant investor outreach for a matched investor. The model is constrained to
 * fact-based, non-guaranteeing language; output is scanned and flagged for legal review
 * if it slips. Persisted as a fundraising_task — never auto-sent.
 */
export async function draftInvestorOutreach(input: {
  userId: string;
  campaignId?: string | null;
  investorName: string;
  firm?: string | null;
  thesis?: string | null;
  startupSummary: string;
  channel?: string;
}): Promise<InvestorOutreachResult> {
  const channel = input.channel ?? "email";
  let body = "";
  try {
    const result = await generateText({
      system:
        "You draft investor outreach for a founder. STRICT RULES: never guarantee or promise returns; never invent traction, revenue, or mutual connections; no hype. State only provided facts, the round, and a clear ask for a meeting. Concise and credible.",
      messages: [
        {
          role: "user",
          content: [
            `Investor: ${input.investorName}${input.firm ? ` (${input.firm})` : ""}`,
            input.thesis ? `Their thesis: ${input.thesis}` : "",
            `About us: ${input.startupSummary}`,
            `Channel: ${channel}`,
            "\nWrite a short outreach message asking for a 20-minute intro call.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      tier: "balanced",
      maxTokens: 600,
    });
    body = result.text.trim();
  } catch {
    body = `Hi ${input.investorName}, I'm raising for my company and believe it fits your thesis. Open to a 20-minute intro call?`;
  }

  const needsLegalReview = containsProhibitedClaims(body);

  const db = createServiceClient();
  const { data } = await db
    .from("fundraising_tasks")
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId ?? null,
      outreach_channel: channel,
      pitch_angle: body.slice(0, 280),
      status: needsLegalReview ? "needs_review" : "draft",
      needs_legal_review: needsLegalReview,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return { taskId: data?.id ?? null, body, needsLegalReview };
}

/**
 * Record a closed fundraising round — attributes Veldo's 2.5% success fee on the raised
 * amount and marks the investor committed. (#33 fee attribution for fundraising.)
 */
export async function recordFundraisingClose(input: {
  userId: string;
  workspaceId?: string | null;
  amount: number;
  investorId?: string | null;
}): Promise<{ feeAmount: number }> {
  const fee = await recordDealClose({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    dealType: "fundraising",
    dealValue: input.amount,
  });

  if (input.investorId) {
    const db = createServiceClient();
    await db.from("investor_profiles").update({ status: "committed" }).eq("id", input.investorId).eq("user_id", input.userId);
  }

  return { feeAmount: fee.feeAmount };
}
