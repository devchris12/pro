import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionToken,
  getSessionToken,
  setSessionToken,
  validateSessionToken,
} from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { logServerError, sanitizeClientError } from "@/lib/auth/sanitize-error";
import { isDevBypassAuth } from "@/lib/env";

function parseAccessToken(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const token = (body as { access_token?: unknown }).access_token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(): Promise<NextResponse> {
  if (isDevBypassAuth()) {
    return NextResponse.json({ authenticated: true });
  }

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const valid = await validateSessionToken(token);
  if (!valid) {
    await clearSessionToken();
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rate = checkRateLimit(`session-post:${clientIp(request)}`, 20, 60_000);
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
    const json: unknown = await request.json();
    const accessToken = parseAccessToken(json);
    if (!accessToken) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const valid = await validateSessionToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    await setSessionToken(accessToken);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logServerError("auth/session POST", err);
    const { message, status } = sanitizeClientError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(): Promise<NextResponse> {
  await clearSessionToken();
  return NextResponse.json({ ok: true });
}
