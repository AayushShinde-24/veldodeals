import "server-only";
import { createServiceClient } from "@/lib/integrations/supabase";
import { readCampaignConfig, type SalesCampaignConfig } from "@/lib/sales/campaign-config";

// ─────────────────────────────────────────────────────────
// Data layer for Sales → Campaigns. Everything here is computed from live
// workspace rows; per-campaign reply linkage goes through leads.campaign_id
// because email_replies only carries lead_id.
// ─────────────────────────────────────────────────────────

export type SalesCampaignStatus = "draft" | "running" | "paused" | "completed";

export interface SalesCampaignListItem {
  id: string;
  name: string;
  status: SalesCampaignStatus;
  createdAt: string;
  audienceSummary: string;
  contacts: number;
  steps: number;
  sent: number;
  queued: number;
  replies: number;
  positive: number;
  creditsSpent: number;
}

const POSITIVE = /positive|interested/i;

function normalizeStatus(status: string | null | undefined): SalesCampaignStatus {
  if (status === "running" || status === "paused" || status === "completed") return status;
  if (status === "sending" || status === "ready_to_send" || status === "fetching_leads" || status === "generating_emails") return "running";
  return "draft";
}

export async function listSalesCampaigns(userId: string): Promise<SalesCampaignListItem[]> {
  const db = createServiceClient();
  const [campaignsRes, sendsRes, leadsRes, repliesRes] = await Promise.all([
    db.from("campaigns").select("id,name,status,created_at,target_niche,icp_json").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    db.from("email_sends").select("campaign_id,status,credits_used").eq("user_id", userId).limit(5000),
    db.from("leads").select("id,campaign_id").eq("user_id", userId).limit(5000),
    db.from("email_replies").select("lead_id,classification,reply_class,sentiment").eq("user_id", userId).limit(2000),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const sends = sendsRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const replies = repliesRes.data ?? [];

  const leadCampaign = new Map<string, string>();
  const contactsPerCampaign = new Map<string, number>();
  for (const lead of leads) {
    if (!lead.campaign_id) continue;
    leadCampaign.set(lead.id, lead.campaign_id);
    contactsPerCampaign.set(lead.campaign_id, (contactsPerCampaign.get(lead.campaign_id) ?? 0) + 1);
  }

  const agg = new Map<string, { sent: number; queued: number; replies: number; positive: number; credits: number }>();
  const bucket = (id: string) => {
    let b = agg.get(id);
    if (!b) {
      b = { sent: 0, queued: 0, replies: 0, positive: 0, credits: 0 };
      agg.set(id, b);
    }
    return b;
  };
  for (const send of sends) {
    if (!send.campaign_id) continue;
    const b = bucket(send.campaign_id);
    if (send.status === "sent") b.sent += 1;
    if (send.status === "queued" || send.status === "sending") b.queued += 1;
    b.credits += Number(send.credits_used ?? 0);
  }
  for (const reply of replies) {
    const campaignId = reply.lead_id ? leadCampaign.get(reply.lead_id) : undefined;
    if (!campaignId) continue;
    const b = bucket(campaignId);
    b.replies += 1;
    if (POSITIVE.test(String(reply.classification ?? reply.reply_class ?? reply.sentiment ?? ""))) b.positive += 1;
  }

  return campaigns.map((c) => {
    const config = readCampaignConfig(c.icp_json);
    const b = agg.get(c.id) ?? { sent: 0, queued: 0, replies: 0, positive: 0, credits: 0 };
    const status = normalizeStatus(c.status);
    const contacts = contactsPerCampaign.get(c.id) ?? config.estimate?.contacts ?? 0;
    // What launch actually debited; per-send credits_used is display-only.
    const creditsSpent = status === "draft" ? 0 : (config.estimate?.credits.total ?? b.credits);
    return {
      id: c.id,
      name: c.name,
      status,
      createdAt: c.created_at,
      audienceSummary: config.audienceSummary ?? c.target_niche ?? "Custom audience",
      contacts,
      steps: config.sequence.length,
      sent: b.sent,
      queued: b.queued,
      replies: b.replies,
      positive: b.positive,
      creditsSpent,
    };
  });
}

// ── Campaign detail ──────────────────────────────────────

export interface DetailLead {
  id: string;
  email: string;
  name: string;
  company: string | null;
  title: string | null;
  stage: string;
}

export interface DetailSend {
  id: string;
  leadId: string | null;
  generatedEmailId: string | null;
  toEmail: string | null;
  subject: string | null;
  status: string;
  step: number;
  scheduledAt: string | null;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface DetailDraft {
  id: string;
  leadId: string | null;
  subject: string | null;
  body: string | null;
  editedSubject: string | null;
  editedBody: string | null;
  status: string;
  approvalStatus: string | null;
  createdAt: string | null;
}

export interface DetailReply {
  id: string;
  leadId: string | null;
  classification: string | null;
  body: string | null;
  createdAt: string;
}

export interface SalesCampaignDetail {
  id: string;
  name: string;
  status: SalesCampaignStatus;
  goal: string | null;
  offer: string | null;
  createdAt: string | null;
  config: SalesCampaignConfig;
  leads: DetailLead[];
  sends: DetailSend[];
  drafts: DetailDraft[];
  replies: DetailReply[];
}

export async function getSalesCampaignDetail(userId: string, campaignId: string): Promise<SalesCampaignDetail | null> {
  const db = createServiceClient();
  const { data: campaign } = await db
    .from("campaigns")
    .select("id,name,status,goal,product_offer,created_at,icp_json")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!campaign) return null;

  const [leadsRes, sendsRes, draftsRes] = await Promise.all([
    db.from("leads").select("id,email,first_name,last_name,full_name,company,title,stage").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: true }).limit(1000),
    db.from("email_sends").select("id,lead_id,generated_email_id,to_email,subject,status,provider,scheduled_at,sent_at,failure_reason,created_at").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: true }).limit(2000),
    db.from("generated_emails").select("id,lead_id,subject,edited_subject,body,edited_body,status,approval_status,created_at").eq("user_id", userId).eq("campaign_id", campaignId).order("created_at", { ascending: false }).limit(500),
  ]);

  const leads: DetailLead[] = (leadsRes.data ?? []).map((l) => ({
    id: l.id,
    email: l.email ?? "",
    name: l.full_name ?? [l.first_name, l.last_name].filter(Boolean).join(" ") ?? "",
    company: l.company,
    title: l.title,
    stage: l.stage ?? "new",
  }));

  const leadIds = leads.map((l) => l.id);
  let replies: DetailReply[] = [];
  if (leadIds.length) {
    const { data } = await db
      .from("email_replies")
      .select("id,lead_id,classification,reply_class,sentiment,body,created_at")
      .eq("user_id", userId)
      .in("lead_id", leadIds.slice(0, 500))
      .order("created_at", { ascending: false })
      .limit(500);
    replies = (data ?? []).map((r) => ({
      id: r.id,
      leadId: r.lead_id,
      classification: r.classification ?? r.reply_class ?? r.sentiment ?? null,
      body: r.body,
      createdAt: r.created_at,
    }));
  }

  return {
    id: campaign.id,
    name: campaign.name,
    status: normalizeStatus(campaign.status),
    goal: campaign.goal,
    offer: campaign.product_offer,
    createdAt: campaign.created_at,
    config: readCampaignConfig(campaign.icp_json),
    leads,
    sends: (sendsRes.data ?? []).map((s) => ({
      id: s.id,
      leadId: s.lead_id,
      generatedEmailId: s.generated_email_id,
      toEmail: s.to_email,
      subject: s.subject,
      status: s.status,
      step: stepOf(s.provider),
      scheduledAt: s.scheduled_at,
      sentAt: s.sent_at,
      failureReason: s.failure_reason,
      createdAt: s.created_at,
    })),
    drafts: (draftsRes.data ?? []).map((d) => ({
      id: d.id,
      leadId: d.lead_id,
      subject: d.subject,
      body: d.body,
      editedSubject: d.edited_subject,
      editedBody: d.edited_body,
      status: d.status,
      approvalStatus: d.approval_status,
      createdAt: d.created_at,
    })),
    replies,
  };
}

function stepOf(provider: string | null): number {
  const match = /^step_(\d+)$/.exec(provider ?? "");
  return match ? Number(match[1]) : 1;
}
