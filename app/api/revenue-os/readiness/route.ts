import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { getLaunchReadiness } from "@/lib/revenue-os/readiness";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before viewing launch readiness.");
    return ok(getLaunchReadiness());
  } catch (error) {
    return fail(error);
  }
}
