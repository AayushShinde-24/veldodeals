import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getOptionalEnv } from "@/lib/security/env";
import { credit } from "@/lib/billing/ledger";
import { getRevenuePlan } from "@/lib/revenue-os/pricing";

// Dodo Payments webhooks (Standard Webhooks / svix-style signing).
interface DodoEvent {
  type?: string;
  data?: DodoObject;
}
interface DodoObject {
  subscription_id?: string;
  payment_id?: string;
  status?: string;
  total_amount?: number;
  currency?: string;
  metadata?: Record<string, string | undefined>;
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return fail("Could not read request body.", 400);
  }

  try {
    const webhookSecret = getOptionalEnv()?.DODO_WEBHOOK_SECRET;
    const webhookId = request.headers.get("webhook-id") ?? "";
    const webhookTimestamp = request.headers.get("webhook-timestamp") ?? "";
    const webhookSignature = request.headers.get("webhook-signature") ?? "";

    if (webhookSecret) {
      if (!webhookId || !webhookTimestamp || !webhookSignature) {
        return fail("Missing webhook signature headers.", 400);
      }
      if (!verifyDodoSignature(rawBody, webhookId, webhookTimestamp, webhookSignature, webhookSecret)) {
        return fail("Webhook signature verification failed.", 400);
      }
    }

    const event = JSON.parse(rawBody) as DodoEvent;
    if (!event.type) return fail("Invalid Dodo event payload.", 400);

    const obj = event.data ?? {};
    const metadata = obj.metadata ?? {};
    const userId = metadata.user_id;
    const plan = metadata.plan;
    // Idempotency key: the svix webhook-id (falls back to subscription/payment id).
    const eventId = webhookId || obj.payment_id || obj.subscription_id || `${event.type}:${Date.now()}`;
    const db = createServiceClient();

    const { data: existing } = await db
      .from("stripe_events")
      .select("event_id,status")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existing?.status === "processed") {
      return ok({ received: true, duplicate: true });
    }

    const { error: insertError } = await db.from("stripe_events").insert({
      event_id: eventId,
      event_type: event.type,
      status: "processing",
      user_id: userId ?? null,
      plan: plan ?? null,
      payload: event,
    });
    if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
      return fail(insertError.message, 500);
    }

    const result = await handleDodoEvent(event, obj, eventId);
    await db
      .from("stripe_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), error_message: null })
      .eq("event_id", eventId);

    return ok({ received: true, ...result });
  } catch (error) {
    return fail(error);
  }
}

async function handleDodoEvent(
  event: DodoEvent,
  obj: DodoObject,
  eventId: string
): Promise<Record<string, unknown>> {
  const metadata = obj.metadata ?? {};
  const userId = metadata.user_id;
  const plan = metadata.plan;
  const kind = metadata.kind;

  if (event.type === "payment.succeeded") {
    if (!userId) return { skipped: true, reason: "no_user_id_in_metadata" };
    if (kind === "addon") {
      const credits = Number(metadata.credits ?? 0);
      if (!Number.isFinite(credits) || credits <= 0) {
        return { skipped: true, reason: "no_addon_credits_in_metadata" };
      }
      const ledger = await credit(userId, credits, "dodo_addon_purchase", {
        idempotencyKey: `dodo:${eventId}:addon`,
        metadata: { paymentId: obj.payment_id, plan, amount: obj.total_amount, currency: obj.currency },
      });
      if (!ledger.success) throw new Error(ledger.error ?? "Could not credit add-on purchase.");
      return { credited: credits, balance: ledger.balance };
    }
    if (plan) await updatePlan(userId, plan);
    return { plan_updated: plan ?? null };
  }

  if (
    event.type === "subscription.active" ||
    event.type === "subscription.renewed" ||
    event.type === "subscription.updated"
  ) {
    if (userId && plan) await updatePlan(userId, plan);
    return { subscription: event.type, plan: plan ?? null };
  }

  if (event.type === "subscription.on_hold" || event.type === "subscription.failed" || event.type === "payment.failed") {
    return { dunning: true, type: event.type, user_id: userId ?? null };
  }

  return { ignored: true, type: event.type };
}

async function updatePlan(userId: string, planKey: string): Promise<void> {
  const plan = getRevenuePlan(planKey);
  const db = createServiceClient();
  await Promise.all([
    db.from("profiles").update({ plan: plan.key, updated_at: new Date().toISOString() }).eq("id", userId),
    db.from("users").update({ plan: plan.key }).eq("id", userId),
  ]);
}

/** Standard Webhooks (svix) verification used by Dodo Payments. */
function verifyDodoSignature(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  signatureHeader: string,
  secret: string
): boolean {
  try {
    const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - parseInt(webhookTimestamp, 10));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
    const expected = createHmac("sha256", key).update(signedContent, "utf8").digest("base64");
    const expectedBuf = Buffer.from(expected);

    // Header is a space-separated list of `version,signature` pairs (e.g. "v1,<sig>").
    return signatureHeader.split(" ").some((part) => {
      const sig = part.includes(",") ? part.slice(part.indexOf(",") + 1) : part;
      const actualBuf = Buffer.from(sig);
      return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
    });
  } catch {
    return false;
  }
}
