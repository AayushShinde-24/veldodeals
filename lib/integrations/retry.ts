export interface RetryOptions {
  maxAttempts?: number;
  attempts?: number;
  delayMs?: number;
  baseDelayMs?: number;
  backoffFactor?: number;
  jitterRatio?: number;
  timeoutMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  provider?: string;
  endpoint?: string;
  userId?: string;
  [key: string]: unknown;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = options.attempts ?? 3,
    delayMs = options.baseDelayMs ?? 500,
    backoffFactor = 2,
    jitterRatio = 0.25,
    timeoutMs,
    shouldRetry = isTransientError,
  } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withOptionalTimeout(fn(), timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !shouldRetry(err, attempt)) break;
      await sleep(delayWithJitter(delayMs * Math.pow(backoffFactor, attempt - 1), jitterRatio));
    }
  }

  throw lastError;
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const timeoutMs = options.timeoutMs;
    const controller = timeoutMs ? new AbortController() : null;
    const timeout = controller
      ? setTimeout(() => controller.abort(new Error("Request timed out.")), timeoutMs)
      : null;

    try {
      const res = await fetch(input, { ...init, signal: init.signal ?? controller?.signal });
      if (!res.ok && isRetryableStatus(res.status)) {
        throw new HttpStatusError(res.status, res.statusText);
      }
      return res;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }, options);
}

export class HttpStatusError extends Error {
  constructor(public readonly status: number, statusText: string) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "HttpStatusError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withOptionalTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) return promise;
  let timeout: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Operation timed out.")), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

function delayWithJitter(delayMs: number, jitterRatio: number): number {
  if (jitterRatio <= 0) return delayMs;
  const jitter = delayMs * jitterRatio;
  return Math.max(0, Math.round(delayMs - jitter + Math.random() * jitter * 2));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export function isRateLimitError(err: unknown): boolean {
  if (err instanceof HttpStatusError) return err.status === 429;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests");
  }
  return false;
}

export function isTransientError(err: unknown): boolean {
  if (err instanceof HttpStatusError) return isRetryableStatus(err.status);
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("408") ||
      msg.includes("409") ||
      msg.includes("425") ||
      msg.includes("503") ||
      msg.includes("502") ||
      msg.includes("500") ||
      msg.includes("504") ||
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("timeout") ||
      isRateLimitError(err)
    );
  }
  return false;
}
