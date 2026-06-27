"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client for client components (e.g. "Continue with Google"
// OAuth). Reads the public env vars; becomes fully functional once a real Supabase
// project is configured. In demo mode the auth UI bypasses this entirely.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}
