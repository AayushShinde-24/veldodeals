import { createServiceClient } from "@/lib/integrations/supabase";
import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";
import { generateStructured, clampScore } from "@/lib/agents/structured";

export interface ResearchResult {
  leadId: string;
  summary: string;
  confidence: number;
  signal: string | null;
}

interface ResearchPayload {
  summary: string;
  confidence: number;
  best_signal: string | null;
}

/**
 * Research a lead's company. Uses Tavily web search when TAVILY_API_KEY is set (raising
 * confidence with real context); otherwise reasons from the stored lead fields at lower
 * confidence. Writes one row to company_research + a signal to signals.
 */
export async function researchCompany(input: {
  userId: string;
  leadId: string;
}): Promise<ResearchResult> {
  const db = createServiceClient();

  const { data: lead } = await db
    .from("leads")
    .select("company, title, first_name, last_name, email, linkedin_url")
    .eq("id", input.leadId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!lead) throw new Error("Lead not found for research.");

  const webContext = await tavilyContext(lead.company ?? lead.email ?? "");
  const hasWeb = webContext.length > 0;

  const { data } = await generateStructured<ResearchPayload>({
    system:
      "You are a B2B sales researcher. Summarize what matters about a prospect's company for outreach: what they do, recent signals (hiring, funding, launches, pain points), and one timely hook. Be factual; never invent specifics. If evidence is thin, say so and lower confidence.",
    prompt: [
      `Company: ${lead.company ?? "(unknown)"}`,
      `Contact: ${[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "(unknown)"}, ${lead.title ?? "(unknown title)"}`,
      lead.linkedin_url ? `LinkedIn: ${lead.linkedin_url}` : "",
      hasWeb ? `\nWeb research:\n${webContext}` : "\n(No live web research available.)",
      `\nReturn JSON: { "summary": string (2-4 sentences), "confidence": number 0-100, "best_signal": string|null }`,
    ]
      .filter(Boolean)
      .join("\n"),
    tier: "balanced",
    maxTokens: 700,
  });

  // Confidence is capped without live web evidence to keep the research gate honest.
  const confidence = hasWeb ? clampScore(data.confidence) : Math.min(55, clampScore(data.confidence, 40));
  const summary = (data.summary ?? "").trim();
  const signal = data.best_signal?.trim() || null;

  await db.from("company_research").insert({
    user_id: input.userId,
    lead_id: input.leadId,
    summary,
    confidence,
    created_at: new Date().toISOString(),
  });

  if (signal) {
    await db.from("signals").insert({
      user_id: input.userId,
      lead_id: input.leadId,
      signal_type: "research",
      content: signal,
      best_signal: signal,
      created_at: new Date().toISOString(),
    });
  }

  return { leadId: input.leadId, summary, confidence, signal };
}

async function tavilyContext(query: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY;
  if (!key || !query) return "";
  try {
    const res = await fetchWithRetry(
      "https://api.tavily.com/search",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: key,
          query: `${query} company overview recent news`,
          max_results: 5,
          search_depth: "basic",
        }),
      },
      { provider: "tavily", endpoint: "search", shouldRetry: isTransientError, timeoutMs: 15_000 }
    );
    if (!res.ok) return "";
    const data = (await res.json()) as { results?: { title?: string; content?: string }[] };
    return (data.results ?? [])
      .slice(0, 5)
      .map((r) => `- ${r.title ?? ""}: ${(r.content ?? "").slice(0, 280)}`)
      .join("\n");
  } catch {
    return "";
  }
}
