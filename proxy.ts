import { NextResponse, type NextRequest } from "next/server";

const publicPageRoutes = new Set([
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/acceptable-use",
  "/data-deletion",
  "/unsubscribe",
  "/unsubscribe/confirmed",
  "/pricing",
]);

/** Prefix-matched public routes (any path starting with these segments) */
const publicPrefixes = ["/invite/"];

export async function proxy(request: NextRequest) {
  // Demo mode (no Supabase configured, or explicitly forced): app is fully browsable.
  if (process.env.VELDO_FORCE_DEMO === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next({ request });
  }

  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicPage =
    publicPageRoutes.has(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix));
  const hasAuthCookie = request.cookies.getAll().some((cookie) => {
    const name = cookie.name.toLowerCase();
    return name === "supabase-auth-token" || (name.startsWith("sb-") && name.includes("auth-token"));
  });

  if (!isApiRoute && !isPublicPage && pathname !== "/" && !hasAuthCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
