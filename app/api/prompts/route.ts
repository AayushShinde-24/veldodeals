import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { getUserIdFromRequest, readJson } from "@/lib/security/request";
import { getPrompt, savePromptVersion } from "@/lib/prompts/store";

const saveSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await getUserIdFromRequest(request);
    const name = request.nextUrl.searchParams.get("name");
    if (!name) return fail("name is required.", 400);
    const versionParam = request.nextUrl.searchParams.get("version");
    const version = versionParam ? Number(versionParam) : undefined;
    return ok(await getPrompt(name, version));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const input = saveSchema.parse(await readJson<unknown>(request));
    return ok(await savePromptVersion({ ...input, createdBy: userId }), 201);
  } catch (error) {
    return fail(error);
  }
}
