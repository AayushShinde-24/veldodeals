import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { sendQueuedCampaignEmails } from "@/src/lib/mvp/email-queue";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before sending queued campaign emails.");
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { taskId?: string; limit?: number };
    return ok(await sendQueuedCampaignEmails({ userId: user.id, campaignId: id, taskId: body.taskId, limit: body.limit }));
  } catch (error) {
    return fail(error);
  }
}
