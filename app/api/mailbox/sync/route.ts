import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { withRetry } from "@/lib/integrations/retry";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { getGmailMessage, listGmailReplies } from "@/src/lib/apis/google/gmail-client";
import { writeAuditLog } from "@/src/lib/audit/log";
import { applyPolicy } from "@/lib/security/rate-limit";
import { trackEvent } from "@/src/lib/analytics/events";
import { emitCustomerWebhook } from "@/lib/webhooks/customer";

const SYNC_LIMIT = 20;

export async function POST() {
  try {
    const context = await getWorkspaceContext();
    if (!context) return fail(new Error("Sign in before syncing mailbox replies."), 401);
    if (!applyPolicy(context.userId, "mailbox_sync")) return fail("Mailbox sync rate limit reached. Please wait a minute before syncing again.", 429);

    const mailbox = await getConnectedGoogleAccessToken(context.workspaceId, "gmail");
    const inbox = await listGmailReplies(mailbox.accessToken);
    const messages = inbox.messages?.slice(0, SYNC_LIMIT) ?? [];

    if (!messages.length) {
      return ok({ synced: 0, note: "No new messages found in the last 14 days." });
    }

    const db = createServiceClient();
    let synced = 0;
    let skipped = 0;

    for (const msg of messages) {
      try {
        // Fetch full message metadata (headers + snippet) — uses format=metadata to avoid large payloads
        const detail = await withRetry(() => getGmailMessage(mailbox.accessToken, msg.id), {
          provider: "gmail",
          endpoint: "messages.get",
          userId: context.userId,
          attempts: 2,
          baseDelayMs: 600,
        });
        const headers = detail.payload?.headers ?? [];

        const fromHeader = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
        const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "";
        const fromEmail = extractEmail(fromHeader);
        const snippet = detail.snippet ?? "";

        if (!fromEmail) { skipped++; continue; }

        // Look up whether this email address matches a known lead
        const { data: lead } = await db
          .from("leads")
          .select("id, campaign_id, user_id")
          .eq("user_id", context.userId)
          .ilike("email", fromEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Upsert the reply — onConflict on (user_id, provider_message_id) deduplicates
        const { error: upsertError } = await db.from("reply_events").upsert(
          {
            user_id: context.userId,
            campaign_id: lead?.campaign_id ?? null,
            lead_id: lead?.id ?? null,
            provider_message_id: detail.id,
            provider_thread_id: detail.threadId ?? null,
            from_email: fromEmail,
            subject,
            raw_reply: snippet,
            reply_class: "unclassified",
            sentiment: null,
            next_action: null,
            should_stop_sequence: false,
            should_create_deal: false,
          },
          { onConflict: "user_id,provider_message_id", ignoreDuplicates: true },
        );

        if (upsertError) {
          // Unique constraint violation = already synced; not an error
          if (/unique|duplicate/iu.test(upsertError.message)) { skipped++; continue; }
          // Missing column = migration not yet applied; log and continue
          if (/column|relation/iu.test(upsertError.message)) { skipped++; continue; }
        } else {
          synced++;
          await trackEvent({ userId: context.userId, event: "first_reply", entityId: lead?.id, properties: { campaign_id: lead?.campaign_id } });
          await emitCustomerWebhook({
            userId: context.userId,
            workspaceId: context.workspaceId,
            event: "email.replied",
            payload: { campaign_id: lead?.campaign_id ?? null, lead_id: lead?.id ?? null, from_email: fromEmail, message_id: detail.id },
          });
        }
      } catch {
        // Don't abort entire sync for a single message failure
        skipped++;
      }
    }

    await writeAuditLog({
      workspaceId: context.workspaceId,
      userId: context.userId,
      action: "mailbox.inbox.synced",
      metadata: { total: messages.length, synced, skipped },
    });

    return ok({
      total: messages.length,
      synced,
      skipped,
      note: synced > 0
        ? `${synced} new replies saved. Classification agents will run shortly.`
        : "No new replies to sync — everything is up to date.",
    });
  } catch {
    return fail(new Error("Mailbox sync failed. Check that your mailbox is connected and try again."), 400);
  }
}

/** Extract email address from a From header like "Name <email@example.com>" or "email@example.com" */
function extractEmail(from: string): string | null {
  const match = from.match(/<([^>]+)>/) ?? from.match(/([^\s<>,]+@[^\s<>,]+\.[^\s<>,]+)/);
  const raw = match?.[1]?.trim().toLowerCase();
  return raw && raw.includes("@") ? raw : null;
}
