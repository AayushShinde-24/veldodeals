import { describe, it, expect } from "vitest";
import { pickProviders } from "@/lib/ai/router";

describe("model router provider selection", () => {
  it("prefers Anthropic by default when both are available", () => {
    expect(pickProviders({ anthropicAvailable: true, openaiAvailable: true })).toEqual([
      "anthropic",
      "openai",
    ]);
  });

  it("honors a preferred provider", () => {
    expect(
      pickProviders({ preferredProvider: "openai", anthropicAvailable: true, openaiAvailable: true })
    ).toEqual(["openai", "anthropic"]);
  });

  it("filters out providers without a key (enables fallback)", () => {
    expect(pickProviders({ anthropicAvailable: true, openaiAvailable: false })).toEqual(["anthropic"]);
    expect(pickProviders({ anthropicAvailable: false, openaiAvailable: true })).toEqual(["openai"]);
  });

  it("returns empty when nothing is configured", () => {
    expect(pickProviders({ anthropicAvailable: false, openaiAvailable: false })).toEqual([]);
  });

  it("still returns the available provider even if the unavailable one is preferred", () => {
    expect(
      pickProviders({ preferredProvider: "openai", anthropicAvailable: true, openaiAvailable: false })
    ).toEqual(["anthropic"]);
  });
});
