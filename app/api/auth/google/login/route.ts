import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getServerApiBaseUrl } from "@/lib/env";
import { AUTH_ENDPOINTS } from "@/lib/api/auth/auth-urls";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { logServerError, sanitizeClientError } from "@/lib/auth/sanitize-error";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function appOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return request.nextUrl.origin;
}

/** Rewrite Google redirect_uri so OAuth returns to this deployment, not a fixed Vercel URL. */
function rewriteRedirectUrl(redirectUrl: string, origin: string): string {
  try {
    const url = new URL(redirectUrl);
    if (url.searchParams.has("redirect_uri")) {
      url.searchParams.set("redirect_uri", `${origin}/oauth-callback`);
      return url.toString();
    }
  } catch {
    /* keep upstream URL */
  }
  return redirectUrl;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rate = checkRateLimit(`google-login:${clientIp(request)}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: rate.retryAfterSec
          ? { "Retry-After": String(rate.retryAfterSec) }
          : undefined,
      }
    );
  }

  try {
    const upstream = await axios.get<{ redirect_url?: string }>(
      `${getServerApiBaseUrl()}${AUTH_ENDPOINTS.GOOGLE_LOGIN}`,
      { timeout: 15_000 }
    );

    const redirectUrl = upstream.data.redirect_url;
    if (!redirectUrl) {
      return NextResponse.json(
        { error: "Missing redirect_url in response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      redirect_url: rewriteRedirectUrl(redirectUrl, appOrigin(request)),
    });
  } catch (err) {
    logServerError("auth/google/login", err);
    const { message, status } = sanitizeClientError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
