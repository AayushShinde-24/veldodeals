import { createServiceClient } from "@/lib/integrations/supabase";
import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

export interface GoogleTokenResult {
  accessToken: string;
  userId: string;
  provider: string;
}

export async function getConnectedGoogleAccessToken(
  userId: string,
  provider = "google"
): Promise<GoogleTokenResult> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("google_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("No connected Google account. Connect Gmail in Settings → Integrations.");
  }

  const expiresAt = new Date(data.expires_at ?? 0);
  if (expiresAt > new Date(Date.now() + 60_000)) {
    return { accessToken: data.access_token, userId, provider };
  }

  // Refresh token
  if (!data.refresh_token) {
    throw new Error("Access token expired and no refresh token available. Reconnect Gmail.");
  }

  const res = await fetchWithRetry(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      }).toString(),
    },
    { provider: "google", endpoint: "oauth.refresh", shouldRetry: isTransientError, timeoutMs: 15_000 }
  );

  if (!res.ok) throw new Error("Failed to refresh Google access token. Reconnect Gmail.");

  const refreshed = (await res.json()) as { access_token: string; expires_in: number };
  await db
    .from("google_tokens")
    .update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId);

  return { accessToken: refreshed.access_token, userId, provider };
}
