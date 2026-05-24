import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/integrations/supabase";
import { recordCreditUsage } from "@/lib/billing/credits";
import { targetOutcomeRates } from "@/lib/revenue-os/pricing";
import { fetchApolloPeople } from "@/lib/integrations/apollo";
import { crawlCompanyWebsite } from "@/lib/integrations/firecrawl";
import { generateValidatedJson } from "@/lib/agents/model-router";
import { hasSecret } from "@/lib/security/env";
import { assertComplianceReady } from "@/src/lib/mvp/compliance";
import { logMvpError } from "@/src/lib/mvp/error-log";
import { incrementUsage } from "@/src/lib/mvp/usage";
import { ensureDefaultWorkspace, isMissingSchemaError } from "@/src/lib/workspace/context";

export const mvpCampaignInputSchema = z.object({
  name: z.string().min(2),
  product_offer: z.string().min(2),
  goal: z.string().min(2),
  target_niche: z.string().min(1),
  industry: z.string().min(1),
  location: z.string().optional().default(""),
  company_size: z.string().optional().default(""),
  job_titles: z.string().min(1),
  number_of_leads: z.coerce.number().int().min(1).max(50).default(10),
  tone: z.string().min(1).default("clear, direct, professional"),
  call_to_action: z.string().min(1),
  sending_mode: z.enum(["draft_only", "approval_required", "auto_send"]).default("approval_required"),
  campaign_type: z.enum(["sales", "fundraising", "distribution", "hybrid"]).default("sales"),
  hyper_personalization: z.coerce.boolean().default(false),
});

const generatedEmailSchema = z.object({
  subject: z.string().min(1),
  opening_line: z.string().optional().default(""),
  preview_line: z.string().optional().default(""),
  body: z.string().min(1),
  cta: z.string().min(1),
  follow_up_1: z.string().optional().default(""),
  follow_up_2: z.string().optional().default(""),
  personalization_reason: z.string().min(1),
});

type ApolloPerson = Record<string, unknown>;

export async function createCampaignAndRun(userId: string, raw: unknown) {
  const input = mvpCampaignInputSchema.parse(raw);
  await assertComplianceReady(userId);
  const campaign = await createAgentCampaign(userId, input, "fetching_leads");

  try {
    const leads = await fetchLeadsForCampaign(userId, campaign.id);
    await dbStatus(campaign.id, leads.length ? "leads_ready" : "failed");
    if (!leads.length) throw new Error("Lead search returned no usable leads.");

    await dbStatus(campaign.id, "generating_emails");
    await researchLeadsForCampaign(userId, campaign.id);
    await writeEmailsForCampaign(userId, campaign.id);
    await dbStatus(campaign.id, "ready_to_send");
  } catch (flowError) {
    await dbStatus(campaign.id, "failed");
    await logMvpError({ userId, campaignId: campaign.id, source: "campaign_flow", errorCode: "campaign_run_failed", error: flowError });
  }

  const { data: refreshed } = await createServiceClient().from("campaigns").select("*").eq("id", campaign.id).single();
  return refreshed ?? campaign;
}

export async function createAgentCampaign(userId: string, raw: unknown, status = "draft") {
  const input = mvpCampaignInputSchema.parse(raw);
  const db = createServiceClient();
  const workspace = await ensureDefaultWorkspace(userId);
  const jobTitles = input.job_titles.split(",").map((item) => item.trim()).filter(Boolean);

  const payload = {
    user_id: userId,
    ...(workspace.schemaMode === "workspace" ? { workspace_id: workspace.workspaceId } : {}),
    name: input.name,
    goal: input.goal,
    product_offer: input.product_offer,
    target_niche: input.target_niche,
    industry: input.industry,
    location: input.location,
    company_size: input.company_size,
    job_titles: jobTitles,
    number_of_leads: input.number_of_leads,
    tone: input.tone,
    call_to_action: input.call_to_action,
    product_name: input.product_offer,
    product_description: input.product_offer,
    offer: input.product_offer,
    target_audience: input.target_niche,
    target_companies: input.company_size,
    desired_outcome: input.goal,
    sending_mode: input.sending_mode,
    campaign_type: input.campaign_type,
    channel_mix: { email: true, calls: input.campaign_type === "hybrid", fundraising: input.campaign_type === "fundraising" || input.campaign_type === "hybrid" },
    target_outcomes: {
      meeting_rate_pct: targetOutcomeRates.meetingRatePct,
      email_deal_rate_pct: targetOutcomeRates.emailDealRatePct,
      call_deal_rate_pct: targetOutcomeRates.callDealRatePct,
    },
    revenue_workflow_state: "researching",
    workflow_progress: 10,
    offer_json: { product_offer: input.product_offer, call_to_action: input.call_to_action },
    icp_json: { target_niche: input.target_niche, industry: input.industry, location: input.location, company_size: input.company_size, job_titles: jobTitles },
    status,
  };

  const created = await insertCampaignWithLegacyFallback(db, payload);
  const { data: campaign, error } = created;
  if (error) throw new Error(error.message);
  return campaign;
}

export async function fetchLeadsForCampaign(userId: string, campaignId: string) {
  const db = createServiceClient();
  const { data: campaign, error } = await db.from("campaigns").select("*").eq("user_id", userId).eq("id", campaignId).single();
  if (error || !campaign) throw new Error("Campaign not found.");
  await db.from("campaigns").update({ status: "fetching_leads" }).eq("id", campaignId);
  const input = campaignToInput(campaign);
  const leads = await fetchAndStoreApolloLeads(userId, campaignId, input);
  await db.from("campaigns").update({ status: leads.length ? "leads_ready" : "failed" }).eq("id", campaignId);
  return leads;
}

export async function researchLeadsForCampaign(userId: string, campaignId: string) {
  const db = createServiceClient();
  const { data: leads, error } = await db.from("leads").select("*").eq("user_id", userId).eq("campaign_id", campaignId);
  if (error) throw new Error(error.message);
  const enriched = [];
  for (const lead of leads ?? []) {
    enriched.push(await enrichLeadBestEffort(userId, campaignId, lead));
  }
  return enriched.filter(Boolean);
}

export async function writeEmailsForCampaign(userId: string, campaignId: string) {
  const db = createServiceClient();
  const [{ data: campaign }, { data: leads }] = await Promise.all([
    db.from("campaigns").select("*").eq("user_id", userId).eq("id", campaignId).single(),
    db.from("leads").select("*").eq("user_id", userId).eq("campaign_id", campaignId),
  ]);
  if (!campaign) throw new Error("Campaign not found.");
  await db.from("campaigns").update({ status: "generating_emails" }).eq("id", campaignId);
  const generated = [];
  for (const lead of leads ?? []) {
    const { data: enrichment } = await db.from("lead_enrichment").select("*").eq("lead_id", lead.id).maybeSingle();
    generated.push(await generateEmailForLead(userId, campaignId, campaign, lead, enrichment));
  }
  await db.from("campaigns").update({ status: "ready_to_send" }).eq("id", campaignId);
  return generated.filter(Boolean);
}

async function fetchAndStoreApolloLeads(userId: string, campaignId: string, input: z.infer<typeof mvpCampaignInputSchema>) {
  const db = createServiceClient();
  const workspace = await ensureDefaultWorkspace(userId);
  try {
    const apollo = await fetchApolloPeople({
      q_keywords: [input.industry, input.target_niche, input.location, input.company_size].filter(Boolean).join(" "),
      person_titles: input.job_titles.split(",").map((item) => item.trim()).filter(Boolean),
      page: 1,
      per_page: input.number_of_leads,
    }, userId);
    const people = extractPeople(apollo).slice(0, input.number_of_leads);
    const saved = [];
    for (const person of people) {
      const lead = normalizeApolloPerson(person);
      if (!lead.email || !lead.company) continue;
      const { data, error } = await db.from("leads").upsert({
        user_id: userId,
        campaign_id: campaignId,
        ...(workspace.schemaMode === "workspace" ? { workspace_id: workspace.workspaceId } : {}),
        first_name: lead.first_name,
        last_name: lead.last_name,
        full_name: lead.full_name,
        email: lead.email,
        email_status: lead.email_status,
        title: lead.title,
        company: lead.company,
        company_website: lead.company_website,
        linkedin_url: lead.linkedin_url,
        location: lead.location,
        industry: lead.industry,
        source: "apollo",
        source_record_id: stringOrNull(person.id) ?? stringOrNull(person.contact_id),
        data_sources: [{
          provider: "apollo",
          source_url: stringOrNull(person.linkedin_url) ?? stringOrNull(lead.linkedin_url),
          source_record_id: stringOrNull(person.id) ?? stringOrNull(person.contact_id),
          collected_at: new Date().toISOString(),
          confidence: scoreLead(lead),
          allowed_channels: ["email"],
        }],
        allowed_outreach_channels: ["email"],
        personalization_tier: input.hyper_personalization ? "hyper" : "standard",
        score: scoreLead(lead),
        score_reason: scoreReason(lead),
        provider_metadata: { provider: "apollo", source_record_id: stringOrNull(person.id) ?? stringOrNull(person.contact_id) },
        status: "fetched",
        stage: "imported",
        enrichment_status: "not_started",
        raw_json: person,
      }, { onConflict: "email,campaign_id" }).select("*").single();
      if (!error && data) saved.push(data);
    }
    await incrementUsage(userId, "leads_fetched", saved.length);
    if (saved.length) {
      await recordCreditUsage({
        userId,
        workspaceId: workspace.schemaMode === "workspace" ? workspace.workspaceId : null,
        campaignId,
        action: "lead_scrape",
        quantity: saved.length,
        metadata: { source: "lead_search" },
      });
    }
    return saved;
  } catch (error) {
    await logMvpError({ userId, campaignId, source: "apollo", errorCode: "apollo_fetch_failed", error });
    throw error;
  }
}

async function enrichLeadBestEffort(userId: string, campaignId: string, lead: Record<string, unknown>) {
  const db = createServiceClient();
  try {
    let websiteSummary = "";
    if (typeof lead.company_website === "string" && lead.company_website) {
      const crawl = await crawlCompanyWebsite(lead.company_website, userId, campaignId, String(lead.id));
      websiteSummary = extractMarkdown(crawl).slice(0, 3500);
    }
    const enrichment = {
      company_description: websiteSummary ? websiteSummary.slice(0, 1000) : `${lead.company ?? "Company"} context from lead data.`,
      website_summary: websiteSummary,
      lead_role_context: `${lead.title ?? "Prospect"} at ${lead.company ?? "their company"}`,
      pain_points: inferPainPoints(String(lead.title ?? ""), String(lead.industry ?? "")),
      personalization_angle: `Reference their role and likely ${lead.industry ?? "business"} priorities without inventing facts.`,
      recent_company_info: "",
    };
    const { data } = await db.from("lead_enrichment").upsert({
      user_id: userId,
      campaign_id: campaignId,
      lead_id: lead.id,
      enriched_profile: {
        lead_role_context: enrichment.lead_role_context,
        pain_points: enrichment.pain_points,
        personalization_angle: enrichment.personalization_angle,
        recent_company_info: enrichment.recent_company_info,
      },
      company_data: {
        company_description: enrichment.company_description,
        website_summary: enrichment.website_summary,
      },
      enrichment_source: websiteSummary ? "firecrawl" : "apollo",
      enrichment_status: "completed",
      enrichment_error: null,
      company_summary: enrichment.company_description,
      website_summary: enrichment.website_summary,
      product_service_summary: enrichment.company_description,
      pain_points: enrichment.pain_points,
      personalization_signals: [enrichment.personalization_angle],
      buying_triggers: enrichment.recent_company_info ? [enrichment.recent_company_info] : [],
      confidence: websiteSummary ? 72 : 55,
      needs_review: !websiteSummary,
    }, { onConflict: "lead_id" }).select("*").single();
    await db.from("leads").update({ enrichment_status: "completed", status: "enriched" }).eq("id", lead.id);
    await incrementUsage(userId, "leads_enriched", 1);
    return data ?? enrichment;
  } catch (error) {
    await db.from("leads").update({ enrichment_status: "failed", status: "enrichment_failed" }).eq("id", lead.id);
    await logMvpError({ userId, campaignId, source: "enrichment", errorCode: "lead_enrichment_failed", error });
    return null;
  }
}

async function generateEmailForLead(
  userId: string,
  campaignId: string,
  campaign: Record<string, unknown>,
  lead: Record<string, unknown>,
  enrichment: Record<string, unknown> | null,
) {
  const db = createServiceClient();
  try {
    const output = await generateValidatedJson({
      route: hasSecret("ANTHROPIC_API_KEY") ? "claude_premium" : "openai_control",
      schema: generatedEmailSchema,
      systemPrompt: [
        "You write short compliant B2B outreach emails.",
        "Return strict JSON with subject, opening_line, preview_line, body, cta, follow_up_1, follow_up_2, personalization_reason.",
        "Never invent facts. No misleading subjects. No spammy words. No fake familiarity.",
        "Do not include an unsubscribe footer; the sender system appends it later.",
      ].join("\n"),
      userPrompt: JSON.stringify({ campaign, lead, enrichment }),
      context: { userId, campaignId, leadId: String(lead.id) },
    });
    const { data, error } = await db.from("generated_emails").upsert({
      user_id: userId,
      ...(await optionalWorkspaceField(userId, campaign.workspace_id)),
      campaign_id: campaignId,
      lead_id: lead.id,
      subject: output.subject,
      opening_line: output.opening_line,
      preview_line: output.preview_line,
      body: output.body,
      cta: output.cta,
      follow_up_1: output.follow_up_1,
      follow_up_2: output.follow_up_2,
      personalization_reason: output.personalization_reason,
      status: "drafted",
    }, { onConflict: "lead_id,campaign_id" }).select("*").single();
    if (error) throw new Error(error.message);
    await db.from("leads").update({ status: "email_generated", stage: "drafted" }).eq("id", lead.id);
    await incrementUsage(userId, "emails_generated", 1);
    return data;
  } catch (error) {
    await db.from("generated_emails").upsert({
      user_id: userId,
      campaign_id: campaignId,
      lead_id: lead.id,
      subject: "Generation failed",
      body: "Email generation failed. Retry after checking provider configuration.",
      status: "failed",
      error_message: error instanceof Error ? error.message : "AI generation failed",
    }, { onConflict: "lead_id,campaign_id" });
    await logMvpError({ userId, campaignId, source: "ai_generation", errorCode: "email_generation_failed", error });
    return null;
  }
}

function extractPeople(apollo: Record<string, unknown>): ApolloPerson[] {
  const people = apollo.people ?? apollo.contacts ?? apollo.results ?? apollo.data;
  return Array.isArray(people) ? people.filter((item): item is ApolloPerson => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
}

function normalizeApolloPerson(person: ApolloPerson) {
  const organization = isRecord(person.organization) ? person.organization : {};
  const firstName = stringOrNull(person.first_name);
  const lastName = stringOrNull(person.last_name);
  const fullName = stringOrNull(person.name) ?? [firstName, lastName].filter(Boolean).join(" ");
  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName || null,
    email: stringOrNull(person.email),
    email_status: stringOrNull(person.email_status) ?? stringOrNull(person.email_status_cd) ?? "unknown",
    title: stringOrNull(person.title),
    company: stringOrNull(person.organization_name) ?? stringOrNull(person.company) ?? stringOrNull(organization.name),
    company_website: stringOrNull(person.company_website) ?? stringOrNull(organization.website_url),
    linkedin_url: stringOrNull(person.linkedin_url),
    location: stringOrNull(person.city) ?? stringOrNull(person.location),
    industry: stringOrNull(person.industry) ?? stringOrNull(organization.industry),
  };
}

function extractMarkdown(value: Record<string, unknown>) {
  const data = isRecord(value.data) ? value.data : value;
  return stringOrNull(data.markdown) ?? stringOrNull(data.content) ?? JSON.stringify(data);
}

function inferPainPoints(title: string, industry: string) {
  const base = ["improving pipeline quality", "reducing manual research work", "keeping outreach relevant and compliant"];
  if (/sales|revenue|growth/iu.test(title)) base.unshift("booking qualified conversations");
  if (/security|finance|health/iu.test(industry)) base.push("maintaining trust and compliance");
  return base;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function dbStatus(campaignId: string, status: string) {
  const result = await createServiceClient().from("campaigns").update({ status }).eq("id", campaignId);
  if (result.error && /violates check constraint/iu.test(result.error.message)) {
    await createServiceClient().from("campaigns").update({ status: status === "completed" ? "completed" : "running" }).eq("id", campaignId);
  }
}

function campaignToInput(campaign: Record<string, unknown>): z.infer<typeof mvpCampaignInputSchema> {
  return mvpCampaignInputSchema.parse({
    name: campaign.name,
    product_offer: campaign.product_offer ?? campaign.offer_json,
    goal: campaign.goal,
    target_niche: campaign.target_niche ?? "target buyers",
    industry: campaign.industry ?? "business",
    location: campaign.location ?? "",
    company_size: campaign.company_size ?? "",
    job_titles: Array.isArray(campaign.job_titles) ? campaign.job_titles.join(", ") : "Buyer, Procurement, Operations",
    number_of_leads: campaign.number_of_leads ?? 10,
    tone: campaign.tone ?? "clear, direct, professional",
    call_to_action: campaign.call_to_action ?? "Open to a short conversation?",
    sending_mode: campaign.sending_mode ?? "approval_required",
  });
}

function scoreLead(lead: ReturnType<typeof normalizeApolloPerson>) {
  let score = 50;
  if (lead.email) score += 15;
  if (lead.title) score += 10;
  if (lead.company_website) score += 10;
  if (lead.linkedin_url) score += 5;
  return Math.min(score, 95);
}

function scoreReason(lead: ReturnType<typeof normalizeApolloPerson>) {
  const reasons = [];
  if (lead.email) reasons.push("email present");
  if (lead.title) reasons.push("title present");
  if (lead.company_website) reasons.push("company website present");
  if (lead.linkedin_url) reasons.push("linkedin present");
  return reasons.length ? reasons.join(", ") : "basic provider match";
}

async function insertCampaignWithLegacyFallback(db: ReturnType<typeof createServiceClient>, payload: Record<string, unknown>) {
  const full = await db.from("campaigns").insert(payload).select("*").single();
  if (!full.error || !isMissingSchemaError(full.error)) return full;

  return db.from("campaigns").insert({
    user_id: payload.user_id,
    name: payload.name,
    goal: payload.goal,
    offer_json: payload.offer_json,
    icp_json: payload.icp_json,
    status: payload.status === "draft" ? "draft" : "running",
  }).select("*").single();
}

async function optionalWorkspaceField(userId: string, existing: unknown) {
  if (typeof existing === "string" && existing) return { workspace_id: existing };
  const workspace = await ensureDefaultWorkspace(userId);
  return workspace.schemaMode === "workspace" ? { workspace_id: workspace.workspaceId } : {};
}
