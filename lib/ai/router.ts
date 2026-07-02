import { fetchWithRetry, withRetry, isTransientError } from "@/lib/integrations/retry";

// ─────────────────────────────────────────────────────────
// Multi-provider model router. Routes generation to Anthropic or OpenAI with
// automatic failover, retries on transient errors, and tier→model mapping.
// Model IDs are env-overridable so they can be updated without code changes.
// ─────────────────────────────────────────────────────────

export type Provider = "anthropic" | "openai";
export type ModelTier = "fast" | "balanced" | "deep";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  system?: string;
  messages: ChatMessage[];
  tier?: ModelTier;
  maxTokens?: number;
  /** Force a provider order; otherwise derived from available keys. */
  preferredProvider?: Provider;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  provider: Provider;
  model: string;
}

const ANTHROPIC_MODELS: Record<ModelTier, string> = {
  fast: process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-4-5-20251001",
  balanced: process.env.ANTHROPIC_MODEL_BALANCED ?? "claude-sonnet-4-6",
  deep: process.env.ANTHROPIC_MODEL_DEEP ?? "claude-opus-4-8",
};

const OPENAI_MODELS: Record<ModelTier, string> = {
  fast: process.env.OPENAI_MODEL_FAST ?? "gpt-4o-mini",
  balanced: process.env.OPENAI_MODEL_BALANCED ?? "gpt-4o",
  deep: process.env.OPENAI_MODEL_DEEP ?? "gpt-4o",
};

export function hasProvider(provider: Provider): boolean {
  return provider === "anthropic" ? !!process.env.ANTHROPIC_API_KEY : !!process.env.OPENAI_API_KEY;
}

/**
 * Pure provider-ordering logic (unit-testable). Returns the providers to try, in order,
 * filtered to those with a configured key. Empty array means no provider is available.
 */
export function pickProviders(opts: {
  preferredProvider?: Provider;
  anthropicAvailable: boolean;
  openaiAvailable: boolean;
}): Provider[] {
  const order: Provider[] =
    opts.preferredProvider === "openai" ? ["openai", "anthropic"] : ["anthropic", "openai"];
  return order.filter((p) => (p === "anthropic" ? opts.anthropicAvailable : opts.openaiAvailable));
}

/** Generate text, trying each available provider in order until one succeeds. */
export async function generateText(options: GenerateOptions): Promise<GenerateResult> {
  const tier = options.tier ?? "balanced";
  const maxTokens = options.maxTokens ?? 1024;

  const providers = pickProviders({
    preferredProvider: options.preferredProvider,
    anthropicAvailable: hasProvider("anthropic"),
    openaiAvailable: hasProvider("openai"),
  });

  if (providers.length === 0) {
    throw new Error("No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await withRetry(
        () =>
          provider === "anthropic"
            ? callAnthropic(options, ANTHROPIC_MODELS[tier], maxTokens)
            : callOpenAI(options, OPENAI_MODELS[tier], maxTokens),
        { maxAttempts: 3, delayMs: 600, shouldRetry: (err) => isTransientError(err) }
      );
    } catch (err) {
      lastError = err;
      // Fall through to the next provider on failure.
    }
  }

  throw new Error(
    `All AI providers failed. Last error: ${lastError instanceof Error ? lastError.message : "unknown"}`
  );
}

async function callAnthropic(options: GenerateOptions, model: string, maxTokens: number): Promise<GenerateResult> {
  const res = await fetchWithRetry(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(options.system ? { system: options.system } : {}),
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        messages: options.messages,
      }),
    },
    { provider: "anthropic", endpoint: "messages", shouldRetry: isTransientError, timeoutMs: 30_000 }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Anthropic ${res.status}: ${err.error?.message ?? res.statusText}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text: string }> };
  const text = data.content?.filter((c) => c.type === "text").map((c) => c.text).join("") ?? "";
  return { text, provider: "anthropic", model };
}

async function callOpenAI(options: GenerateOptions, model: string, maxTokens: number): Promise<GenerateResult> {
  const messages = [
    ...(options.system ? [{ role: "system" as const, content: options.system }] : []),
    ...options.messages,
  ];

  const res = await fetchWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        messages,
      }),
    },
    { provider: "openai", endpoint: "chat.completions", shouldRetry: isTransientError, timeoutMs: 30_000 }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`OpenAI ${res.status}: ${err.error?.message ?? res.statusText}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text, provider: "openai", model };
}
