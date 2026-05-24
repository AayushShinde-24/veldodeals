import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiKey } from "@/lib/api/api-key-auth";
import { createServiceClient } from "@/lib/integrations/supabase";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request, "usage:read");
  if (!auth.ok) return auth.response;

  const db = createServiceClient();
  const [keys, usage] = await Promise.all([
    db.from("veldo_api_keys").select("id,status,request_count,last_used_at").eq("workspace_id", auth.context.workspaceId),
    db.from("veldo_api_key_usage_events").select("id,route,method,status_code,created_at").eq("workspace_id", auth.context.workspaceId).order("created_at", { ascending: false }).limit(50),
  ]);

  if (keys.error || usage.error) {
    return NextResponse.json({ ok: false, error: { code: "usage_load_failed", message: "Veldo could not load API usage." } }, { status: 500 });
  }

  const keyRows = keys.data ?? [];
  return NextResponse.json({
    ok: true,
    data: {
      total_keys: keyRows.length,
      active_keys: keyRows.filter((key) => key.status === "active").length,
      total_requests: keyRows.reduce((sum, key) => sum + Number(key.request_count ?? 0), 0),
      recent_events: usage.data ?? [],
    },
  });
}
