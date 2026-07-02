import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { createCampaign } from "@/lib/campaigns/service";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";
import { createCampaignAndRun } from "@/src/lib/mvp/campaign-flow";
import { applyPolicy } from "@/lib/security/rate-limit";
import { assertWithinPlan, PlanLimitError } from "@/lib/billing/plan-limits";
import { trackEvent } from "@/src/lib/analytics/events";

const canonicalSchema = z.object({
  name: z.string().min(1).default("Untitled campaign"),
  goal: z.string().min(1),
  offer: z.unknown().optional(),
  icp: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<Record<string, unknown>>(request);
    const userId = await getUserIdFromRequest(request, body);
    if (!applyPolicy(userId, "campaign_create")) return fail("Too many campaigns created recently. Please wait a moment.", 429);
    await assertWithinPlan(userId, "campaigns");
    if ("product_offer" in body || "target_niche" in body || "number_of_leads" in body) {
      const result = await createCampaignAndRun(userId, body);
      await trackEvent({ userId, event: "first_campaign", properties: { source: "campaign_flow" } });
      return ok(result, 201);
    }
    const input = canonicalSchema.parse(body);
    const campaign = await createCampaign({
      userId,
      name: input.name,
      goal: input.goal,
      offer: parseObject(input.offer),
      icp: parseObject(input.icp),
    });
    await trackEvent({ userId, event: "first_campaign", entityId: campaign.id, properties: { source: "api" } });
    return ok(campaign, 201);
  } catch (error) {
    if (error instanceof PlanLimitError) return fail(error.message, 402);
    return fail(error);
  }
}

function parseObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !(value instanceof File)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
