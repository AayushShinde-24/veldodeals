import "server-only";

import { z } from "zod";
import { fetchApolloPeople } from "@/lib/integrations/apollo";
import { crawlCompanyWebsite } from "@/lib/integrations/firecrawl";
import { createServiceClient } from "@/lib/integrations/supabase";
import { searchPublicSignals } from "@/lib/integrations/tavily";
import { getEnv, hasSecret } from "@/lib/security/env";
import { isMissingSchemaError } from "@/src/lib/workspace/context";

const generateLeadsSchema = z.object({
  count: z.coerce.number().int().min(1).max(500),
  keywords: z.string().trim().default("B2B SaaS revenue leaders"),
  location: z.string().trim().default("America"),
  companySize: z.string().trim().optional(),
  titles: z.string().trim().default("Founder, VP Sales, Head of Growth"),
  campaignId: z.string().uuid().optional(),
});

type GenerateLeadsInput = z.infer<typeof generateLeadsSchema> & {
  userId: string;
};

type ProviderNote = {
  provider: string;
  status: "used" | "not_configured" | "skipped" | "failed";
  detail: string;
};

export async function generateLeadsWithApollo(raw: GenerateLeadsInput) {
  const input = generateLeadsSchema.parse(raw);
  const people = await fetchApolloPages(input, raw.userId);
  const rows = people.slice(0, input.count).map(normalizeApolloPerson).filter((lead) => lead.email && lead.company);
  const db = createServiceClient();
  const saved = [];

  for (const lead of rows) {
    const providerNotes = await collectProviderContext({ userId: raw.userId, lead });
    const payload = {
      user_id: raw.userId,
      ...(input.campaignId ? { campaign_id: input.campaignId } : {}),
      first_name: lead.first_name,
      last_name: lead.last_name,
      full_name: lead.full_name,
      email: lead.email,
      email_status: lead.email_status,
      title: lead.title,
      company: lead.company,
      company_website: lead.company_website,
      linkedin_url: lead.linkedin_url,
      industry: lead.industry,
      location: lead.location,
      source: "apollo",
      source_record_id: lead.source_record_id,
      status: "found",
      stage: "imported",
      enrichment_status: providerNotes.some((note) => note.status === "used") ? "completed" : "queued",
      score: leadScore(lead),
      score_reason: "Generated from lead search and enriched with configured business context.",
      provider_metadata: {
        apollo: lead.raw,
        providers: providerNotes,
      },
      raw_json: lead.raw,
    };
    const result = await upsertLead(db, payload);
    if (result.data) saved.push(result.data);
  }

  return {
    requested: input.count,
    saved: saved.length,
    leads: saved,
    source: "apollo",
  };
}

async function fetchApolloPages(input: z.infer<typeof generateLeadsSchema>, userId: string) {
  const perPage = Math.min(100, input.count);
  const pages = Math.ceil(input.count / perPage);
  const people: Record<string, unknown>[] = [];
  for (let page = 1; page <= pages; page += 1) {
    const response = await fetchApolloPeople({
      q_keywords: [input.keywords, input.location, input.companySize].filter(Boolean).join(" "),
      person_titles: input.titles.split(",").map((title) => title.trim()).filter(Boolean),
      page,
      per_page: perPage,
    }, userId);
    people.push(...extractPeople(response));
    if (people.length >= input.count) break;
  }
  return people;
}

async function upsertLead(db: ReturnType<typeof createServiceClient>, payload: Record<string, unknown>) {
  if (!payload.campaign_id && typeof payload.email === "string") {
    const existing = await db
      .from("leads")
      .select("id")
      .eq("user_id", payload.user_id)
      .ilike("email", payload.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing.data?.id) {
      const updated = await db.from("leads").update(payload).eq("id", existing.data.id).select("*").single();
      if (!updated.error || !isMissingSchemaError(updated.error)) return updated;
      return db.from("leads").update(legacyLeadPayload(payload)).eq("id", existing.data.id).select("*").single();
    }
    const inserted = await db.from("leads").insert(payload).select("*").single();
    if (!inserted.error || !isMissingSchemaError(inserted.error)) return inserted;
    return db.from("leads").insert(legacyLeadPayload(payload)).select("*").single();
  }

  const first = await db.from("leads").upsert(payload, { onConflict: "email,campaign_id", ignoreDuplicates: false }).select("*").single();
  if (!first.error || !isMissingSchemaError(first.error)) return first;
  const fallback = { ...payload };
  return db.from("leads").upsert(legacyLeadPayload(fallback), { onConflict: "email,campaign_id", ignoreDuplicates: false }).select("*").single();
}

function legacyLeadPayload(payload: Record<string, unknown>) {
  const fallback = { ...payload };
  for (const key of ["workspace_id", "provider_metadata", "source_record_id", "score", "score_reason", "duplicate_of", "full_name", "email_status", "status", "enrichment_status"]) {
    delete fallback[key];
  }
  return fallback;
}

async function collectProviderContext(input: { userId: string; lead: ReturnType<typeof normalizeApolloPerson> }) {
  const notes: ProviderNote[] = [];
  const env = getEnv();

  notes.push(await providerSearch("enrich", hasSecret("ENRICH_API_KEY"), env.ENRICH_API_KEY ? "Configured for lead enrichment." : "ENRICH_API_KEY missing."));
  notes.push(await providerSearch("data_enrichment", hasSecret("CLAY_API_KEY"), env.CLAY_API_KEY ? "Configured for enrichment workflows." : "Enrichment key missing."));
  notes.push(await providerSearch("apify", hasSecret("APIFY_KEY"), env.APIFY_KEY ? "Configured for Apify website/contact automation." : "APIFY_KEY missing."));

  if (hasSecret("FIRECRAWL_API_KEY") && input.lead.company_website) {
    try {
      await crawlCompanyWebsite(input.lead.company_website, input.userId);
      notes.push({ provider: "firecrawl", status: "used", detail: "Scraped available company website for public business context." });
    } catch (error) {
      notes.push({ provider: "page_extraction", status: "failed", detail: "Page extraction failed." });
    }
  } else {
    notes.push({ provider: "page_extraction", status: "skipped", detail: input.lead.company_website ? "Page extraction is not configured." : "No company website available." });
  }

  if (hasSecret("TAVILY_API_KEY") && input.lead.company) {
    try {
      await searchPublicSignals(`${input.lead.company} company news hiring product launch`, input.userId);
      notes.push({ provider: "tavily", status: "used", detail: "Searched public company signals." });
    } catch (error) {
      notes.push({ provider: "web_research", status: "failed", detail: "Web research failed." });
    }
  } else {
    notes.push({ provider: "web_research", status: "not_configured", detail: "Web research is not configured." });
  }

  if (hasSecret("SERPAPI_KEY") && input.lead.company) {
    try {
      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", `${input.lead.company} ${input.lead.title ?? ""}`.trim());
      url.searchParams.set("api_key", env.SERPAPI_KEY ?? "");
      const response = await fetch(url, { cache: "no-store" });
      notes.push({ provider: "serpapi", status: response.ok ? "used" : "failed", detail: response.ok ? "Searched public company/person context." : `SerpAPI failed with ${response.status}.` });
    } catch (error) {
      notes.push({ provider: "serpapi", status: "failed", detail: error instanceof Error ? error.message : "SerpAPI failed." });
    }
  } else {
    notes.push({ provider: "serpapi", status: "not_configured", detail: "SERPAPI_KEY missing." });
  }

  return notes;
}

async function providerSearch(provider: string, configured: boolean, detail: string): Promise<ProviderNote> {
  return { provider, status: configured ? "used" : "not_configured", detail };
}

function extractPeople(value: Record<string, unknown>) {
  const people = value.people ?? value.contacts ?? value.results ?? value.data;
  return Array.isArray(people) ? people.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
}

function normalizeApolloPerson(raw: Record<string, unknown>) {
  const organization = isRecord(raw.organization) ? raw.organization : {};
  const firstName = stringOrNull(raw.first_name);
  const lastName = stringOrNull(raw.last_name);
  const fullName = stringOrNull(raw.name) ?? [firstName, lastName].filter(Boolean).join(" ");
  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName || null,
    email: stringOrNull(raw.email),
    email_status: stringOrNull(raw.email_status) ?? "unknown",
    title: stringOrNull(raw.title),
    company: stringOrNull(raw.organization_name) ?? stringOrNull(raw.company) ?? stringOrNull(organization.name),
    company_website: stringOrNull(raw.company_website) ?? stringOrNull(organization.website_url),
    linkedin_url: stringOrNull(raw.linkedin_url),
    industry: stringOrNull(raw.industry) ?? stringOrNull(organization.industry),
    location: stringOrNull(raw.city) ?? stringOrNull(raw.location),
    source_record_id: stringOrNull(raw.id) ?? stringOrNull(raw.contact_id),
    raw,
  };
}

function leadScore(lead: ReturnType<typeof normalizeApolloPerson>) {
  let score = 45;
  if (lead.email) score += 20;
  if (lead.title) score += 10;
  if (lead.company_website) score += 10;
  if (lead.linkedin_url) score += 5;
  if (lead.email_status === "verified") score += 10;
  return Math.min(100, score);
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
