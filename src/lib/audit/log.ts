import { createServiceClient } from "@/lib/integrations/supabase";

export interface AuditEntry {
  userId: string;
  workspaceId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: unknown;
  ipAddress?: string;
  [key: string]: unknown;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from("audit_logs").insert({
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      metadata: entry.metadata ?? null,
      ip_address: entry.ipAddress ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Audit logging is non-blocking — don't fail the request
  }
}
