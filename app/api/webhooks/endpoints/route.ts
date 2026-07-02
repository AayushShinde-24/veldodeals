import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";

const schema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(["email.sent", "email.replied", "deal.created", "meeting.booked"])).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { data, error } = await createServiceClient()
      .from("webhook_endpoints")
      .select("id,url,events,status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return fail(error.message);
    return ok(data ?? []);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const input = schema.parse(await readJson<unknown>(request));
    const secret = `whsec_${randomBytes(24).toString("hex")}`;
    const { data, error } = await createServiceClient()
      .from("webhook_endpoints")
      .insert({ user_id: userId, url: input.url, events: input.events, secret })
      .select("id,url,events,status,created_at")
      .single();
    if (error || !data) return fail(error?.message ?? "Could not create webhook endpoint.");
    return ok({ ...data, secret }, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const body = await readJson<{ id?: string }>(request);
    if (!body.id) return fail("id is required.", 400);
    const { error } = await createServiceClient()
      .from("webhook_endpoints")
      .update({ status: "disabled", updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("user_id", userId);
    if (error) return fail(error.message);
    return ok({ disabled: true });
  } catch (error) {
    return fail(error);
  }
}
