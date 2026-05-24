import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiKey } from "@/lib/api/api-key-auth";
import { createServiceClient } from "@/lib/integrations/supabase";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request, "campaigns:read");
  if (!auth.ok) return auth.response;

  const { data, error } = await createServiceClient()
    .from("campaigns")
    .select("id,name,goal,status,created_at")
    .eq("user_id", auth.context.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: { code: "campaigns_load_failed", message: "Veldo could not load campaigns." } }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}
