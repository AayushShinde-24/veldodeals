import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mode";

export async function GET() {
  return NextResponse.json({
    isDemoMode: isDemoMode(),
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    disableDemo: process.env.VELDO_DISABLE_DEMO ?? null,
  });
}
