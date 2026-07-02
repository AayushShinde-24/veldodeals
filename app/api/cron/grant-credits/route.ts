import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { grantMonthlyFreeCredits } from "@/lib/billing/grants";

// Refills free-tier monthly credits. Invoked daily by Vercel Cron (catches each
// user's month boundary) and guarded by CRON_SECRET.
async function handler(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return fail("Unauthorized.", 401);
  }
  try {
    return ok(await grantMonthlyFreeCredits());
  } catch (error) {
    return fail(error);
  }
}

export { handler as GET, handler as POST };
