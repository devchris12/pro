/** PostHog — set NEXT_PUBLIC_POSTHOG_KEY and add posthog-js to enable. */
export function initPostHog(): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || typeof window === "undefined") return;
  if (process.env.NODE_ENV === "development") {
    console.info("[monitoring] PostHog key configured — add posthog-js to enable.");
  }
}
