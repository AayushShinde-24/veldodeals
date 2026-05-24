import "server-only";

import { companyResearchOutputSchema, type AgentContext, type CompanyResearchOutput } from "@/lib/agents/schemas";
import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage } from "@/lib/agents/agent-helpers";
import { crawlCompanyWebsite } from "@/lib/integrations/firecrawl";
import { generateValidatedJson, loadAgentPrompt } from "@/lib/agents/model-router";

export async function runCompanyResearchAgent(input: Record<string, unknown>, context: AgentContext): Promise<CompanyResearchOutput> {
  if (!context.leadId) throw new Error("lead_id is required for company research.");
  const db = getDb();
  const { lead } = await fetchLeadBundle(db, context.leadId);
  const website = (input.company_website as string | undefined) ?? lead.company_website;
  if (!website) throw new Error("Company website is required for company research.");

  const crawl = await crawlCompanyWebsite(website, context.userId, context.campaignId, context.leadId);
  const markdown = extractMarkdown(crawl);
  const systemPrompt = await loadAgentPrompt("company-research.md");

  const output = await generateValidatedJson({
    route: "claude_premium",
    schema: companyResearchOutputSchema,
    systemPrompt,
    userPrompt: JSON.stringify({
      task: "Summarize the company from public website content only.",
      lead_id: context.leadId,
      company: lead.company,
      website,
      content: markdown.slice(0, 12000),
    }),
    context,
  });

  await db.from("company_research").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    company_summary: output.company_summary,
    target_customers: output.target_customers,
    product_offering: output.product_offering,
    positioning: output.positioning,
    possible_pain_points: output.possible_pain_points,
    useful_pages: output.useful_pages,
    confidence: output.confidence,
  }, { onConflict: "lead_id" });

  await updateLeadStage(db, context.leadId, output.confidence >= 60 ? "researched" : "needs_review");
  await logAgent(db, { ...context, agentName: "company_research" }, "Company research saved.", "info", { confidence: output.confidence });
  await saveDecision(db, { ...context, agentName: "company_research" }, output, output.confidence, output.confidence < 60);
  return output;
}

function extractMarkdown(payload: Record<string, unknown>) {
  const data = payload.data;
  if (data && typeof data === "object" && "markdown" in data) {
    const markdown = (data as { markdown?: unknown }).markdown;
    return typeof markdown === "string" ? markdown : "";
  }
  const markdown = payload.markdown;
  return typeof markdown === "string" ? markdown : JSON.stringify(payload);
}
