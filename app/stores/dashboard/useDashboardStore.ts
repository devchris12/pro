"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Tier controls which nav items and mock data are used.
export type DashboardTier = "basic" | "intermediate" | "advanced";

// Industry key — one entry per supported industry.
export type DevIndustry = "retail";

interface DashboardState {
  // ── Date filters (multiselect — empty array = no filter) ──────────────────
  filterYears:        number[]; // e.g. [2025], [] = all years
  filterMonths:       number[]; // 0=Jan … 11=Dec, [] = all months
  filterDaysOfWeek:   number[]; // 0=Sun … 6=Sat, [] = all days
  toggleFilterYear:      (year: number) => void;
  toggleFilterMonth:     (month: number) => void;
  toggleFilterDayOfWeek: (day: number) => void;
  setFilterYears:        (years: number[]) => void;
  setFilterMonths:       (months: number[]) => void;
  setFilterDaysOfWeek:   (days: number[]) => void;
  clearFilters: () => void;

  // ── Layout ─────────────────────────────────────────────────────────────────
  sideRailExpanded: boolean;
  toggleSideRail: () => void;
  setSideRailExpanded: (expanded: boolean) => void;

  filterPaneOpen: boolean;
  toggleFilterPane: () => void;
  setFilterPaneOpen: (open: boolean) => void;
  focusModeOpen: boolean;
  setFocusModeOpen: (open: boolean) => void;
  focusedChartId: string | null;
  setFocusedChartId: (id: string | null) => void;

  // ── Dev-mode tier switcher ─────────────────────────────────────────────────
  devTier: DashboardTier;
  setDevTier: (tier: DashboardTier) => void;

  devIndustry: DevIndustry;
  setDevIndustry: (industry: DevIndustry) => void;

  // ── UI theme ───────────────────────────────────────────────────────────────
  theme: "light" | "dark";
  toggleTheme: () => void;
}

// Toggle helper: adds value if absent, removes if present
function toggle(arr: number[], value: number): number[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      filterYears:        [],
      filterMonths:       [],
      filterDaysOfWeek:   [],
      toggleFilterYear:      (year)  => set((s) => ({ filterYears:      toggle(s.filterYears,      year)  })),
      toggleFilterMonth:     (month) => set((s) => ({ filterMonths:     toggle(s.filterMonths,     month) })),
      toggleFilterDayOfWeek: (day)   => set((s) => ({ filterDaysOfWeek: toggle(s.filterDaysOfWeek, day)   })),
      setFilterYears:        (years)  => set({ filterYears: years }),
      setFilterMonths:       (months) => set({ filterMonths: months }),
      setFilterDaysOfWeek:   (days)   => set({ filterDaysOfWeek: days }),
      clearFilters: () => set({ filterYears: [], filterMonths: [], filterDaysOfWeek: [] }),

      sideRailExpanded: true,
      toggleSideRail: () =>
        set((state) => ({ sideRailExpanded: !state.sideRailExpanded })),
      setSideRailExpanded: (expanded) => set({ sideRailExpanded: expanded }),

      filterPaneOpen: false,
      toggleFilterPane: () =>
        set((state) => ({ filterPaneOpen: !state.filterPaneOpen })),
      setFilterPaneOpen: (open) => set({ filterPaneOpen: open }),
      focusModeOpen: false,
      setFocusModeOpen: (open) => set({ focusModeOpen: open }),
      focusedChartId: null,
      setFocusedChartId: (id) => set({ focusedChartId: id }),

      devTier: "basic",
      setDevTier: (devTier) => set({ devTier }),

      devIndustry: "retail",
      setDevIndustry: (devIndustry) => set({ devIndustry }),

      theme: "light",
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
    }),
    {
      name: "dashboard-prefs",
      partialize: (state) => ({
        filterYears: state.filterYears,
        filterMonths: state.filterMonths,
        filterDaysOfWeek: state.filterDaysOfWeek,
        sideRailExpanded: state.sideRailExpanded,
        filterPaneOpen: state.filterPaneOpen,
        devTier: state.devTier,
        devIndustry: state.devIndustry,
        theme: state.theme,
      }),
    }
  )
);
