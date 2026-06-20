import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/integrations/supabase";
import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

export type CustomerWebhookEvent = "email.sent" | "email.replied" | "deal.created" | "deal.won" | "meeting.booked";

export async function emitCustomerWebhook(input: {
  userId: string;
  workspaceId?: string | null;
  event: CustomerWebhookEvent;
  payload: Record<string, unknown>;
}): Promise<void> {
  const db = createServiceClient();
  const { data: endpoints } = await db
    .from("webhook_endpoints")
    .select("id,url,secret,events")
    .eq("user_id", input.userId)
    .eq("status", "active");

  for (const endpoint of endpoints ?? []) {
    const events = (endpoint.events as string[] | null) ?? [];
    if (events.length > 0 && !events.includes(input.event)) continue;
    await deliver(endpoint.id, endpoint.url, endpoint.secret, input.event, input.payload);
  }
}

async function deliver(
  endpointId: string,
  url: string,
  secret: string,
  event: CustomerWebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const db = createServiceClient();
  const body = JSON.stringify({ event, payload, created_at: new Date().toISOString() });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const { data: delivery } = await db
    .from("webhook_deliveries")
    .insert({ endpoint_id: endpointId, event, payload, status: "queued" })
    .select("id")
    .maybeSingle();

  try {
    const res = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Veldo-Event": event,
          "Veldo-Signature": `sha256=${signature}`,
        },
        body,
      },
      { provider: "customer_webhook", endpoint: event, shouldRetry: isTransientError, timeoutMs: 10_000 }
    );
    if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
    if (delivery?.id) {
      await db
        .from("webhook_deliveries")
        .update({ status: "delivered", attempts: 1, delivered_at: new Date().toISOString() })
        .eq("id", delivery.id);
    }
  } catch (error) {
    if (delivery?.id) {
      await db
        .from("webhook_deliveries")
        .update({
          status: "failed",
          attempts: 1,
          last_error: error instanceof Error ? error.message : "Delivery failed",
        })
        .eq("id", delivery.id);
    }
  }
}
