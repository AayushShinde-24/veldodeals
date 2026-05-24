import { ok, fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { listGmailReplies } from "@/src/lib/apis/google/gmail-client";
import { writeAuditLog } from "@/src/lib/audit/log";

export async function POST() {
  try {
    const context = await getWorkspaceContext();
    if (!context) return fail(new Error("Sign in before syncing mailbox replies."), 401);
    const mailbox = await getConnectedGoogleAccessToken(context.workspaceId, "gmail");
    const inbox = await listGmailReplies(mailbox.accessToken);
    await writeAuditLog({ workspaceId: context.workspaceId, userId: context.userId, action: "mailbox.inbox.synced", metadata: { messages: inbox.messages?.length ?? 0 } });
    return ok({ messages: inbox.messages ?? [], note: "Mailbox metadata synced. Reply body ingestion stays conservative until message-to-lead mapping is configured." });
  } catch {
    return fail(new Error("Mailbox sync failed."), 400);
  }
}
