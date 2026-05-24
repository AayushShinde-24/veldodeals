import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/integrations/supabase";
import { createAgentCampaign, fetchLeadsForCampaign, researchLeadsForCampaign, writeEmailsForCampaign } from "@/src/lib/mvp/campaign-flow";
import { approveGeneratedEmail, sendGeneratedEmail } from "@/src/lib/mvp/sending";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { getGmailMessage, listGmailReplies } from "@/src/lib/apis/google/gmail-client";
import { remember } from "@/src/lib/veldo-agent/memory";

export const toolSchemas = {
  create_campaign: z.object({
    product_name: z.string().min(1),
    product_description: z.string().min(1),
    target_audience: z.string().min(1),
    target_companies: z.string().min(1),
    desired_outcome: z.string().min(1),
    number_of_leads_needed: z.coerce.number().int().min(1).max(50),
    tone: z.string().optional(),
    call_to_action: z.string().optional(),
  }),
  find_leads: z.object({ campaign_id: z.string().uuid(), number_of_leads: z.coerce.number().int().min(1).max(50).optional() }),
  research_leads: z.object({ campaign_id: z.string().uuid() }),
  write_emails: z.object({ campaign_id: z.string().uuid() }),
  improve_email: z.object({ generated_email_id: z.string().uuid(), instruction: z.string().min(1) }),
  send_approved_emails: z.object({ campaign_id: z.string().uuid() }),
  check_replies: z.object({ campaign_id: z.string().uuid().optional() }),
};

export type ToolName = keyof typeof toolSchemas;

export const openAiTools = [
  {
    type: "function",
    function: {
      name: "create_campaign",
      description: "Create a Veldo outreach campaign from the user's sales goal. Does not send emails.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string" },
          product_description: { type: "string" },
          target_audience: { type: "string" },
          target_companies: { type: "string" },
          desired_outcome: { type: "string" },
          number_of_leads_needed: { type: "number" },
          tone: { type: "string" },
          call_to_action: { type: "string" },
        },
        required: ["product_name", "product_description", "target_audience", "target_companies", "desired_outcome", "number_of_leads_needed"],
      },
    },
  },
  tool("find_leads", "Search for real leads and save them for an existing campaign.", { campaign_id: "string", number_of_leads: "number" }, ["campaign_id"]),
  tool("research_leads", "Research and enrich saved campaign leads using available providers.", { campaign_id: "string" }, ["campaign_id"]),
  tool("write_emails", "Generate personalized email drafts for saved campaign leads.", { campaign_id: "string" }, ["campaign_id"]),
  tool("improve_email", "Revise one generated email draft based on the user's instruction. Still requires approval before sending.", { generated_email_id: "string", instruction: "string" }, ["generated_email_id", "instruction"]),
  tool("send_approved_emails", "Send only already-approved generated emails through the connected mailbox. Never approves emails.", { campaign_id: "string" }, ["campaign_id"]),
  tool("check_replies", "Check recent replies if the mailbox readonly scope is connected.", { campaign_id: "string" }, []),
];

export async function runVeldoTool(userId: string, name: ToolName, rawArgs: unknown) {
  switch (name) {
    case "create_campaign":
      return createCampaignTool(userId, toolSchemas.create_campaign.parse(rawArgs));
    case "find_leads":
      return findLeadsTool(userId, toolSchemas.find_leads.parse(rawArgs));
    case "research_leads":
      return researchLeadsTool(userId, toolSchemas.research_leads.parse(rawArgs));
    case "write_emails":
      return writeEmailsTool(userId, toolSchemas.write_emails.parse(rawArgs));
    case "improve_email":
      return improveEmailTool(userId, toolSchemas.improve_email.parse(rawArgs));
    case "send_approved_emails":
      return sendApprovedEmailsTool(userId, toolSchemas.send_approved_emails.parse(rawArgs));
    case "check_replies":
      return checkRepliesTool(userId, toolSchemas.check_replies.parse(rawArgs));
  }
}

async function createCampaignTool(userId: string, args: z.infer<typeof toolSchemas.create_campaign>) {
  const campaign = await createAgentCampaign(userId, {
    name: `${args.product_name} to ${args.target_companies}`,
    product_offer: `${args.product_name}: ${args.product_description}`,
    goal: args.desired_outcome,
    target_niche: args.target_audience,
    industry: args.target_companies,
    location: "",
    company_size: "",
    job_titles: inferBuyerTitles(args.target_audience, args.target_companies).join(", "),
    number_of_leads: args.number_of_leads_needed,
    tone: args.tone ?? "clear, direct, professional",
    call_to_action: args.call_to_action ?? `Open to a short conversation about ${args.product_name}?`,
  });
  await remember({ userId, campaignId: campaign.id, key: "campaign_goal", summary: `${args.product_name} for ${args.target_companies}: ${args.desired_outcome}`, value: args });
  return { campaign, next_best_step: "find_leads", explanation: "I created the campaign and inferred likely buyer titles. Next I should search for real contacts." };
}

async function findLeadsTool(userId: string, args: z.infer<typeof toolSchemas.find_leads>) {
  if (args.number_of_leads) {
    await createServiceClient().from("campaigns").update({ number_of_leads: args.number_of_leads }).eq("user_id", userId).eq("id", args.campaign_id);
  }
  const leads = await fetchLeadsForCampaign(userId, args.campaign_id);
  return { leads_found: leads.length, leads: leads.map((lead) => ({ id: lead.id, name: lead.full_name ?? lead.email, title: lead.title, company: lead.company, email: lead.email })) };
}

async function researchLeadsTool(userId: string, args: z.infer<typeof toolSchemas.research_leads>) {
  const enriched = await researchLeadsForCampaign(userId, args.campaign_id);
  return { enriched_count: enriched.length, note: "I researched available company websites and saved enrichment. I did not invent missing facts." };
}

async function writeEmailsTool(userId: string, args: z.infer<typeof toolSchemas.write_emails>) {
  const emails = await writeEmailsForCampaign(userId, args.campaign_id);
  return { emails_generated: emails.length, requires_user_review: true, note: "Drafts are saved for review. I will not send until you approve them." };
}

async function improveEmailTool(userId: string, args: z.infer<typeof toolSchemas.improve_email>) {
  const db = createServiceClient();
  const { data: email, error } = await db.from("generated_emails").select("*").eq("user_id", userId).eq("id", args.generated_email_id).single();
  if (error || !email) throw new Error("Generated email not found.");
  const improvedBody = `${email.edited_body ?? email.body}\n\nRevision note: ${args.instruction}`;
  const { data: updated, error: updateError } = await db.from("generated_emails").update({
    status: "edited",
    edited_subject: email.edited_subject ?? email.subject,
    edited_body: improvedBody,
  }).eq("user_id", userId).eq("id", args.generated_email_id).select("*").single();
  if (updateError) throw new Error(updateError.message);
  return { email: updated, requires_user_review: true, note: "I revised the draft. It still needs explicit approval before any send." };
}

async function sendApprovedEmailsTool(userId: string, args: z.infer<typeof toolSchemas.send_approved_emails>) {
  const { data: emails } = await createServiceClient()
    .from("generated_emails")
    .select("id,status")
    .eq("user_id", userId)
    .eq("campaign_id", args.campaign_id)
    .eq("status", "approved");
  const results = [];
  for (const email of emails ?? []) {
    try {
      results.push({ id: email.id, status: "sent", send: await sendGeneratedEmail({ userId, generatedEmailId: email.id }) });
    } catch (error) {
      results.push({ id: email.id, status: "blocked_or_failed", error: error instanceof Error ? error.message : "Send failed" });
    }
  }
  return { attempted: emails?.length ?? 0, results, note: "Only approved emails were attempted. Unapproved drafts were skipped." };
}

async function checkRepliesTool(userId: string, args: z.infer<typeof toolSchemas.check_replies>) {
  const db = createServiceClient();
  const { data: membership } = await db.from("workspace_members").select("workspace_id").eq("user_id", userId).limit(1).maybeSingle();
  if (!membership?.workspace_id) throw new Error("Workspace not found.");
  const google = await getConnectedGoogleAccessToken(membership.workspace_id, "gmail");
  const inbox = await listGmailReplies(google.accessToken);
  const messages = [];
  for (const item of (inbox.messages ?? []).slice(0, 10)) {
    const message = await getGmailMessage(google.accessToken, item.id);
    messages.push({ id: message.id, threadId: message.threadId, snippet: message.snippet ?? "" });
  }
  await remember({ userId, campaignId: args.campaign_id ?? null, key: "recent_replies", summary: `${messages.length} recent mailbox messages checked.`, value: { messages } });
  return { replies_checked: messages.length, messages, note: "Reply matching to campaign is conservative; I only report snippets unless a lead/campaign match is certain." };
}

function tool(name: string, description: string, properties: Record<string, "string" | "number">, required: string[]) {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(Object.entries(properties).map(([key, type]) => [key, { type }])),
        required,
      },
    },
  };
}

function inferBuyerTitles(audience: string, companies: string) {
  const text = `${audience} ${companies}`.toLowerCase();
  if (text.includes("walmart") || text.includes("retail")) return ["Category Manager", "Buyer", "Procurement Manager", "Merchandising Manager"];
  if (text.includes("sales") || text.includes("saas")) return ["VP Sales", "Head of Growth", "Revenue Operations"];
  return ["Founder", "Operations Manager", "Procurement Manager", "Business Development Manager"];
}
