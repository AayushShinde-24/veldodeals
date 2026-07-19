import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { applyPolicy } from "@/lib/security/rate-limit";
import { runVeldoAgent } from "@/src/lib/veldo-agent/orchestrator";

const schema = z.object({
  message: z.string().min(1).max(5000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(40)
    .optional()
    .default([]),
  autonomyMode: z.enum(["manual", "semi", "auto"]).optional().default("auto"),
});

// Retrieve compact workspace context for RAG grounding. Best-effort — skipped cleanly
// when no data source is available.
async function retrieveContext(): Promise<string | undefined> {
  try {
    const { isDemoMode, demoOperationalData } = await import("@/lib/demo/mode");
    if (isDemoMode()) {
      const d = demoOperationalData();
      const openDeals = d.deals.filter((x) => x.stage !== "won").length;
      return [
        `Workspace: ${d.workspace?.name ?? "—"} (${d.workspace?.industry ?? "B2B"}).`,
        `Campaigns: ${d.campaigns.length}. Leads: ${d.leads.length}. Open deals: ${openDeals}. Recent replies: ${d.replies.length}.`,
        `Top learning: ${d.learnings[0]?.summary ?? "n/a"}.`,
      ].join(" ");
    }
  } catch {
    /* no-op */
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before using Vel.");
    if (!applyPolicy(user.id, "agent_chat")) return fail("Too many requests. Please slow down.", 429);

    const input = schema.parse(await request.json());
    const context = await retrieveContext();

    const result = await runVeldoAgent({
      message: input.message,
      history: input.history,
      autonomyMode: input.autonomyMode,
      context,
    });

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
