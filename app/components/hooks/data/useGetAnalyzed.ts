"use client";

import { useQuery } from "@tanstack/react-query";
import { getAnalyzedData } from "@/lib/api/data/get-analyzed";
import { useTokenStore } from "@/app/components/stores/auth/useTokenStore";

export function useGetAnalyzed() {
  const isAuthenticated = useTokenStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ["data-analyzed"],
    queryFn: () => getAnalyzedData(),
    enabled: isAuthenticated,
  });
}
