"use client";

import { useEffect } from "react";
import { initPostHog } from "@/lib/monitoring/posthog";
import { initSentryClient } from "@/lib/monitoring/sentry-client";

/** Initializes optional analytics/error monitoring when env keys are present. */
export function MonitoringProvider(): null {
  useEffect(() => {
    initSentryClient();
    initPostHog();
  }, []);

  return null;
}
