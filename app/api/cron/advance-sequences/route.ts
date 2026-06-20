import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { advanceSequences } from "@/lib/sequences/engine";

// Advances due multi-step follow-up sequences. Runs hourly via Vercel Cron, guarded
// by CRON_SECRET. Stop conditions (reply/unsub/meeting) are checked per step.
async function handler(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return fail("Unauthorized.", 401);
  }
  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 50), 200);
    return ok(await advanceSequences(limit));
  } catch (error) {
    return fail(error);
  }
}

export { handler as GET, handler as POST };
