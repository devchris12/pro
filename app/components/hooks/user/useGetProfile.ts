"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "@/lib/api/user/get-profile";
import { useTokenStore } from "@/app/components/stores/auth/useTokenStore";

export function useGetProfile() {
  const isAuthenticated = useTokenStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ["user-profile"],
    queryFn: () => getUserProfile(),
    enabled: isAuthenticated,
  });
}
