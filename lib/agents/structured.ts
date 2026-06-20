import { generateText, type ModelTier } from "@/lib/ai/router";

export interface StructuredOptions {
  system: string;
  prompt: string;
  tier?: ModelTier;
  maxTokens?: number;
  hyperPersonalization?: boolean;
}

export interface StructuredResult<T> {
  data: T;
  provider: string;
  model: string;
  raw: string;
}

/**
 * Ask a model for JSON and parse it robustly. Used by every specialist agent so they
 * return typed, validated structures instead of free text. Throws if no JSON can be
 * extracted, so callers can fail the task cleanly (and the queue can retry).
 */
export async function generateStructured<T>(options: StructuredOptions): Promise<StructuredResult<T>> {
  const result = await generateText({
    system: `${options.system}\n\nRespond with ONLY valid JSON. No prose, no markdown fences.`,
    messages: [{ role: "user", content: options.prompt }],
    tier: options.tier ?? "balanced",
    maxTokens: options.maxTokens ?? 1024,
    temperature: 0.4,
  });

  const data = parseJson<T>(result.text);
  if (data === null) {
    throw new Error("Agent returned unparseable output (expected JSON).");
  }
  return { data, provider: result.provider, model: result.model, raw: result.text };
}

/** Extract a JSON object/array from a model response, tolerating fences and stray prose. */
export function parseJson<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/giu, "").trim();

  // Fast path.
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fall through
  }

  // Find the first balanced {...} or [...] block.
  const start = cleaned.search(/[{[]/u);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < cleaned.length; i += 1) {
    if (cleaned[i] === open) depth += 1;
    else if (cleaned[i] === close) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Clamp a model-provided numeric score into a 0–100 integer. */
export function clampScore(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}
