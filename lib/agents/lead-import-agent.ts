import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { leadImportOutputSchema, type AgentContext, type LeadImportOutput } from "@/lib/agents/schemas";

type RawLead = Record<string, unknown>;

export async function runLeadImportAgent(input: Record<string, unknown>, context: AgentContext): Promise<LeadImportOutput> {
  const db = getDb();
  const rawLeads = extractRawLeads(input.apollo_response ?? input.leads ?? input.rows);
  const seen = new Set<string>();
  const valid: LeadImportOutput["valid_leads"] = [];
  const rejected: LeadImportOutput["rejected_leads"] = [];
  let duplicateCount = 0;

  for (const raw of rawLeads) {
    const normalized = normalizeLead(raw);
    const dedupeKey = [normalized.email?.toLowerCase(), normalized.linkedin_url?.toLowerCase()].filter(Boolean).join("|");

    if (!normalized.email || !normalized.company) {
      rejected.push({ raw, reason: "Missing required email or company." });
      continue;
    }
    if (seen.has(dedupeKey)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(dedupeKey);
    valid.push(normalized as LeadImportOutput["valid_leads"][number]);
  }

  const output = leadImportOutputSchema.parse({
    valid_leads: valid,
    rejected_leads: rejected,
    duplicate_count: duplicateCount,
    import_quality_score: rawLeads.length === 0 ? 0 : Math.round((valid.length / rawLeads.length) * 100),
    notes: `${valid.length} valid leads, ${rejected.length} rejected, ${duplicateCount} duplicates.`,
  });

  if (context.campaignId) {
    const campaign = await db.from("campaigns").select("workspace_id").eq("id", context.campaignId).maybeSingle();
    for (const lead of output.valid_leads) {
      await db.from("leads").upsert(
        {
          user_id: context.userId,
          workspace_id: campaign.data?.workspace_id ?? null,
          campaign_id: context.campaignId,
          ...lead,
          source: "apollo",
          enrichment_status: "not_started",
          raw_json: lead,
        },
        { onConflict: "email,campaign_id", ignoreDuplicates: false },
      );
    }
  }

  await logAgent(db, { ...context, agentName: "lead_import" }, output.notes, "info", {
    valid_count: output.valid_leads.length,
    rejected_count: output.rejected_leads.length,
  });
  await saveDecision(db, { ...context, agentName: "lead_import" }, output, output.import_quality_score, output.import_quality_score < 60);

  return output;
}

function extractRawLeads(value: unknown): RawLead[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value)) {
    const people = value.people ?? value.contacts ?? value.results ?? value.data;
    if (Array.isArray(people)) return people.filter(isRecord);
  }
  return [];
}

function normalizeLead(raw: RawLead) {
  const organization = isRecord(raw.organization) ? raw.organization : {};
  return {
    first_name: stringOrNull(raw.first_name),
    last_name: stringOrNull(raw.last_name),
    email: stringOrNull(raw.email),
    title: stringOrNull(raw.title),
    company: stringOrNull(raw.company) ?? stringOrNull(raw.organization_name) ?? stringOrNull(organization.name),
    company_website: stringOrNull(raw.company_website) ?? stringOrNull(organization.website_url),
    linkedin_url: stringOrNull(raw.linkedin_url),
    industry: stringOrNull(raw.industry) ?? stringOrNull(organization.industry),
    location: stringOrNull(raw.city) ?? stringOrNull(raw.location),
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is RawLead {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
