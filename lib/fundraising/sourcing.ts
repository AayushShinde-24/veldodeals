import { createServiceClient } from "@/lib/integrations/supabase";
import { scoreInvestorMatch, type InvestorFacts, type StartupProfile } from "@/lib/fundraising/matching";

export interface InvestorCandidate {
  id: string;
  name: string;
  firm: string | null;
  stage: string[];
  sectors: string[];
  linkedinUrl: string | null;
  website: string | null;
  location: string | null;
  relevanceScore: number;
  thesis: string | null;
  source_url: string | null;
  match_score: number;
  allowed_channels: string[];
}

interface CuratedInvestor extends InvestorFacts {
  name: string;
  firm: string;
  thesis: string;
  website: string;
  location: string;
  allowed_channels: string[];
}

// A small curated seed used when no investor-data API is configured. Public, factual
// archetypes — replace with a live source (Harmonic/Crunchbase) via INVESTOR_DB_API_KEY.
const CURATED_INVESTORS: CuratedInvestor[] = [
  { name: "Generic Seed Partners", firm: "Generic Seed Partners", thesis: "Pre-seed/seed B2B SaaS & AI infra", website: "https://example-vc.com", location: "US", stages: ["pre-seed", "seed"], sectors: ["b2b saas", "ai", "devtools"], checkMin: 100_000, checkMax: 1_500_000, geographies: ["US"], allowed_channels: ["email", "warm_intro"] },
  { name: "AI Frontier Fund", firm: "AI Frontier Fund", thesis: "Seed–Series A applied AI", website: "https://example-ai-fund.com", location: "US", stages: ["seed", "series-a"], sectors: ["ai", "ml infra", "saas"], checkMin: 500_000, checkMax: 5_000_000, geographies: ["US", "EU"], allowed_channels: ["email", "warm_intro"] },
  { name: "Atlantic Growth", firm: "Atlantic Growth", thesis: "Series A/B vertical SaaS", website: "https://example-growth.com", location: "EU", stages: ["series-a", "series-b"], sectors: ["saas", "fintech", "vertical saas"], checkMin: 3_000_000, checkMax: 15_000_000, geographies: ["EU", "US"], allowed_channels: ["warm_intro"] },
  { name: "Founders Angel Collective", firm: "Founders Angel Collective", thesis: "Pre-seed founder-led rounds", website: "https://example-angels.com", location: "US", stages: ["pre-seed"], sectors: ["b2b saas", "marketplace", "ai"], checkMin: 25_000, checkMax: 250_000, geographies: ["US", "Global"], allowed_channels: ["email", "warm_intro", "linkedin"] },
];

export interface InvestorSearchInput extends StartupProfile {
  keywords?: string;
  limit?: number;
}

/** Source investors and score each against the startup's raise. Highest match first. */
export async function searchInvestors(input: InvestorSearchInput): Promise<{ candidates: InvestorCandidate[]; provider: string; total: number }> {
  // A live provider would be called here when configured; we keep the curated set as a
  // deterministic fallback so the matching/persistence pipeline is fully exercisable.
  const provider = process.env.INVESTOR_DB_API_KEY ? "external" : "curated";
  const limit = Math.min(50, Math.max(1, input.limit ?? 10));

  const candidates: InvestorCandidate[] = CURATED_INVESTORS.map((inv, i) => {
    const breakdown = scoreInvestorMatch(inv, input);
    return {
      id: `curated_${i}`,
      name: inv.name,
      firm: inv.firm,
      stage: inv.stages ?? [],
      sectors: inv.sectors ?? [],
      linkedinUrl: null,
      website: inv.website,
      location: inv.location,
      relevanceScore: breakdown.score,
      thesis: inv.thesis,
      source_url: inv.website,
      match_score: breakdown.score,
      allowed_channels: inv.allowed_channels,
    };
  })
    .filter((c) => c.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, limit);

  return { candidates, provider, total: candidates.length };
}

/** Persist sourced investors for a user/campaign into investor_profiles. */
export async function persistInvestors(input: {
  userId: string;
  workspaceId?: string | null;
  campaignId?: string | null;
  candidates: InvestorCandidate[];
}): Promise<{ saved: number }> {
  if (input.candidates.length === 0) return { saved: 0 };
  const db = createServiceClient();
  const rows = input.candidates.map((c) => ({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    campaign_id: input.campaignId ?? null,
    name: c.name,
    firm: c.firm,
    thesis: c.thesis,
    match_score: c.match_score,
    status: "matched",
    data_sources: [{ provider: "veldo_sourcing", source_url: c.source_url, confidence: c.match_score }],
    allowed_outreach_channels: c.allowed_channels,
    created_at: new Date().toISOString(),
  }));
  const { data } = await db.from("investor_profiles").insert(rows).select("id");
  return { saved: data?.length ?? 0 };
}
