import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getEnv, hasSecret } from "@/lib/security/env";
import { withRetry } from "@/lib/integrations/retry";

export type ModelRoute = "openai_control" | "claude_premium";

type GenerateJsonOptions<TSchema extends z.ZodType> = {
  route: ModelRoute;
  schema: TSchema;
  systemPrompt: string;
  userPrompt: string;
  context?: {
    userId?: string;
    campaignId?: string;
    leadId?: string;
    taskId?: string;
  };
};

export async function loadAgentPrompt(fileName: string) {
  return readFile(path.join(process.cwd(), "lib", "agents", "prompts", fileName), "utf8");
}

export async function generateValidatedJson<TSchema extends z.ZodType>(
  options: GenerateJsonOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const raw = await generateRawJson(options);
  const parsed = parseJsonObject(raw);
  const first = options.schema.safeParse(parsed);
  if (first.success) return first.data;

  const repaired = await repairJson({
    ...options,
    invalidJson: raw,
    validationError: first.error.message,
  });
  const repairedParsed = parseJsonObject(repaired);
  return options.schema.parse(repairedParsed);
}

async function generateRawJson<TSchema extends z.ZodType>(options: GenerateJsonOptions<TSchema>) {
  if (options.route === "claude_premium") {
    return callClaude(options);
  }

  return callOpenAi(options);
}

async function repairJson<TSchema extends z.ZodType>(
  options: GenerateJsonOptions<TSchema> & { invalidJson: string; validationError: string },
) {
  const repairPrompt = [
    "Repair this model output so it is valid JSON matching the target schema.",
    "Do not add unsupported facts. Return only JSON.",
    `Validation error: ${options.validationError}`,
    `Invalid output: ${options.invalidJson}`,
  ].join("\n\n");

  return generateRawJson({
    ...options,
    route: "openai_control",
    systemPrompt: "You repair invalid JSON for a strict Zod schema. Return only JSON.",
    userPrompt: repairPrompt,
  });
}

async function callOpenAi<TSchema extends z.ZodType>(options: GenerateJsonOptions<TSchema>) {
  const env = getEnv();
  if (!hasSecret("OPENAI_API_KEY")) {
    throw new Error("OPENAI_API_KEY is required for OpenAI-routed agent work.");
  }

  const response = await withRetry(
    async () => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL ?? "gpt-5.3",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: options.systemPrompt },
            { role: "user", content: options.userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI request failed with ${res.status}`);
      }

      return res.json() as Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    },
    {
      provider: "openai",
      endpoint: "/v1/chat/completions",
      ...options.context,
    },
  );

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty JSON response.");
  return content;
}

async function callClaude<TSchema extends z.ZodType>(options: GenerateJsonOptions<TSchema>) {
  const env = getEnv();
  if (!hasSecret("ANTHROPIC_API_KEY")) {
    throw new Error("ANTHROPIC_API_KEY is required for Claude-routed agent work.");
  }

  const response = await withRetry(
    async () => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1600,
          temperature: 0.35,
          system: options.systemPrompt,
          messages: [{ role: "user", content: options.userPrompt }],
        }),
      });

      if (!res.ok) {
        throw new Error(`Anthropic request failed with ${res.status}`);
      }

      return res.json() as Promise<{
        content?: Array<{ type: string; text?: string }>;
      }>;
    },
    {
      provider: "anthropic",
      endpoint: "/v1/messages",
      ...options.context,
    },
  );

  const text = response.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error("Anthropic returned an empty JSON response.");
  return text;
}

function parseJsonObject(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/u);
  return JSON.parse(fenced?.[1] ?? trimmed) as unknown;
}
