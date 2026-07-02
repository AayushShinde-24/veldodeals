import { createServiceClient } from "@/lib/integrations/supabase";

export interface SegmentFilters {
  industry?: string;
  title?: string;
  size?: string;
  stage?: string;
}

export async function createSegment(input: {
  userId: string;
  workspaceId?: string | null;
  name: string;
  filters: SegmentFilters;
}): Promise<{ id: string }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("segments")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      name: input.name,
      filters: input.filters,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create segment.");
  return { id: data.id };
}

export async function getSegmentLeads(input: {
  userId: string;
  segmentId?: string;
  filters?: SegmentFilters;
  limit?: number;
}): Promise<unknown[]> {
  const db = createServiceClient();
  let filters = input.filters;
  if (!filters && input.segmentId) {
    const { data } = await db
      .from("segments")
      .select("filters")
      .eq("id", input.segmentId)
      .eq("user_id", input.userId)
      .maybeSingle();
    filters = (data?.filters as SegmentFilters | null) ?? {};
  }

  let query = db.from("leads").select("*").eq("user_id", input.userId).limit(input.limit ?? 100);
  if (filters?.stage) query = query.eq("stage", filters.stage);
  if (filters?.title) query = query.ilike("title", `%${filters.title}%`);
  if (filters?.industry) query = query.ilike("company", `%${filters.industry}%`);
  if (filters?.size) query = query.ilike("company", `%${filters.size}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
