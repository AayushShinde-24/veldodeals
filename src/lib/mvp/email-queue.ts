import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";
import { assertCreditsAvailable, recordCreditUsage } from "@/lib/billing/credits";
import { getOptionalEnv } from "@/lib/security/env";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { sendGmailMessage } from "@/src/lib/apis/google/gmail-client";
import { assertComplianceReady } from "@/src/lib/mvp/compliance";
import { logMvpError } from "@/src/lib/mvp/error-log";
import { assertCanSendByUsage, incrementUsage } from "@/src/lib/mvp/usage";
import { appendComplianceFooter, buildUnsubscribeLink, hasComplianceFooter, isUnsubscribed } from "@/src/lib/mvp/unsubscribe";
import { ensureDefaultWorkspace } from "@/src/lib/workspace/context";

export type SendingMode = "draft_only" | "approval_required" | "auto_send";

type SafetyCheckInput = {
  userId: string;
  generatedEmailId: string;
  campaignId?: string;
  mode?: SendingMode;
  requireConnectedAccount?: boolean;
};

type QueueInput = {
  userId: string;
  campaignId: string;
  taskId?: string | null;
  mode?: SendingMode;
};

type SendQueuedInput = {
  userId: string;
  campaignId: string;
  taskId?: string | null;
  limit?: number;
};

type SafetyResult = {
  passed: boolean;
  issues: string[];
  lead?: Record<string, unknown>;
  campaign?: Record<string, unknown>;
  generated?: Record<string, unknown>;
  account?: Record<string, unknown> | null;
};

export async function runGeneratedEmailSafetyCheck(input: SafetyCheckInput): Promise<SafetyResult> {
  const db = createServiceClient();
  const { data: generated, error } = await db
    .from("generated_emails")
    .select("*, leads(*), campaigns(*)")
    .eq("id", input.generatedEmailId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error || !generated) throw new Error("Generated email not found.");

  const lead = normalizeJoined(generated.leads);
  const campaign = normalizeJoined(generated.campaigns);
  const campaignId = String(input.campaignId ?? generated.campaign_id);
  const workspaceId = String(generated.workspace_id ?? campaign?.workspace_id ?? (await ensureDefaultWorkspace(input.userId)).workspaceId);
  const issues: string[] = [];
  const email = stringValue(lead?.email);
  const subject = stringValue(generated.edited_subject) || stringValue(generated.subject);
  const body = stringValue(generated.edited_body) || stringValue(generated.body);

  if (!email) issues.push("Recipient email is missing.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) issues.push("Recipient email is invalid.");
  if (!lead?.company) issues.push("Lead company is missing.");
  if (await hasDuplicateEmail(input.userId, campaignId, email, stringValue(lead?.id))) issues.push("Duplicate recipient email in this campaign.");
    if (email && await isUnsubscribed({ userId: input.userId, email })) issues.push("Recipient is unsubscribed.");
  const leadScore = Number(lead?.fit_score ?? lead?.score ?? 0);
  if (leadScore < 50) issues.push(`ICP fit score is ${leadScore}; minimum is 50.`);
  const safetyScore = Number(generated.email_score ?? generated.score ?? 0);
  if (safetyScore > 0 && safetyScore < 75) issues.push(`Email score is ${safetyScore}; minimum is 75.`);
  const leaderDecision = campaign?.leader_decision_json && typeof campaign.leader_decision_json === "object"
    ? campaign.leader_decision_json as Record<string, unknown>
    : null;
  if (input.mode === "auto_send" && leaderDecision?.allowed_to_continue !== true) {
    issues.push("Campaign Leader approval is required before autonomous sending.");
  }
  const spamFlags = findSpamFlags(`${subject} ${body}`);
  issues.push(...spamFlags);

  let account: Record<string, unknown> | null = null;
  let compliance = null;
  try {
    compliance = await assertComplianceReady(input.userId, campaignId);
  } catch (complianceError) {
    issues.push(complianceError instanceof Error ? complianceError.message : "Compliance profile is incomplete.");
  }

  if (compliance && email) {
    const withFooter = appendComplianceFooter({
      body,
      compliance,
      unsubscribeLink: buildUnsubscribeLink({ email, campaignId }),
    });
    if (!hasComplianceFooter(withFooter)) issues.push("Compliance footer or opt-out line is missing.");
  }

  if (input.requireConnectedAccount || input.mode === "auto_send") {
    try {
      const google = await getConnectedGoogleAccessToken(workspaceId, "gmail");
      account = google.account;
    } catch {
      issues.push("Gmail account is not connected or must be reconnected.");
    }
  }

  if (input.mode === "auto_send") {
    const allowlist = getSendAllowlist();
    if (!allowlist.length) {
      issues.push("VELDO_SEND_ALLOWLIST is empty, so first-release auto-send is blocked.");
    } else if (email && !isAllowlisted(email, allowlist)) {
      issues.push("Recipient is not in the first-release send allowlist.");
    }
  }

  const result = {
    passed: issues.length === 0,
    issues,
    lead: lead ?? undefined,
    campaign: campaign ?? undefined,
    generated,
    account,
  };

  await db.from("generated_emails").update({
    workspace_id: workspaceId,
    safety_status: result.passed ? "passed" : "blocked",
    safety_issues: issues,
    status: result.passed ? "safety_checked" : generated.status,
  }).eq("id", input.generatedEmailId);

  return result;
}

export async function prepareCampaignSendQueue(input: QueueInput) {
  const db = createServiceClient();
  const { data: campaign, error } = await db
    .from("campaigns")
    .select("*")
    .eq("id", input.campaignId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error || !campaign) throw new Error("Campaign not found.");
  const mode = normalizeSendingMode(input.mode ?? campaign.sending_mode);
  const workspaceId = String(campaign.workspace_id ?? (await ensureDefaultWorkspace(input.userId)).workspaceId);
  await db.from("campaigns").update({ sending_mode: mode, status: mode === "draft_only" ? "ready_to_send" : "queueing", workflow_progress: 90 }).eq("id", input.campaignId);

  const { data: generatedRows, error: generatedError } = await db
    .from("generated_emails")
    .select("*")
    .eq("user_id", input.userId)
    .eq("campaign_id", input.campaignId)
    .order("created_at", { ascending: true });
  if (generatedError) throw new Error(generatedError.message);

  const queued = [];
  const blocked = [];
  const skipped = [];

  for (const generated of generatedRows ?? []) {
    if (mode === "draft_only") {
      skipped.push({ generated_email_id: generated.id, reason: "Campaign is draft_only." });
      continue;
    }
    if (mode === "approval_required" && generated.status !== "approved") {
      skipped.push({ generated_email_id: generated.id, reason: "Draft is waiting for approval." });
      continue;
    }

    const safety = await runGeneratedEmailSafetyCheck({
      userId: input.userId,
      generatedEmailId: String(generated.id),
      campaignId: input.campaignId,
      mode,
      requireConnectedAccount: mode === "auto_send",
    });
    if (!safety.passed) {
      blocked.push({ generated_email_id: generated.id, issues: safety.issues });
      await upsertSendRecord({
        userId: input.userId,
        workspaceId,
        campaignId: input.campaignId,
        leadId: String(generated.lead_id),
        generatedEmailId: String(generated.id),
        taskId: input.taskId,
        status: classifyBlockedStatus(safety.issues),
        safetyResult: safety,
        failureReason: safety.issues.join(" "),
      });
      continue;
    }

    const sendRecord = await upsertSendRecord({
      userId: input.userId,
      workspaceId,
      campaignId: input.campaignId,
      leadId: String(generated.lead_id),
      generatedEmailId: String(generated.id),
      taskId: input.taskId,
      sendingAccountId: safety.account?.id ? String(safety.account.id) : null,
      status: "queued",
      safetyResult: safety,
      scheduledAt: nextScheduleTime(queued.length),
    });
    await db.from("generated_emails").update({ status: "queued", queued_at: new Date().toISOString() }).eq("id", generated.id);
    queued.push(sendRecord);
  }

  await db.from("campaigns").update({
    status: queued.length ? "queued" : mode === "draft_only" ? "ready_to_send" : "needs_review",
    workflow_progress: queued.length ? 94 : 90,
  }).eq("id", input.campaignId);

  return { mode, queued, blocked, skipped };
}

export async function sendQueuedCampaignEmails(input: SendQueuedInput) {
  const db = createServiceClient();
  const { data: campaign, error } = await db
    .from("campaigns")
    .select("*")
    .eq("id", input.campaignId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error || !campaign) throw new Error("Campaign not found.");
  if (normalizeSendingMode(campaign.sending_mode) !== "auto_send") throw new Error("Auto-send is not enabled for this campaign.");

  const now = new Date().toISOString();
  const { data: queue, error: queueError } = await db
    .from("email_sends")
    .select("*")
    .eq("user_id", input.userId)
    .eq("campaign_id", input.campaignId)
    .eq("status", "queued")
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order("scheduled_at", { ascending: true })
    .limit(input.limit ?? 5);
  if (queueError) throw new Error(queueError.message);

  const sent = [];
  const failed = [];
  for (const record of queue ?? []) {
    try {
      sent.push(await sendQueuedEmailRecord(input.userId, String(record.id)));
    } catch (error) {
      failed.push({ id: record.id, error: error instanceof Error ? error.message : "Send failed" });
    }
  }

  const { count: remaining } = await db
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("campaign_id", input.campaignId)
    .eq("status", "queued");

  await db.from("campaigns").update({
    status: remaining ? "queued" : failed.length ? "needs_review" : "completed",
    workflow_progress: remaining ? 96 : 100,
    final_summary: {
      sent: sent.length,
      failed: failed.length,
      remaining: remaining ?? 0,
      completed_at: new Date().toISOString(),
    },
  }).eq("id", input.campaignId);

  return { sent, failed, remaining: remaining ?? 0 };
}

export async function sendQueuedEmailRecord(userId: string, emailSendId: string) {
  const db = createServiceClient();
  const { data: sendRecord, error } = await db
    .from("email_sends")
    .select("*, generated_emails(*), leads(*), campaigns(*)")
    .eq("id", emailSendId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !sendRecord) throw new Error("Queued email not found.");
  if (sendRecord.status !== "queued") throw new Error("Email is not queued.");

  const generated = normalizeJoined(sendRecord.generated_emails);
  const lead = normalizeJoined(sendRecord.leads);
  const campaign = normalizeJoined(sendRecord.campaigns);
  if (!generated || !lead || !campaign) throw new Error("Queued email is missing campaign, lead, or draft data.");

  const campaignId = String(sendRecord.campaign_id);
  const safety = await runGeneratedEmailSafetyCheck({
    userId,
    generatedEmailId: String(sendRecord.generated_email_id),
    campaignId,
    mode: "auto_send",
    requireConnectedAccount: true,
  });
  if (!safety.passed) {
    const status = classifyBlockedStatus(safety.issues);
    await db.from("email_sends").update({
      status,
      failure_reason: safety.issues.join(" "),
      safety_result: safety,
      last_attempt_at: new Date().toISOString(),
    }).eq("id", emailSendId);
    throw new Error(safety.issues.join(" "));
  }

  try {
    await assertCanSendByUsage(userId);
    await assertCreditsAvailable({ userId, action: "email_send" });
    const workspaceId = String(sendRecord.workspace_id ?? campaign.workspace_id ?? (await ensureDefaultWorkspace(userId)).workspaceId);
    const compliance = await assertComplianceReady(userId, campaignId);
    const google = await getConnectedGoogleAccessToken(workspaceId, "gmail");
    const to = stringValue(lead.email);
    const subject = stringValue(generated.edited_subject) || stringValue(generated.subject);
    const rawBody = stringValue(generated.edited_body) || stringValue(generated.body);
    const body = appendComplianceFooter({
      body: rawBody,
      compliance,
      unsubscribeLink: buildUnsubscribeLink({ email: to, campaignId }),
    });
    if (!hasComplianceFooter(body)) throw new Error("Email compliance footer is missing.");

    await db.from("email_sends").update({
      status: "sending",
      sending_account_id: google.account.id,
      last_attempt_at: new Date().toISOString(),
    }).eq("id", emailSendId);
    await db.from("generated_emails").update({ status: "sending" }).eq("id", generated.id);

    const sent = await sendGmailMessage({
      accessToken: google.accessToken,
      from: stringValue(google.account.email),
      to,
      subject,
      body,
    });
    const accounting = await recordCreditUsage({
      userId,
      workspaceId,
      campaignId,
      leadId: String(sendRecord.lead_id),
      action: "email_send",
      metadata: { provider: "gmail", provider_message_id: sent.id, email_send_id: emailSendId },
    });

    const update = {
      provider_message_id: sent.id,
      status: "sent",
      sent_at: new Date().toISOString(),
      failure_reason: null,
      credits_used: accounting.creditsUsed,
    };
    const { data: updated, error: updateError } = await db.from("email_sends").update(update).eq("id", emailSendId).select("*").single();
    if (updateError) throw new Error(updateError.message);
    await db.from("generated_emails").update({ status: "sent", sent_at: update.sent_at }).eq("id", generated.id);
    await db.from("leads").update({ status: "sent", stage: "sent" }).eq("id", lead.id);
    await incrementUsage(userId, "emails_sent", 1);
    return updated;
  } catch (sendError) {
    const reason = sendError instanceof Error ? sendError.message : "Send failed.";
    const status = reason.includes("limit") ? "blocked_limit" : reason.includes("unsubscribed") ? "blocked_unsubscribed" : reason.includes("compliance") || reason.includes("allowlist") ? "blocked_compliance" : "failed";
    await db.from("email_sends").update({
      status,
      failure_reason: reason,
      retry_count: Number(sendRecord.retry_count ?? 0) + (status === "failed" ? 1 : 0),
      last_attempt_at: new Date().toISOString(),
    }).eq("id", emailSendId);
    await db.from("generated_emails").update({ status }).eq("id", generated.id);
    await logMvpError({ userId, campaignId, source: "gmail", errorCode: status, error: sendError });
    throw sendError;
  }
}

async function upsertSendRecord(input: {
  userId: string;
  workspaceId: string;
  campaignId: string;
  leadId: string;
  generatedEmailId: string;
  taskId?: string | null;
  sendingAccountId?: string | null;
  status: string;
  safetyResult: Record<string, unknown>;
  failureReason?: string | null;
  scheduledAt?: string | null;
}) {
  const db = createServiceClient();
  const { data: existing } = await db
    .from("email_sends")
    .select("*")
    .eq("generated_email_id", input.generatedEmailId)
    .eq("user_id", input.userId)
    .in("status", ["safety_checked", "queued", "sending", "sent", "blocked_unsubscribed", "blocked_compliance", "blocked_limit"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const payload = {
    user_id: input.userId,
    workspace_id: input.workspaceId,
    campaign_id: input.campaignId,
    lead_id: input.leadId,
    generated_email_id: input.generatedEmailId,
    task_id: input.taskId ?? null,
    sending_account_id: input.sendingAccountId ?? null,
    provider: "gmail",
    status: input.status,
    safety_result: scrubSafetyResult(input.safetyResult),
    failure_reason: input.failureReason ?? null,
    scheduled_at: input.scheduledAt ?? null,
    queued_at: input.status === "queued" ? new Date().toISOString() : null,
  };
  if (existing?.id) {
    const { data, error } = await db.from("email_sends").update(payload).eq("id", existing.id).select("*").single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await db.from("email_sends").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

function normalizeSendingMode(value: unknown): SendingMode {
  return value === "draft_only" || value === "auto_send" || value === "approval_required" ? value : "approval_required";
}

function getSendAllowlist() {
  return (getOptionalEnv()?.VELDO_SEND_ALLOWLIST ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowlisted(email: string, allowlist: string[]) {
  const normalized = email.toLowerCase();
  const domain = normalized.split("@")[1] ?? "";
  return allowlist.some((item) => {
    const clean = item.startsWith("@") ? item.slice(1) : item;
    return normalized === item || domain === clean;
  });
}

function findSpamFlags(content: string) {
  const lower = content.toLowerCase();
  const banned = ["guaranteed", "risk-free", "act now", "limited time", "100% free", "make money fast"];
  return banned.filter((word) => lower.includes(word)).map((word) => `Spammy wording detected: ${word}.`);
}

async function hasDuplicateEmail(userId: string, campaignId: string, email: string, leadId: string) {
  if (!email) return false;
  const { data } = await createServiceClient()
    .from("leads")
    .select("id")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .ilike("email", email);
  return (data ?? []).some((lead) => String(lead.id) !== leadId);
}

function classifyBlockedStatus(issues: string[]) {
  const text = issues.join(" ").toLowerCase();
  if (text.includes("unsubscribed")) return "blocked_unsubscribed";
  if (text.includes("limit")) return "blocked_limit";
  return "blocked_compliance";
}

function nextScheduleTime(index: number) {
  return new Date(Date.now() + index * 90_000).toISOString();
}

function normalizeJoined(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return value[0] && typeof value[0] === "object" ? value[0] as Record<string, unknown> : null;
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function scrubSafetyResult(value: Record<string, unknown>) {
  return {
    passed: value.passed,
    issues: value.issues,
    account: value.account && typeof value.account === "object" && "id" in value.account ? { id: value.account.id, email: (value.account as Record<string, unknown>).email } : null,
  };
}
