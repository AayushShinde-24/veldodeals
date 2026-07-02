import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

export interface ApolloQuery {
  q_keywords?: string;
  person_titles?: string[];
  organization_industry_tag_ids?: string[];
  per_page?: number;
  page?: number;
  [key: string]: unknown;
}

export interface ApolloPerson {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  title: string | null;
  organization_name: string | null;
  linkedin_url: string | null;
}

export interface ApolloResponse {
  people: ApolloPerson[];
  pagination: { total_entries: number; page: number };
}

export async function fetchApolloPeople(
  query: ApolloQuery,
  _userId: string
): Promise<ApolloResponse> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return {
      people: [],
      pagination: { total_entries: 0, page: 1 },
    };
  }

  const body = {
    api_key: apiKey,
    per_page: query.per_page ?? 25,
    page: query.page ?? 1,
    ...query,
  };

  const res = await fetchWithRetry(
    "https://api.apollo.io/v1/mixed_people/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { provider: "apollo", endpoint: "mixed_people.search", shouldRetry: isTransientError, timeoutMs: 20_000 }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Apollo API error: ${err.message ?? res.statusText}`);
  }

  return res.json() as Promise<ApolloResponse>;
}
