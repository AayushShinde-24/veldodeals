import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: unknown, status = 400) {
  const rawMessage = error instanceof Error ? error.message : "Request failed";
  const message = sanitizePublicError(rawMessage);
  return NextResponse.json({ ok: false, error: message }, { status });
}

function sanitizePublicError(message: string) {
  if (process.env.NODE_ENV !== "production") return message;
  if (/key|secret|token|authorization|password|service[_ -]?role|bearer|refresh|access[_ -]?token/iu.test(message)) {
    return "Request failed because a secure service dependency is unavailable.";
  }
  if (/database|supabase|postgres|relation|column|constraint|violates|schema/iu.test(message)) {
    return "Request failed because the workspace data could not be updated.";
  }
  if (/google|gmail|apollo|openai|anthropic|firecrawl|tavily|zerobounce|clay|resend/iu.test(message)) {
    return "Request failed because an external service could not complete the action.";
  }
  return message;
}
