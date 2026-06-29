import { z } from "zod";

const optionalUrl = z.preprocess((value) => typeof value === "string" && !value.trim() ? undefined : value, z.string().url().optional());
const optionalString = z.preprocess((value) => typeof value === "string" && !value.trim() ? undefined : value, z.string().optional());
const defaultAppUrl = z.preprocess((value) => typeof value === "string" && !value.trim() ? undefined : value, z.string().default("http://localhost:3000"));

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL_ADVANCED: z.string().optional(),
  ANTHROPIC_MODEL_PREMIUM: z.string().optional(),
  APOLLO_API_KEY: z.string().optional(),
  CLAY_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  TABLY_API_KEY: z.string().optional(),
  ZEROBOUNCE_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ENRICH_API_KEY: z.string().optional(),
  ENRICH_KEY: z.string().optional(),
  APIFY_KEY: z.string().optional(),
  APIFY_API_KEY: z.string().optional(),
  SERPAPI_KEY: z.string().optional(),
  ME5_API_KEY: z.string().optional(),
  GMAIL_API_KEY: z.string().optional(),
  GOOGLE_CALENDAR_API_KEY: z.string().optional(),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REDIRECT_URI: optionalString,
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: optionalString,
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  VELDO_SEND_ALLOWLIST: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  VELDO_DEFAULT_FROM_EMAIL: z.string().email().optional(),
  VELDO_ALLOW_UNAUTH_USER_ID: z.string().optional(),
  VELDO_VOICE_PROVIDER_API_KEY: z.string().optional(),
  VELDO_DNC_PROVIDER_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_GO: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_PLUS: z.string().optional(),
  STRIPE_PRICE_GROW: z.string().optional(),
  STRIPE_PRICE_EXPAND: z.string().optional(),
  STRIPE_PRICE_ADVANCED_EXPANSION: z.string().optional(),
  APP_URL: optionalString,
  VELDO_APP_URL: defaultAppUrl,
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const source = normalizeEnv(process.env);
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid Veldo environment configuration: ${missing}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getOptionalEnv(): Env | null {
  try {
    return getEnv();
  } catch {
    return null;
  }
}

export function getSupabaseProjectUrl(): string {
  const url = getEnv().NEXT_PUBLIC_SUPABASE_URL.trim();
  return url.replace(/\/rest\/v1\/?$/u, "");
}

export function getGoogleRedirectUri(): string {
  const env = getEnv();
  return env.GMAIL_REDIRECT_URI ?? env.GOOGLE_REDIRECT_URI ?? `${env.VELDO_APP_URL.replace(/\/$/u, "")}/api/auth/google/callback`;
}

export function hasSecret(name: keyof Env): boolean {
  const value = getOptionalEnv()?.[name];
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeEnv(env: NodeJS.ProcessEnv) {
  const supabaseAnon =
    nonEmpty(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    nonEmpty(env.SUPABASE_ANON_KEY) ??
    nonEmpty(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    nonEmpty(env.SUPABASE_PUBLISHABLE_KEY);
  const serviceRole = nonEmpty(env.SUPABASE_SERVICE_ROLE_KEY) ?? nonEmpty(env.SUPABASE_SECRET_KEY);
  const googleCalendar = nonEmpty(env.GOOGLE_CALENDAR_API_KEY) ?? nonEmpty(env.GOGGLE_CALENDAR_API_KEY);
  const googleClientId = nonEmpty(env.GMAIL_CLIENT_ID) ?? nonEmpty(env.GOOGLE_CLIENT_ID) ?? nonEmpty(env.GOGGLE_CLIENT_ID);
  const googleClientSecret = nonEmpty(env.GMAIL_CLIENT_SECRET) ?? nonEmpty(env.GOOGLE_CLIENT_SECRET) ?? nonEmpty(env.GOGGLE_CLIENT_SECRET);
  const googleRedirectUri = nonEmpty(env.GMAIL_REDIRECT_URI) ?? nonEmpty(env.GOOGLE_REDIRECT_URI);
  const appUrl = nonEmpty(env.APP_URL) ?? nonEmpty(env.VELDO_APP_URL);

  return {
    ...env,
    NEXT_PUBLIC_SUPABASE_URL: nonEmpty(env.NEXT_PUBLIC_SUPABASE_URL) ?? nonEmpty(env.SUPABASE_URL),
    SUPABASE_URL: nonEmpty(env.SUPABASE_URL) ?? nonEmpty(env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ?? supabaseAnon,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseAnon,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole,
    SUPABASE_SECRET_KEY: serviceRole,
    SUPABASE_JWT_SECRET: nonEmpty(env.SUPABASE_JWT_SECRET) ?? nonEmpty(env.SUPABASE_JWT_KEY),
    OPENAI_MODEL: nonEmpty(env.OPENAI_MODEL) ?? "gpt-5.4",
    ANTHROPIC_API_KEY: nonEmpty(env.ANTHROPIC_API_KEY) ?? nonEmpty(env.ANTROPIC_API_KEY),
    ANTHROPIC_MODEL_ADVANCED: nonEmpty(env.ANTHROPIC_MODEL_ADVANCED) ?? "claude-sonnet-4-6",
    ANTHROPIC_MODEL_PREMIUM: nonEmpty(env.ANTHROPIC_MODEL_PREMIUM) ?? "claude-opus-4-8",
    GOOGLE_CALENDAR_API_KEY: googleCalendar,
    GMAIL_CLIENT_ID: googleClientId,
    GMAIL_CLIENT_SECRET: googleClientSecret,
    GMAIL_REDIRECT_URI: googleRedirectUri,
    GOOGLE_CLIENT_ID: googleClientId,
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    GOOGLE_REDIRECT_URI: googleRedirectUri,
    ENRICH_KEY: nonEmpty(env.ENRICH_KEY) ?? nonEmpty(env.ENRICH_API_KEY),
    ENRICH_API_KEY: nonEmpty(env.ENRICH_API_KEY) ?? nonEmpty(env.ENRICH_KEY),
    APIFY_KEY: nonEmpty(env.APIFY_KEY) ?? nonEmpty(env.APIFY_API_KEY) ?? nonEmpty(env.AMIFY_API_KEY),
    APIFY_API_KEY: nonEmpty(env.APIFY_API_KEY) ?? nonEmpty(env.APIFY_KEY) ?? nonEmpty(env.AMIFY_API_KEY),
    SERPAPI_KEY: nonEmpty(env.SERPAPI_KEY) ?? nonEmpty(env.SERP_API_KEY),
    TAVILY_API_KEY: nonEmpty(env.TAVILY_API_KEY) ?? nonEmpty(env.TAILY_API_KEY),
    TABLY_API_KEY: nonEmpty(env.TABLY_API_KEY),
    VELDO_APP_URL: appUrl ?? "http://localhost:3000",
    APP_URL: appUrl,
  };
}

function nonEmpty(value: string | undefined) {
  return value && value.trim() ? value.trim() : undefined;
}
