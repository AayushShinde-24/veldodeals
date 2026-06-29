import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth/server";
import { getEnv } from "@/lib/security/env";
import { ensureDefaultWorkspace } from "@/src/lib/workspace/context";

/**
 * OAuth (e.g. Continue with Google) session-exchange callback.
 * Distinct from /api/auth/google/callback, which connects a mailbox.
 */
export async function GET(request: NextRequest) {
  const appUrl = getEnv().VELDO_APP_URL.replace(/\/$/u, "");
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent("Sign-in could not be completed. Please try again.")}`);
  }

  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent("Sign-in could not be completed. Please try again.")}`);
    }
    await ensureDefaultWorkspace(data.user.id, data.user.email ?? "", data.user.user_metadata ?? {});
    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent("Sign-in could not be completed. Please try again.")}`);
  }
}
