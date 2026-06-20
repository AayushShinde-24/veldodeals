import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getOptionalEnv } from "@/lib/security/env";
import { credit } from "@/lib/billing/ledger";
import { getRevenuePlan } from "@/lib/revenue-os/pricing";

interface StripeEvent {
  id?: string;
  type?: string;
  data?: { object?: StripeObject };
}

interface StripeObject {
  id?: string;
  customer?: string;
  subscription?: string;
  payment_status?: string;
  status?: string;
  amount_total?: number;
  amount_paid?: number;
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
    const webhookSecret = getOptionalEnv()?.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const sigHeader = request.headers.get("stripe-signature");
      if (!sigHeader) return fail("Missing stripe-signature header.", 400);
      if (!verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
        return fail("Webhook signature verification failed.", 400);
      }
    }

    const event = JSON.parse(rawBody) as StripeEvent;
    if (!event.id || !event.type) return fail("Invalid Stripe event payload.", 400);

    const obj = event.data?.object ?? {};
    const metadata = obj.metadata ?? {};
    const userId = metadata.user_id;
    const plan = metadata.plan;
    const db = createServiceClient();

    const { data: existing } = await db
      .from("stripe_events")
      .select("event_id,status")
      .eq("event_id", event.id)
      .maybeSingle();
    if (existing?.status === "processed") {
      return ok({ received: true, duplicate: true });
    }

    const { error: insertError } = await db.from("stripe_events").insert({
      event_id: event.id,
      event_type: event.type,
      status: "processing",
      user_id: userId ?? null,
      plan: plan ?? null,
      payload: event,
    });
    if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
      return fail(insertError.message, 500);
    }

    const result = await handleStripeEvent(event, obj);
    await db
      .from("stripe_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), error_message: null })
      .eq("event_id", event.id);

    return ok({ received: true, ...result });
  } catch (error) {
    return fail(error);
  }
}

async function handleStripeEvent(
  event: StripeEvent,
  obj: StripeObject
): Promise<Record<string, unknown>> {
  const metadata = obj.metadata ?? {};
  const userId = metadata.user_id;
  const plan = metadata.plan;
  const kind = metadata.kind;

  if (event.type === "checkout.session.completed") {
    if (!userId) return { skipped: true, reason: "no_user_id_in_metadata" };
    if (kind === "addon") {
      const credits = Number(metadata.credits ?? 0);
      if (!Number.isFinite(credits) || credits <= 0) {
        return { skipped: true, reason: "no_addon_credits_in_metadata" };
      }
      const ledger = await credit(userId, credits, "stripe_addon_purchase", {
        idempotencyKey: `stripe:${event.id}:addon`,
        metadata: { stripeSessionId: obj.id, plan, amountTotal: obj.amount_total, currency: obj.currency },
      });
      if (!ledger.success) throw new Error(ledger.error ?? "Could not credit add-on purchase.");
      return { credited: credits, balance: ledger.balance };
    }
    if (plan) await updatePlan(userId, plan);
    return { plan_updated: plan ?? null };
  }

  if (event.type === "invoice.paid") {
    if (userId && plan) await updatePlan(userId, plan);
    return { invoice_paid: true, user_id: userId ?? null };
  }

  if (event.type === "invoice.payment_failed") {
    return { dunning: true, user_id: userId ?? null };
  }

  if (event.type === "customer.subscription.updated") {
    if (userId && plan) await updatePlan(userId, plan);
    return { subscription_updated: true, plan: plan ?? null };
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

function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string): boolean {
  try {
    const parts = Object.fromEntries(
      sigHeader.split(",").map((part) => {
        const idx = part.indexOf("=");
        return [part.slice(0, idx), part.slice(idx + 1)];
      }),
    );
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    const eventAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (eventAge > 300) return false;

    const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
