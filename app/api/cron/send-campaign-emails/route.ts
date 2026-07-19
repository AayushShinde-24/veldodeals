import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { processCampaignSends } from "@/lib/sales/send-worker";

export const maxDuration = 300;

// Processes due campaign sends: window/cap checks, verification, final copy,
// delivery, and next-step scheduling. Runs every 10 minutes via Vercel Cron,
// guarded by CRON_SECRET. Idempotent — overlapping ticks never double-send.
async function handler(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return fail("Unauthorized.", 401);
  }
  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 25), 100);
    return ok(await processCampaignSends({ limit }));
  } catch (error) {
    return fail(error);
  }
}

export { handler as GET, handler as POST };
