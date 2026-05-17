"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";

/**
 * Reads the theme from Zustand and toggles the `dark` class on <html>.
 * Must be mounted inside QueryProvider (so the store is available).
 * Returns null — renders nothing itself.
 */
export function ThemeApplier(): null {
  const theme = useDashboardStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}
