import "server-only";
import { createServiceClient } from "@/lib/integrations/supabase";
import { generateStructured } from "@/lib/agents/structured";
import { verifyEmail } from "@/lib/integrations/zerobounce";
import { sendManagedEmail, managedSendingConfigured } from "@/lib/integrations/mailer";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { sendGmailMessage } from "@/src/lib/apis/google/gmail-client";
import { appendComplianceFooter, buildUnsubscribeLink, isUnsubscribed } from "@/src/lib/mvp/unsubscribe";
import { readCampaignConfig, isWithinSendWindow, type SalesCampaignConfig } from "@/lib/sales/campaign-config";

// ─────────────────────────────────────────────────────────
// Campaign send worker. Picks due queued email_sends, enforces the campaign's
// send window and daily cap, verifies addresses, generates final copy, sends
// (Gmail when connected, managed otherwise), and schedules the next sequence
// step. Credits were debited at launch approval — nothing here charges again.
// Idempotent: rows are claimed with a queued→sending compare-and-set, so
// overlapping cron ticks never double-send.
// ─────────────────────────────────────────────────────────

export interface WorkerResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  deferred: number;
  notes: string[];
}

interface QueuedSend {
  id: string;
  user_id: string;
  campaign_id: string | null;
  lead_id: string | null;
  generated_email_id: string | null;
  to_email: string | null;
  provider: string | null;
  scheduled_at: string | null;
}

interface CampaignRowLite {
  id: string;
  user_id: string;
  name: string;
  status: string;
  goal: string | null;
  product_offer: string | null;
  icp_json: unknown;
}

interface CopyPayload {
  subject: string;
  body: string;
}

export function stepFromProvider(provider: string | null): number {
  const match = /^step_(\d+)$/.exec(provider ?? "");
  const n = match ? Number(match[1]) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function processCampaignSends(options: {
  userId?: string;
  campaignId?: string;
  limit?: number;
} = {}): Promise<WorkerResult> {
  const db = createServiceClient();
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const nowIso = new Date().toISOString();

  let query = db
    .from("email_sends")
    .select("id,user_id,campaign_id,lead_id,generated_email_id,to_email,provider,scheduled_at")
    .eq("status", "queued")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.campaignId) query = query.eq("campaign_id", options.campaignId);

  const { data: due, error } = await query;
  if (error) throw new Error(`Failed to read send queue: ${error.message}`);

  const result: WorkerResult = { processed: 0, sent: 0, skipped: 0, failed: 0, deferred: 0, notes: [] };
  if (!due?.length) return result;

  const campaigns = new Map<string, { row: CampaignRowLite; config: SalesCampaignConfig; sentInWindow: number } | null>();
  const touchedCampaigns = new Set<string>();

  for (const send of due as QueuedSend[]) {
    result.processed += 1;
    if (!send.campaign_id || !send.lead_id) {
      await markSend(db, send.id, "failed", "Missing campaign or contact reference.");
      result.failed += 1;
      continue;
    }

    // Load + cache the campaign and its rolling-24h send count.
    let entry = campaigns.get(send.campaign_id);
    if (entry === undefined) {
      entry = await loadCampaign(db, send.campaign_id);
      campaigns.set(send.campaign_id, entry);
    }
    if (!entry) {
      await markSend(db, send.id, "failed", "Campaign not found.");
      result.failed += 1;
      continue;
    }
    const { row: campaign, config } = entry;

    if (campaign.status !== "running") {
      result.deferred += 1;
      continue; // stays queued; resumes when the campaign does
    }
    if (!isWithinSendWindow(config.sending)) {
      result.deferred += 1;
      continue;
    }
    if (entry.sentInWindow >= config.sending.dailyCap) {
      result.deferred += 1;
      continue;
    }

    // Claim the row — only one worker wins a queued→sending transition.
    const { data: claimed } = await db
      .from("email_sends")
      .update({ status: "sending" })
      .eq("id", send.id)
      .eq("status", "queued")
      .select("id");
    if (!claimed?.length) continue;

    try {
      const outcome = await processOne(db, send, campaign, config);
      if (outcome === "sent") {
        result.sent += 1;
        entry.sentInWindow += 1;
        touchedCampaigns.add(campaign.id);
      } else {
        result.skipped += 1;
      }
    } catch (err) {
      result.failed += 1;
      const reason = err instanceof Error ? err.message : "Send failed.";
      await markSend(db, send.id, "failed", reason.slice(0, 400));
      result.notes.push(reason.slice(0, 200));
    }
  }

  // Close out campaigns whose queue drained.
  for (const campaignId of touchedCampaigns) {
    const { count } = await db
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .in("status", ["queued", "sending"]);
    if ((count ?? 0) === 0) {
      await db.from("campaigns").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", campaignId).eq("status", "running");
    }
  }

  return result;
}

async function processOne(
  db: ReturnType<typeof createServiceClient>,
  send: QueuedSend,
  campaign: CampaignRowLite,
  config: SalesCampaignConfig
): Promise<"sent" | "skipped"> {
  const step = stepFromProvider(send.provider);
  const userId = send.user_id;

  const { data: lead } = await db
    .from("leads")
    .select("id,email,first_name,last_name,company,title,stage")
    .eq("id", send.lead_id)
    .eq("user_id", userId)
    .maybeSingle();
  const toEmail = (send.to_email ?? lead?.email ?? "").trim().toLowerCase();
  if (!lead || !toEmail) {
    await markSend(db, send.id, "skipped", "Contact has no email address.");
    return "skipped";
  }

  // Stop conditions: replied or unsubscribed contacts drop out of the sequence.
  const [{ data: reply }, unsubscribed] = await Promise.all([
    db.from("email_replies").select("id").eq("user_id", userId).eq("lead_id", lead.id).limit(1).maybeSingle(),
    isUnsubscribed(toEmail, userId),
  ]);
  if (reply) {
    await markSend(db, send.id, "skipped", "Contact replied — sequence stopped.");
    return "skipped";
  }
  if (unsubscribed) {
    await markSend(db, send.id, "skipped", "Contact unsubscribed.");
    return "skipped";
  }

  // Pre-send verification (step 1 only — later steps reuse the verdict).
  if (step === 1 && config.sending.verify) {
    const verdict = await verifyEmail(toEmail, { userId, leadId: lead.id });
    if (!verdict.didMock && verdict.status !== "valid" && verdict.status !== "catch-all") {
      await markSend(db, send.id, "skipped", `Address failed verification (${verdict.status}).`);
      return "skipped";
    }
  }

  // Final copy: use the prepared/edited draft when one exists, else write it now.
  const copy = await resolveCopy(db, send, campaign, config, lead, step);

  // Send — connected mailbox first, managed sending as the working default.
  const unsubscribeUrl = buildUnsubscribeLink({ email: toEmail, userId, campaignId: campaign.id });
  const html = appendComplianceFooter({ body: toHtml(copy.body), unsubscribeLink: unsubscribeUrl });

  let providerMessageId: string | null = null;
  let gmailMessageId: string | null = null;
  let sentVia = "managed";

  if (config.sending.sender === "gmail") {
    try {
      const { accessToken } = await getConnectedGoogleAccessToken(userId);
      const gmail = await sendGmailMessage({ accessToken, to: toEmail, subject: copy.subject, htmlBody: html, listUnsubscribeUrl: unsubscribeUrl });
      gmailMessageId = gmail.messageId ?? null;
      sentVia = "gmail";
    } catch {
      if (!managedSendingConfigured()) throw new Error("No connected mailbox and managed sending is not configured.");
      const managed = await sendManagedEmail({ to: toEmail, subject: copy.subject, html, fromName: fromNameFor(lead, campaign), listUnsubscribeUrl: unsubscribeUrl });
      providerMessageId = managed.id;
    }
  } else {
    const managed = await sendManagedEmail({ to: toEmail, subject: copy.subject, html, fromName: fromNameFor(lead, campaign), listUnsubscribeUrl: unsubscribeUrl });
    providerMessageId = managed.id;
  }

  const nowIso = new Date().toISOString();
  await db
    .from("email_sends")
    .update({
      status: "sent",
      sent_at: nowIso,
      to_email: toEmail,
      subject: copy.subject,
      provider_message_id: providerMessageId,
      gmail_message_id: gmailMessageId,
      credits_used: 1,
      failure_reason: sentVia === "gmail" ? null : undefined,
    })
    .eq("id", send.id);

  if (send.generated_email_id) {
    await db.from("generated_emails").update({ status: "sent", sent_at: nowIso }).eq("id", send.generated_email_id);
  }
  await db.from("leads").update({ stage: "contacted", updated_at: nowIso }).eq("id", lead.id).eq("user_id", userId).eq("stage", "new");

  // Schedule the next touch, unless this was the last step.
  const nextStep = step + 1;
  if (nextStep <= config.sequence.length) {
    const waitDays = config.sequence[nextStep - 1]?.waitDays ?? 3;
    const { data: existing } = await db
      .from("email_sends")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("lead_id", lead.id)
      .eq("provider", `step_${nextStep}`)
      .limit(1)
      .maybeSingle();
    if (!existing) {
      await db.from("email_sends").insert({
        user_id: userId,
        campaign_id: campaign.id,
        lead_id: lead.id,
        to_email: toEmail,
        provider: `step_${nextStep}`,
        status: "queued",
        scheduled_at: new Date(Date.now() + waitDays * 86_400_000).toISOString(),
        created_at: nowIso,
      });
    }
  }

  return "sent";
}

/** Prefer an edited draft; otherwise generate final copy now (prepaid at launch). */
async function resolveCopy(
  db: ReturnType<typeof createServiceClient>,
  send: QueuedSend,
  campaign: CampaignRowLite,
  config: SalesCampaignConfig,
  lead: { id: string; first_name: string | null; last_name: string | null; company: string | null; title: string | null },
  step: number
): Promise<CopyPayload> {
  if (send.generated_email_id) {
    const { data: draft } = await db
      .from("generated_emails")
      .select("subject,edited_subject,body,edited_body,approval_status")
      .eq("id", send.generated_email_id)
      .maybeSingle();
    const subject = (draft?.edited_subject ?? draft?.subject ?? "").trim();
    const body = (draft?.edited_body ?? draft?.body ?? "").trim();
    if (subject && body && draft?.approval_status !== "rejected") return { subject, body };
  }

  const generated = await writeStepCopy(db, campaign, config, lead, step);

  const { data: inserted } = await db
    .from("generated_emails")
    .insert({
      user_id: send.user_id,
      campaign_id: campaign.id,
      lead_id: lead.id,
      subject: generated.subject,
      subject_1: generated.subject,
      body: generated.body,
      email_body: generated.body,
      status: "generated",
      approval_status: "auto_approved",
      safety_status: "not_checked",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (inserted?.id) {
    await db.from("email_sends").update({ generated_email_id: inserted.id }).eq("id", send.id);
  }
  return generated;
}

async function writeStepCopy(
  db: ReturnType<typeof createServiceClient>,
  campaign: CampaignRowLite,
  config: SalesCampaignConfig,
  lead: { id: string; first_name: string | null; last_name: string | null; company: string | null; title: string | null },
  step: number
): Promise<CopyPayload> {
  const [{ data: research }, { data: workspace }] = await Promise.all([
    db.from("company_research").select("summary").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("workspaces").select("sales_settings,name").eq("owner_id", campaign.user_id).maybeSingle(),
  ]);
  const tone = String((workspace?.sales_settings as { tone?: string } | null)?.tone ?? "direct");
  const stepGoal = config.sequence[step - 1]?.goal ?? "Follow up briefly and restate the offer.";
  const firstName = lead.first_name ?? "there";

  const { data } = await generateStructured<CopyPayload>({
    system:
      "You are an elite B2B outbound email writer. Write a short, specific, non-salesy email (60-110 words) that earns a reply. Use only the facts provided — never invent metrics, names, or events. One clear CTA. Match the requested tone.",
    prompt: [
      `Sequence step: ${step} of ${config.sequence.length}${step > 1 ? " (follow-up — reference that you reached out before, keep it shorter)" : ""}`,
      `Step goal: ${stepGoal}`,
      `Recipient: ${firstName}${lead.title ? `, ${lead.title}` : ""}${lead.company ? ` at ${lead.company}` : ""}`,
      campaign.product_offer ? `Offer: ${campaign.product_offer}` : "",
      campaign.goal ? `Campaign goal: ${campaign.goal}` : "",
      research?.summary ? `Company research: ${research.summary}` : "",
      `Tone: ${tone}`,
      `Return JSON: { "subject": string, "body": string }`,
    ]
      .filter(Boolean)
      .join("\n"),
    tier: "deep",
    maxTokens: 700,
  });

  const subject = (data.subject ?? "").trim();
  const body = (data.body ?? "").trim();
  if (!subject || !body) throw new Error("Copy generation returned an empty email.");
  return { subject, body };
}

async function loadCampaign(
  db: ReturnType<typeof createServiceClient>,
  campaignId: string
): Promise<{ row: CampaignRowLite; config: SalesCampaignConfig; sentInWindow: number } | null> {
  const { data } = await db
    .from("campaigns")
    .select("id,user_id,name,status,goal,product_offer,icp_json")
    .eq("id", campaignId)
    .maybeSingle();
  if (!data) return null;
  const config = readCampaignConfig(data.icp_json);
  // Rolling 24h count approximates the daily cap without timezone math on the DB.
  const { count } = await db
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "sent")
    .gte("sent_at", new Date(Date.now() - 86_400_000).toISOString());
  return { row: data as CampaignRowLite, config, sentInWindow: count ?? 0 };
}

async function markSend(
  db: ReturnType<typeof createServiceClient>,
  id: string,
  status: "skipped" | "failed",
  reason: string
): Promise<void> {
  await db.from("email_sends").update({ status, failure_reason: reason }).eq("id", id);
}

function fromNameFor(
  lead: { first_name: string | null },
  campaign: CampaignRowLite
): string | null {
  void lead;
  void campaign;
  return null; // sender display name comes from the managed identity for now
}

function toHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
