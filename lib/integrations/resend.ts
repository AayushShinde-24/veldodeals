import "server-only";

import { getEnv, hasSecret } from "@/lib/security/env";
import { withRetry } from "@/lib/integrations/retry";

export async function sendWithResend(input: {
  to: string;
  subject: string;
  html: string;
  userId: string;
  campaignId: string;
  leadId: string;
}) {
  const env = getEnv();
  if (!hasSecret("RESEND_API_KEY")) {
    throw new Error("RESEND_API_KEY is required for sending.");
  }
  if (!env.VELDO_DEFAULT_FROM_EMAIL) {
    throw new Error("VELDO_DEFAULT_FROM_EMAIL is required for sending.");
  }

  return withRetry(
    async () => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.VELDO_DEFAULT_FROM_EMAIL,
          to: input.to,
          subject: input.subject,
          html: input.html,
        }),
      });

      if (!response.ok) throw new Error(`Resend request failed with ${response.status}`);
      return response.json() as Promise<{ id?: string }>;
    },
    {
      provider: "resend",
      endpoint: "/emails",
      userId: input.userId,
      campaignId: input.campaignId,
      leadId: input.leadId,
    },
  );
}
