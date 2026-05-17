import { NextRequest, NextResponse } from "next/server";
import axios, { type AxiosRequestConfig } from "axios";
import { getSessionToken } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getServerApiBaseUrl, isDevBypassAuth } from "@/lib/env";
import { logServerError, sanitizeClientError } from "@/lib/auth/sanitize-error";

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const method = request.method.toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const rate = checkRateLimit(`proxy:${clientIp(request)}`, 120, 60_000);
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

  const token = await getSessionToken();
  if (!token && !isDevBypassAuth()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upstreamPath = pathSegments.join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${getServerApiBaseUrl()}/${upstreamPath}${search}`;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  try {
    let body: AxiosRequestConfig["data"];
    if (method !== "GET" && method !== "DELETE") {
      if (contentType?.includes("multipart/form-data")) {
        body = await request.arrayBuffer();
      } else {
        const text = await request.text();
        body = text.length > 0 ? text : undefined;
      }
    }

    const upstream = await axios.request({
      method,
      url: targetUrl,
      headers,
      data: body,
      validateStatus: () => true,
      timeout: 30_000,
      maxBodyLength: 25 * 1024 * 1024,
    });

    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers["content-type"];
    if (typeof upstreamContentType === "string") {
      responseHeaders.set("Content-Type", upstreamContentType);
    }

    return new NextResponse(
      typeof upstream.data === "string" ? upstream.data : JSON.stringify(upstream.data),
      { status: upstream.status, headers: responseHeaders }
    );
  } catch (err) {
    logServerError(`proxy/${upstreamPath}`, err);
    const { message, status } = sanitizeClientError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
