/** Sentry — enable by setting NEXT_PUBLIC_SENTRY_DSN and configuring @sentry/nextjs. */
export function initSentryClient(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.info("[monitoring] Sentry DSN configured — add @sentry/nextjs to enable.");
  }
}
