import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { handleCallResult } from "@/lib/voice/calling";

// Voice-provider result webhook (transcript / recording / outcome). Optionally guarded
// by VOICE_WEBHOOK_SECRET. Normalizes the common provider payload shapes.
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.VOICE_WEBHOOK_SECRET;
    if (secret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) return fail("Unauthorized.", 401);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const providerCallId = String(body.call_id ?? body.id ?? body.providerCallId ?? "");
    if (!providerCallId) return fail("Missing provider call id.", 400);

    return ok(
      await handleCallResult({
        providerCallId,
        transcript: typeof body.transcript === "string" ? body.transcript : undefined,
        recordingUrl: typeof body.recording_url === "string" ? body.recording_url : undefined,
        durationSeconds: typeof body.duration === "number" ? body.duration : undefined,
        outcome: typeof body.outcome === "string" ? body.outcome : undefined,
      })
    );
  } catch (error) {
    return fail(error);
  }
}
