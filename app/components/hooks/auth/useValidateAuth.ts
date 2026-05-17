"use client";

import { useQuery } from "@tanstack/react-query";
import { validateAuth } from "@/lib/api/auth/validate";
import { useTokenStore } from "@/app/components/stores/auth/useTokenStore";

export function useValidateAuth() {
  const isAuthenticated = useTokenStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ["auth-validate"],
    queryFn: () => validateAuth(),
    enabled: isAuthenticated,
  });
}
