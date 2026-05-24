import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";

export async function getOrCreateThread(input: { userId: string; threadId?: string | null; title?: string; campaignId?: string | null }) {
  const db = createServiceClient();
  if (input.threadId) {
    const { data } = await db.from("veldo_agent_threads").select("*").eq("user_id", input.userId).eq("id", input.threadId).maybeSingle();
    if (data) return data;
  }
  const { data, error } = await db.from("veldo_agent_threads").insert({
    user_id: input.userId,
    campaign_id: input.campaignId ?? null,
    title: input.title ?? "Veldo Agent",
  }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addAgentMessage(input: { threadId: string; userId: string; role: "user" | "assistant" | "tool" | "system"; content: string; toolName?: string; metadata?: Record<string, unknown> }) {
  const { data, error } = await createServiceClient().from("veldo_agent_messages").insert({
    thread_id: input.threadId,
    user_id: input.userId,
    role: input.role,
    content: input.content,
    tool_name: input.toolName ?? null,
    metadata: input.metadata ?? {},
  }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function loadAgentContext(userId: string, threadId: string) {
  const db = createServiceClient();
  const [messages, memories, campaigns] = await Promise.all([
    db.from("veldo_agent_messages").select("*").eq("user_id", userId).eq("thread_id", threadId).order("created_at", { ascending: true }).limit(30),
    db.from("veldo_agent_memory").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
    db.from("campaigns").select("id,name,status,goal,target_niche,industry,number_of_leads,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);
  return {
    messages: messages.data ?? [],
    memories: memories.data ?? [],
    campaigns: campaigns.data ?? [],
  };
}

export async function remember(input: { userId: string; campaignId?: string | null; key: string; summary: string; value?: Record<string, unknown> }) {
  await createServiceClient().from("veldo_agent_memory").upsert({
    user_id: input.userId,
    campaign_id: input.campaignId ?? null,
    key: input.key,
    summary: input.summary,
    value_json: input.value ?? {},
  }, { onConflict: "user_id,campaign_id,key" });
}

export async function recordToolRun(input: { threadId: string; userId: string; campaignId?: string | null; toolName: string; input: Record<string, unknown>; output: Record<string, unknown>; status?: "success" | "failed" | "blocked" | "needs_user_approval"; errorMessage?: string | null }) {
  await createServiceClient().from("veldo_agent_tool_runs").insert({
    thread_id: input.threadId,
    user_id: input.userId,
    campaign_id: input.campaignId ?? null,
    tool_name: input.toolName,
    input_json: input.input,
    output_json: input.output,
    status: input.status ?? "success",
    error_message: input.errorMessage ?? null,
  });
}
