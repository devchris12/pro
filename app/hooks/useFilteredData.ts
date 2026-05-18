"use client";

/**
 * useFilteredData
 *
 * Wraps useBasicAnalysis() and applies the global date filters from the
 * Zustand dashboard store. Returns the same BasicAnalysisResult shape but
 * with page_1 and page_2 data scoped to the selected time window.
 *
 * Filters (multiselect — empty array = no filter):
 *   filterYears      — restrict to specific calendar years (e.g. [2025, 2026])
 *   filterMonths     — restrict to specific months (0=Jan … 11=Dec)
 *   filterDaysOfWeek — restrict to specific weekdays (0=Sun … 6=Sat)
 *
 * Combinations: [2025] + [0] shows all Januaries in 2025.
 * Multiple years: [2025, 2026] shows data from either year.
 *
 * Page 3 (Forecast) and Cockpit are intentionally excluded — they always
 * use the full dataset.
 *
 * filterMonthlyTrend — exported utility for Int/Adv pages that have
 * pre-aggregated monthly data (no row-level detail table).
 */

import { useMemo } from "react";
import { useBasicAnalysis } from "./useDashboardData";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import { getBasicDetailTable } from "@/app/lib/basic-analysis";
import type {
  BasicAnalysisResult,
  DetailRow,
  Page1,
  Page1Kpis,
  Page1Charts,
  Page2,
  ProductTableRow,
  TopProduct,
} from "@/app/types/basicAnalysis";

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Normalises a date string for comparison.
 * Handles "YYYY-MM" (monthly), "YYYY-MM-DD" (daily), and ISO datetimes.
 */
export function toDate(dateStr?: string | null): Date {
  // Defensive guard: invalid/missing dates should not crash filters.
  if (typeof dateStr !== "string") return new Date(Number.NaN);
  const trimmed = dateStr.trim();
  if (!trimmed) return new Date(Number.NaN);
  return trimmed.length === 7 ? new Date(`${trimmed}-01`) : new Date(trimmed);
}

// ── Monthly trend filter (for Intermediate/Advanced pre-aggregated data) ──────

/**
 * Filters any array of objects with a `month` field ("YYYY-MM") to the
 * active year/month filter window. Returns the array unmodified when
 * both filter arrays are empty (= all data).
 */
export function filterMonthlyTrend<T extends { month: string }>(
  data: T[],
  filterYears:  number[],
  filterMonths: number[],
): T[] {
  if (filterYears.length === 0 && filterMonths.length === 0) return data;

  return data.filter((point) => {
    const [yearStr, monthStr] = point.month.split("-");
    const year     = parseInt(yearStr,  10);
    const monthNum = parseInt(monthStr, 10) - 1; // convert 1-based to 0-based
    if (filterYears.length  > 0 && !filterYears.includes(year))     return false;
    if (filterMonths.length > 0 && !filterMonths.includes(monthNum)) return false;
    return true;
  });
}

// ── Re-derivation helpers ─────────────────────────────────────────────────────

function derivePage1Kpis(rows: DetailRow[]): Page1Kpis {
  const total_sales = rows.reduce((s, r) => s + r.total_sales_auto, 0);
  const total_profit = rows.reduce((s, r) => s + r.profit_auto, 0);
  const total_cost = total_sales - total_profit;
  const units_sold = rows.reduce((s, r) => s + r.quantity, 0);
  const total_transactions = rows.length;
  const average_selling_price = units_sold > 0 ? total_sales / units_sold : 0;
  const transfer_count = rows.filter(
    (r) => r.payment_method.toLowerCase().includes("transfer"),
  ).length;
  const transfer_rate = total_transactions > 0 ? transfer_count / total_transactions : 0;

  return {
    total_sales,
    total_cost,
    total_profit,
    units_sold,
    average_selling_price,
    total_transactions,
    transfer_rate,
  };
}

function derivePage1Charts(
  rows: DetailRow[],
  originalCharts: Page1Charts | undefined,
  filterYears:  number[],
  filterMonths: number[],
): Page1Charts {
  const sales_trend = (originalCharts?.sales_trend ?? []).filter((p) => {
    const d = toDate(p.date);
    if (filterYears.length  > 0 && !filterYears.includes(d.getFullYear()))  return false;
    if (filterMonths.length > 0 && !filterMonths.includes(d.getMonth()))    return false;
    return true;
  });
  const profit_trend = (originalCharts?.profit_trend ?? []).filter((p) => {
    const d = toDate(p.date);
    if (filterYears.length  > 0 && !filterYears.includes(d.getFullYear()))  return false;
    if (filterMonths.length > 0 && !filterMonths.includes(d.getMonth()))    return false;
    return true;
  });

  // Re-aggregate category quantities from filtered rows
  const catQtyMap: Record<string, number> = {};
  rows.forEach((r) => {
    catQtyMap[r.category] = (catQtyMap[r.category] ?? 0) + r.quantity;
  });
  const quantity_by_category = Object.entries(catQtyMap)
    .map(([category, quantity]) => ({ category, quantity }))
    .sort((a, b) => b.quantity - a.quantity);

  // Re-aggregate payment method distribution from filtered rows
  const payMap: Record<string, number> = {};
  rows.forEach((r) => {
    payMap[r.payment_method] = (payMap[r.payment_method] ?? 0) + 1;
  });
  const payment_method_distribution = Object.entries(payMap)
    .map(([payment_method, transactions]) => ({ payment_method, transactions }))
    .sort((a, b) => b.transactions - a.transactions);

  return { sales_trend, profit_trend, quantity_by_category, payment_method_distribution };
}

function derivePage2(rows: DetailRow[], originalPage2: Page2): Page2 {
  if (rows.length === 0) {
    return {
      kpis: { units_sold: 0, product_revenue: 0, product_profit: 0, current_profit_margin: 0, reorder_alerts: 0 },
      top_products: [],
      product_table: [],
      category_performance: {},
    };
  }

  const origMeta = new Map(originalPage2.product_table.map((p) => [p.product, p]));

  const prodMap: Record<string, { units: number; revenue: number; profit: number; category: string; txCount: number }> = {};
  rows.forEach((r) => {
    if (!prodMap[r.product]) {
      prodMap[r.product] = { units: 0, revenue: 0, profit: 0, category: r.category, txCount: 0 };
    }
    prodMap[r.product].units   += r.quantity;
    prodMap[r.product].revenue += r.total_sales_auto;
    prodMap[r.product].profit  += r.profit_auto;
    prodMap[r.product].txCount += 1;
  });

  const product_table: ProductTableRow[] = Object.entries(prodMap)
    .map(([product, data]) => {
      const orig = origMeta.get(product);
      return {
        product,
        category:                  data.category,
        units_sold:                data.units,
        revenue:                   data.revenue,
        profit:                    data.profit,
        profit_margin:             data.revenue > 0 ? data.profit / data.revenue : 0,
        needs_reorder:             orig?.needs_reorder ?? false,
        reorder_level_piecespacks: orig?.reorder_level_piecespacks ?? 0,
        current_unit_cost:         orig?.current_unit_cost ?? 0,
        current_selling_price:     orig?.current_selling_price ?? 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const product_revenue = product_table.reduce((s, p) => s + p.revenue, 0);
  const product_profit  = product_table.reduce((s, p) => s + p.profit, 0);
  const units_sold      = product_table.reduce((s, p) => s + p.units_sold, 0);
  const current_profit_margin = product_revenue > 0 ? product_profit / product_revenue : 0;
  const reorder_alerts  = product_table.filter((p) => p.needs_reorder).length;

  const top_products: TopProduct[] = product_table.slice(0, 20).map((p) => ({
    ...p,
    avg_selling_price: p.units_sold > 0 ? p.revenue / p.units_sold : 0,
    transaction_count: prodMap[p.product]?.txCount ?? 0,
  }));

  const category_performance: Record<string, number> = {};
  rows.forEach((r) => {
    category_performance[r.category] = (category_performance[r.category] ?? 0) + r.total_sales_auto;
  });

  return {
    kpis: { units_sold, product_revenue, product_profit, current_profit_margin, reorder_alerts },
    top_products,
    product_table,
    category_performance,
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export interface FilteredResult extends BasicAnalysisResult {
  /** true when any filter (year, month, day) is active */
  isFiltered: boolean;
  /** How many transactions exist in the selected window */
  filteredCount: number;
}

export function useFilteredData(): FilteredResult | null {
  const analysis = useBasicAnalysis();
  const { filterYears, filterMonths, filterDaysOfWeek } = useDashboardStore();

  return useMemo(() => {
    if (!analysis) return null;

    const isFiltered = filterYears.length > 0 || filterMonths.length > 0 || filterDaysOfWeek.length > 0;

    // No filters — return full dataset
    if (!isFiltered) {
      return {
        ...analysis,
        isFiltered: false,
        filteredCount: analysis.metadata.record_count,
      };
    }

    const page1 = analysis.page_1;
    if (!page1) return null;

    // Filter the detail table by year, month, and/or day of week
    const filteredRows = getBasicDetailTable(analysis).filter((r) => {
      const d = toDate(r.date);
      if (filterYears.length      > 0 && !filterYears.includes(d.getFullYear()))      return false;
      if (filterMonths.length     > 0 && !filterMonths.includes(d.getMonth()))        return false;
      if (filterDaysOfWeek.length > 0 && !filterDaysOfWeek.includes(d.getDay()))      return false;
      return true;
    });

    const page_1: Page1 = {
      ...page1,
      kpis:         derivePage1Kpis(filteredRows),
      charts:       derivePage1Charts(filteredRows, page1.charts, filterYears, filterMonths),
      detail_table: filteredRows,
    };

    const page_2: Page2 = derivePage2(filteredRows, analysis.page_2 ?? {
      kpis: { units_sold: 0, product_revenue: 0, product_profit: 0, current_profit_margin: 0, reorder_alerts: 0 },
      top_products: [],
      product_table: [],
      category_performance: {},
    });

    // Derive actual date range from filtered rows (ISO string comparison is safe for YYYY-MM-DD)
    const filteredDateRange =
      filteredRows.length > 0
        ? {
            start: filteredRows.reduce((min, r) => (r.date < min ? r.date : min), filteredRows[0].date),
            end:   filteredRows.reduce((max, r) => (r.date > max ? r.date : max), filteredRows[0].date),
          }
        : analysis.metadata.date_range;

    const metadata = {
      ...analysis.metadata,
      record_count: filteredRows.length,
      date_range:   filteredDateRange,
    };

    return {
      ...analysis,
      page_1,
      page_2,
      metadata,
      isFiltered: true,
      filteredCount: filteredRows.length,
    };
  }, [analysis, filterYears, filterMonths, filterDaysOfWeek]);
}
