import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { buildGoogleOAuthUrl } from "@/src/lib/apis/google/oauth";

export async function GET(request: NextRequest) {
  try {
    const context = await getWorkspaceContext();
    if (!context) return fail(new Error("Sign in before connecting a mailbox."), 401);
    const provider = request.nextUrl.searchParams.get("provider") === "calendar" ? "google_calendar" : "google";
    return NextResponse.redirect(buildGoogleOAuthUrl({
      userId: context.userId,
      workspaceId: context.workspaceId,
      provider,
    }));
  } catch {
    return fail(new Error("Mailbox connection is not configured."), 400);
  }
}
