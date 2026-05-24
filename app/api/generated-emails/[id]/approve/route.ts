import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { approveGeneratedEmail } from "@/src/lib/mvp/sending";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before approving emails.");
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await request.json().catch(() => ({})) as { subject?: string; body?: string }
      : null;
    const form = body ? null : await request.formData();
    return ok(await approveGeneratedEmail({
      userId: user.id,
      generatedEmailId: id,
      subject: body?.subject ?? String(form?.get("subject") ?? ""),
      body: body?.body ?? String(form?.get("body") ?? ""),
    }));
  } catch (error) {
    return fail(error);
  }
}
