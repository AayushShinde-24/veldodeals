import { createServiceClient } from "@/lib/integrations/supabase";

export interface Variant {
  id: string;
  name: string;
  weight: number;
  payload: unknown;
}

export async function pickVariant(campaignId: string): Promise<Variant | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("ab_variants")
    .select("id,name,weight,payload")
    .eq("campaign_id", campaignId);
  if (error) throw new Error(error.message);
  const variants = (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    weight: Number(row.weight ?? 1),
    payload: row.payload,
  }));
  if (variants.length === 0) return null;

  const total = variants.reduce((sum, v) => sum + Math.max(0, v.weight), 0);
  let roll = Math.random() * (total || variants.length);
  for (const variant of variants) {
    roll -= Math.max(0, variant.weight || 1);
    if (roll <= 0) return variant;
  }
  return variants[variants.length - 1] ?? null;
}

export async function trackVariantSend(variantId: string): Promise<void> {
  const db = createServiceClient();
  const { data } = await db.from("ab_variants").select("sends_count").eq("id", variantId).maybeSingle();
  await db
    .from("ab_variants")
    .update({ sends_count: Number(data?.sends_count ?? 0) + 1 })
    .eq("id", variantId);
}
