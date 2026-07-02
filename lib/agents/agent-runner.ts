import { createServiceClient } from "@/lib/integrations/supabase";
import { updateTaskStatus } from "@/lib/agents/agent-helpers";
import { importApolloLeads } from "@/lib/leads/generation";
import type { ApolloResponse } from "@/lib/integrations/apollo";
import { verifyEmail } from "@/lib/integrations/zerobounce";
import { researchCompany } from "@/lib/agents/company-research-agent";
import { scoreIcpFit } from "@/lib/agents/icp-fit-agent";
import { writeEmail } from "@/lib/agents/email-writer-agent";
import { scoreEmail } from "@/lib/agents/email-scoring-agent";
import { classifyReply } from "@/lib/agents/reply-classifier-agent";
import { prepareCall, placeCall } from "@/lib/voice/calling";

interface AgentTask {
  id: string;
  agent_name: string | null;
  task_type: string | null;
  input_json: unknown;
  user_id?: string | null;
  campaign_id?: string | null;
  lead_id?: string | null;
}

export async function runTask(task: AgentTask): Promise<{
  taskId: string;
  status: string;
  result?: unknown;
  message: string;
}> {
  const db = createServiceClient();

  try {
    // Mark as running
    await db
      .from("agent_tasks")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", task.id);

    // Route to appropriate handler
    const result = await dispatch(task);

    await updateTaskStatus(task.id, "completed", result);

    return {
      taskId: task.id,
      status: "completed",
      result,
      message: `Task ${task.task_type} completed successfully.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await updateTaskStatus(task.id, "failed", null, message);
    throw err;
  }
}

export async function processQueuedTask(taskIdOrUserId: string): Promise<{
  ran: boolean;
  taskId: string;
  status: string;
  result?: unknown;
  message: string;
}> {
  const db = createServiceClient();

  // Determine if we were passed a userId or a taskId
  // If the string looks like a UUID, treat as taskId first; if not found, treat as userId
  let task: AgentTask | null = null;

  // Try finding by task id
  const { data: byId } = await db
    .from("agent_tasks")
    .select("*")
    .eq("id", taskIdOrUserId)
    .in("status", ["pending", "queued"])
    .maybeSingle();

  if (byId) {
    task = byId as AgentTask;
  } else {
    // Find next pending task for this user
    const { data: byUser } = await db
      .from("agent_tasks")
      .select("*")
      .eq("user_id", taskIdOrUserId)
      .in("status", ["pending", "queued"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    task = byUser as AgentTask | null;
  }

  if (!task) {
    return { ran: false, taskId: "", status: "none", message: "No pending tasks found." };
  }

  const result = await runTask(task);
  return { ran: true, ...result };
}

async function dispatch(task: AgentTask): Promise<unknown> {
  switch (task.agent_name) {
    case "lead_import":
      if (task.task_type === "import_apollo") {
        const input = task.input_json as { apollo_response?: ApolloResponse } | null;
        const response = input?.apollo_response;
        if (!response) return { imported: 0, skipped: 0, message: "No Apollo response provided." };
        return importApolloLeads({
          userId: task.user_id ?? "",
          campaignId: task.campaign_id,
          response,
        });
      }
      return { imported: 0, message: "Lead import queued. Connect Apollo API key in Settings → Integrations." };

    case "company_research":
      if (!task.user_id || !task.lead_id) return { researched: 0, message: "Research needs a user and lead." };
      return researchCompany({ userId: task.user_id, leadId: task.lead_id });

    case "icp_fit":
    case "icp_scoring": {
      if (!task.user_id || !task.lead_id || !task.campaign_id) {
        return { scored: 0, message: "ICP scoring needs a user, lead, and campaign." };
      }
      return scoreIcpFit({ userId: task.user_id, leadId: task.lead_id, campaignId: task.campaign_id });
    }

    case "email_writer": {
      if (!task.user_id || !task.lead_id || !task.campaign_id) {
        return { drafted: 0, message: "Email writing needs a user, lead, and campaign." };
      }
      const input = task.input_json as { hyper_personalization?: boolean } | null;
      return writeEmail({
        userId: task.user_id,
        leadId: task.lead_id,
        campaignId: task.campaign_id,
        hyperPersonalization: input?.hyper_personalization === true,
      });
    }

    case "email_scoring": {
      if (!task.user_id) return { scored: 0, message: "Email scoring needs a user." };
      const input = task.input_json as { draft_id?: string; generated_email_id?: string } | null;
      let draftId = input?.draft_id ?? input?.generated_email_id;
      if (!draftId && task.lead_id) {
        const { data: latest } = await createServiceClient()
          .from("generated_emails")
          .select("id")
          .eq("user_id", task.user_id)
          .eq("lead_id", task.lead_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        draftId = latest?.id;
      }
      if (!draftId) return { scored: 0, message: "No draft found to score." };
      return scoreEmail({ userId: task.user_id, draftId });
    }

    case "voice_call": {
      if (!task.user_id) return { message: "Voice call needs a user." };
      const input = (task.input_json ?? {}) as Record<string, unknown>;
      const db = createServiceClient();

      if (task.task_type === "place_voice_call" && typeof input.call_task_id === "string") {
        return placeCall(task.user_id, input.call_task_id);
      }

      // prepare_voice_call: load the lead's number, build a script, run compliance gates.
      let toPhone = String(input.to_phone ?? "");
      let leadName = "";
      if (!toPhone && task.lead_id) {
        const { data: lead } = await db
          .from("leads")
          .select("phone, first_name, last_name")
          .eq("id", task.lead_id)
          .eq("user_id", task.user_id)
          .maybeSingle();
        toPhone = String(lead?.phone ?? "");
        leadName = [lead?.first_name, lead?.last_name].filter(Boolean).join(" ");
      }
      if (!toPhone) return { status: "needs_review", blockers: ["No phone number on this lead."] };

      const callTimeAllowed = input.call_time_allowed === true;
      return prepareCall({
        userId: task.user_id,
        leadId: task.lead_id,
        campaignId: task.campaign_id,
        toPhone,
        script: String(input.script ?? `Hi ${leadName || "there"}, this is an AI assistant calling on behalf of our team.`),
        consentBasis: String(input.consent_basis ?? "manual_review_required"),
        // If the caller hasn't confirmed the call-time is allowed, force an out-of-window
        // hour so the window gate blocks until a human confirms.
        localHour: callTimeAllowed ? 12 : 3,
        disclosureGiven: input.user_approved_campaign_purpose === true,
        recordingConsentRequired: true,
        recordingConsentGiven: input.recording_consent_obtained === true,
      });
    }

    case "reply_classification": {
      if (!task.user_id) return { classified: 0, message: "Reply classification needs a user." };
      const input = (task.input_json ?? {}) as Record<string, unknown>;
      const text = String(input.raw_reply ?? input.text ?? input.body ?? input.reply ?? "");
      if (!text) return { classified: 0, message: "No reply text to classify." };
      return classifyReply({
        userId: task.user_id,
        leadId: task.lead_id,
        campaignId: task.campaign_id,
        replyId: typeof input.reply_id === "string" ? input.reply_id : null,
        text,
      });
    }

    case "email_verification":
      if (task.lead_id && task.user_id) {
        const { data: lead } = await createServiceClient()
          .from("leads")
          .select("email")
          .eq("id", task.lead_id)
          .eq("user_id", task.user_id)
          .maybeSingle();
        const email = typeof lead?.email === "string" ? lead.email : "";
        if (email) return verifyEmail(email, { userId: task.user_id, leadId: task.lead_id });
      }
      return { verified: 0, message: "Email verification queued. Requires ZEROBOUNCE_API_KEY." };

    default:
      return { queued: true, message: `Task ${task.task_type} for agent ${task.agent_name} is queued for processing.` };
  }
}
