import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { getListData } from "@/lib/ui/data";

// Lightweight campaign list (id + name) for client selectors.
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in first.");
    const campaigns = await getListData(user.id, "campaigns");
    return ok(campaigns.map((c) => ({ id: c.id, name: c.name })));
  } catch (error) {
    return fail(error);
  }
}
