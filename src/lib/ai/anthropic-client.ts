import "server-only";

import { getEnv } from "@/lib/security/env";

export async function callAnthropicText(input: { system: string; user: string; fallback: string }) {
  const key = getEnv().ANTHROPIC_API_KEY;
  if (!key) return input.fallback;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      system: input.system,
      messages: [{ role: "user", content: input.user }],
    }),
  });

  if (!response.ok) return input.fallback;
  const json = await response.json() as { content?: Array<{ type: string; text?: string }> };
  return json.content?.find((part) => part.type === "text")?.text ?? input.fallback;
}
