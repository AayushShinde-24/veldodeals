import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";

export const apiKeyPermissions = ["campaigns:read", "usage:read"] as const;
export type ApiKeyPermission = (typeof apiKeyPermissions)[number];
export type ApiKeyMode = "test" | "live";
export type ApiKeyStatus = "active" | "disabled" | "revoked";

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Name is too long."),
  mode: z.enum(["test", "live"]).default("live"),
  permissions: z.array(z.enum(apiKeyPermissions)).default([...apiKeyPermissions]),
});

export const updateApiKeySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["active", "disabled", "revoked"]).optional(),
});

export type ApiKeyRow = {
  id: string;
  name: string;
  mode: ApiKeyMode;
  key_prefix: string;
  key_last_four: string;
  masked_key: string;
  permissions: ApiKeyPermission[];
  status: ApiKeyStatus;
  request_count: number;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

type StoredApiKeyRow = ApiKeyRow & {
  user_id: string;
  workspace_id: string;
  key_hash: string;
};

export type CreatedApiKey = {
  key: string;
  record: ApiKeyRow;
};

export async function listApiKeysForCurrentUser() {
  const context = await requireDeveloperContext();
  const result = await tryApiKeyDatabase(() =>
    createServiceClient()
      .from("veldo_api_keys")
      .select("id,name,mode,key_prefix,key_last_four,masked_key,permissions,status,request_count,last_used_at,revoked_at,created_at,updated_at")
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId)
      .order("created_at", { ascending: false }),
  );

  if (!result || result.error) return listLocalApiKeys(context);
  const { data } = result;
  return (data ?? []) as ApiKeyRow[];
}

export async function createApiKeyForCurrentUser(raw: unknown): Promise<CreatedApiKey> {
  const context = await requireDeveloperContext();
  const input = createApiKeySchema.parse(raw);
  const key = generateApiKey(input.mode);
  const fingerprint = getKeyFingerprint(key);
  const now = new Date().toISOString();

  const result = await tryApiKeyDatabase(() =>
    createServiceClient()
      .from("veldo_api_keys")
      .insert({
        user_id: context.userId,
        workspace_id: context.workspaceId,
        name: input.name,
        mode: input.mode,
        key_hash: hashApiKey(key),
        key_prefix: fingerprint.prefix,
        key_last_four: fingerprint.lastFour,
        masked_key: fingerprint.masked,
        permissions: input.permissions,
        status: "active",
        created_at: now,
        updated_at: now,
      })
      .select("id,name,mode,key_prefix,key_last_four,masked_key,permissions,status,request_count,last_used_at,revoked_at,created_at,updated_at")
      .single(),
  );

  if (!result || result.error) return createLocalApiKey(context, input, key, fingerprint, now);
  const { data } = result;
  return { key, record: data as ApiKeyRow };
}

export async function updateApiKeyForCurrentUser(id: string, raw: unknown) {
  const context = await requireDeveloperContext();
  const input = updateApiKeySchema.parse(raw);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name) patch.name = input.name;
  if (input.status) {
    patch.status = input.status;
    patch.revoked_at = input.status === "revoked" ? new Date().toISOString() : null;
  }

  const result = await tryApiKeyDatabase(() =>
    createServiceClient()
      .from("veldo_api_keys")
      .update(patch)
      .eq("id", id)
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId)
      .select("id,name,mode,key_prefix,key_last_four,masked_key,permissions,status,request_count,last_used_at,revoked_at,created_at,updated_at")
      .single(),
  );

  if (!result || result.error) return updateLocalApiKey(context, id, patch);
  const { data } = result;
  return data as ApiKeyRow;
}

export async function deleteApiKeyForCurrentUser(id: string) {
  const context = await requireDeveloperContext();
  const result = await tryApiKeyDatabase(() =>
    createServiceClient()
      .from("veldo_api_keys")
      .delete()
      .eq("id", id)
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId),
  );

  if (!result || result.error) return deleteLocalApiKey(context, id);
  return { deleted: true };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

function generateApiKey(mode: ApiKeyMode) {
  return `vld_${mode}_${randomBytes(32).toString("base64url")}`;
}

function getKeyFingerprint(key: string) {
  const [brand, mode, secret] = key.split("_");
  const prefix = `${brand}_${mode}_${secret.slice(0, 8)}`;
  const lastFour = key.slice(-4);
  return {
    prefix,
    lastFour,
    masked: `${prefix}...${lastFour}`,
  };
}

async function tryApiKeyDatabase<T>(operation: () => PromiseLike<T>): Promise<T | null> {
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("API key database timed out.")), 4000);
      }),
    ]);
  } catch {
    return null;
  }
}

async function requireDeveloperContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in before managing API keys.");
  const profile = await getCurrentProfile().catch(() => null);
  return { userId: user.id, workspaceId: profile?.workspace_id ?? user.id };
}

function localStorePath() {
  const dir = join(process.cwd(), "output");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, "local-api-keys.json");
}

function readLocalStore(): StoredApiKeyRow[] {
  const path = localStorePath();
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf8")) as StoredApiKeyRow[];
  } catch {
    return [];
  }
}

function writeLocalStore(rows: StoredApiKeyRow[]) {
  writeFileSync(localStorePath(), JSON.stringify(rows, null, 2));
}

function publicRow(row: StoredApiKeyRow): ApiKeyRow {
  const { user_id: _userId, workspace_id: _workspaceId, key_hash: _keyHash, ...safe } = row;
  return safe;
}

function listLocalApiKeys(context: { userId: string; workspaceId: string }) {
  return readLocalStore()
    .filter((row) => row.user_id === context.userId && row.workspace_id === context.workspaceId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(publicRow);
}

function createLocalApiKey(
  context: { userId: string; workspaceId: string },
  input: z.infer<typeof createApiKeySchema>,
  key: string,
  fingerprint: ReturnType<typeof getKeyFingerprint>,
  now: string,
): CreatedApiKey {
  const rows = readLocalStore();
  const row: StoredApiKeyRow = {
    id: randomUUID(),
    user_id: context.userId,
    workspace_id: context.workspaceId,
    name: input.name,
    mode: input.mode,
    key_hash: hashApiKey(key),
    key_prefix: fingerprint.prefix,
    key_last_four: fingerprint.lastFour,
    masked_key: fingerprint.masked,
    permissions: input.permissions,
    status: "active",
    request_count: 0,
    last_used_at: null,
    revoked_at: null,
    created_at: now,
    updated_at: now,
  };
  writeLocalStore([row, ...rows]);
  return { key, record: publicRow(row) };
}

function updateLocalApiKey(context: { userId: string; workspaceId: string }, id: string, patch: Record<string, unknown>) {
  const rows = readLocalStore();
  const index = rows.findIndex((row) => row.id === id && row.user_id === context.userId && row.workspace_id === context.workspaceId);
  if (index === -1) throw new Error("API key not found.");
  rows[index] = { ...rows[index], ...patch } as StoredApiKeyRow;
  writeLocalStore(rows);
  return publicRow(rows[index]);
}

function deleteLocalApiKey(context: { userId: string; workspaceId: string }, id: string) {
  const rows = readLocalStore();
  writeLocalStore(rows.filter((row) => !(row.id === id && row.user_id === context.userId && row.workspace_id === context.workspaceId)));
  return { deleted: true };
}
