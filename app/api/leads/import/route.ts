import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { enqueueAgentTask } from "@/lib/agents/agent-helpers";
import { runTask } from "@/lib/agents/agent-runner";
import { fetchApolloPeople } from "@/lib/integrations/apollo";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const campaignId = String(body.campaign_id);
    const leadQuery = body.lead_query && typeof body.lead_query === "object"
      ? body.lead_query as Record<string, unknown>
      : {
          q_keywords: [body.industry, body.role, body.company_size].filter(Boolean).join(" "),
        };
    const leadResponse = body.lead_response ?? await fetchApolloPeople(leadQuery, userId);
    const task = await enqueueAgentTask({
      userId,
      campaignId,
      agentName: "lead_import",
      taskType: "import_leads",
      priority: 2,
      inputJson: { leads: leadResponse },
    });
    return ok(await runTask(task), 201);
  } catch {
    return fail(new Error("Lead import failed."), 400);
  }
}
