export function getOptionalEnv(): NodeJS.ProcessEnv;
export function getOptionalEnv(key: string): string | undefined;
export function getOptionalEnv(key?: string): string | undefined | NodeJS.ProcessEnv {
  if (key === undefined) return process.env;
  return process.env[key] || undefined;
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function getEnv(): NodeJS.ProcessEnv;
export function getEnv(key: string): string;
export function getEnv(key?: string): string | NodeJS.ProcessEnv {
  if (key === undefined) return process.env;
  return requireEnv(key);
}

export function hasSecret(key: string): boolean {
  return !!(process.env[key] ?? "").trim();
}

/** Vars without which the app cannot function at all. */
const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

/** Vars the app runs without, but with degraded/disabled features. */
const RECOMMENDED_ENV = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "STRIPE_SECRET_KEY",
  "APOLLO_API_KEY",
  "TAVILY_API_KEY",
  "ZEROBOUNCE_API_KEY",
  "RESEND_API_KEY",
] as const;

/**
 * Boot-time validation. Throws (fails loud) when a hard-required var is missing,
 * and warns for recommended ones so degraded features are visible in logs.
 */
export function validateEnv(): { ok: boolean; missingRequired: string[]; missingRecommended: string[] } {
  const missingRequired = REQUIRED_ENV.filter((k) => !hasSecret(k));
  const missingRecommended = RECOMMENDED_ENV.filter((k) => !hasSecret(k));

  if (missingRecommended.length) {
    console.warn(
      `[veldo:env] Missing recommended env vars (related features disabled): ${missingRecommended.join(", ")}`
    );
  }
  if (missingRequired.length) {
    const message = `[veldo:env] FATAL — missing required env vars: ${missingRequired.join(", ")}. Add them to .env.local.`;
    console.error(message);
    throw new Error(message);
  }
  return { ok: true, missingRequired, missingRecommended };
}
