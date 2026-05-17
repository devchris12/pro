"use client";

import { useGetProfile } from "@/app/components/hooks/user/useGetProfile";
import { useMounted } from "./useMounted";

/** Avoids hydration mismatch: profile fetch only runs after mount. */
export function useDashboardPageReady(): { ready: boolean; firstName: string } {
  const mounted = useMounted();
  const { data: user, isLoading } = useGetProfile();

  return {
    ready: mounted && !isLoading,
    firstName: user?.first_name ?? "there",
  };
}
