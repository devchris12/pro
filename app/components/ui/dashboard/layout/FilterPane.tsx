"use client";

/**
 * FilterPane — a sliding right-side panel containing all filters for the
 * current page and tier.
 *
 * Structure:
 *   - Fixed-position pane (slides in/out from the right edge)
 *   - A tab/toggle button that hugs the left edge of the pane and stays
 *     visible on the screen edge when the pane is closed
 *   - Date Range section (Year / Month / Day of Week) from Zustand — global
 *   - Content filter sections (Product / Category / etc.) from FilterPaneContext
 *     — registered by whichever tier component is currently rendered
 *   - Disabled placeholder rows for tier-level filter groups not active on the
 *     current page (e.g. Cockpit / Forecast pages show all groups greyed out)
 *
 * The TopBar DateFilterBar is removed in favour of this pane.
 */

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import { useFilterPaneContext } from "@/app/contexts/FilterPaneContext";
import { useTierMetadata } from "@/app/hooks/useDashboardData";
import { useFilteredData } from "@/app/hooks/useFilteredData";
import { cn } from "@/lib/utils";
import type { DashboardTier } from "@/app/stores/dashboard/useDashboardStore";

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Monday-first day order; values are JS getDay() numbers (0 = Sun)
const DAYS: { label: string; value: number }[] = [
  { label: "Mon", value: 1 }, { label: "Tue", value: 2 },
  { label: "Wed", value: 3 }, { label: "Thu", value: 4 },
  { label: "Fri", value: 5 }, { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

/** Returns every calendar year between dataset start and end (inclusive). */
function getAvailableYears(start: string | null, end: string | null): number[] {
  if (!start || !end) return [];
  const s = new Date(start).getFullYear();
  const e = new Date(end).getFullYear();
  const years: number[] = [];
  for (let y = s; y <= e; y++) years.push(y);
  return years;
}

/** Formats a date as "Jan 2025" */
function fmtMonthYear(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/**
 * Derives the effective visible date range from the dataset bounds + active
 * year/month filters. Returns a display string and whether it is narrowed.
 */
function getEffectiveDateRange(
  start: string | null,
  end: string | null,
  filterYears: number[],
  filterMonths: number[]
): { label: string; isFiltered: boolean } {
  if (!start || !end) return { label: "", isFiltered: false };
  const dataStart = new Date(start);
  const dataEnd   = new Date(end);

  if (filterYears.length === 0 && filterMonths.length === 0) {
    return {
      label: `${fmtMonthYear(dataStart)} – ${fmtMonthYear(dataEnd)}`,
      isFiltered: false,
    };
  }

  // Build the full set of years/months to consider
  const allDataYears = Array.from(
    { length: dataEnd.getFullYear() - dataStart.getFullYear() + 1 },
    (_, i) => dataStart.getFullYear() + i
  );
  const years  = filterYears.length  > 0 ? filterYears  : allDataYears;
  const months = filterMonths.length > 0 ? filterMonths : Array.from({ length: 12 }, (_, i) => i);

  const minYear  = Math.min(...years);
  const maxYear  = Math.max(...years);
  const minMonth = Math.min(...months);
  const maxMonth = Math.max(...months);

  // Build candidate start/end, then clamp to dataset bounds
  const effStart = new Date(minYear, minMonth, 1);
  const effEnd   = new Date(maxYear, maxMonth + 1, 0); // last day of maxMonth
  const from = effStart < dataStart ? dataStart : effStart;
  const to   = effEnd   > dataEnd   ? dataEnd   : effEnd;

  return {
    label: `${fmtMonthYear(from)} – ${fmtMonthYear(to)}`,
    isFiltered: true,
  };
}

// ── Per-tier content filter group definitions ─────────────────────────────────
// Defines WHICH filter groups exist for each tier. Each group is shown in the
// pane regardless of page. If a page's component has registered that group
// (via useRegisterPageFilters), it shows as active. Otherwise it shows as
// disabled with "Not available on this page".

interface FilterGroupDef {
  id: string;
  label: string;
}

const TIER_FILTER_GROUPS: Record<DashboardTier, FilterGroupDef[]> = {
  basic: [
    { id: "product",  label: "Product" },
    { id: "category", label: "Category" },
    { id: "payment",  label: "Payment Method" },
  ],
  intermediate: [
    { id: "category",  label: "Category" },
    { id: "product",   label: "Product" },
    { id: "payment",   label: "Payment Method" },
    { id: "staff",     label: "Staff" },
    { id: "supplier",  label: "Supplier" },
    { id: "paidto",    label: "Paid To" },
  ],
  advanced: [
    { id: "category",  label: "Category" },
    { id: "product",   label: "Product" },
    { id: "payment",   label: "Payment Method" },
    { id: "staff",     label: "Staff" },
    { id: "supplier",  label: "Supplier" },
    { id: "type",      label: "Expense Type" },
    { id: "branch",    label: "Branch" },
  ],
};

// ── Collapsible section ───────────────────────────────────────────────────────

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** When true, collapses and shows "Not available on this page" */
  disabled?: boolean;
  /** Number of active selections, for the active badge */
  activeCount?: number;
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
  disabled = false,
  activeCount = 0,
}: FilterSectionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 dark:border-slate-800">
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors",
          disabled
            ? "cursor-default"
            : "hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              disabled
                ? "text-gray-300 dark:text-slate-600"
                : "text-gray-500 dark:text-slate-400"
            )}
          >
            {title}
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-secondary/15 dark:bg-secondary/25 text-secondary dark:text-secondary text-[9px] font-bold px-1 border border-secondary/30 dark:border-secondary/40">
              {activeCount}
            </span>
          )}
        </div>
        {!disabled && (
          <ChevronDownIcon
            className={cn(
              "size-3 text-gray-400 dark:text-slate-500 transition-transform duration-150",
              open ? "rotate-0" : "-rotate-90"
            )}
          />
        )}
      </button>

      {/* Content: disabled shows placeholder; enabled shows children when open */}
      {disabled ? (
        <div className="px-4 pb-2.5">
          <p className="text-[10px] text-gray-300 dark:text-slate-600 italic">
            Not available on this page
          </p>
        </div>
      ) : (
        open && <div className="px-4 pb-3">{children}</div>
      )}
    </div>
  );
}

// ── Compact checkbox list ─────────────────────────────────────────────────────

function CheckList({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-0.5 max-h-44 overflow-y-auto">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-2 py-1 text-xs text-gray-700 dark:text-slate-300 hover:text-primary dark:hover:text-blue-300 cursor-pointer select-none transition-colors rounded"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="accent-secondary size-3.5 shrink-0"
          />
          <span className="truncate">{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ── FilterPane ────────────────────────────────────────────────────────────────

export default function FilterPane(): React.ReactElement | null {
  const pathname = usePathname();
  const {
    filterPaneOpen,
    toggleFilterPane,
    filterYears,
    filterMonths,
    filterDaysOfWeek,
    toggleFilterYear,
    toggleFilterMonth,
    toggleFilterDayOfWeek,
    clearFilters,
    devTier,
    focusModeOpen,
  } = useDashboardStore();

  const { contentFilters } = useFilterPaneContext();
  const metadata = useTierMetadata();
  const filteredData  = useFilteredData();
  const filteredCount = filteredData?.isFiltered ? filteredData.filteredCount : null;

  if (pathname.startsWith("/dashboard/user")) return null;

  const years = getAvailableYears(
    metadata?.date_range.start ?? null,
    metadata?.date_range.end ?? null
  );

  // ── Active filter counts ───────────────────────────────────────────────────
  const dateActiveCount =
    filterYears.length + filterMonths.length + filterDaysOfWeek.length;
  const contentActiveCount = contentFilters.reduce(
    (sum, f) => sum + f.selected.length,
    0
  );
  const totalActiveCount = dateActiveCount + contentActiveCount;

  const tierGroups = TIER_FILTER_GROUPS[devTier];

  // ── Clear everything ───────────────────────────────────────────────────────
  const clearAll = (): void => {
    clearFilters();
    contentFilters.forEach((f) => f.onClearAll());
  };

  return (
    <>
      {/* ── Toggle tab button — hugs the right screen edge, slides with pane ── */}
      {/* When closed, hovering expands the button leftward to show "Filters" label.
          z-[350] keeps it above the focus modal (z-[300]) so it's always clickable. */}
      <button
        type="button"
        onClick={toggleFilterPane}
        aria-label={filterPaneOpen ? "Close filter pane" : "Open filter pane"}
        className={cn(
          "fixed top-[88px] z-[350] h-10 flex flex-row items-center group",
          "bg-white dark:bg-slate-900 shadow-md transition-all duration-200 ease-in-out",
          "border border-gray-200 dark:border-slate-700",
          filterPaneOpen
            ? "right-[300px] rounded-l-lg border-r-0 w-8"
            : "right-0 rounded-l-lg w-8 hover:w-24"
        )}
      >
        {/* Inner span clips the expanding text without clipping the external badge */}
        <span className="flex flex-row items-center h-full overflow-hidden pl-2.5 w-full">
          <FunnelIcon className="size-3.5 text-gray-500 dark:text-slate-400 shrink-0" />
          {/* "Filters" label — slides in on hover, only when pane is closed */}
          {!filterPaneOpen && (
            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[4rem] transition-[max-width] duration-200">
              Filters
            </span>
          )}
        </span>
        {/* Badge lives outside overflow-hidden so it is never clipped */}
        {totalActiveCount > 0 && (
          <span className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 rounded-full bg-secondary text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm pointer-events-none">
            {totalActiveCount}
          </span>
        )}
      </button>

      {/* ── Pane — slides in from the right ─────────────────────────────────── */}
      <div
        className={cn(
          "fixed right-0 bottom-0 w-[300px] z-[350]",
          focusModeOpen ? "top-0" : "top-16",
          "bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 shadow-xl",
          "flex flex-col transition-transform duration-300 ease-in-out",
          filterPaneOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!filterPaneOpen}
      >
        {focusModeOpen && (
          <div className="h-16 shrink-0" />
        )}
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              {/* Accent bar — matches SectionHeader style across all pages */}
              <span className="w-[3px] h-4 rounded-full bg-primary dark:bg-blue-400 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-slate-300">
                Filters
              </span>
              {totalActiveCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-secondary/15 dark:bg-secondary/25 text-secondary dark:text-secondary text-[10px] font-bold px-1.5 border border-secondary/30 dark:border-secondary/40">
                  {totalActiveCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggleFilterPane}
              aria-label="Close filter pane"
              className="p-1.5 rounded-md text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>

          {/* Date range strip — updates live as year/month filters change */}
          {(() => {
            const { label, isFiltered } = getEffectiveDateRange(
              metadata?.date_range.start ?? null,
              metadata?.date_range.end ?? null,
              filterYears,
              filterMonths
            );
            return (
              <div className="px-4 pb-2.5 flex items-center gap-2">
                <span className={cn(
                  "text-[11px] font-medium tabular-nums",
                  isFiltered
                    ? "text-secondary dark:text-blue-400"
                    : "text-gray-400 dark:text-slate-500"
                )}>
                  {label}
                </span>
                {isFiltered && (
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-secondary/70 dark:text-blue-400/70">
                    {filteredCount !== null ? `filtered · ${filteredCount} records` : "filtered"}
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── Scrollable sections ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">

          {/* Period ─────────────────────────────────────────────────────────── */}
          <FilterSection
            title="Period"
            defaultOpen
            activeCount={dateActiveCount}
          >
            {/* Year */}
            <div className="mb-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1.5">
                Year
              </p>
              <div className="flex flex-wrap gap-x-4">
                {years.map((y) => (
                  <label
                    key={y}
                    className="flex items-center gap-1.5 py-0.5 text-xs text-gray-700 dark:text-slate-300 hover:text-primary dark:hover:text-blue-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={filterYears.includes(y)}
                      onChange={() => toggleFilterYear(y)}
                      className="accent-secondary size-3.5 shrink-0"
                    />
                    {y}
                  </label>
                ))}
              </div>
            </div>

            {/* Month */}
            <div className="mb-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1.5">
                Month
              </p>
              <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
                {MONTHS.map((m, i) => (
                  <label
                    key={m}
                    className="flex items-center gap-1.5 py-0.5 text-xs text-gray-700 dark:text-slate-300 hover:text-primary dark:hover:text-blue-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={filterMonths.includes(i)}
                      onChange={() => toggleFilterMonth(i)}
                      className="accent-secondary size-3 shrink-0"
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>

            {/* Day of Week */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1.5">
                Day of Week
              </p>
              <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
                {DAYS.map((d) => (
                  <label
                    key={d.value}
                    className="flex items-center gap-1.5 py-0.5 text-xs text-gray-700 dark:text-slate-300 hover:text-primary dark:hover:text-blue-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={filterDaysOfWeek.includes(d.value)}
                      onChange={() => toggleFilterDayOfWeek(d.value)}
                      className="accent-secondary size-3 shrink-0"
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>
          </FilterSection>

          {/* Content filter groups ───────────────────────────────────────────── */}
          {tierGroups.map((group) => {
            const registered = contentFilters.find((f) => f.id === group.id);
            const isActive =
              registered !== undefined && registered.options.length > 0;

            if (isActive && registered !== undefined) {
              return (
                <FilterSection
                  key={group.id}
                  title={group.label}
                  defaultOpen={registered.selected.length > 0}
                  activeCount={registered.selected.length}
                >
                  <CheckList
                    options={registered.options}
                    selected={registered.selected}
                    onToggle={registered.onToggle}
                  />
                  {registered.selected.length > 0 && (
                    <button
                      type="button"
                      onClick={registered.onClearAll}
                      className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 hover:text-primary dark:hover:text-blue-400 transition-colors"
                    >
                      Clear {group.label}
                    </button>
                  )}
                </FilterSection>
              );
            }

            return (
              <FilterSection
                key={group.id}
                title={group.label}
                disabled
                defaultOpen={false}
              >
                {/* content rendered by FilterSection's disabled branch */}
                <></>
              </FilterSection>
            );
          })}
        </div>

        {/* ── Footer — Reset All ───────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={clearAll}
            disabled={totalActiveCount === 0}
            className={cn(
              "w-full py-2 rounded-xl text-sm font-semibold transition-colors",
              totalActiveCount > 0
                ? "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]"
                : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed"
            )}
          >
            Reset All Filters
          </button>
        </div>
      </div>
    </>
  );
}
