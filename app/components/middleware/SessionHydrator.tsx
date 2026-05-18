"use client";

import { useEffect } from "react";
import { checkSession } from "@/lib/api/establish-session";
import { useTokenStore } from "../stores/auth/useTokenStore";

/** Hydrates in-memory auth state from the httpOnly session cookie on app load. */
export default function SessionHydrator(): null {
  const setAuthenticated = useTokenStore((s) => s.setAuthenticated);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
      setAuthenticated(true);
      return;
    }
    void checkSession().then((ok) => setAuthenticated(ok));
  }, [setAuthenticated]);

  return null;
}
