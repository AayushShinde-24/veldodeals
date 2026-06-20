import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { suppressFromProviderSignal } from "@/lib/deliverability/suppressions";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const type = eventType(body);
    if (!type) return ok({ ignored: true });
    const email = recipientEmail(body);
    if (!email) return fail("Could not determine recipient email.", 400);
    await suppressFromProviderSignal({
      email,
      type,
      userId: typeof body.user_id === "string" ? body.user_id : null,
      workspaceId: typeof body.workspace_id === "string" ? body.workspace_id : null,
      provider: typeof body.provider === "string" ? body.provider : "email_provider",
      payload: body,
    });
    return ok({ suppressed: true, email, type });
  } catch (error) {
    return fail(error);
  }
}

function eventType(body: Record<string, unknown>): "bounce" | "complaint" | null {
  const raw = String(body.type ?? body.event ?? body.event_type ?? "").toLowerCase();
  if (raw.includes("bounce")) return "bounce";
  if (raw.includes("complaint") || raw.includes("spam")) return "complaint";
  return null;
}

function recipientEmail(body: Record<string, unknown>): string | null {
  const direct = body.email ?? body.recipient ?? body.to;
  if (typeof direct === "string") return direct.toLowerCase();
  const recipients = body.recipients;
  if (Array.isArray(recipients) && typeof recipients[0] === "string") return recipients[0].toLowerCase();
  return null;
}
