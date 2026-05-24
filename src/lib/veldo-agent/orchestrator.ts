import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getEnv, hasSecret } from "@/lib/security/env";
import { createAgentCampaign, fetchLeadsForCampaign, researchLeadsForCampaign, writeEmailsForCampaign } from "@/src/lib/mvp/campaign-flow";
import { prepareCampaignSendQueue, sendQueuedCampaignEmails, type SendingMode } from "@/src/lib/mvp/email-queue";
import { ensureDefaultWorkspace } from "@/src/lib/workspace/context";
import { addAgentMessage, getOrCreateThread, loadAgentContext, recordToolRun, remember } from "@/src/lib/veldo-agent/memory";

type VelEventStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "needs_input" | "needs_review";

export type VelEvent = {
  agent: string;
  step: string;
  status: VelEventStatus;
  message: string;
  api?: string;
  progress: number;
};

export type VelQuestion = {
  id: string;
  question: string;
  options: Array<{ label: string; value: string }>;
};

type WorkflowIntent = {
  goal: string;
  productOffer: string;
  targetNiche: string;
  industry: string;
  location: string;
  companySize: string;
  jobTitles: string;
  numberOfLeads: number;
  tone: string;
  callToAction: string;
  sendingMode: SendingMode;
};

const intentSchema = z.object({
  goal: z.string().optional().default(""),
  productOffer: z.string().optional().default(""),
  targetNiche: z.string().optional().default(""),
  industry: z.string().optional().default(""),
  location: z.string().optional().default(""),
  companySize: z.string().optional().default(""),
  jobTitles: z.string().optional().default(""),
  numberOfLeads: z.coerce.number().int().min(1).max(50).optional().default(10),
  tone: z.string().optional().default("clear, direct, professional"),
  callToAction: z.string().optional().default("Open to a short conversation?"),
  sendingMode: z.enum(["draft_only", "approval_required", "auto_send"]).optional().default("approval_required"),
});

export async function runVeldoAgent(input: { userId: string; threadId?: string | null; message: string }) {
  const db = createServiceClient();
  const workspace = await ensureDefaultWorkspace(input.userId);
  const thread = await getOrCreateThread({ userId: input.userId, threadId: input.threadId, title: titleFromMessage(input.message) });
  await addAgentMessage({ threadId: thread.id, userId: input.userId, role: "user", content: input.message });

  const task = await createTask(input.userId, workspace.workspaceId, thread.id, input.message);
  const events: VelEvent[] = [];
  const pushEvent = (event: VelEvent) => events.push(event);

  await logAgent({
    userId: input.userId,
    workspaceId: workspace.workspaceId,
    taskId: task.id,
    agentName: "Vel",
    message: "Vel received a chat request and started request understanding.",
    metadata: { threadId: thread.id },
  });
  pushEvent({
    agent: "Vel",
    step: "Understanding request",
    status: "running",
    api: hasSecret("OPENAI_API_KEY") ? "AI routing" : "Structured parser",
    message: "Vel is turning the plain-English request into a campaign workflow.",
    progress: 10,
  });

  const context = await loadAgentContext(input.userId, thread.id);
  const combinedMessage = [...context.messages.slice(-6).map((message) => String(message.content)), input.message].join("\n");
  const intent = await understandRequest(combinedMessage);
  const questions = buildMissingQuestions(intent);

  if (questions.length) {
    const content = [
      "I can start this, but I need a couple of clear choices first.",
      "",
      ...questions.map((item) => `${item.question}\n${item.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option.label}`).join("\n")}`),
    ].join("\n\n");
    pushEvent({
      agent: "Vel",
      step: "Asking required questions",
      status: "needs_input",
      message: "Required campaign details are missing, so Vel paused the task and asked guided options.",
      progress: 18,
    });
    await logAgent({
      userId: input.userId,
      workspaceId: workspace.workspaceId,
      taskId: task.id,
      agentName: "Vel",
      level: "info",
      message: "Vel needs user input before creating a campaign.",
      metadata: { questions, parsedIntent: intent },
    });
    await updateTask(task.id, {
      status: "needs_review",
      output_json: { questions, events, parsed_intent: intent },
    });
    await addAgentMessage({ threadId: thread.id, userId: input.userId, role: "assistant", content, metadata: { questions, events, taskId: task.id } });
    return { threadId: thread.id, taskId: task.id, message: content, questions, events, progress: 18 };
  }

  pushEvent({
    agent: "Campaign Agent",
    step: "Creating campaign",
    status: "running",
    api: hasSecret("OPENAI_API_KEY") || hasSecret("ANTHROPIC_API_KEY") ? "AI routing available" : "Structured parser",
    message: "Campaign Agent is saving the campaign plan securely.",
    progress: 24,
  });

  let campaign: Record<string, unknown> | null = null;
  let leads: Array<Record<string, unknown>> = [];
  let enrichments: Array<Record<string, unknown>> = [];
  let emails: Array<Record<string, unknown>> = [];
  let queued: Array<Record<string, unknown>> = [];
  let blockedQueue: Array<Record<string, unknown>> = [];
  let sent: Array<Record<string, unknown>> = [];
  let sendFailures: Array<Record<string, unknown>> = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  try {
    const createdCampaign = await createAgentCampaign(input.userId, {
      name: campaignName(intent),
      product_offer: intent.productOffer,
      goal: intent.goal,
      target_niche: intent.targetNiche,
      industry: intent.industry,
      location: intent.location,
      company_size: intent.companySize,
      job_titles: intent.jobTitles,
      number_of_leads: intent.numberOfLeads,
      tone: intent.tone,
      call_to_action: intent.callToAction,
      sending_mode: intent.sendingMode,
    }, "draft");
    campaign = createdCampaign;
    await db.from("veldo_agent_threads").update({ campaign_id: createdCampaign.id }).eq("id", thread.id);
    await logAgent({
      userId: input.userId,
      workspaceId: workspace.workspaceId,
      taskId: task.id,
      campaignId: String(createdCampaign.id),
      agentName: "Campaign Agent",
      message: "Campaign Agent created a campaign record.",
      metadata: { campaignId: createdCampaign.id, intent },
    });
    await saveDecision({
      userId: input.userId,
      workspaceId: workspace.workspaceId,
      taskId: task.id,
      campaignId: String(createdCampaign.id),
      agentName: "Campaign Agent",
      confidence: hasSecret("OPENAI_API_KEY") ? 78 : 62,
      needsHumanReview: !hasSecret("OPENAI_API_KEY"),
      decision: { action: "create_campaign", intent },
    });
    await recordToolRun({
      threadId: thread.id,
      userId: input.userId,
      campaignId: String(createdCampaign.id),
      toolName: "create_campaign",
      input: { intent },
      output: { campaignId: createdCampaign.id, status: createdCampaign.status },
    });
    pushEvent({
      agent: "Campaign Agent",
      step: "Campaign saved",
      status: "completed",
      api: "Workspace data",
      message: "Campaign record was saved and linked to this Vel chat task.",
      progress: 34,
    });
  } catch (error) {
    const message = errorMessage(error);
    failed.push(`Campaign Agent: ${message}`);
    await failTask(task.id, message);
    await logAgent({ userId: input.userId, workspaceId: workspace.workspaceId, taskId: task.id, agentName: "Campaign Agent", level: "error", message, metadata: { intent } });
    const content = `I could not create the campaign yet: ${message}`;
    await addAgentMessage({ threadId: thread.id, userId: input.userId, role: "assistant", content, metadata: { events, failed, taskId: task.id } });
    return { threadId: thread.id, taskId: task.id, message: content, events, failed, progress: 34 };
  }

  if (!campaign) throw new Error("Campaign Agent did not return a campaign.");
  const activeCampaign = campaign;
  const campaignId = String(activeCampaign.id);

  if (hasSecret("APOLLO_API_KEY")) {
    pushEvent({
      agent: "Lead Agent",
      step: "Finding leads",
      status: "running",
      api: "Lead search",
      message: "Lead Agent is running server-side lead search and saving valid leads securely.",
      progress: 45,
    });
    try {
      leads = await fetchLeadsForCampaign(input.userId, campaignId);
      await logAgent({
        userId: input.userId,
        workspaceId: workspace.workspaceId,
        taskId: task.id,
        campaignId,
        agentName: "Lead Agent",
        message: "Lead Agent completed lead search.",
        metadata: { requested: intent.numberOfLeads, saved: leads.length, api: "apollo" },
      });
      pushEvent({
        agent: "Lead Agent",
        step: "Leads saved",
        status: leads.length ? "completed" : "needs_review",
        api: "Lead search + workspace data",
        message: leads.length ? `${leads.length} leads were saved.` : "Lead search returned no usable leads.",
        progress: 56,
      });
    } catch (error) {
      const message = errorMessage(error);
      failed.push(`Lead Agent: ${message}`);
      await logAgent({ userId: input.userId, workspaceId: workspace.workspaceId, taskId: task.id, campaignId, agentName: "Lead Agent", level: "error", message, metadata: { api: "apollo" } });
      pushEvent({ agent: "Lead Agent", step: "Lead search failed", status: "failed", api: "Lead search", message: sanitizePublicMessage(message), progress: 56 });
    }
  } else {
    skipped.push("Lead search is not configured, so real lead search was marked pending.");
    await logAgent({
      userId: input.userId,
      workspaceId: workspace.workspaceId,
      taskId: task.id,
      campaignId,
      agentName: "Lead Agent",
      level: "warn",
      message: "Lead search skipped because lead search is not configured.",
      metadata: { api: "apollo", status: "missing_api_key" },
    });
    pushEvent({
      agent: "Lead Agent",
      step: "Lead search pending",
      status: "skipped",
      api: "Lead search",
      message: "Lead search is not configured. No fake leads were invented.",
      progress: 56,
    });
  }

  await logIntegrationReadiness(input.userId, workspace.workspaceId, task.id, campaignId);

  if (leads.length && hasSecret("FIRECRAWL_API_KEY")) {
    pushEvent({
      agent: "Enrichment Agent",
      step: "Enriching leads",
      status: "running",
      api: "Page extraction",
      message: "Enrichment Agent is researching company websites and saving confidence-scored enrichment.",
      progress: 66,
    });
    try {
      enrichments = await researchLeadsForCampaign(input.userId, campaignId);
      await logAgent({
        userId: input.userId,
        workspaceId: workspace.workspaceId,
        taskId: task.id,
        campaignId,
        agentName: "Enrichment Agent",
        message: "Enrichment Agent saved lead enrichment records.",
        metadata: { enriched: enrichments.length, api: "firecrawl" },
      });
      pushEvent({
        agent: "Enrichment Agent",
        step: "Enrichment saved",
        status: "completed",
        api: "Lead enrichment + workspace data",
        message: `${enrichments.length} enrichment records were saved.`,
        progress: 74,
      });
    } catch (error) {
      const message = errorMessage(error);
      failed.push(`Enrichment Agent: ${message}`);
      await logAgent({ userId: input.userId, workspaceId: workspace.workspaceId, taskId: task.id, campaignId, agentName: "Enrichment Agent", level: "error", message, metadata: { api: "firecrawl" } });
      pushEvent({ agent: "Enrichment Agent", step: "Enrichment failed", status: "failed", api: "Lead enrichment", message: sanitizePublicMessage(message), progress: 74 });
    }
  } else {
    const reason = leads.length ? "Lead enrichment is not configured." : "No leads are available to enrich.";
    skipped.push(`Enrichment skipped: ${reason}`);
    await logAgent({
      userId: input.userId,
      workspaceId: workspace.workspaceId,
      taskId: task.id,
      campaignId,
      agentName: "Enrichment Agent",
      level: "warn",
      message: `Enrichment skipped. ${reason}`,
      metadata: { api: "firecrawl", hasLeads: leads.length > 0 },
    });
    pushEvent({ agent: "Enrichment Agent", step: "Enrichment pending", status: "skipped", api: "Lead enrichment", message: reason, progress: 74 });
  }

  if (leads.length && (hasSecret("ANTHROPIC_API_KEY") || hasSecret("OPENAI_API_KEY"))) {
    pushEvent({
      agent: "Personalization Agent",
      step: "Drafting emails",
      status: "running",
      api: "AI writing",
      message: "Personalization Agent is writing review-ready drafts and saving them securely.",
      progress: 82,
    });
    try {
      emails = await writeEmailsForCampaign(input.userId, campaignId);
      await logAgent({
        userId: input.userId,
        workspaceId: workspace.workspaceId,
        taskId: task.id,
        campaignId,
        agentName: "Personalization Agent",
        message: "Personalization Agent saved generated emails.",
        metadata: { drafted: emails.length, api: hasSecret("ANTHROPIC_API_KEY") ? "anthropic" : "openai" },
      });
      pushEvent({
        agent: "Personalization Agent",
        step: "Drafts saved",
        status: "completed",
        api: "AI writing + workspace data",
        message: `${emails.length} email drafts were saved for review.`,
        progress: 88,
      });
    } catch (error) {
      const message = errorMessage(error);
      failed.push(`Personalization Agent: ${message}`);
      await logAgent({ userId: input.userId, workspaceId: workspace.workspaceId, taskId: task.id, campaignId, agentName: "Personalization Agent", level: "error", message, metadata: { api: "ai_generation" } });
      pushEvent({ agent: "Personalization Agent", step: "Drafting failed", status: "failed", api: "AI writing", message: sanitizePublicMessage(message), progress: 88 });
    }
  } else {
    const reason = leads.length ? "AI writing is not configured." : "No leads are available for drafts.";
    skipped.push(`Email drafting skipped: ${reason}`);
    await logAgent({
      userId: input.userId,
      workspaceId: workspace.workspaceId,
      taskId: task.id,
      campaignId,
      agentName: "Personalization Agent",
      level: "warn",
      message: `Email drafting skipped. ${reason}`,
      metadata: { hasLeads: leads.length > 0 },
    });
    pushEvent({ agent: "Personalization Agent", step: "Drafting pending", status: "skipped", api: "AI writing", message: reason, progress: 88 });
  }

  if (emails.length) {
    pushEvent({
      agent: "Compliance/Safety Agent",
      step: "Running safety checks",
      status: "running",
      api: "Workspace data + mailbox readiness",
      message: "Safety checks are validating recipients, opt-out, duplicates, compliance, and send mode.",
      progress: 92,
    });
    try {
      const queueResult = await prepareCampaignSendQueue({ userId: input.userId, campaignId, taskId: task.id, mode: intent.sendingMode });
      queued = queueResult.queued as Array<Record<string, unknown>>;
      blockedQueue = queueResult.blocked as Array<Record<string, unknown>>;
      if (queueResult.skipped.length) skipped.push(`Queue skipped ${queueResult.skipped.length} draft(s): ${queueResult.skipped.map((item) => item.reason).join(" ")}`);
      if (blockedQueue.length) failed.push(`Compliance/Safety Agent blocked ${blockedQueue.length} email(s).`);
      await logAgent({
        userId: input.userId,
        workspaceId: workspace.workspaceId,
        taskId: task.id,
        campaignId,
        agentName: "Compliance/Safety Agent",
        level: blockedQueue.length ? "warn" : "info",
        message: "Safety checks finished and queue records were persisted.",
        metadata: { mode: intent.sendingMode, queued: queued.length, blocked: blockedQueue.length, skipped: queueResult.skipped.length },
      });
      pushEvent({
        agent: "Compliance/Safety Agent",
        step: "Safety checks saved",
        status: blockedQueue.length ? "needs_review" : "completed",
        api: "Workspace data",
        message: `${queued.length} email(s) queued, ${blockedQueue.length} blocked, ${queueResult.skipped.length} waiting.`,
        progress: 94,
      });
    } catch (error) {
      const message = errorMessage(error);
      failed.push(`Compliance/Safety Agent: ${message}`);
      await logAgent({ userId: input.userId, workspaceId: workspace.workspaceId, taskId: task.id, campaignId, agentName: "Compliance/Safety Agent", level: "error", message, metadata: { mode: intent.sendingMode } });
      pushEvent({ agent: "Compliance/Safety Agent", step: "Safety checks failed", status: "failed", api: "Workspace data", message: sanitizePublicMessage(message), progress: 94 });
    }
  } else {
    skipped.push("Safety and queue skipped because no email drafts are available.");
    pushEvent({ agent: "Compliance/Safety Agent", step: "Safety pending", status: "skipped", message: "No email drafts are available to check.", progress: 94 });
  }

  if (intent.sendingMode === "auto_send" && queued.length) {
    pushEvent({
      agent: "Sending Agent",
      step: "Sending queued emails",
      status: "running",
      api: "Mailbox",
      message: "Auto-send is enabled. Sending Agent is processing the safe queued batch.",
      progress: 97,
    });
    try {
      const sendResult = await sendQueuedCampaignEmails({ userId: input.userId, campaignId, taskId: task.id, limit: 5 });
      sent = sendResult.sent as Array<Record<string, unknown>>;
      sendFailures = sendResult.failed as Array<Record<string, unknown>>;
      if (sendFailures.length) failed.push(`Sending Agent failed ${sendFailures.length} email(s).`);
      await logAgent({
        userId: input.userId,
        workspaceId: workspace.workspaceId,
        taskId: task.id,
        campaignId,
        agentName: "Sending Agent",
        level: sendFailures.length ? "warn" : "info",
        message: "Sending Agent processed the queued mailbox batch.",
        metadata: { sent: sent.length, failed: sendFailures.length, remaining: sendResult.remaining },
      });
      pushEvent({
        agent: "Sending Agent",
        step: "Send batch complete",
        status: sendFailures.length ? "needs_review" : "completed",
        api: "Mailbox",
        message: `${sent.length} sent, ${sendFailures.length} failed, ${sendResult.remaining} still queued.`,
        progress: 99,
      });
    } catch (error) {
      const message = errorMessage(error);
      failed.push(`Sending Agent: ${message}`);
      await logAgent({ userId: input.userId, workspaceId: workspace.workspaceId, taskId: task.id, campaignId, agentName: "Sending Agent", level: "error", message, metadata: { mode: intent.sendingMode } });
      pushEvent({ agent: "Sending Agent", step: "Sending blocked", status: "failed", api: "Mailbox", message: sanitizePublicMessage(message), progress: 99 });
    }
  } else {
    const message = intent.sendingMode === "auto_send"
      ? "Auto-send is enabled, but no safe queued emails are available."
      : intent.sendingMode === "draft_only"
        ? "Draft-only mode is active. No emails were queued or sent."
        : "Approval-required mode is active. Drafts must be approved before sending.";
    await logAgent({
      userId: input.userId,
      workspaceId: workspace.workspaceId,
      taskId: task.id,
      campaignId,
      agentName: "Sending Agent",
      message,
      metadata: { gmailConfigured: hasSecret("GMAIL_CLIENT_ID") && hasSecret("GMAIL_CLIENT_SECRET"), sendingMode: intent.sendingMode, queued: queued.length },
    });
    pushEvent({
      agent: "Sending Agent",
      step: "Sending paused",
      status: intent.sendingMode === "approval_required" ? "needs_review" : "skipped",
      api: "Mailbox",
      message,
      progress: 99,
    });
  }

  const finalResult = buildFinalResult(input.message, intent, activeCampaign, leads, enrichments, emails, queued, blockedQueue, sent, sendFailures, skipped, failed);
  await saveCampaignLearning(input.userId, workspace.workspaceId, campaignId, finalResult.summary, skipped, failed);
  await logAgent({
    userId: input.userId,
    workspaceId: workspace.workspaceId,
    taskId: task.id,
    campaignId,
    agentName: "Reporting Agent",
    message: "Reporting Agent saved the final workflow summary.",
    metadata: finalResult,
  });
  pushEvent({
    agent: "Reporting Agent",
    step: "Task completed",
    status: failed.length ? "needs_review" : "completed",
    api: "Workspace data",
    message: "Final task summary was saved.",
    progress: 100,
  });

  const status = failed.length ? "needs_review" : "completed";
  await updateTask(task.id, {
    status,
    campaign_id: campaignId,
    output_json: finalResult,
    error_message: failed.length ? failed.join(" | ") : null,
  });
  const response = formatFinalMessage(finalResult);
  await addAgentMessage({ threadId: thread.id, userId: input.userId, role: "assistant", content: response, metadata: { events, taskId: task.id, finalResult } });
  await remember({ userId: input.userId, campaignId, key: "last_vel_workflow", summary: finalResult.summary, value: finalResult });
  return { threadId: thread.id, taskId: task.id, message: response, events, progress: 100, finalResult };
}

async function understandRequest(message: string): Promise<WorkflowIntent> {
  const heuristic = inferIntent(message);
  if (!hasSecret("OPENAI_API_KEY")) return heuristic;
  try {
    const env = getEnv();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL ?? "gpt-5.3",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Extract a B2B outreach workflow from the user's text. Return JSON only with goal, productOffer, targetNiche, industry, location, companySize, jobTitles, numberOfLeads, tone, callToAction, sendingMode. sendingMode must be draft_only, approval_required, or auto_send. Do not invent private facts.",
          },
          { role: "user", content: message },
        ],
      }),
    });
    if (!response.ok) return heuristic;
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return heuristic;
    const ai = intentSchema.parse(JSON.parse(content));
    return normalizeIntent({ ...heuristic, ...removeEmpty(ai) });
  } catch {
    return heuristic;
  }
}

function inferIntent(message: string): WorkflowIntent {
  const text = message.replace(/\s+/gu, " ").trim();
  const lower = text.toLowerCase();
  const numberMatch = lower.match(/\b(\d{1,2})\s+(?:leads|prospects|buyers|contacts)\b/u);
  const productMatch = text.match(/(?:for my|for our|for a|for an)\s+(.+?)(?:\s+and\s+create|\s+and\s+draft|\s+to\s+|$)/iu);
  const targetMatch = text.match(/(?:for|target|targeting)\s+([A-Z0-9][A-Za-z0-9\s&,-]{2,80}?(?:buyers|founders|heads|managers|directors|operators|owners|executives|procurement|retailers))/u);
  const productOffer = cleanPhrase(productMatch?.[1]) || "";
  const targetNiche = cleanPhrase(targetMatch?.[1]) || (lower.includes("walmart") ? "Walmart buyers" : "");
  const wantsEmails = /\b(email|emails|draft|personaliz)/iu.test(text);
  const wantsLeads = /\b(lead|leads|prospect|prospects|buyers|contacts|find)\b/iu.test(text);

  return normalizeIntent({
    goal: wantsLeads && wantsEmails ? "Find leads and create personalized emails" : wantsLeads ? "Find qualified leads" : wantsEmails ? "Create personalized emails" : "",
    productOffer,
    targetNiche,
    industry: inferIndustry(text, productOffer, targetNiche),
    location: inferLocation(text),
    companySize: "",
    jobTitles: inferJobTitles(text, targetNiche),
    numberOfLeads: numberMatch ? Number(numberMatch[1]) : 10,
    tone: inferTone(text),
    callToAction: "Open to a short conversation?",
    sendingMode: inferSendingMode(text),
  });
}

function normalizeIntent(raw: Partial<WorkflowIntent>): WorkflowIntent {
  return {
    goal: raw.goal?.trim() || "",
    productOffer: raw.productOffer?.trim() || "",
    targetNiche: raw.targetNiche?.trim() || "",
    industry: raw.industry?.trim() || "B2B",
    location: raw.location?.trim() || "",
    companySize: raw.companySize?.trim() || "",
    jobTitles: raw.jobTitles?.trim() || "",
    numberOfLeads: Math.max(1, Math.min(50, Number(raw.numberOfLeads ?? 10) || 10)),
    tone: raw.tone?.trim() || "clear, direct, professional",
    callToAction: raw.callToAction?.trim() || "Open to a short conversation?",
    sendingMode: raw.sendingMode ?? "approval_required",
  };
}

function buildMissingQuestions(intent: WorkflowIntent): VelQuestion[] {
  const questions: VelQuestion[] = [];
  if (!intent.goal) {
    questions.push({
      id: "goal",
      question: "What is your main goal?",
      options: [
        { label: "Find leads", value: "Find qualified leads" },
        { label: "Draft emails", value: "Create personalized emails" },
        { label: "Find leads and draft emails", value: "Find leads and create personalized emails" },
        { label: "Improve an existing campaign", value: "Improve an existing campaign" },
      ],
    });
  }
  if (!intent.targetNiche && !intent.jobTitles) {
    questions.push({
      id: "target",
      question: "Who should Vel target?",
      options: [
        { label: "Retail buyers", value: "Retail buyers" },
        { label: "Founders", value: "Founders" },
        { label: "Sales heads", value: "Sales heads" },
        { label: "Marketing managers", value: "Marketing managers" },
      ],
    });
  }
  if (!intent.productOffer) {
    questions.push({
      id: "offer",
      question: "What should the campaign promote?",
      options: [
        { label: "My product", value: "My product" },
        { label: "My service", value: "My service" },
        { label: "A SaaS offer", value: "A SaaS offer" },
        { label: "A custom offer", value: "A custom offer" },
      ],
    });
  }
  if (questions.length && questions.length < 3) {
    questions.push({
      id: "sending_mode",
      question: "Should Vel send emails after generation?",
      options: [
        { label: "Save drafts for review", value: "approval_required" },
        { label: "Draft only", value: "draft_only" },
        { label: "Auto-send after safety checks", value: "auto_send" },
      ],
    });
  }
  return questions.slice(0, 3);
}

async function createTask(userId: string, workspaceId: string, threadId: string, message: string) {
  const { data, error } = await createServiceClient().from("agent_tasks").insert({
    user_id: userId,
    workspace_id: workspaceId,
    agent_name: "Vel",
    task_type: "veldo_chat_workflow",
    status: "running",
    priority: 3,
    input_json: { thread_id: threadId, user_request: message },
  }).select("*").single();
  if (error) throw new Error(error.message);
  return data as Record<string, string>;
}

async function updateTask(taskId: string, updates: Record<string, unknown>) {
  const { error } = await createServiceClient().from("agent_tasks").update(updates).eq("id", taskId);
  if (error) throw new Error(error.message);
}

async function failTask(taskId: string, message: string) {
  await updateTask(taskId, { status: "failed", error_message: message, output_json: { error: message } });
}

async function logAgent(input: {
  userId: string;
  workspaceId: string;
  taskId?: string;
  campaignId?: string;
  leadId?: string;
  agentName: string;
  level?: "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await createServiceClient().from("agent_logs").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId,
    task_id: input.taskId ?? null,
    campaign_id: input.campaignId ?? null,
    lead_id: input.leadId ?? null,
    agent_name: input.agentName,
    level: input.level ?? "info",
    message: input.message,
    metadata: input.metadata ?? {},
  });
}

async function saveDecision(input: {
  userId: string;
  workspaceId: string;
  taskId: string;
  campaignId: string;
  agentName: string;
  decision: Record<string, unknown>;
  confidence: number;
  needsHumanReview: boolean;
}) {
  await createServiceClient().from("agent_decisions").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId,
    task_id: input.taskId,
    campaign_id: input.campaignId,
    agent_name: input.agentName,
    decision_json: input.decision,
    confidence: input.confidence,
    needs_human_review: input.needsHumanReview,
  });
}

async function logIntegrationReadiness(userId: string, workspaceId: string, taskId: string, campaignId: string) {
  const integrations = [
    { name: "Clay", env: "CLAY_API_KEY", role: "lead workflows" },
    { name: "Tably", env: "TABLY_API_KEY", role: "company/contact data" },
    { name: "Enrich", env: "ENRICH_API_KEY", role: "lead enrichment" },
    { name: "Mailbox", env: "GMAIL_CLIENT_ID", role: "sending workflow" },
  ] as const;
  for (const integration of integrations) {
    await logAgent({
      userId,
      workspaceId,
      taskId,
      campaignId,
      agentName: "Vel",
      level: hasSecret(integration.env) ? "info" : "warn",
      message: `${integration.name} ${hasSecret(integration.env) ? "is configured" : "is not configured"} for ${integration.role}.`,
      metadata: { provider: integration.name.toLowerCase(), configured: hasSecret(integration.env), role: integration.role },
    });
  }
}

async function saveCampaignLearning(userId: string, workspaceId: string, campaignId: string, summary: string, skipped: string[], failed: string[]) {
  await createServiceClient().from("campaign_learnings").upsert({
    user_id: userId,
    workspace_id: workspaceId,
    campaign_id: campaignId,
    summary,
    weakness: failed[0] ?? skipped[0] ?? null,
    recommended_change: failed.length || skipped.length ? "Connect missing prerequisites, review results, then rerun the pending steps." : "Review drafts and approve safe sends when a mailbox is connected.",
    risk_flags: [...failed, ...skipped],
  }, { onConflict: "campaign_id" });
}

function buildFinalResult(
  userRequest: string,
  intent: WorkflowIntent,
  campaign: Record<string, unknown>,
  leads: Array<Record<string, unknown>>,
  enrichments: Array<Record<string, unknown>>,
  emails: Array<Record<string, unknown>>,
  queued: Array<Record<string, unknown>>,
  blockedQueue: Array<Record<string, unknown>>,
  sent: Array<Record<string, unknown>>,
  sendFailures: Array<Record<string, unknown>>,
  skipped: string[],
  failed: string[],
) {
  const apisUsed = [
    "Workspace data",
    hasSecret("OPENAI_API_KEY") ? "AI routing" : null,
    hasSecret("APOLLO_API_KEY") ? "Lead search" : null,
    hasSecret("FIRECRAWL_API_KEY") ? "Lead enrichment" : null,
    hasSecret("ANTHROPIC_API_KEY") ? "AI writing" : null,
    sent.length || queued.length ? "Mailbox" : null,
  ].filter(Boolean);
  const summary = `Vel understood the request as: ${intent.goal}. Campaign "${campaign.name}" was saved with ${leads.length} leads, ${enrichments.length} enrichments, ${emails.length} drafts, ${queued.length} queued, and ${sent.length} sent.`;
  return {
    user_request: userRequest,
    vel_understood: intent,
    campaign,
    leads_requested: intent.numberOfLeads,
    leads_found: leads.length,
    leads_enriched: enrichments.length,
    emails_drafted: emails.length,
    emails_queued: queued.length,
    emails_blocked: blockedQueue.length,
    emails_sent: sent.length,
    emails_failed: sendFailures.length,
    apis_used: apisUsed,
    skipped_steps: skipped.map(sanitizePublicMessage),
    failed_steps: failed.map(sanitizePublicMessage),
    sending_mode: intent.sendingMode,
    next_best_action: failed.length || skipped.length ? "Review blocked steps, connect missing prerequisites, then rerun the pending agent step." : intent.sendingMode === "auto_send" ? "Monitor replies and queue status." : "Review and approve drafts before sending.",
    summary,
  };
}

function formatFinalMessage(result: ReturnType<typeof buildFinalResult>) {
  return [
    `Vel understood this as: ${result.vel_understood.goal}`,
    "",
    `Campaign created: ${String((result.campaign as Record<string, unknown>).name ?? "Untitled campaign")}`,
    `Leads requested: ${result.leads_requested}`,
    `Leads found: ${result.leads_found}`,
    `Leads enriched: ${result.leads_enriched}`,
    `Emails drafted: ${result.emails_drafted}`,
    `Emails queued: ${result.emails_queued}`,
    `Emails sent: ${result.emails_sent}`,
    `Emails failed/blocked: ${Number(result.emails_failed) + Number(result.emails_blocked)}`,
    `Sending mode: ${result.sending_mode}`,
    `Systems used: ${result.apis_used.join(", ") || "Workspace data only"}`,
    result.skipped_steps.length ? `Skipped: ${result.skipped_steps.join(" ")}` : "Skipped: none",
    result.failed_steps.length ? `Failed: ${result.failed_steps.join(" ")}` : "Failed: none",
    "",
    `Next best action: ${result.next_best_action}`,
  ].join("\n");
}

function sanitizePublicMessage(message: string) {
  return message
    .replace(/\bSupabase\b/giu, "workspace data")
    .replace(/\bApollo\b/giu, "lead search")
    .replace(/\bOpenAI\b|\bAnthropic\b|\bClaude\b|\bGPT(?:[-\s]?\d+(?:\.\d+)?)?\b/giu, "AI")
    .replace(/\bFirecrawl\b|\bTavily\b|\bZeroBounce\b|\bClay\b/giu, "configured service")
    .replace(/\bGmail\b|\bGoogle\b/giu, "mailbox")
    .replace(/\b[A-Z0-9_]*(?:API_KEY|CLIENT_ID|CLIENT_SECRET)[A-Z0-9_]*\b/gu, "required configuration");
}

function campaignName(intent: WorkflowIntent) {
  const target = intent.targetNiche || intent.jobTitles || "prospects";
  const offer = intent.productOffer || "offer";
  return `${titleCase(offer)} to ${titleCase(target)}`.slice(0, 90);
}

function inferJobTitles(text: string, target: string) {
  const source = `${text} ${target}`.toLowerCase();
  if (source.includes("walmart") || source.includes("retail") || source.includes("buyer")) return "Retail Buyer, Category Manager, Procurement Manager";
  if (source.includes("founder")) return "Founder, Co-Founder, CEO";
  if (source.includes("sales")) return "Head of Sales, VP Sales, Revenue Leader";
  if (source.includes("marketing")) return "Head of Marketing, Marketing Manager, Growth Manager";
  return "";
}

function inferIndustry(text: string, product: string, target: string) {
  const source = `${text} ${product} ${target}`.toLowerCase();
  if (source.includes("walmart") || source.includes("retail") || source.includes("buyer")) return "Retail";
  if (source.includes("oil")) return "Consumer goods";
  if (source.includes("saas") || source.includes("software")) return "Software";
  return "B2B";
}

function inferLocation(text: string) {
  const match = text.match(/\b(?:in|around|near)\s+([A-Z][A-Za-z\s,]{2,40})(?:\.|,|$)/u);
  return cleanPhrase(match?.[1]) || "";
}

function inferTone(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("friendly")) return "friendly";
  if (lower.includes("premium") || lower.includes("enterprise")) return "premium enterprise";
  if (lower.includes("highly personalized")) return "highly personalized";
  if (lower.includes("short") || lower.includes("direct")) return "short and direct";
  return "clear, direct, professional";
}

function inferSendingMode(text: string): SendingMode {
  const lower = text.toLowerCase();
  if (lower.includes("auto_send") || lower.includes("auto-send") || lower.includes("autosend") || lower.includes("send automatically") || /\band send (them|emails|it)\b/iu.test(text)) return "auto_send";
  if (lower.includes("draft_only") || lower.includes("draft only") || lower.includes("do not send") || lower.includes("don't send")) return "draft_only";
  return "approval_required";
}

function titleFromMessage(message: string) {
  return message.length > 80 ? `${message.slice(0, 77)}...` : message || "Veldo Chat";
}

function titleCase(value: string) {
  return value.replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function cleanPhrase(value: string | undefined) {
  return value?.replace(/[.?!,]+$/gu, "").trim() ?? "";
}

function removeEmpty<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== null && item !== undefined)) as Partial<WorkflowIntent>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
