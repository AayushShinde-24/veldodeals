import "server-only";

import { createServiceClient } from "@/lib/integrations/supabase";

export async function writeAuditLog(input: {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.workspaceId && !input.userId) return;
  try {
    await createServiceClient().from("audit_logs").insert({
      workspace_id: input.workspaceId ?? null,
      user_id: input.userId ?? null,
      action: input.action,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Audit logging must not break the product path when legacy schemas are missing.
  }
}
