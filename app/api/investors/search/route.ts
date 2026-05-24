import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { searchInvestorCandidates } from "@/lib/integrations/investor-provider";

const schema = z.object({
  campaignId: z.string().uuid().optional(),
  thesis: z.string().min(2),
  stage: z.string().optional(),
  geography: z.string().optional(),
  count: z.number().int().min(1).max(50).default(10),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before searching investors.");
    const profile = await getCurrentProfile();
    const input = schema.parse(await request.json());
    const result = await searchInvestorCandidates({ userId: user.id, campaignId: input.campaignId, thesis: input.thesis, stage: input.stage, geography: input.geography, count: input.count });
    const db = createServiceClient();
    const rows = [];
    for (const candidate of result.candidates) {
      const { data, error } = await db.from("investor_profiles").insert({
        user_id: user.id,
        workspace_id: profile?.workspace_id ?? null,
        campaign_id: input.campaignId ?? null,
        name: candidate.name,
        firm: candidate.firm,
        thesis: candidate.thesis,
        data_sources: [{
          provider: result.provider,
          source_url: candidate.source_url,
          collected_at: new Date().toISOString(),
          confidence: candidate.match_score,
          allowed_channels: candidate.allowed_channels,
        }],
        match_score: candidate.match_score,
        allowed_outreach_channels: candidate.allowed_channels,
      }).select("*").single();
      if (!error && data) rows.push(data);
    }
    return ok({ provider: result.provider, investors: rows });
  } catch (error) {
    return fail(error);
  }
}
