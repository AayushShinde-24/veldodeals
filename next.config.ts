import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";

loadLocalEnvAliases();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;

function loadLocalEnvAliases() {
  for (const file of [".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      process.env[key.trim()] ??= rest.join("=").trim().replace(/^["']|["']$/gu, "");
    }
  }

  process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_ANON_KEY ??= process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY ??= process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_JWT_SECRET ??= process.env.SUPABASE_JWT_KEY;
  process.env.ANTHROPIC_API_KEY ??= process.env.ANTROPIC_API_KEY;
  process.env.GMAIL_CLIENT_ID ??= process.env.GOOGLE_CLIENT_ID ?? process.env.GOGGLE_CLIENT_ID;
  process.env.GMAIL_CLIENT_SECRET ??= process.env.GOOGLE_CLIENT_SECRET ?? process.env.GOGGLE_CLIENT_SECRET;
  process.env.GMAIL_REDIRECT_URI ??= process.env.GOOGLE_REDIRECT_URI;
  process.env.GOOGLE_CLIENT_ID ??= process.env.GMAIL_CLIENT_ID;
  process.env.GOOGLE_CLIENT_SECRET ??= process.env.GMAIL_CLIENT_SECRET;
  process.env.GOOGLE_REDIRECT_URI ??= process.env.GMAIL_REDIRECT_URI;
  process.env.GOOGLE_CALENDAR_API_KEY ??= process.env.GOGGLE_CALENDAR_API_KEY;
  process.env.ENRICH_KEY ??= process.env.ENRICH_API_KEY;
  process.env.ENRICH_API_KEY ??= process.env.ENRICH_KEY;
  process.env.APIFY_KEY ??= process.env.AMIFY_API_KEY;
  process.env.TAVILY_API_KEY ??= process.env.TAILY_API_KEY;
  process.env.VELDO_APP_URL ??= process.env.APP_URL;
  process.env.APP_URL ??= process.env.VELDO_APP_URL;
}
