import { createServiceClient } from "@/lib/integrations/supabase";

export async function isSuppressed(input: {
  email: string;
  userId?: string | null;
  workspaceId?: string | null;
}): Promise<boolean> {
  const email = input.email.trim().toLowerCase();
  if (!email) return true;
  const db = createServiceClient();
  let query = db.from("suppressions").select("id").eq("email", email).limit(1);
  if (input.userId || input.workspaceId) {
    query = query.or([
      "scope.eq.global",
      input.userId ? `user_id.eq.${input.userId}` : "",
      input.workspaceId ? `workspace_id.eq.${input.workspaceId}` : "",
    ].filter(Boolean).join(","));
  } else {
    query = query.eq("scope", "global");
  }
  const { data } = await query.maybeSingle();
  return !!data;
}

export async function addSuppression(input: {
  email: string;
  userId?: string | null;
  workspaceId?: string | null;
  scope?: "global" | "workspace" | "user";
  reason: string;
  source?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = createServiceClient();
  await db.from("suppressions").upsert(
    {
      email: input.email.trim().toLowerCase(),
      user_id: input.userId ?? null,
      workspace_id: input.workspaceId ?? null,
      scope: input.scope ?? (input.workspaceId ? "workspace" : input.userId ? "user" : "global"),
      reason: input.reason,
      source: input.source ?? null,
      metadata: input.metadata ?? {},
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,email,scope" }
  );
}

export async function suppressFromProviderSignal(input: {
  email: string;
  type: "bounce" | "complaint";
  userId?: string | null;
  workspaceId?: string | null;
  provider?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await addSuppression({
    email: input.email,
    userId: input.userId,
    workspaceId: input.workspaceId,
    reason: input.type,
    source: input.provider ?? "provider_webhook",
    metadata: input.payload,
  });
}
