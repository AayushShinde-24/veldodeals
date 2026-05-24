import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";

export async function logMvpError(input: {
  userId?: string | null;
  campaignId?: string | null;
  source: string;
  errorCode?: string;
  error: unknown;
  rawError?: Record<string, unknown>;
}) {
  const message = input.error instanceof Error ? input.error.message : String(input.error || "Unknown error");
  await createServiceClient().from("error_logs").insert({
    user_id: input.userId ?? null,
    campaign_id: input.campaignId ?? null,
    source: input.source,
    error_code: input.errorCode ?? null,
    error_message: message,
    raw_error: sanitizeRawError(input.rawError),
  });
}

function sanitizeRawError(raw?: Record<string, unknown>) {
  if (!raw) return null;
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (/key|secret|token|authorization|password/iu.test(key)) continue;
    copy[key] = typeof value === "string" && value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }
  return copy;
}
