import { ok, fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { listGmailReplies } from "@/src/lib/apis/google/gmail-client";
import { writeAuditLog } from "@/src/lib/audit/log";

export async function POST() {
  try {
    const context = await getWorkspaceContext();
    if (!context) throw new Error("Sign in before syncing Gmail.");
    const google = await getConnectedGoogleAccessToken(context.workspaceId, "gmail");
    const inbox = await listGmailReplies(google.accessToken);
    await writeAuditLog({ workspaceId: context.workspaceId, userId: context.userId, action: "gmail.inbox.synced", metadata: { messages: inbox.messages?.length ?? 0 } });
    return ok({ messages: inbox.messages ?? [], note: "Gmail message metadata synced. Reply body ingestion is intentionally conservative until message-to-lead mapping is configured." });
  } catch (error) {
    return fail(error);
  }
}
