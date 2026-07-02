import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { checkDomainAuth } from "@/lib/deliverability/dns";
import { getUserIdFromRequest } from "@/lib/security/request";
import { applyPolicy } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!applyPolicy(userId, "deliverability_dns")) return fail("Too many DNS checks. Please wait a moment.", 429);
    const domain = request.nextUrl.searchParams.get("domain");
    if (!domain) return fail("domain is required.", 400);
    const selector = request.nextUrl.searchParams.get("selector") ?? "default";
    return ok(await checkDomainAuth(domain, selector));
  } catch (error) {
    return fail(error);
  }
}
