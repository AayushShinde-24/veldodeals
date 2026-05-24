import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";
import { getEnv } from "@/lib/security/env";
import { decryptToken, encryptToken } from "@/src/lib/security/tokens";

export async function getConnectedGoogleAccessToken(workspaceId: string, provider: "gmail" | "google_calendar") {
  const db = createServiceClient();
  const { data, error } = await db
    .from("connected_accounts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("status", "connected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.access_token_encrypted) throw new Error(`${provider} is not connected.`);
  if (isFresh(data.expires_at)) {
    return {
      account: data,
      accessToken: decryptToken(String(data.access_token_encrypted)),
    };
  }

  if (!data.refresh_token_encrypted) {
    await db.from("connected_accounts").update({
      status: "expired",
      last_error: "Mailbox refresh token is missing.",
    }).eq("id", data.id);
    throw new Error(`${provider} must be reconnected.`);
  }

  try {
    const refreshed = await refreshGoogleAccessToken(String(data.refresh_token_encrypted));
    const expiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null;
    const { data: updated, error: updateError } = await db.from("connected_accounts").update({
      access_token_encrypted: encryptToken(refreshed.access_token),
      expires_at: expiresAt,
      token_type: refreshed.token_type ?? data.token_type ?? "Bearer",
      status: "connected",
      last_refresh_at: new Date().toISOString(),
      last_error: null,
      scope: refreshed.scope ?? data.scope,
    }).eq("id", data.id).select("*").single();
    if (updateError) throw new Error(updateError.message);
    return {
      account: updated,
      accessToken: refreshed.access_token,
    };
  } catch (refreshError) {
    const message = refreshError instanceof Error ? sanitizeProviderError(refreshError.message) : "Mailbox token refresh failed.";
    await db.from("connected_accounts").update({
      status: "error",
      last_error: message,
    }).eq("id", data.id);
    throw new Error(`${provider} reconnect required: ${message}`);
  }
}

function isFresh(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() - Date.now() > 5 * 60 * 1000;
}

async function refreshGoogleAccessToken(encryptedRefreshToken: string) {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Mailbox connection credentials are not configured.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: decryptToken(encryptedRefreshToken),
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Mailbox token refresh failed.");
  const json = await response.json() as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
  if (!json.access_token) throw new Error("Mailbox token refresh returned no access token.");
  return {
    access_token: json.access_token,
    expires_in: json.expires_in,
    scope: json.scope,
    token_type: json.token_type,
  };
}

function sanitizeProviderError(message: string) {
  return message.replace(/\bGoogle\b|\bGmail\b/giu, "mailbox").replace(/\bOAuth\b/gu, "connection");
}
