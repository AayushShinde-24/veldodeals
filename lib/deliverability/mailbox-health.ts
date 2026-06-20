import { createServiceClient } from "@/lib/integrations/supabase";

export type MailboxStatus = "healthy" | "expiring" | "expired" | "scope_missing" | "disconnected";

export interface MailboxHealth {
  status: MailboxStatus;
  connected: boolean;
  needsReconnect: boolean;
  email: string | null;
  expiresAt: string | null;
  lastRefreshAt: string | null;
  missingScopes: string[];
  message: string;
}

/** Scopes the outbound + reply-sync + calendar features require. */
export const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

interface TokenRow {
  email?: string | null;
  expires_at?: string | null;
  scopes?: string | null;
  refresh_token?: string | null;
  updated_at?: string | null;
}

/**
 * Pure mailbox-health classifier (unit-testable). Decides whether a connected mailbox
 * is healthy, expiring soon, expired, or missing scopes — without touching the DB.
 */
export function classifyMailboxHealth(token: TokenRow | null, now: Date = new Date()): MailboxHealth {
  if (!token) {
    return {
      status: "disconnected",
      connected: false,
      needsReconnect: true,
      email: null,
      expiresAt: null,
      lastRefreshAt: null,
      missingScopes: REQUIRED_SCOPES,
      message: "No mailbox connected.",
    };
  }

  const grantedScopes = (token.scopes ?? "").split(/\s+/u).filter(Boolean);
  const missingScopes = REQUIRED_SCOPES.filter((s) => !grantedScopes.includes(s));
  const expiresAt = token.expires_at ? new Date(token.expires_at) : null;
  const expired = expiresAt !== null && expiresAt.getTime() <= now.getTime();
  const expiringSoon =
    expiresAt !== null && !expired && expiresAt.getTime() - now.getTime() <= 24 * 60 * 60 * 1000;

  const base = {
    connected: true,
    email: token.email ?? null,
    expiresAt: token.expires_at ?? null,
    lastRefreshAt: token.updated_at ?? null,
    missingScopes,
  };

  // Missing the send scope is fatal regardless of token freshness.
  if (missingScopes.includes("https://www.googleapis.com/auth/gmail.send")) {
    return { ...base, status: "scope_missing", needsReconnect: true, message: "Mailbox is missing the Gmail send permission. Reconnect to grant it." };
  }

  // Expired without a refresh token means a manual reconnect.
  if (expired && !token.refresh_token) {
    return { ...base, status: "expired", needsReconnect: true, message: "Mailbox access expired and cannot auto-refresh. Reconnect Gmail." };
  }

  if (expiringSoon) {
    return { ...base, status: "expiring", needsReconnect: false, message: "Mailbox access expires soon; it will auto-refresh on next send." };
  }

  return { ...base, status: "healthy", needsReconnect: false, message: "Mailbox is connected and healthy." };
}

/** Load and classify a user's mailbox health. */
export async function getMailboxHealth(userId: string): Promise<MailboxHealth> {
  const db = createServiceClient();
  const { data } = await db
    .from("google_tokens")
    .select("email, expires_at, scopes, refresh_token, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  return classifyMailboxHealth(data ?? null);
}
