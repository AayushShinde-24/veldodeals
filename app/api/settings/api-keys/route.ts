import { NextResponse } from "next/server";
import { createApiKeyForCurrentUser, listApiKeysForCurrentUser } from "@/lib/developer/api-keys";

export async function GET() {
  try {
    const keys = await listApiKeysForCurrentUser();
    return NextResponse.json({ ok: true, data: keys });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "API keys could not be loaded." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const created = await createApiKeyForCurrentUser(payload);
    return NextResponse.json({ ok: true, data: created });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "API key could not be created." }, { status: 400 });
  }
}
