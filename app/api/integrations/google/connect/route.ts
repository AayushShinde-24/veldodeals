import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL("/api/auth/google/connect", request.url);
  const provider = request.nextUrl.searchParams.get("provider");
  if (provider) url.searchParams.set("provider", provider);
  return NextResponse.redirect(url);
}
