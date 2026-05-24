import { existsSync, readFileSync } from "node:fs";

loadDotenvLocal();

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "TOKEN_ENCRYPTION_KEY",
  "VELDO_APP_URL",
];

const missing = required.filter((key) => !process.env[key]?.trim());
const failures = [];

if (missing.length) failures.push(`Missing required environment variables: ${missing.join(", ")}`);
if (process.env.NODE_ENV === "production" && process.env.VELDO_ALLOW_UNAUTH_USER_ID === "true") {
  failures.push("VELDO_ALLOW_UNAUTH_USER_ID must not be true in production.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
if (supabaseUrl.includes("/rest/v1")) failures.push("Supabase URL must be the project URL, not the /rest/v1 endpoint.");

if ((process.env.TOKEN_ENCRYPTION_KEY ?? "").trim().length < 32) {
  failures.push("TOKEN_ENCRYPTION_KEY must be at least 32 characters.");
}

if (process.env.NODE_ENV === "production" && !process.env.VELDO_SEND_ALLOWLIST?.trim()) {
  failures.push("VELDO_SEND_ALLOWLIST must be set for first-release production sending.");
}

if (failures.length) {
  console.error(`Veldo launch preflight failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Veldo launch preflight passed.");

function loadDotenvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    process.env[key.trim()] ??= rest.join("=").trim().replace(/^["']|["']$/gu, "");
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= process.env.SUPABASE_SECRET_KEY;
  process.env.ANTHROPIC_API_KEY ??= process.env.ANTROPIC_API_KEY;
  process.env.TOKEN_ENCRYPTION_KEY ??= process.env.SUPABASE_JWT_KEY;
  process.env.VELDO_APP_URL ??= process.env.APP_URL;
}
