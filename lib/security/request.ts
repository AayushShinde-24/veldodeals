import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function getUserIdFromRequest(
  _request: NextRequest,
  _body?: Record<string, unknown>
): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated. Sign in before making this request.");
  return user.id;
}

export async function readJson<T = unknown>(request: NextRequest): Promise<T> {
  const text = await request.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON body.");
  }
}
