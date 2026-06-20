export interface InvestorSearchQuery {
  userId?: string;
  campaignId?: string;
  stage?: string | string[];
  sectors?: string[];
  checkSize?: { min?: number; max?: number };
  geography?: string | string[];
  keywords?: string;
  thesis?: string;
  count?: number;
}

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

export async function searchInvestorCandidates(
  query: InvestorSearchQuery,
  _userId?: string
): Promise<{ investors: InvestorCandidate[]; candidates: InvestorCandidate[]; total: number; provider: string }> {
  const { searchInvestors } = await import("@/lib/fundraising/sourcing");
  const toArr = (v: string | string[] | undefined): string[] =>
    Array.isArray(v) ? v : v ? [v] : [];

  const sectors = [
    ...(query.sectors ?? []),
    ...(query.thesis ? query.thesis.split(/[,\s]+/u).filter((t) => t.length > 2) : []),
  ];

  const result = await searchInvestors({
    stage: toArr(query.stage)[0] ?? null,
    sectors,
    geography: toArr(query.geography)[0] ?? null,
    targetCheck: query.checkSize?.max ?? query.checkSize?.min ?? null,
    keywords: query.keywords,
    limit: query.count ?? 10,
  });

  const candidates = result.candidates as unknown as InvestorCandidate[];
  return { investors: candidates, candidates, total: result.total, provider: result.provider };
}
