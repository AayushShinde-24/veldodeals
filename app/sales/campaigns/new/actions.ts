"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { fetchApolloPeople } from "@/lib/integrations/apollo";
import { generateStructured } from "@/lib/agents/structured";
import { launchCampaign } from "@/lib/sales/launch";
import {
  buildEstimate,
  MAX_SEQUENCE_STEPS,
  type SendingConfig,
  type SequenceStep,
} from "@/lib/sales/campaign-config";

// Server actions backing the 4-step campaign wizard. Nothing in here spends
// credits except launch (via launchCampaign) — previews and audience searches
// are free by design so the launch card stays the single spend gate.

export interface AudiencePerson {
  key: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  title: string;
  company: string;
}

export interface AudienceSearchResult {
  ok: boolean;
  error?: string;
  people: AudiencePerson[];
  total: number;
}

export async function searchAudienceAction(filters: {
  titles: string;
  keywords: string;
  page?: number;
}): Promise<AudienceSearchResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in.", people: [], total: 0 };
  if (!process.env.APOLLO_API_KEY) {
    return { ok: false, error: "Contact sourcing isn't connected yet. Connect it in Settings → Connections.", people: [], total: 0 };
  }

  try {
    const titles = filters.titles.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetchApolloPeople(
      {
        person_titles: titles.length ? titles : undefined,
        q_keywords: filters.keywords.trim() || undefined,
        per_page: 25,
        page: Math.max(1, filters.page ?? 1),
      },
      user.id
    );
    return {
      ok: true,
      total: res.pagination?.total_entries ?? res.people.length,
      people: res.people
        .filter((p) => !!p.email)
        .map((p) => ({
          key: p.id,
          firstName: p.first_name ?? "",
          lastName: p.last_name ?? "",
          name: p.name ?? [p.first_name, p.last_name].filter(Boolean).join(" "),
          email: p.email ?? "",
          title: p.title ?? "",
          company: p.organization_name ?? "",
        })),
    };
  } catch {
    return { ok: false, error: "Contact search failed — try again in a moment.", people: [], total: 0 };
  }
}

export interface PreviewEmail {
  to: string;
  subject: string;
  body: string;
}

export async function generatePreviewsAction(input: {
  offer: string;
  goal: string;
  stepGoal: string;
  feedback?: string;
  samples: { name: string; title: string; company: string; email: string }[];
}): Promise<{ ok: boolean; error?: string; previews: PreviewEmail[] }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in.", previews: [] };

  const samples = input.samples.slice(0, 2);
  if (!samples.length) return { ok: false, error: "Stage at least one contact first.", previews: [] };

  try {
    const previews = await Promise.all(
      samples.map(async (s) => {
        const { data } = await generateStructured<{ subject: string; body: string }>({
          system:
            "You are an elite B2B outbound email writer. Write a short, specific, non-salesy email (60-110 words) that earns a reply. Use only facts provided — never invent metrics, names, or events. One clear CTA.",
          prompt: [
            `Recipient: ${s.name || "there"}${s.title ? `, ${s.title}` : ""}${s.company ? ` at ${s.company}` : ""}`,
            `Offer: ${input.offer}`,
            `Campaign goal: ${input.goal}`,
            `This email's goal: ${input.stepGoal}`,
            input.feedback ? `Revision feedback from the founder: ${input.feedback}` : "",
            `Return JSON: { "subject": string, "body": string }`,
          ]
            .filter(Boolean)
            .join("\n"),
          tier: "deep",
          maxTokens: 700,
        });
        return { to: s.email, subject: (data.subject ?? "").trim(), body: (data.body ?? "").trim() };
      })
    );
    return { ok: true, previews: previews.filter((p) => p.subject && p.body) };
  } catch {
    return { ok: false, error: "Preview generation failed — try again.", previews: [] };
  }
}

/** Itemized credits + conservative result ranges for the launch card (server-computed). */
export async function estimateResultsAction(input: {
  contacts: number;
  steps: number;
  verify: boolean;
}): Promise<ReturnType<typeof buildEstimate>> {
  const contacts = Math.min(2000, Math.max(1, Math.round(input.contacts)));
  const steps = Math.min(MAX_SEQUENCE_STEPS, Math.max(1, Math.round(input.steps)));
  return buildEstimate(contacts, steps, input.verify);
}

// ── Create + launch ──────────────────────────────────────

export interface WizardPayload {
  name: string;
  offer: string;
  goal: string;
  audienceSummary: string;
  audienceSource: "veldo_ai" | "crm";
  crmLeadIds: string[];
  sourcedPeople: AudiencePerson[];
  sequence: SequenceStep[];
  sending: SendingConfig;
}

export type CreateCampaignResult =
  | { ok: true; campaignId: string; launched: boolean; queued?: number }
  | { ok: false; error: string; campaignId?: string; needed?: number; balance?: number };

export async function createCampaignAction(payload: WizardPayload, launch: boolean): Promise<CreateCampaignResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const name = payload.name.trim().slice(0, 120);
  const offer = payload.offer.trim();
  const goal = payload.goal.trim();
  if (!name || !offer || !goal) return { ok: false, error: "Name, offer, and goal are required." };
  const sequence = payload.sequence
    .slice(0, MAX_SEQUENCE_STEPS)
    .map((s) => ({ goal: String(s.goal ?? "").trim(), waitDays: Math.min(30, Math.max(1, Math.round(Number(s.waitDays) || 3))) }))
    .filter((s) => s.goal.length > 0);
  if (!sequence.length) return { ok: false, error: "Add at least one email step." };

  const db = createServiceClient();

  const config = {
    description: offer,
    audienceSummary: payload.audienceSummary.trim().slice(0, 160) || "Custom audience",
    audienceSource: payload.audienceSource,
    sequence,
    sending: payload.sending,
  };

  const { data: campaign, error: insertError } = await db
    .from("campaigns")
    .insert({
      user_id: user.id,
      name,
      goal,
      product_offer: offer,
      target_niche: config.audienceSummary,
      status: "draft",
      sending_mode: "approval_required",
      offer_json: { description: offer },
      icp_json: config,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insertError || !campaign) return { ok: false, error: insertError?.message ?? "Failed to create campaign." };

  // Stage the audience.
  if (payload.audienceSource === "crm") {
    const ids = payload.crmLeadIds.slice(0, 1000);
    if (ids.length) {
      await db.from("leads").update({ campaign_id: campaign.id, updated_at: new Date().toISOString() }).eq("user_id", user.id).in("id", ids);
    }
  } else {
    const people = payload.sourcedPeople.filter((p) => p.email.includes("@")).slice(0, 1000);
    if (people.length) {
      const rows = people.map((p) => ({
        user_id: user.id,
        campaign_id: campaign.id,
        email: p.email.trim().toLowerCase(),
        first_name: p.firstName || null,
        last_name: p.lastName || null,
        full_name: p.name || null,
        title: p.title || null,
        company: p.company || null,
        stage: "new",
        source: "veldo_ai",
        created_at: new Date().toISOString(),
      }));
      for (let i = 0; i < rows.length; i += 200) {
        await db.from("leads").upsert(rows.slice(i, i + 200), { onConflict: "user_id,email", ignoreDuplicates: false });
      }
    }
  }

  // Store the (pre-launch) estimate so the draft's launch card shows real numbers.
  const { count } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("campaign_id", campaign.id);
  const staged = count ?? 0;
  const estimate = buildEstimate(Math.max(1, staged), sequence.length, payload.sending.verify);
  await db
    .from("campaigns")
    .update({ icp_json: { ...config, estimate, stagedCount: staged } })
    .eq("id", campaign.id)
    .eq("user_id", user.id);

  if (!launch) return { ok: true, campaignId: campaign.id, launched: false };

  const result = await launchCampaign(user.id, campaign.id);
  if (!result.ok) {
    return { ok: false, error: result.error, campaignId: campaign.id, needed: result.needed, balance: result.balance };
  }
  return { ok: true, campaignId: campaign.id, launched: true, queued: result.queued };
}
