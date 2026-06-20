// Pure investor↔startup matching. Scores how well an investor fits a raising startup
// on the dimensions that actually drive a yes: stage, sector, check size, geography.

export interface StartupProfile {
  stage?: string | null;          // e.g. "pre-seed" | "seed" | "series-a"
  sectors?: string[];             // e.g. ["b2b saas", "ai"]
  roundSize?: number | null;      // total raise (USD)
  targetCheck?: number | null;    // desired check from this investor (USD)
  geography?: string | null;      // e.g. "US"
}

export interface InvestorFacts {
  stages?: string[];
  sectors?: string[];
  checkMin?: number | null;
  checkMax?: number | null;
  geographies?: string[];
}

export interface MatchBreakdown {
  score: number;            // 0-100
  stage: number;
  sector: number;
  check: number;
  geography: number;
}

const norm = (s: string): string => s.trim().toLowerCase().replace(/[\s_]+/gu, "-");
const overlaps = (a: string[] = [], b: string[] = []): boolean => {
  const setB = new Set(b.map(norm));
  return a.map(norm).some((x) => setB.has(x));
};

// Weights sum to 100.
const W = { stage: 35, sector: 30, check: 20, geography: 15 };

/**
 * Score an investor against a startup's raise (0-100). Each dimension contributes its
 * weight when it matches; partial credit where it makes sense. Pure + unit-testable.
 */
export function scoreInvestorMatch(investor: InvestorFacts, startup: StartupProfile): MatchBreakdown {
  // Stage: exact stage match earns full weight.
  const stage =
    startup.stage && (investor.stages ?? []).map(norm).includes(norm(startup.stage)) ? W.stage : 0;

  // Sector: any overlap earns full weight (investors list a handful of themes).
  const sector = overlaps(startup.sectors, investor.sectors) ? W.sector : 0;

  // Check size: full weight if the desired check fits the investor's band; half if a
  // band exists but we don't know the target; zero if clearly out of range.
  let check = 0;
  const min = investor.checkMin ?? null;
  const max = investor.checkMax ?? null;
  const target = startup.targetCheck ?? null;
  if (target !== null && (min !== null || max !== null)) {
    const okMin = min === null || target >= min;
    const okMax = max === null || target <= max;
    check = okMin && okMax ? W.check : 0;
  } else if (min !== null || max !== null) {
    check = Math.round(W.check / 2);
  }

  // Geography: overlap (or investor is global / unspecified) earns full weight.
  const investorGeos = investor.geographies ?? [];
  const geography =
    !startup.geography || investorGeos.length === 0 || investorGeos.map(norm).includes(norm(startup.geography))
      ? W.geography
      : 0;

  const score = Math.max(0, Math.min(100, stage + sector + check + geography));
  return { score, stage, sector, check, geography };
}
