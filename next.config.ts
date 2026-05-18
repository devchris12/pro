import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  isProd
    ? "script-src 'self' 'unsafe-inline' https://us.i.posthog.com https://us-assets.i.posthog.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  [
    "connect-src 'self'",
    "https://mag-byte-api.vercel.app",
    "https://accounts.google.com",
    "https://*.ingest.sentry.io",
    "https://us.i.posthog.com",
    "https://us.posthog.com",
  ].join(" "),
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Content-Security-Policy", value: cspDirectives },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL ?? "" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
