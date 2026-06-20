import { createServiceClient } from "@/lib/integrations/supabase";
import type { ApolloResponse } from "@/lib/integrations/apollo";

export interface LeadGenerationInput {
  campaignId?: string;
  userId: string;
  targetIndustry?: string;
  targetRole?: string;
  targetCompanySize?: string;
  targetLocation?: string;
  keywords?: string;
  limit?: number;
  count?: number;
  companySize?: string;
  titles?: string;
  location?: string;
}

export interface GeneratedLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  title: string;
  linkedinUrl: string | null;
  location: string | null;
  stage: string;
  icpScore: number | null;
  source: string;
}

export async function generateLeadsForCampaign(
  input: LeadGenerationInput
): Promise<{ leads: GeneratedLead[]; total: number; saved: number; message: string }> {
  const db = createServiceClient();

  // Pull existing leads for this campaign
  let query = db
    .from("leads")
    .select("id, first_name, last_name, email, company, title, linkedin_url, location, stage, icp_score, source", { count: "exact" })
    .eq("user_id", input.userId)
    .limit(input.limit ?? input.count ?? 50);
  if (input.campaignId) query = query.eq("campaign_id", input.campaignId);
  const { data: existingLeads, count } = await query;

  const leads: GeneratedLead[] = (existingLeads ?? []).map((l) => ({
    id: l.id,
    firstName: l.first_name,
    lastName: l.last_name,
    email: l.email,
    company: l.company ?? "",
    title: l.title ?? "",
    linkedinUrl: l.linkedin_url,
    location: l.location,
    stage: l.stage ?? "new",
    icpScore: l.icp_score,
    source: l.source ?? "manual",
  }));

  return {
    leads,
    total: count ?? leads.length,
    saved: leads.length,
    message:
      leads.length === 0
        ? "No leads found for this campaign. Import leads via Apollo or CSV upload."
        : `Found ${leads.length} leads for campaign.`,
  };
}

export const generateLeadsWithApollo = generateLeadsForCampaign;

export async function importApolloLeads(input: {
  userId: string;
  campaignId?: string | null;
  response: ApolloResponse;
}): Promise<{ imported: number; skipped: number; total: number }> {
  const db = createServiceClient();
  let imported = 0;
  let skipped = 0;

  for (const person of input.response.people ?? []) {
    const email = (person.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      skipped += 1;
      continue;
    }

    const { error } = await db.from("leads").upsert(
      {
        user_id: input.userId,
        campaign_id: input.campaignId ?? null,
        email,
        first_name: person.first_name ?? "",
        last_name: person.last_name ?? "",
        full_name: person.name ?? [person.first_name, person.last_name].filter(Boolean).join(" "),
        company: person.organization_name ?? "",
        title: person.title ?? "",
        linkedin_url: person.linkedin_url ?? null,
        source: "apollo",
        stage: "new",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,email" }
    );

    if (error) skipped += 1;
    else imported += 1;
  }

  return { imported, skipped, total: input.response.people?.length ?? 0 };
}

export async function importLeadsFromCsv(
  userId: string,
  campaignId: string,
  rows: Record<string, string>[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const db = createServiceClient();
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = (row.email ?? row.Email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      errors.push(`Skipped row — invalid email: "${email}"`);
      skipped++;
      continue;
    }

    const { error } = await db.from("leads").upsert(
      {
        user_id: userId,
        campaign_id: campaignId,
        email,
        first_name: row.first_name ?? row["First Name"] ?? "",
        last_name: row.last_name ?? row["Last Name"] ?? "",
        company: row.company ?? row.Company ?? "",
        title: row.title ?? row.Title ?? "",
        linkedin_url: row.linkedin_url ?? row.LinkedIn ?? null,
        source: "csv_import",
        stage: "new",
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,email" }
    );

    if (error) {
      errors.push(`Failed to import ${email}: ${error.message}`);
      skipped++;
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors };
}
