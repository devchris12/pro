"use client";

import { useQuery } from "@tanstack/react-query";
import { getRawData } from "@/lib/api/data/get-data";
import { useTokenStore } from "@/app/components/stores/auth/useTokenStore";

export function useGetData() {
  const isAuthenticated = useTokenStore((state) => state.isAuthenticated);

  return useQuery<unknown, Error>({
    queryKey: ["data-raw"],
    queryFn: () => getRawData(),
    enabled: isAuthenticated,
  });
}
