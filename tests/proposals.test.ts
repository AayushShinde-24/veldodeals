import { describe, it, expect, afterEach } from "vitest";
import { esignProviderName } from "@/lib/deals/proposals";

afterEach(() => {
  delete process.env.ESIGN_PROVIDER_API_KEY;
  delete process.env.ESIGN_PROVIDER;
});

describe("e-sign provider selection", () => {
  it("falls back to mock without an API key", () => {
    expect(esignProviderName()).toBe("mock");
  });

  it("uses the configured provider when a key is present", () => {
    process.env.ESIGN_PROVIDER_API_KEY = "test";
    expect(esignProviderName()).toBe("docusign"); // default
    process.env.ESIGN_PROVIDER = "pandadoc";
    expect(esignProviderName()).toBe("pandadoc");
  });
});
