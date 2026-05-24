import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { sendGeneratedEmail } from "@/src/lib/mvp/sending";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before sending emails.");
    const { id } = await params;
    return ok(await sendGeneratedEmail({ userId: user.id, generatedEmailId: id }));
  } catch (error) {
    return fail(error);
  }
}
