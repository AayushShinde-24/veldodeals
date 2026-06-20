import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { consumeToken } from "@/lib/security/rate-limit";

export type ApiKeyAuthResult =
  | { ok: true; context: { userId: string; workspaceId: string | null; scopes: string[] }; response?: never }
  | { ok: false; context?: never; response: NextResponse };

export async function authenticateApiKey(
  request: NextRequest,
  requiredScope?: string
): Promise<ApiKeyAuthResult> {
  const authHeader = request.headers.get("Authorization");
  const apiKey =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : request.nextUrl.searchParams.get("api_key");

  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { code: "missing_api_key", message: "Missing API key. Include it as a Bearer token or api_key param." } },
        { status: 401 }
      ),
    };
  }

  const db = createServiceClient();
  const keyHash = hashKey(apiKey);
  if (!consumeToken(`api-key:${keyHash}`, 120, 60_000)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { code: "rate_limited", message: "API key rate limit exceeded." } },
        { status: 429 }
      ),
    };
  }

  const { data, error } = await db
    .from("api_keys")
    .select("user_id, revoked_at, scopes")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { code: "invalid_api_key", message: "Invalid API key." } },
        { status: 401 }
      ),
    };
  }

  if (data.revoked_at) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { code: "revoked_api_key", message: "API key has been revoked." } },
        { status: 401 }
      ),
    };
  }

  const scopes: string[] = data.scopes ?? [];

  if (requiredScope && !scopes.includes(requiredScope) && !scopes.includes("*")) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { code: "insufficient_scope", message: `This API key does not have the '${requiredScope}' scope.` } },
        { status: 403 }
      ),
    };
  }

  // Update last_used_at fire-and-forget
  db.from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash)
    .then(null, () => {});

  const { data: profile } = await db
    .from("profiles")
    .select("workspace_id")
    .eq("id", data.user_id)
    .maybeSingle();

  return { ok: true, context: { userId: data.user_id, workspaceId: profile?.workspace_id ?? null, scopes } };
}

function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0") + key.slice(-8);
}
