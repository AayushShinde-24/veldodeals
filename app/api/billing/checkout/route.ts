import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { createCheckoutSession } from "@/lib/integrations/billing-provider";

const schema = z.object({
  plan: z.enum(["solo", "team", "scale", "enterprise", "enterprise_plus", "enterprise_max", "custom"]),
  mode: z.enum(["subscription", "addon"]).default("subscription"),
  hyperPersonalization: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before starting checkout.");
    const input = schema.parse(await request.json());
    const baseUrl = process.env.VELDO_APP_URL ?? process.env.APP_URL ?? request.nextUrl.origin;
    return ok(await createCheckoutSession({
      userId: user.id,
      plan: input.plan,
      mode: input.mode,
      hyperPersonalization: input.hyperPersonalization,
      successUrl: `${baseUrl}/billing?checkout=success`,
      cancelUrl: `${baseUrl}/pricing?checkout=cancelled`,
    }));
  } catch (error) {
    return fail(error);
  }
}
