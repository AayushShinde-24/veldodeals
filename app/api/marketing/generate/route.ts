import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { isDemoMode } from "@/lib/demo/mode";
import { getCurrentUser } from "@/lib/auth/server";
import { generateAd } from "@/lib/marketing/ad-gen";

const schema = z.object({
  product: z.string().min(1),
  audience: z.string().optional(),
  goal: z.string().optional(),
  format: z.enum(["image", "video", "carousel"]).default("image"),
  channels: z.array(z.enum(["meta", "google", "tiktok", "linkedin", "x"])).min(1).default(["meta", "google"]),
});

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());

    if (!isDemoMode()) {
      const user = await getCurrentUser();
      if (!user) throw new Error("Sign in to generate ads.");
      const { consumeCredits } = await import("@/lib/billing/consumption");
      const creative = input.format === "video" ? "ad_video" : "ad_image";
      await consumeCredits(user.id, creative, {});
      await consumeCredits(user.id, "ad_copy", { quantity: input.channels.length });
    }

    const result = await generateAd(input);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
