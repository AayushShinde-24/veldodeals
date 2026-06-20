import { NextResponse } from "next/server";

export function ok(data?: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: unknown, status?: number): NextResponse {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Request failed";
  const code =
    typeof status === "number"
      ? status
      : message.toLowerCase().includes("not authenticated") ||
          message.toLowerCase().includes("sign in")
        ? 401
        : message.toLowerCase().includes("too many")
          ? 429
          : 500;
  return NextResponse.json({ ok: false, error: message }, { status: code });
}
