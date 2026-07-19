import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

// Managed outbound sending (Resend under the hood — surfaced to users only as
// "Veldo managed sending"). Used when no Gmail mailbox is connected.

export interface ManagedSendInput {
  to: string;
  subject: string;
  html: string;
  fromName?: string | null;
  listUnsubscribeUrl?: string;
}

export interface ManagedSendResult {
  id: string | null;
}

export function managedSendingConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function managedFromAddress(fromName?: string | null): string {
  const address = process.env.VELDO_DEFAULT_FROM_EMAIL ?? "onboarding@resend.dev";
  const name = (fromName ?? "").trim();
  return name ? `${name} via Veldo <${address}>` : `Veldo <${address}>`;
}

export async function sendManagedEmail(input: ManagedSendInput): Promise<ManagedSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Managed sending is not configured.");

  const res = await fetchWithRetry(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: managedFromAddress(input.fromName),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.listUnsubscribeUrl
          ? { headers: { "List-Unsubscribe": `<${input.listUnsubscribeUrl}>` } }
          : {}),
      }),
    },
    { provider: "resend", endpoint: "emails.send", shouldRetry: isTransientError, timeoutMs: 20_000 }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string; name?: string };
    throw new Error(`Managed send failed: ${err.message ?? err.name ?? res.statusText}`);
  }

  const data = (await res.json()) as { id?: string };
  return { id: data.id ?? null };
}
