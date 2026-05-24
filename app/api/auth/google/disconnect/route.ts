import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api/responses";
import { getWorkspaceContext } from "@/src/lib/workspace/context";
import { disconnectGoogleAccount } from "@/src/lib/apis/google/oauth";

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext();
    if (!context) throw new Error("Sign in before disconnecting your mailbox.");
    const form = await request.formData().catch(() => null);
    const rawProvider = form?.get("provider") ?? request.nextUrl.searchParams.get("provider") ?? "google";
    const provider = rawProvider === "gmail" || rawProvider === "google_calendar" || rawProvider === "google" ? rawProvider : "google";
    await disconnectGoogleAccount({ userId: context.userId, workspaceId: context.workspaceId, provider });
    return NextResponse.redirect(new URL("/sending-accounts?disconnected=mailbox", request.url));
  } catch (error) {
    return fail(error);
  }
}
