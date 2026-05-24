import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getUserIdFromRequest } from "@/lib/security/request";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const db = createServiceClient();
    const [user, ledger] = await Promise.all([
      db.from("users").select("credits_balance,plan").eq("id", userId).single(),
      db.from("credits_ledger").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);
    if (user.error) throw new Error(user.error.message);
    return ok({ ...user.data, ledger: ledger.data ?? [] });
  } catch (error) {
    return fail(error);
  }
}
