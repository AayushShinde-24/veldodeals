import { createServiceClient } from "@/lib/integrations/supabase";
import crypto from "crypto";

export interface ApiKeyRow {
  id: string;
  userId: string;
  name: string;
  keyPreview: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("api_keys")
    .select("id, name, key_preview, scopes, last_used_at, created_at, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    userId,
    name: row.name,
    keyPreview: row.key_preview,
    scopes: row.scopes ?? [],
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  }));
}

export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[]
): Promise<{ key: string; id: string }> {
  const rawKey = `vld_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPreview = `${rawKey.slice(0, 8)}...${rawKey.slice(-4)}`;

  const db = createServiceClient();
  const { data, error } = await db
    .from("api_keys")
    .insert({
      user_id: userId,
      name,
      key_hash: keyHash,
      key_preview: keyPreview,
      scopes,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create API key: ${error?.message}`);
  return { key: rawKey, id: data.id };
}

async function getRequesterUserId(): Promise<string> {
  const { getCurrentUser } = await import("@/lib/auth/server");
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in before managing API keys.");
  return user.id;
}

export async function listApiKeysForCurrentUser(): Promise<ApiKeyRow[]> {
  const userId = await getRequesterUserId();
  return listApiKeys(userId);
}

export async function createApiKeyForCurrentUser(
  payloadOrName: string | { name: string; scopes?: string[] },
  scopes?: string[]
): Promise<{ key: string; id: string }> {
  const userId = await getRequesterUserId();
  const name = typeof payloadOrName === "string" ? payloadOrName : payloadOrName.name;
  const resolvedScopes = typeof payloadOrName === "string" ? (scopes ?? []) : (payloadOrName.scopes ?? []);
  return createApiKey(userId, name, resolvedScopes);
}

export async function deleteApiKeyForCurrentUser(keyId: string): Promise<void> {
  const userId = await getRequesterUserId();
  return revokeApiKey(userId, keyId);
}

export async function updateApiKeyForCurrentUser(
  keyId: string,
  updates: { name?: string; scopes?: string[] }
): Promise<void> {
  const userId = await getRequesterUserId();
  const db = createServiceClient();
  const { error } = await db
    .from("api_keys")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to update API key: ${error.message}`);
}

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to revoke API key: ${error.message}`);
}
