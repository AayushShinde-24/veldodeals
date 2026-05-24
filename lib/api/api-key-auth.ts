import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { hashApiKey, type ApiKeyPermission } from "@/lib/developer/api-keys";

export type ApiKeyAuthContext = {
  apiKeyId: string;
  userId: string;
  workspaceId: string;
  permissions: string[];
};

type ApiKeyRecord = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  status: string;
  permissions: string[] | null;
  request_count: number | null;
};

export async function authenticateApiKey(request: NextRequest, requiredPermission: ApiKeyPermission) {
  const rawKey = readApiKey(request);
  if (!rawKey) return authError("missing_api_key", "Provide a Veldo API key using Authorization: Bearer <key> or X-Veldo-API-Key.", 401);
  if (!/^vld_(test|live)_[A-Za-z0-9_-]+$/u.test(rawKey)) return authError("invalid_api_key", "The Veldo API key format is invalid.", 401);

  const db = createServiceClient();
  const { data, error } = await db
    .from("veldo_api_keys")
    .select("id,user_id,workspace_id,status,permissions,request_count")
    .eq("key_hash", hashApiKey(rawKey))
    .maybeSingle();

  if (error) return authError("api_key_lookup_failed", "Veldo could not verify this API key.", 500);
  const record = data as ApiKeyRecord | null;
  if (!record?.workspace_id) return authError("invalid_api_key", "The Veldo API key is not valid.", 401);
  if (record.status !== "active") return authError("api_key_inactive", "This Veldo API key is not active.", 403);
  if (!(record.permissions ?? []).includes(requiredPermission)) return authError("missing_permission", `This Veldo API key is missing ${requiredPermission}.`, 403);

  const now = new Date().toISOString();
  await db
    .from("veldo_api_keys")
    .update({
      request_count: Number(record.request_count ?? 0) + 1,
      last_used_at: now,
      updated_at: now,
    })
    .eq("id", record.id);

  await db.from("veldo_api_key_usage_events").insert({
    api_key_id: record.id,
    user_id: record.user_id,
    workspace_id: record.workspace_id,
    route: request.nextUrl.pathname,
    method: request.method,
    status_code: 200,
  });

  return {
    ok: true as const,
    context: {
      apiKeyId: record.id,
      userId: record.user_id,
      workspaceId: record.workspace_id,
      permissions: record.permissions ?? [],
    },
  };
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function authError(code: string, message: string, status: number) {
  return { ok: false as const, response: apiError(code, message, status) };
}

function readApiKey(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-veldo-api-key")?.trim() ?? null;
}
