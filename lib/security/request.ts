import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";

const userIdSchema = z.string().uuid();

export async function readJson<T>(request: NextRequest): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const record: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      record[key] = typeof value === "string" && looksLikeJson(value) ? JSON.parse(value) : value;
    }
    return record as T;
  }

  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

function looksLikeJson(value: string) {
  const trimmed = value.trim();
  return (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}

export async function getUserIdFromRequest(request: NextRequest, body?: unknown): Promise<string> {
  const user = await getCurrentUser();
  if (user?.id) return user.id;

  if (process.env.VELDO_ALLOW_UNAUTH_USER_ID !== "true") {
    throw new Error("Sign in before using this Veldo endpoint.");
  }

  const headerUserId = request.headers.get("x-user-id") ?? request.headers.get("x-veldo-user-id");
  const bodyUserId =
    body && typeof body === "object" && "user_id" in body
      ? (body as { user_id?: unknown }).user_id
      : undefined;

  const candidate = typeof bodyUserId === "string" ? bodyUserId : headerUserId;
  const parsed = userIdSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new Error("A valid user_id is required. Send it in the JSON body or x-user-id header.");
  }

  return parsed.data;
}
