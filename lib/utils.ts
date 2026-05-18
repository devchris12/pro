import { twMerge } from "tailwind-merge";

/** Merges Tailwind classes safely, resolving conflicts. Use this instead of string concatenation. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return twMerge(classes.filter(Boolean) as string[]);
}

/** Formats a number as Nigerian Naira — ₦1.2M / ₦45K / ₦500 */
export function formatNaira(value: number): string {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${value.toLocaleString()}`;
}

/** Formats a decimal as a signed percentage string — +12.5% / -3.2% */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** Formats an ISO date string for table cells — "11 Mar 2026" */
export function fmtTableDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(String(dateStr));
  return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Returns time-of-day greeting based on current hour */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
