import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { placeCall } from "@/lib/voice/calling";

const schema = z.object({ callTaskId: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before placing calls.");
    const { callTaskId } = schema.parse(await request.json());
    return ok(await placeCall(user.id, callTaskId));
  } catch (error) {
    return fail(error);
  }
}
