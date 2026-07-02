import { describe, it, expect } from "vitest";
import { buildUnsubscribeLink, appendComplianceFooter } from "@/src/lib/mvp/unsubscribe";

describe("unsubscribe link", () => {
  it("builds a tokenized link from email + userId (positional form)", () => {
    const link = buildUnsubscribeLink("lead@acme.com", "user-123");
    expect(link).toContain("/unsubscribe?t=");
    // token is base64url of "user-123:lead@acme.com"
    const token = link.split("t=")[1];
    expect(Buffer.from(token, "base64url").toString()).toBe("user-123:lead@acme.com");
  });

  it("supports the object form", () => {
    const link = buildUnsubscribeLink({ email: "a@b.com", userId: "u1" });
    expect(link).toContain("/unsubscribe?t=");
  });
});

describe("compliance footer", () => {
  it("appends an unsubscribe footer to plain html", () => {
    const out = appendComplianceFooter("<p>Hi</p>", "lead@acme.com", "user-1");
    expect(out).toContain("Unsubscribe");
    expect(out).toContain("/unsubscribe?t=");
    expect(out.startsWith("<p>Hi</p>")).toBe(true);
  });

  it("injects before </body> when present", () => {
    const out = appendComplianceFooter("<body><p>Hi</p></body>", "lead@acme.com", "user-1");
    expect(out).toContain("</body>");
    expect(out.indexOf("Unsubscribe")).toBeLessThan(out.indexOf("</body>"));
  });
});
