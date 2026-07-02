import { NextResponse } from "next/server";

export function ok(data?: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: unknown, status = 400) {
  const rawMessage = error instanceof Error ? error.message : "Request failed";
  // Keep the real error in server logs for debugging; never send it to the client.
  if (error instanceof Error) {
    console.error("[veldo:api-error]", rawMessage);
  }
  const message = sanitizePublicError(rawMessage);
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * Converts an internal error message into a safe, Veldo-branded message for the
 * end user. Runs in every environment (not just production) so preview/dev
 * deployments never expose third-party vendor names or infrastructure details.
 *
 * Use this anywhere an error string may reach the UI — not only inside `fail()`.
 */
export function sanitizePublicError(message: string) {
  // Secrets / auth — never hint at which credential failed.
  if (/key|secret|token|authorization|password|service[_ -]?role|bearer|refresh|access[_ -]?token|credential|unauthorized|forbidden|401|403/iu.test(message)) {
    return "We couldn't complete that action right now. Please try again shortly.";
  }
  // Data layer — hide DB/vendor specifics.
  if (/database|supabase|postgres|relation|column|constraint|violates|schema|duplicate|foreign key|rls|row[- ]level/iu.test(message)) {
    return "We couldn't update your workspace data. Please try again.";
  }
  // Third-party providers — never surface vendor names to the user.
  if (VENDOR_PATTERN.test(message)) {
    return "A connected service is temporarily unavailable. Please try again in a moment.";
  }
  // Rate limits / quotas.
  if (/rate limit|too many requests|quota|429|insufficient/iu.test(message)) {
    return "You've hit a temporary limit. Please wait a moment and try again.";
  }
  // Network / timeout.
  if (/timed out|timeout|network|fetch failed|econn|enotfound|socket/iu.test(message)) {
    return "The request took too long. Please try again.";
  }
  return message;
}

/**
 * Every external provider/vendor name we must never expose to end users.
 * Matches both the brand and any internal mention (e.g. "APOLLO_API_KEY").
 */
const VENDOR_PATTERN =
  /\b(google|gmail|outlook|microsoft|office\s?365|apollo|clay|openai|gpt|anthropic|claude|firecrawl|tavily|zerobounce|resend|serpapi|apify|stripe|dodo|hubspot|salesforce|pipedrive|slack|calendly|linkedin|posthog|sentry|twilio|me5|enrich)\b/iu;
