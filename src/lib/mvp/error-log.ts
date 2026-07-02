import { createServiceClient } from "@/lib/integrations/supabase";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorLogEntry {
  id: string;
  userId: string;
  severity: ErrorSeverity;
  context: string;
  message: string;
  stackTrace: string | null;
  metadata: unknown;
  resolvedAt: string | null;
  createdAt: string;
}

export async function logError(
  userId: string,
  context: string,
  error: unknown,
  severity: ErrorSeverity = "medium",
  metadata?: unknown
): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
    const stackTrace = error instanceof Error ? (error.stack ?? null) : null;

    // Forward to Sentry (no-ops without a DSN).
    try {
      const { captureError } = await import("@/lib/observability/sentry");
      captureError(error, { userId, context, severity });
    } catch {
      // observability must never break logging
    }

    const db = createServiceClient();
    await db.from("error_logs").insert({
      user_id: userId,
      severity,
      context,
      message,
      stack_trace: stackTrace,
      metadata: metadata ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never let logging fail silently crash the app
  }
}

export async function logMvpError(
  userIdOrOptions: string | { userId: string; campaignId?: string | null; source?: string; errorCode?: string; error?: unknown; severity?: ErrorSeverity; metadata?: unknown },
  context?: string,
  error?: unknown,
  severity?: ErrorSeverity,
  metadata?: unknown
): Promise<void> {
  if (typeof userIdOrOptions === "string") {
    return logError(userIdOrOptions, context ?? "unknown", error, severity, metadata);
  }
  const opts = userIdOrOptions;
  return logError(
    opts.userId,
    opts.source ?? "unknown",
    opts.error,
    opts.severity ?? "medium",
    { errorCode: opts.errorCode, campaignId: opts.campaignId, ...(typeof opts.metadata === "object" ? opts.metadata : {}) }
  );
}

export async function getRecentErrors(
  userId: string,
  limit = 20
): Promise<ErrorLogEntry[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("error_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    severity: (row.severity as ErrorSeverity) ?? "medium",
    context: row.context as string,
    message: row.message as string,
    stackTrace: (row.stack_trace as string) ?? null,
    metadata: row.metadata,
    resolvedAt: (row.resolved_at as string) ?? null,
    createdAt: row.created_at as string,
  }));
}
