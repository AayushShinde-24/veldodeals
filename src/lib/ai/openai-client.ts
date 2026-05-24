import "server-only";

import { getEnv } from "@/lib/security/env";

export async function callOpenAIJson<T>(input: {
  system: string;
  user: string;
  schemaName: string;
  fallback: T;
}): Promise<T> {
  const key = getEnv().OPENAI_API_KEY;
  const model = getEnv().OPENAI_MODEL ?? "gpt-5.3";
  if (!key) return input.fallback;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    }),
  });

  if (!response.ok) return input.fallback;
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return input.fallback;
  try {
    return JSON.parse(content) as T;
  } catch {
    return input.fallback;
  }
}
