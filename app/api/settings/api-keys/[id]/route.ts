import { NextResponse } from "next/server";
import { deleteApiKeyForCurrentUser, updateApiKeyForCurrentUser } from "@/lib/developer/api-keys";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const updated = await updateApiKeyForCurrentUser(id, payload);
    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "API key could not be updated." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await deleteApiKeyForCurrentUser(id);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "API key could not be deleted." }, { status: 400 });
  }
}
