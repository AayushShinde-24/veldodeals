import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { enqueueAgentTask } from "@/lib/agents/agent-helpers";
import { runTask } from "@/lib/agents/agent-runner";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";
import { fetchApolloPeople } from "@/lib/integrations/apollo";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    const campaignId = String(body.campaign_id);
    const apolloQuery = body.apollo_query && typeof body.apollo_query === "object"
      ? body.apollo_query as Record<string, unknown>
      : {
          q_keywords: [body.industry, body.role, body.company_size].filter(Boolean).join(" "),
        };
    const apolloResponse = body.apollo_response ?? await fetchApolloPeople(apolloQuery, userId);
    const task = await enqueueAgentTask({
      userId,
      campaignId,
      agentName: "lead_import",
      taskType: "import_apollo",
      priority: 2,
      inputJson: { apollo_response: apolloResponse },
    });
    return ok(await runTask(task), 201);
  } catch (error) {
    return fail(error);
  }
}
