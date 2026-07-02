import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { drainDuePublications } from "@/lib/distribution/publishing";

async function handler(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return fail("Unauthorized.", 401);
  }

  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 25), 100);
    return ok(await drainDuePublications(limit));
  } catch (error) {
    return fail(error);
  }
}

export { handler as GET, handler as POST };
