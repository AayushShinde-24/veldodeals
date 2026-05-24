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
]);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicPage = publicPageRoutes.has(pathname);
  const hasAuthCookie = request.cookies.getAll().some((cookie) => {
    const name = cookie.name.toLowerCase();
    return name === "supabase-auth-token" || (name.startsWith("sb-") && name.includes("auth-token"));
  });

  if (!isApiRoute && !isPublicPage && pathname !== "/" && !hasAuthCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isApiRoute && hasAuthCookie && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|settings/api-keys|api/settings/api-keys|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
