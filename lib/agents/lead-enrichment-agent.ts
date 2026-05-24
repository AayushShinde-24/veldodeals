import "server-only";

import { fetchLeadBundle, getDb, logAgent, saveDecision, updateLeadStage } from "@/lib/agents/agent-helpers";
import { leadEnrichmentOutputSchema, type AgentContext, type LeadEnrichmentOutput } from "@/lib/agents/schemas";

export async function runLeadEnrichmentAgent(input: Record<string, unknown>, context: AgentContext): Promise<LeadEnrichmentOutput> {
  if (!context.leadId) throw new Error("lead_id is required for enrichment.");
  const db = getDb();
  const { lead } = await fetchLeadBundle(db, context.leadId);
  const supplied = input.enrichment && typeof input.enrichment === "object" ? input.enrichment : {};

  const output = leadEnrichmentOutputSchema.parse({
    lead_id: context.leadId,
    enriched_profile: {
      title: lead.title,
      seniority: inferSeniority(lead.title),
      department: inferDepartment(lead.title),
      linkedin_url: lead.linkedin_url,
      ...supplied,
    },
    company_data: {
      company: lead.company,
      website: lead.company_website,
      industry: lead.industry,
    },
    social_profiles: lead.linkedin_url ? [{ type: "linkedin", url: lead.linkedin_url }] : [],
    conflicts: [],
    confidence: lead.title && lead.company_website ? 72 : 55,
    needs_review: !(lead.title && lead.company_website),
  });

  await db.from("lead_enrichment").upsert({
    user_id: context.userId,
    campaign_id: context.campaignId,
    lead_id: context.leadId,
    enriched_profile: output.enriched_profile,
    company_data: output.company_data,
    social_profiles: output.social_profiles,
    conflicts: output.conflicts,
    confidence: output.confidence,
    needs_review: output.needs_review,
  }, { onConflict: "lead_id" });

  await updateLeadStage(db, context.leadId, "enriched");
  await logAgent(db, { ...context, agentName: "lead_enrichment" }, "Lead enrichment saved.", "info", { confidence: output.confidence });
  await saveDecision(db, { ...context, agentName: "lead_enrichment" }, output, output.confidence, output.needs_review);
  return output;
}

function inferSeniority(title?: string | null) {
  const value = title?.toLowerCase() ?? "";
  if (/(founder|owner|ceo|chief|president)/u.test(value)) return "executive";
  if (/(vp|vice president|head)/u.test(value)) return "leadership";
  if (/(manager|lead|director)/u.test(value)) return "manager";
  return "individual_contributor";
}

function inferDepartment(title?: string | null) {
  const value = title?.toLowerCase() ?? "";
  if (/(sales|revenue|growth|business development|bd)/u.test(value)) return "sales";
  if (/(marketing|demand|brand|content)/u.test(value)) return "marketing";
  if (/(people|hr|talent)/u.test(value)) return "people";
  if (/(engineering|product|technology|cto)/u.test(value)) return "product_engineering";
  return "general";
}
