import "server-only";

import { getEnv, getGoogleRedirectUri, getOptionalEnv } from "@/lib/security/env";
import { createServiceClient } from "@/lib/integrations/supabase";
import { encryptToken, canEncryptTokens } from "@/src/lib/security/tokens";
import { writeAuditLog } from "@/src/lib/audit/log";

const scopes = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

export function canConnectGoogle() {
  const env = getOptionalEnv();
  return Boolean(env?.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && canEncryptTokens());
}

export function getGoogleSetupState() {
  const env = getOptionalEnv();
  return {
    hasClientId: Boolean(env?.GOOGLE_CLIENT_ID),
    hasClientSecret: Boolean(env?.GOOGLE_CLIENT_SECRET),
    hasTokenEncryption: canEncryptTokens(),
    redirectUri: env ? getGoogleRedirectUri() : "Set VELDO_APP_URL to generate the callback URL.",
  };
}

export function buildGoogleOAuthUrl(input: { userId: string; workspaceId: string; provider: "gmail" | "google_calendar" | "google" }) {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google OAuth credentials are not configured.");
  if (!canEncryptTokens()) throw new Error("TOKEN_ENCRYPTION_KEY is required before connecting Google accounts.");

  const state = Buffer.from(JSON.stringify({
    userId: input.userId,
    workspaceId: input.workspaceId,
    provider: input.provider,
    createdAt: Date.now(),
  })).toString("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", getGoogleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeGoogleCode(input: { code: string; state: string }) {
  const env = getEnv();
  const state = parseState(input.state);
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google OAuth credentials are not configured.");
  if (!canEncryptTokens()) throw new Error("TOKEN_ENCRYPTION_KEY is required before connecting Google accounts.");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) throw new Error("Google OAuth token exchange failed.");
  const tokens = await tokenResponse.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
  if (!tokens.access_token) throw new Error("Google OAuth did not return an access token.");

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;
  const email = await fetchGoogleEmail(tokens.access_token);

  const db = createServiceClient();
  const providers: Array<"gmail" | "google_calendar"> =
    state.provider === "google" ? ["gmail", "google_calendar"] : [state.provider];

  for (const provider of providers) {
    const { data: existing } = await db.from("connected_accounts")
      .select("refresh_token_encrypted")
      .eq("workspace_id", state.workspaceId)
      .eq("provider", provider)
      .eq("status", "connected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    await db.from("connected_accounts")
      .delete()
      .eq("workspace_id", state.workspaceId)
      .eq("provider", provider);
    await db.from("connected_accounts").insert({
      workspace_id: state.workspaceId,
      user_id: state.userId,
      provider,
      email,
      access_token_encrypted: encryptToken(tokens.access_token),
      refresh_token_encrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : existing?.refresh_token_encrypted ?? null,
      scope: tokens.scope ?? null,
      expires_at: expiresAt,
      token_type: tokens.token_type ?? "Bearer",
      status: "connected",
      connected_at: new Date().toISOString(),
      metadata: { scope: tokens.scope ?? null, token_type: tokens.token_type ?? "Bearer" },
    });
  }

  await writeAuditLog({
    workspaceId: state.workspaceId,
    userId: state.userId,
    action: "google.oauth.connected",
    metadata: { providers },
  });

  return { workspaceId: state.workspaceId, providers, email };
}

export async function disconnectGoogleAccount(input: { userId: string; workspaceId: string; provider?: "gmail" | "google_calendar" | "google" }) {
  const providers: Array<"gmail" | "google_calendar"> =
    !input.provider || input.provider === "google" ? ["gmail", "google_calendar"] : [input.provider];
  const { error } = await createServiceClient()
    .from("connected_accounts")
    .update({
      status: "revoked",
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      last_error: null,
      disconnected_at: new Date().toISOString(),
    })
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId)
    .in("provider", providers);
  if (error) throw new Error(error.message);
  await writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "google.oauth.disconnected",
    metadata: { providers },
  });
  return { disconnected: providers };
}

async function fetchGoogleEmail(accessToken: string) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const json = await response.json() as { emailAddress?: string };
  return json.emailAddress ?? null;
}

function parseState(state: string): { userId: string; workspaceId: string; provider: "gmail" | "google_calendar" | "google" } {
  const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
    userId?: string;
    workspaceId?: string;
    provider?: string;
    createdAt?: number;
  };
  if (!parsed.userId || !parsed.workspaceId) throw new Error("Google OAuth state is invalid.");
  if (!["gmail", "google_calendar", "google"].includes(String(parsed.provider))) throw new Error("Google OAuth provider is invalid.");
  if (!parsed.createdAt || Date.now() - parsed.createdAt > 15 * 60 * 1000) throw new Error("Google OAuth state expired.");
  return {
    userId: parsed.userId,
    workspaceId: parsed.workspaceId,
    provider: parsed.provider as "gmail" | "google_calendar" | "google",
  };
}
