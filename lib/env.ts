/**
 * Server-only API base URL. Never import this from client components.
 */
export function getServerApiBaseUrl(): string {
  return (
    process.env.API_BASE_URL?.replace(/\/$/, "") ??
    "https://mag-byte-api.vercel.app/api"
  );
}

export function getServerMicroBaseUrl(): string {
  return (
    process.env.MICRO_BASE_URL?.replace(/\/$/, "") ??
    "https://magbyte-micro.vercel.app"
  );
}

export function isDevBypassAuth(): boolean {
  return process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
}

export function isPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

export function getPreviewProtectionSecret(): string | undefined {
  return process.env.PREVIEW_PROTECTION_SECRET;
}
