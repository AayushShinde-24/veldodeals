import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getOptionalEnv } from "@/lib/security/env";
import { sendGmailMessage } from "@/src/lib/apis/google/gmail-client";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { appendComplianceFooter, buildUnsubscribeLink, isUnsubscribed } from "@/src/lib/mvp/unsubscribe";
import { getUserCompliance } from "@/src/lib/mvp/compliance";
import { recordCreditUsage } from "@/lib/billing/credits";
import { logMvpError } from "@/src/lib/mvp/error-log";

const FOLLOWUP_DELAY_DAYS = 3;
const BATCH_LIMIT = 10;

async function handler(request: NextRequest) {
  // Authenticate cron caller via shared secret
  const env = getOptionalEnv();
  const cronSecret = env?.CRON_SECRET;

  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return fail("Unauthorized.", 401);
    }
  }

  try {
    const db = createServiceClient();
    const cutoff = new Date(Date.now() - FOLLOWUP_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Find primary sends older than FOLLOWUP_DELAY_DAYS that don't have a follow-up sent yet
    const { data: sends, error: sendsError } = await db
      .from("email_sends")
      .select("id, user_id, campaign_id, lead_id, generated_email_id, sent_at")
      .eq("status", "sent")
      .not("provider", "like", "followup_%")
      .lt("sent_at", cutoff)
      .order("sent_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (sendsError) return fail(sendsError.message);
    if (!sends?.length) return ok({ sent: 0, note: "No follow-ups due." });

    let sent = 0;
    let skipped = 0;

    for (const send of sends) {
      try {
        // Check a follow-up hasn't already been sent for this generated_email_id
        if (send.generated_email_id) {
          const { data: existing } = await db
            .from("email_sends")
            .select("id")
            .eq("generated_email_id", send.generated_email_id)
            .like("provider", "followup_%")
            .maybeSingle();

          if (existing) { skipped++; continue; }
        }

        // Load the generated email for follow-up body
        const { data: generated } = send.generated_email_id
          ? await db
              .from("generated_emails")
              .select("follow_up_1, subject")
              .eq("id", send.generated_email_id)
              .maybeSingle()
          : { data: null };

        if (!generated?.follow_up_1) { skipped++; continue; }

        // Load lead email
        const { data: lead } = await db
          .from("leads")
          .select("email, first_name")
          .eq("id", send.lead_id)
          .maybeSingle();

        if (!lead?.email) { skipped++; continue; }

        // Unsubscribe check
        const unsub = await isUnsubscribed({ userId: send.user_id, email: lead.email });
        if (unsub) { skipped++; continue; }

        // Load compliance (required for footer)
        const compliance = await getUserCompliance(send.user_id);
        if (!compliance) { skipped++; continue; }

        // Get Gmail access token via workspace
        const { data: workspace } = await db
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", send.user_id)
          .limit(1)
          .maybeSingle();

        if (!workspace?.workspace_id) { skipped++; continue; }

        let mailboxToken: string;
        try {
          const mailbox = await getConnectedGoogleAccessToken(workspace.workspace_id, "gmail");
          mailboxToken = mailbox.accessToken;
        } catch {
          skipped++;
          continue;
        }

        // Build follow-up body with compliance footer
        const unsubLink = buildUnsubscribeLink({
          email: lead.email,
          campaignId: send.campaign_id ?? "",
        });
        const bodyWithFooter = appendComplianceFooter({
          body: generated.follow_up_1,
          compliance,
          unsubscribeLink: unsubLink,
        });

        // Send via Gmail
        const gmailResult = await sendGmailMessage({
          accessToken: mailboxToken,
          to: lead.email,
          subject: `Re: ${generated.subject ?? "Following up"}`,
          body: bodyWithFooter,
        });

        // Record the follow-up send
        await db.from("email_sends").insert({
          user_id: send.user_id,
          campaign_id: send.campaign_id,
          lead_id: send.lead_id,
          generated_email_id: send.generated_email_id,
          provider: "followup_1",
          provider_message_id: gmailResult.id ?? null,
          thread_id: gmailResult.threadId ?? null,
          status: "sent",
          sent_at: new Date().toISOString(),
          credits_used: 1,
        });

        // Deduct 1 credit
        await recordCreditUsage({
          userId: send.user_id,
          workspaceId: workspace.workspace_id,
          campaignId: send.campaign_id,
          action: "email_send",
          quantity: 1,
          metadata: { followup: true, original_send_id: send.id },
        });

        sent++;
      } catch (error) {
        skipped++;
        await logMvpError({
          userId: send.user_id,
          campaignId: send.campaign_id,
          source: "cron_followup",
          errorCode: "followup_send_failed",
          error,
        }).catch(() => {});
      }
    }

    return ok({ sent, skipped, total: sends.length });
  } catch (error) {
    return fail(error);
  }
}

// Vercel cron sends GET; also accept POST for manual triggers
export { handler as GET, handler as POST };
