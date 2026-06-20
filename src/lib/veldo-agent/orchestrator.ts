import { createServiceClient } from "@/lib/integrations/supabase";

const SYSTEM_PROMPT = `You are Vel, the AI sales assistant inside Veldo — an AI Sales Team OS.

You help users:
- Set up and launch outbound email campaigns
- Review and approve email drafts in the approval queue
- Understand Campaign Leader decisions and agent logs
- Analyze campaign performance and reply data
- Find and qualify leads, import from Apollo or CSV
- Configure ICP definitions, sending gates, and compliance rules
- Troubleshoot blocked sends, failed gates, or low scores

Key system rules the user should know:
- Every email must pass 7 safety gates before sending: ICP fit ≥50%, research confidence ≥60%, personalization risk ≤medium, email score ≥75, email verified, human-approved, credits available
- The Campaign Leader routes work between specialist agents: research, ICP scoring, personalization, email writing, scoring, verification
- No production sends happen without human approval
- Replies are auto-classified and feed the analytics learning loop

Navigation:
- Dashboard → /dashboard (campaign health, approval queue, blockers)
- Campaigns → /campaigns (list, start, pause)
- New Campaign → /campaigns/new (campaign builder)
- Leads → /leads (import, enrich, view)
- Vel AI → /agent (this interface)
- Inbox → /inbox (reply management)
- Analytics → /analytics (performance, learnings)
- Settings → /settings (API keys, compliance, integrations)

Be concise, specific, and action-oriented. When the user needs to do something, tell them exactly where to go and what to do.`;

export async function runVeldoAgent({
  userId,
  threadId: existingThreadId,
  message,
}: {
  userId: string;
  threadId: string | null | undefined;
  message: string;
}) {
  const db = createServiceClient();

  // Resolve or create thread
  let threadId = existingThreadId ?? null;
  if (!threadId) {
    const { data: thread } = await db
      .from("veldo_agent_threads")
      .insert({
        user_id: userId,
        title: message.slice(0, 72),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    threadId = thread?.id ?? crypto.randomUUID();
  }

  // Save user message
  await db.from("veldo_agent_messages").insert({
    thread_id: threadId,
    user_id: userId,
    role: "user",
    content: message,
    created_at: new Date().toISOString(),
  });

  // Fetch recent context (last 20 messages)
  const { data: history } = await db
    .from("veldo_agent_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(20);

  const messages = (history ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content as string,
  }));

  // Generate the reply through the multi-provider router (Anthropic → OpenAI fallback).
  let replyText =
    "I'm having trouble connecting right now. Please check that ANTHROPIC_API_KEY or OPENAI_API_KEY is set in your environment variables.";

  try {
    const { generateText } = await import("@/lib/ai/router");
    const result = await generateText({
      system: SYSTEM_PROMPT,
      messages: messages as { role: "user" | "assistant"; content: string }[],
      tier: "balanced",
      maxTokens: 1024,
    });
    replyText = result.text || replyText;
  } catch (e) {
    replyText = `Connection error: ${e instanceof Error ? e.message : "unknown"}`;
  }

  // Persist assistant reply
  const { data: savedMsg } = await db
    .from("veldo_agent_messages")
    .insert({
      thread_id: threadId,
      user_id: userId,
      role: "assistant",
      content: replyText,
      metadata: null,
      created_at: new Date().toISOString(),
    })
    .select("id, role, content, metadata, created_at")
    .single();

  // Update thread timestamp
  await db
    .from("veldo_agent_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return { threadId, message: savedMsg };
}
