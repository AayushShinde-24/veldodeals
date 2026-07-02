import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchWithRetry,
  HttpStatusError,
  isRateLimitError,
  isTransientError,
  withRetry,
} from "@/lib/integrations/retry";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withRetry", () => {
  it("returns immediately on success without retrying", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls += 1;
      return "ok";
    });
    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries transient failures then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("network timeout");
        return "recovered";
      },
      { delayMs: 1, jitterRatio: 0, maxAttempts: 5 }
    );
    expect(result).toBe("recovered");
    expect(calls).toBe(3);
  });

  it("gives up after maxAttempts and throws the last error", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("network still failing");
        },
        { delayMs: 1, jitterRatio: 0, maxAttempts: 2 }
      )
    ).rejects.toThrow("network still failing");
    expect(calls).toBe(2);
  });

  it("does not retry when shouldRetry returns false", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("fatal");
        },
        { delayMs: 1, jitterRatio: 0, maxAttempts: 5, shouldRetry: () => false }
      )
    ).rejects.toThrow("fatal");
    expect(calls).toBe(1);
  });

  it("times out a slow operation", async () => {
    await expect(
      withRetry(() => new Promise((resolve) => setTimeout(resolve, 25)), {
        maxAttempts: 1,
        timeoutMs: 1,
      })
    ).rejects.toThrow("timed out");
  });
});

describe("fetchWithRetry", () => {
  it("retries retryable HTTP statuses", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("busy", { status: 503, statusText: "busy" }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await fetchWithRetry("https://example.com", {}, { delayMs: 1, jitterRatio: 0 });

    expect(await res.text()).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not throw on non-retryable HTTP statuses", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("bad", { status: 400, statusText: "bad" }));

    const res = await fetchWithRetry("https://example.com", {}, { delayMs: 1, jitterRatio: 0 });

    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("error classification", () => {
  it("detects rate-limit errors", () => {
    expect(isRateLimitError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isRateLimitError(new Error("rate limit exceeded"))).toBe(true);
    expect(isRateLimitError(new HttpStatusError(429, "Too Many Requests"))).toBe(true);
    expect(isRateLimitError(new Error("bad request"))).toBe(false);
  });

  it("detects transient errors (incl. rate limits)", () => {
    expect(isTransientError(new Error("503 service unavailable"))).toBe(true);
    expect(isTransientError(new Error("network timeout"))).toBe(true);
    expect(isTransientError(new Error("429"))).toBe(true);
    expect(isTransientError(new HttpStatusError(500, "Internal Error"))).toBe(true);
    expect(isTransientError(new Error("validation failed"))).toBe(false);
  });
});
