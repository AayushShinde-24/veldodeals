import { NextRequest } from "next/server";
import Papa from "papaparse";
import { ok, fail } from "@/lib/api/responses";
import { enqueueAgentTask } from "@/lib/agents/agent-helpers";
import { runTask } from "@/lib/agents/agent-runner";
import { getUserIdFromRequest } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const userId = await getUserIdFromRequest(request, { user_id: form.get("user_id") });
    const campaignId = String(form.get("campaign_id"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("CSV file is required.");
    const csv = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(csv, { header: true, skipEmptyLines: true });
    const task = await enqueueAgentTask({
      userId,
      campaignId,
      agentName: "lead_import",
      taskType: "upload_csv",
      priority: 2,
      inputJson: { leads: parsed.data },
    });
    return ok(await runTask(task), 201);
  } catch (error) {
    return fail(error);
  }
}
