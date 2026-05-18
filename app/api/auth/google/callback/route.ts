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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { error: "Authorization code is missing" },
      { status: 400 }
    );
  }

  const rate = checkRateLimit(`google-callback:${clientIp(request)}`, 30, 60_000);
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
    const upstream = await axios.get(
      `${getServerApiBaseUrl()}${AUTH_ENDPOINTS.GOOGLE_OAUTH_CALLBACK}`,
      { params: { code }, timeout: 15_000 }
    );

    return NextResponse.json(upstream.data, { status: upstream.status });
  } catch (err) {
    logServerError("auth/google/callback", err);
    const { message, status } = sanitizeClientError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
