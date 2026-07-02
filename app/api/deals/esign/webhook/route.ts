import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { handleSignatureComplete } from "@/lib/deals/proposals";

// E-sign provider webhook. Marks the proposal signed/declined and, on signature,
// advances the deal to closed_won (firing the 2.5% success fee).
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.ESIGN_WEBHOOK_SECRET;
    if (secret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) return fail("Unauthorized.", 401);
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const esignRequestId = String(body.request_id ?? body.document_id ?? body.id ?? body.uuid ?? "");
    if (!esignRequestId) return fail("Missing e-sign request id.", 400);

    const status = String(body.status ?? body.event ?? "").toLowerCase();
    const signed = /sign|complet|finish/u.test(status);
    return ok(await handleSignatureComplete({ esignRequestId, signed }));
  } catch (error) {
    return fail(error);
  }
}
