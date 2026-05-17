"use client";
import { checkSession } from "@/lib/api/establish-session";
import { validateAuth } from "@/lib/api/auth/validate";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useTokenStore } from "../../stores/auth/useTokenStore";

const REVALIDATION_INTERVAL_MS = 10 * 60 * 1000;

interface AuthGuardState {
  sessionExpired: boolean;
  isChecking: boolean;
}

export function useAuthGuard(redirectTo?: string): AuthGuardState {
  const router = useRouter();
  const { isAuthenticated, setAuthenticated, logout } = useTokenStore();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
      setAuthenticated(true);
      setIsChecking(false);
      if (redirectTo && isAuthenticated) router.replace(redirectTo);
      return;
    }

    const handleInvalid = (): void => {
      void logout();
      setSessionExpired(true);
      setTimeout(() => router.replace("/"), 2500);
    };

    const validateSession = async (): Promise<void> => {
      if (typeof window === "undefined") return;

      setIsChecking(true);
      const hasSession = await checkSession();
      if (!hasSession) {
        setAuthenticated(false);
        setIsChecking(false);
        if (!redirectTo) router.replace("/");
        return;
      }

      setAuthenticated(true);

      try {
        await validateAuth();
        setIsChecking(false);
        if (redirectTo) router.replace(redirectTo);
      } catch {
        setIsChecking(false);
        handleInvalid();
      }
    };

    void validateSession();

    if (!redirectTo) {
      intervalRef.current = setInterval(async () => {
        try {
          await validateAuth();
        } catch {
          handleInvalid();
        }
      }, REVALIDATION_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sessionExpired, isChecking };
}
