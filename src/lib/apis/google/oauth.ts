import { createServiceClient } from "@/lib/integrations/supabase";
import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "";

export function getGoogleSetupState(): {
  configured: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRedirectUri: boolean;
  hasTokenEncryption: boolean;
  redirectUri: string;
} {
  return {
    configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    hasClientId: !!GOOGLE_CLIENT_ID,
    hasClientSecret: !!GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!GOOGLE_REDIRECT_URI,
    hasTokenEncryption: !!(process.env.TOKEN_ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY),
    redirectUri: GOOGLE_REDIRECT_URI,
  };
}

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export function buildGoogleOAuthUrl(
  input: string | { userId: string; workspaceId?: string; provider?: string; state?: string },
  state?: string
): string {
  if (!GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not configured.");
  const userId = typeof input === "string" ? input : input.userId;
  const resolvedState = typeof input === "string" ? (state ?? userId) : (input.state ?? userId);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: resolvedState,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(input: { code: string; state?: string }, userId?: string): Promise<{ email?: string; scopes: string }>;
export async function exchangeGoogleCode(code: string, userId: string): Promise<{ email?: string; scopes: string }>;
export async function exchangeGoogleCode(
  codeOrInput: string | { code: string; state?: string },
  userId?: string
): Promise<{ email?: string; scopes: string }> {
  const code = typeof codeOrInput === "string" ? codeOrInput : codeOrInput.code;
  const resolvedUserId = userId ?? (typeof codeOrInput !== "string" ? codeOrInput.state : undefined);
  if (!resolvedUserId) throw new Error("userId is required for OAuth code exchange.");
  return _exchangeGoogleCode(code, resolvedUserId);
}

async function _exchangeGoogleCode(code: string, userId: string) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not configured.");
  }

  const res = await fetchWithRetry(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    },
    { provider: "google", endpoint: "oauth.token", shouldRetry: isTransientError, timeoutMs: 15_000 }
  );

  if (!res.ok) {
    const err = (await res.json()) as { error_description?: string };
    throw new Error(`Google OAuth error: ${err.error_description ?? res.statusText}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };

  // Get user email from Google
  const meRes = await fetchWithRetry(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    { provider: "google", endpoint: "oauth.userinfo", shouldRetry: isTransientError, timeoutMs: 10_000 }
  );
  const me = meRes.ok ? ((await meRes.json()) as { email?: string }) : {};

  const db = createServiceClient();
  await db.from("google_tokens").upsert(
    {
      user_id: userId,
      email: me.email ?? null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return { email: me.email, scopes: tokens.scope };
}

export async function disconnectGoogleAccount(
  userIdOrInput: string | { userId: string; workspaceId?: string; provider?: string }
) {
  const userId = typeof userIdOrInput === "string" ? userIdOrInput : userIdOrInput.userId;
  const db = createServiceClient();
  const { data } = await db
    .from("google_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.access_token) {
    await fetchWithRetry(
      `https://oauth2.googleapis.com/revoke?token=${data.access_token}`,
      { method: "POST" },
      { provider: "google", endpoint: "oauth.revoke", shouldRetry: isTransientError, timeoutMs: 10_000 }
    ).catch(() => {});
  }

  await db.from("google_tokens").delete().eq("user_id", userId);
  return { disconnected: true };
}
