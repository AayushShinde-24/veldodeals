import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { runVeldoAgent } from "@/src/lib/veldo-agent/orchestrator";

const schema = z.object({
  threadId: z.string().uuid().optional().nullable(),
  message: z.string().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before using Veldo Agent.");
    const input = schema.parse(await request.json());
    return ok(await runVeldoAgent({ userId: user.id, threadId: input.threadId, message: input.message }));
  } catch (error) {
    return fail(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before using Veldo Agent.");
    const threadId = request.nextUrl.searchParams.get("threadId");
    const db = createServiceClient();
    const threadQuery = db
      .from("veldo_agent_threads")
      .select("id,title,campaign_id,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);
    const { data: thread } = threadId
      ? await db.from("veldo_agent_threads").select("id,title,campaign_id,created_at,updated_at").eq("user_id", user.id).eq("id", threadId).maybeSingle()
      : await threadQuery.maybeSingle();
    const messages = thread
      ? await db
          .from("veldo_agent_messages")
          .select("id,role,content,metadata,created_at")
          .eq("user_id", user.id)
          .eq("thread_id", thread.id)
          .order("created_at", { ascending: true })
          .limit(50)
      : { data: [] };
    return ok({ thread, messages: messages.data ?? [] });
  } catch (error) {
    return fail(error);
  }
}
