import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { prepareCampaignSendQueue } from "@/src/lib/mvp/email-queue";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before queueing campaign emails.");
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { mode?: "draft_only" | "approval_required" | "auto_send"; taskId?: string };
    return ok(await prepareCampaignSendQueue({ userId: user.id, campaignId: id, mode: body.mode, taskId: body.taskId }));
  } catch (error) {
    return fail(error);
  }
}
