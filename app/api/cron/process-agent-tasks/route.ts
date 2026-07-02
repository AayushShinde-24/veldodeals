import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { drainQueue } from "@/lib/agents/queue";

// Drains the agent task queue. Invoked by Vercel Cron (see vercel.json) and
// protected by CRON_SECRET. Also accepts POST for manual triggering.
async function handler(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return fail("Unauthorized.", 401);
    }
  }

  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 25), 100);
    const result = await drainQueue(limit);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

export { handler as GET, handler as POST };
