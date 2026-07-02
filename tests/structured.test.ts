import { describe, it, expect } from "vitest";
import { parseJson, clampScore } from "@/lib/agents/structured";

describe("parseJson", () => {
  it("parses clean JSON", () => {
    expect(parseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(parseJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it("extracts a JSON object embedded in prose", () => {
    const text = 'Here is the result:\n{"score": 80, "reason": "good"}\nHope that helps!';
    expect(parseJson<{ score: number }>(text)).toEqual({ score: 80, reason: "good" });
  });

  it("handles nested braces correctly", () => {
    const text = '{"outer": {"inner": 1}, "x": 2}';
    expect(parseJson(text)).toEqual({ outer: { inner: 1 }, x: 2 });
  });

  it("parses arrays", () => {
    expect(parseJson("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("returns null when there is no JSON", () => {
    expect(parseJson("no json here")).toBeNull();
    expect(parseJson("")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseJson("{ this is not: valid }")).toBeNull();
  });
});

describe("clampScore", () => {
  it("clamps into 0-100 and rounds", () => {
    expect(clampScore(83.6)).toBe(84);
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(150)).toBe(100);
  });

  it("coerces numeric strings", () => {
    expect(clampScore("72")).toBe(72);
  });

  it("falls back for non-numeric input", () => {
    expect(clampScore("abc", 40)).toBe(40);
    expect(clampScore(undefined, 10)).toBe(10);
  });
});
