import { createServiceClient } from "@/lib/integrations/supabase";
import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

export interface EmailVerificationResult {
  email: string;
  status: string;
  subStatus?: string | null;
  didMock: boolean;
}

export async function verifyEmail(
  email: string,
  options: { userId?: string; leadId?: string | null } = {}
): Promise<EmailVerificationResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return saveResult({ email: normalized, status: "invalid", didMock: true }, options);
  }

  const apiKey = process.env.ZEROBOUNCE_API_KEY;
  if (!apiKey) {
    return saveResult({ email: normalized, status: "valid", didMock: true }, options);
  }

  const params = new URLSearchParams({ api_key: apiKey, email: normalized });
  const res = await fetchWithRetry(
    `https://api.zerobounce.net/v2/validate?${params}`,
    {},
    { provider: "zerobounce", endpoint: "validate", shouldRetry: isTransientError, timeoutMs: 20_000 }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(`ZeroBounce error: ${err.error ?? err.message ?? res.statusText}`);
  }

  const data = (await res.json()) as { address?: string; status?: string; sub_status?: string };
  return saveResult({
    email: data.address ?? normalized,
    status: data.status ?? "unknown",
    subStatus: data.sub_status ?? null,
    didMock: false,
  }, options);
}

async function saveResult(
  result: EmailVerificationResult,
  options: { userId?: string; leadId?: string | null }
): Promise<EmailVerificationResult> {
  if (!options.userId) return result;
  const db = createServiceClient();
  await db.from("email_verifications").insert({
    user_id: options.userId,
    lead_id: options.leadId ?? null,
    status: result.status,
    created_at: new Date().toISOString(),
  });
  if (options.leadId) {
    await db
      .from("leads")
      .update({ stage: result.status === "valid" ? "verified" : "verification_failed", updated_at: new Date().toISOString() })
      .eq("id", options.leadId)
      .eq("user_id", options.userId);
  }
  return result;
}
