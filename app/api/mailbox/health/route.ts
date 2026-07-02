import { ok, fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { getMailboxHealth } from "@/lib/deliverability/mailbox-health";

export async function GET() {
  try {
    const context = await getWorkspaceContext();
    if (!context) return fail(new Error("Sign in to check mailbox health."), 401);
    return ok(await getMailboxHealth(context.userId));
  } catch (error) {
    return fail(error);
  }
}
