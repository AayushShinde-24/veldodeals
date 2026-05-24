import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { getConnectedGoogleAccessToken } from "@/src/lib/apis/google/connected-account";
import { getCalendarAvailability } from "@/src/lib/apis/google/google-calendar-client";

const schema = z.object({
  timeMin: z.string().datetime(),
  timeMax: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext();
    if (!context) throw new Error("Sign in before checking availability.");
    const input = schema.parse(await request.json());
    const google = await getConnectedGoogleAccessToken(context.workspaceId, "google_calendar");
    return ok(await getCalendarAvailability({ accessToken: google.accessToken, ...input }));
  } catch (error) {
    return fail(error);
  }
}
