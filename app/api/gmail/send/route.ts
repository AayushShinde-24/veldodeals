import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { sendGeneratedEmail } from "@/src/lib/mvp/sending";

const schema = z.object({
  generated_email_id: z.string().uuid(),
  confirmSend: z.literal(true),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before sending.");
    const input = schema.parse(await request.json());
    return ok(await sendGeneratedEmail({ userId: user.id, generatedEmailId: input.generated_email_id }));
  } catch (error) {
    return fail(error);
  }
}
