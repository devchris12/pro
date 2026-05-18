import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  getPreviewProtectionSecret,
  isDevBypassAuth,
  isPreviewDeployment,
} from "@/lib/env";

const DASHBOARD_PREFIX = "/dashboard";

function hasValidPreviewAccess(request: NextRequest): boolean {
  const secret = getPreviewProtectionSecret();
  if (!secret) return false;

  const headerSecret = request.headers.get("x-preview-secret");
  if (headerSecret === secret) return true;

  const cookieSecret = request.cookies.get("preview_secret")?.value;
  return cookieSecret === secret;
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // Protect Vercel preview deployments from public indexing/scraping
  if (isPreviewDeployment() && getPreviewProtectionSecret()) {
    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    if (!hasValidPreviewAccess(request)) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("preview", "required");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (!pathname.startsWith(DASHBOARD_PREFIX)) {
    return NextResponse.next();
  }

  if (isDevBypassAuth()) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!session) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)",
  ],
};
