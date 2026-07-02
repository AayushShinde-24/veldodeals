import { createServiceClient } from "@/lib/integrations/supabase";

export interface PromptVersion {
  name: string;
  version: number;
  content: string;
  metadata: Record<string, unknown>;
}

export async function getPrompt(name: string, version?: number): Promise<PromptVersion | null> {
  const db = createServiceClient();
  let query = db
    .from("prompts")
    .select("name,version,content,metadata")
    .eq("name", name)
    .order("version", { ascending: false })
    .limit(1);
  if (version !== undefined) query = query.eq("version", version);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    name: data.name,
    version: Number(data.version),
    content: data.content,
    metadata: (data.metadata as Record<string, unknown> | null) ?? {},
  };
}

export async function savePromptVersion(input: {
  name: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}): Promise<PromptVersion> {
  const db = createServiceClient();
  const latest = await getPrompt(input.name);
  const nextVersion = (latest?.version ?? 0) + 1;
  const { data, error } = await db
    .from("prompts")
    .insert({
      name: input.name,
      version: nextVersion,
      content: input.content,
      metadata: input.metadata ?? {},
      created_by: input.createdBy ?? null,
    })
    .select("name,version,content,metadata")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save prompt.");
  return {
    name: data.name,
    version: Number(data.version),
    content: data.content,
    metadata: (data.metadata as Record<string, unknown> | null) ?? {},
  };
}
