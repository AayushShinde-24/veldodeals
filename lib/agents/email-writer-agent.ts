import { createServiceClient } from "@/lib/integrations/supabase";
import { generateStructured } from "@/lib/agents/structured";
import { consumeCredits } from "@/lib/billing/consumption";

export interface WriteEmailResult {
  draftId: string | null;
  subject: string;
  body: string;
  followUp: string;
  personalizationReason: string;
  personalizationRisk: "low" | "medium" | "high";
  charged: number;
  blocked?: string;
}

interface EmailPayload {
  subject: string;
  body: string;
  follow_up_1: string;
  angle: string;
  personalization_reason: string;
  personalization_risk: "low" | "medium" | "high";
}

/**
 * Write a personalized cold email + first follow-up for a lead, grounded in the stored
 * research/signals and the campaign offer. Charges credits (email_write, ×1.25 if
 * hyper-personalized) idempotently, persists to generated_emails, and records the
 * strategy angle. Never fabricates facts — risk is flagged for the send-gate.
 */
export async function writeEmail(input: {
  userId: string;
  leadId: string;
  campaignId: string;
  hyperPersonalization?: boolean;
}): Promise<WriteEmailResult> {
  const db = createServiceClient();

  const [{ data: lead }, { data: campaign }, { data: research }, { data: signal }] = await Promise.all([
    db.from("leads").select("first_name, last_name, company, title, email").eq("id", input.leadId).eq("user_id", input.userId).maybeSingle(),
    db.from("campaigns").select("name, goal, product_offer, offer_json, target_audience").eq("id", input.campaignId).eq("user_id", input.userId).maybeSingle(),
    db.from("company_research").select("summary").eq("lead_id", input.leadId).eq("user_id", input.userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("signals").select("best_signal, content").eq("lead_id", input.leadId).eq("user_id", input.userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!lead) throw new Error("Lead not found for email writing.");

  // Charge credits up front, idempotent per (lead, campaign) so retries don't double-bill.
  const charge = await consumeCredits(input.userId, "email_write", {
    hyperPersonalization: input.hyperPersonalization,
    idempotencyKey: `email_write:${input.campaignId}:${input.leadId}`,
    metadata: { leadId: input.leadId, campaignId: input.campaignId },
  });
  if (!charge.success) {
    return {
      draftId: null,
      subject: "",
      body: "",
      followUp: "",
      personalizationReason: "",
      personalizationRisk: "high",
      charged: 0,
      blocked: charge.error ?? "Insufficient credits to write email.",
    };
  }

  const firstName = lead.first_name ?? "there";
  const { data } = await generateStructured<EmailPayload>({
    system:
      "You are an elite B2B cold-email writer. Write a short, specific, non-salesy email (60-110 words) that earns a reply. Use only facts provided — never invent metrics, mutual connections, or events. One clear CTA. Plus a 1-2 sentence follow-up. Flag personalization_risk: 'high' if you had to guess at specifics, 'low' if grounded in provided facts.",
    prompt: [
      `Recipient: ${firstName}${lead.title ? `, ${lead.title}` : ""}${lead.company ? ` at ${lead.company}` : ""}`,
      campaign?.product_offer ? `What we offer: ${campaign.product_offer}` : "",
      campaign?.goal ? `Campaign goal: ${campaign.goal}` : "",
      research?.summary ? `Company research: ${research.summary}` : "",
      signal?.best_signal || signal?.content ? `Timely signal: ${signal?.best_signal ?? signal?.content}` : "",
      input.hyperPersonalization ? "Mode: hyper-personalized — lead hard on the specific signal." : "",
      `\nReturn JSON: { "subject": string, "body": string, "follow_up_1": string, "angle": string, "personalization_reason": string, "personalization_risk": "low"|"medium"|"high" }`,
    ]
      .filter(Boolean)
      .join("\n"),
    tier: input.hyperPersonalization ? "deep" : "balanced",
    maxTokens: 900,
  });

  const subject = (data.subject ?? "").trim();
  const body = (data.body ?? "").trim();
  const followUp = (data.follow_up_1 ?? "").trim();
  const personalizationReason = (data.personalization_reason ?? "").trim();
  const personalizationRisk = normalizeRisk(data.personalization_risk);

  const { data: draft } = await db
    .from("generated_emails")
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId,
      lead_id: input.leadId,
      subject,
      subject_1: subject,
      body,
      email_body: body,
      follow_up_1: followUp,
      personalization_reason: personalizationReason,
      personalization_risk: personalizationRisk,
      status: "generated",
      approval_status: "pending",
      safety_status: "not_checked",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (data.angle) {
    await db.from("email_strategies").insert({
      user_id: input.userId,
      lead_id: input.leadId,
      approach: data.angle,
      angle: data.angle,
      created_at: new Date().toISOString(),
    });
  }

  return {
    draftId: draft?.id ?? null,
    subject,
    body,
    followUp,
    personalizationReason,
    personalizationRisk,
    charged: charge.cost,
  };
}

function normalizeRisk(risk: unknown): "low" | "medium" | "high" {
  return risk === "low" || risk === "medium" || risk === "high" ? risk : "medium";
}
