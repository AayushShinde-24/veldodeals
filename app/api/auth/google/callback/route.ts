import { NextRequest, NextResponse } from "next/server";
import { getOptionalEnv } from "@/lib/security/env";
import { exchangeGoogleCode } from "@/src/lib/apis/google/oauth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const configuredUrl = getOptionalEnv()?.VELDO_APP_URL;
  const appUrl = (configuredUrl && /^https?:\/\//u.test(configuredUrl) ? configuredUrl : request.nextUrl.origin).replace(/\/$/u, "");

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/sending-accounts?error=${encodeURIComponent("Mailbox connection was cancelled or incomplete.")}`);
  }

  try {
    await exchangeGoogleCode({ code, state });
    return NextResponse.redirect(`${appUrl}/sending-accounts?connected=google`);
  } catch (error) {
    const message = sanitizePublicConnectionError(error instanceof Error ? error.message : "Mailbox connection failed.");
    return NextResponse.redirect(`${appUrl}/sending-accounts?error=${encodeURIComponent(message)}`);
  }
}

function sanitizePublicConnectionError(message: string) {
  return message
    .replace(/\bGoogle\b|\bGmail\b/giu, "mailbox")
    .replace(/\bOAuth\b/gu, "connection");
}
