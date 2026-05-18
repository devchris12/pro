"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LabelList, Legend,
} from "recharts";
import { getBasicDetailTable } from "@/app/lib/basic-analysis";
import { useFilteredData, filterMonthlyTrend } from "@/app/hooks/useFilteredData";
import { useSalesPageData, useTierMetadata, useBasicAnalysis } from "@/app/hooks/useDashboardData";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import { formatNaira, cn, fmtTableDate, getGreeting } from "@/lib/utils";
import { CalendarIcon } from "@heroicons/react/24/outline";
import {
  DashTooltip, GradDefs, GRAD, DONUT_COLOURS, CHART_COLOURS,
  SectionHeader, ChartCard, KpiCard, KpiStrip, TICK, GRID_STROKE, CHART_PRIMARY_VAR,
  GranularityToggle, type TimeGranularity,
} from "@/app/components/ui/dashboard/ChartUtils";
import { EditableGreeting } from "@/app/components/ui/dashboard/EditableGreeting";
import { useRegisterPageFilters } from "@/app/hooks/useRegisterPageFilters";
import type { IntermediateAnalysisResult, IntPage1Kpis } from "@/app/types/intermediateAnalysis";
import type { AdvancedAnalysisResult, AdvPage1Kpis } from "@/app/types/advancedAnalysis";
import type { BasicAnalysisResult, DetailRow } from "@/app/types/basicAnalysis";

// ── Profit/Operating waterfall types ─────────────────────────────────────────

interface WaterfallStep {
  label: string;
  value: number;
  type: "start" | "decrease" | "end";
}

// ── Aggregate daily trend data into monthly totals ───────────────────────────

const MONTH_LABELS      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL_NAMES  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface MonthlyPoint {
  label: string;
  tooltipLabel: string;
  [key: string]: string | number;
}

function aggregateDailyToMonthly<T extends { date: string }>(
  data: T[],
  valueKey: keyof T & string,
): MonthlyPoint[] {
  if (data.length === 0) return [];

  const totals = new Array<number>(12).fill(0);
  const hasData = new Array<boolean>(12).fill(false);
  data.forEach((p) => {
    const d = new Date(String(p.date));
    if (isNaN(d.getTime())) return;
    const i = d.getMonth();
    totals[i] += Number(p[valueKey]);
    hasData[i] = true;
  });

  return MONTH_LABELS
    .map((label, i) => ({ label, tooltipLabel: MONTH_FULL_NAMES[i], [valueKey]: totals[i] }))
    .filter((_, i) => hasData[i]);
}

// ── Parse pre-formatted Naira strings back to numbers (Adv KPI scaling) ─────

function parseNairaStr(v: string): number {
  const s = v.replace("₦", "").trim();
  if (s.endsWith("M")) return parseFloat(s) * 1_000_000;
  if (s.endsWith("K")) return parseFloat(s) * 1_000;
  return parseFloat(s.replace(/,/g, ""));
}

// ── Trend chart data types (unified label field for all granularities) ────────

interface SalesTrendChartPoint {
  label: string;
  tooltipLabel?: string; // Full month name for tooltip — only present in monthly view
  sales: number;
  month?: string; // YYYY-MM — only present in monthly view; used for dot/tick highlighting
}
interface ProfitTrendChartPoint {
  label: string;
  tooltipLabel?: string;
  profit: number;
  month?: string;
}

// ── Quarterly aggregation helpers ─────────────────────────────────────────────

function toQuarterlySales(data: Array<{ month: string; sales: number }>): SalesTrendChartPoint[] {
  const q: Record<string, number> = {};
  data.forEach(({ month, sales }) => {
    const [year, m] = month.split("-");
    const qn = Math.ceil(parseInt(m, 10) / 3);
    const key = `Q${qn} ${year}`;
    q[key] = (q[key] ?? 0) + sales;
  });
  return Object.entries(q).map(([label, sales]) => ({ label, sales }));
}

function toQuarterlyProfit(data: Array<{ month: string; profit: number }>): ProfitTrendChartPoint[] {
  const q: Record<string, number> = {};
  data.forEach(({ month, profit }) => {
    const [year, m] = month.split("-");
    const qn = Math.ceil(parseInt(m, 10) / 3);
    const key = `Q${qn} ${year}`;
    q[key] = (q[key] ?? 0) + profit;
  });
  return Object.entries(q).map(([label, profit]) => ({ label, profit }));
}

// ── Day-of-week aggregation helpers (from daily detail rows) ──────────────────

const MONTHS_SHORT_AGG = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

// ── Yearly aggregation helpers ────────────────────────────────────────────────

function toYearlySales(monthly: Array<{ month: string; sales: number }>): SalesTrendChartPoint[] {
  const map: Record<string, number> = {};
  for (const { month, sales } of monthly) {
    const year = month.split("-")[0];
    map[year] = (map[year] ?? 0) + sales;
  }
  return Object.entries(map).sort().map(([label, sales]) => ({ label, sales }));
}

function toYearlyProfit(monthly: Array<{ month: string; profit: number }>): ProfitTrendChartPoint[] {
  const map: Record<string, number> = {};
  for (const { month, profit } of monthly) {
    const year = month.split("-")[0];
    map[year] = (map[year] ?? 0) + profit;
  }
  return Object.entries(map).sort().map(([label, profit]) => ({ label, profit }));
}

// ── Basic tier: monthly aggregation with month field for spotlight highlighting ─

// yearAware=true  → key is "YYYY-MM" (one entry per year-month, used when a year filter is active)
// yearAware=false → key is "0000-MM" (all years aggregated into a single entry per month)
function toRawMonthly(rows: DetailRow[], yearAware = true): Array<{ month: string; sales: number; profit: number }> {
  const map: Record<string, { sales: number; profit: number }> = {};
  rows.forEach((r) => {
    const d = new Date(r.date);
    if (isNaN(d.getTime())) return;
    const monthPad = String(d.getMonth() + 1).padStart(2, "0");
    const key = yearAware ? `${d.getFullYear()}-${monthPad}` : `0000-${monthPad}`;
    if (!map[key]) map[key] = { sales: 0, profit: 0 };
    map[key].sales  += r.total_sales_auto;
    map[key].profit += r.profit_auto;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));
}

function toMonthlySalesPoints(raw: Array<{ month: string; sales: number }>): SalesTrendChartPoint[] {
  return raw.map(({ month, sales }) => {
    const mIdx = parseInt(month.split("-")[1] ?? "1", 10) - 1;
    return { month, sales, label: MONTHS_SHORT_AGG[mIdx] ?? month, tooltipLabel: MONTH_FULL_NAMES[mIdx] };
  });
}

function toMonthlyProfitPoints(raw: Array<{ month: string; profit: number }>): ProfitTrendChartPoint[] {
  return raw.map(({ month, profit }) => {
    const mIdx = parseInt(month.split("-")[1] ?? "1", 10) - 1;
    return { month, profit, label: MONTHS_SHORT_AGG[mIdx] ?? month, tooltipLabel: MONTH_FULL_NAMES[mIdx] };
  });
}

// ── Basic: transaction log ─────────────────────────────────────────────────────

interface BasicDetailTableProps {
  categoryFilters: string[];
  paymentFilters: string[];
  productFilters: string[];
  overrideRows?: DetailRow[];
}

function BasicDetailTable({ categoryFilters, paymentFilters, productFilters, overrideRows }: BasicDetailTableProps): React.ReactElement | null {
  const filteredData = useFilteredData();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const rows = useMemo(() => {
    if (overrideRows !== undefined) {
      return [...overrideRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    if (!filteredData) return [];
    let r = [...getBasicDetailTable(filteredData)].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (categoryFilters.length > 0) r = r.filter((row) => categoryFilters.includes(row.category));
    if (paymentFilters.length > 0)  r = r.filter((row) => paymentFilters.includes(row.payment_method));
    if (productFilters.length > 0)  r = r.filter((row) => productFilters.includes(row.product));
    return r;
  }, [filteredData, categoryFilters, paymentFilters, productFilters, overrideRows]);

  React.useEffect(() => { setPage(0); }, [categoryFilters, paymentFilters, productFilters, overrideRows]);

  if (!filteredData && !overrideRows) return null;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Transaction Log</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
          {rows.length} rows
          {(categoryFilters.length > 0 || paymentFilters.length > 0 || productFilters.length > 0) ? " · filtered" : " · all transactions"}
        </p>
      </div>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
              {["Date","Product","Category","Qty","Price","Payment","Revenue","Profit"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={i} className={cn("relative border-b border-gray-50 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:scale-[1.01] hover:z-10 transition-all duration-150", i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50/40 dark:bg-slate-800/30")}>
                <td className="px-4 py-2.5 text-gray-400 dark:text-slate-500 whitespace-nowrap tabular-nums">{fmtTableDate(row.date)}</td>
                <td className="px-4 py-2.5 text-gray-800 dark:text-slate-200 font-medium max-w-[140px] truncate">{row.product}</td>
                <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400">{row.category}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 tabular-nums">{row.quantity}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 tabular-nums">{formatNaira(row.selling_price)}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">{row.payment_method}</span></td>
                <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-slate-200 tabular-nums">{formatNaira(row.total_sales_auto)}</td>
                <td className={cn("px-4 py-2.5 font-bold tabular-nums", row.profit_auto > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>{formatNaira(row.profit_auto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-400 dark:text-slate-500">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium">Previous</button>
            <button disabled={page === totalPages - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg bg-primary dark:bg-secondary text-white disabled:opacity-40 hover:opacity-90 dark:hover:bg-secondary/90 active:scale-[0.97] transition-all font-medium">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Basic tier content ─────────────────────────────────────────────────────────

function BasicContent({ data, rawData }: { data: BasicAnalysisResult["page_1"]; rawData: BasicAnalysisResult["page_1"] }): React.ReactElement | null {
  if (!data || !rawData) return null;

  const { kpis, charts } = data;
  const rawDetailTable = rawData.detail_table ?? [];
  const filteredData = useFilteredData();
  const {
    focusModeOpen,
    filterYears, filterMonths, filterDaysOfWeek,
    setFilterYears, setFilterMonths, setFilterDaysOfWeek,
  } = useDashboardStore();

  const [salesGran,  setSalesGran]  = useState<TimeGranularity>("M");
  const [profitGran, setProfitGran] = useState<TimeGranularity>("M");

  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [paymentFilters,  setPaymentFilters]  = useState<string[]>([]);
  const [productFilters,  setProductFilters]  = useState<string[]>([]);

  const toggleCategory = (cat: string): void =>
    setCategoryFilters((prev) => prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]);
  const togglePayment = (method: string): void =>
    setPaymentFilters((prev) => prev.includes(method) ? prev.filter((x) => x !== method) : [...prev, method]);
  const toggleProduct = (v: string): void =>
    setProductFilters((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const detailTable = getBasicDetailTable(filteredData);

  const productOptions = useMemo(
    () => [...new Set(detailTable.map((r) => r.product))].sort(),
    [detailTable]
  );
  const categoryOptions = useMemo(
    () => [...new Set(detailTable.map((r) => r.category))].sort(),
    [detailTable]
  );
  const paymentOptions = useMemo(
    () => [...new Set(detailTable.map((r) => r.payment_method))].filter(Boolean).sort(),
    [detailTable]
  );

  useRegisterPageFilters([
    {
      id: "product",
      label: "Product",
      options: productOptions,
      selected: productFilters,
      onToggle: toggleProduct,
      onClearAll: () => setProductFilters([]),
    },
    {
      id: "category",
      label: "Category",
      options: categoryOptions,
      selected: categoryFilters,
      onToggle: toggleCategory,
      onClearAll: () => setCategoryFilters([]),
    },
    {
      id: "payment",
      label: "Payment Method",
      options: paymentOptions,
      selected: paymentFilters,
      onToggle: togglePayment,
      onClearAll: () => setPaymentFilters([]),
    },
  ]);

  const filteredRows = useMemo(() => {
    let r = detailTable;
    if (categoryFilters.length > 0) r = r.filter((row) => categoryFilters.includes(row.category));
    if (paymentFilters.length > 0)  r = r.filter((row) => paymentFilters.includes(row.payment_method));
    if (productFilters.length > 0)  r = r.filter((row) => productFilters.includes(row.product));
    return r;
  }, [detailTable, categoryFilters, paymentFilters, productFilters]);

  const hasContentFilter = categoryFilters.length > 0 || paymentFilters.length > 0 || productFilters.length > 0;

  const liveDisplayKpis = useMemo(() => {
    if (!hasContentFilter) return kpis;
    const totalSales = filteredRows.reduce((sum, row) => sum + row.total_sales_auto, 0);
    const totalProfit = filteredRows.reduce((sum, row) => sum + row.profit_auto, 0);
    const unitsSold = filteredRows.reduce((sum, row) => sum + row.quantity, 0);
    const totalTransactions = filteredRows.length;
    const transferCount = filteredRows.filter((row) =>
      row.payment_method.toLowerCase().includes("transfer"),
    ).length;
    return {
      total_sales: totalSales,
      total_profit: totalProfit,
      total_cost: totalSales - totalProfit,
      units_sold: unitsSold,
      average_selling_price: unitsSold > 0 ? totalSales / unitsSold : 0,
      total_transactions: totalTransactions,
      transfer_rate: totalTransactions > 0 ? transferCount / totalTransactions : 0,
    };
  }, [filteredRows, hasContentFilter, kpis]);

  // ── Focus mode freeze + filter restore ────────────────────────────────────
  const frozenRowsRef              = useRef<DetailRow[]>(filteredRows);
  const frozenKpisRef              = useRef(liveDisplayKpis);
  const frozenCategoryFiltersRef   = useRef(categoryFilters);
  const frozenPaymentFiltersRef    = useRef(paymentFilters);
  const frozenProductFiltersRef    = useRef(productFilters);
  const frozenFilterYearsRef       = useRef(filterYears);
  const frozenFilterMonthsRef      = useRef(filterMonths);
  const frozenFilterDaysRef        = useRef(filterDaysOfWeek);
  const prevFocusRef               = useRef(focusModeOpen);
  const focusSessionRef            = useRef(false);

  if (focusModeOpen && !prevFocusRef.current) {
    frozenRowsRef.current            = filteredRows;
    frozenKpisRef.current            = liveDisplayKpis;
    frozenCategoryFiltersRef.current = [...categoryFilters];
    frozenPaymentFiltersRef.current  = [...paymentFilters];
    frozenProductFiltersRef.current  = [...productFilters];
    frozenFilterYearsRef.current     = [...filterYears];
    frozenFilterMonthsRef.current    = [...filterMonths];
    frozenFilterDaysRef.current      = [...filterDaysOfWeek];
    focusSessionRef.current          = true;
  }
  prevFocusRef.current = focusModeOpen;

  useEffect(() => {
    if (!focusModeOpen && focusSessionRef.current) {
      focusSessionRef.current = false;
      setCategoryFilters(frozenCategoryFiltersRef.current);
      setPaymentFilters(frozenPaymentFiltersRef.current);
      setProductFilters(frozenProductFiltersRef.current);
      setFilterYears(frozenFilterYearsRef.current);
      setFilterMonths(frozenFilterMonthsRef.current);
      setFilterDaysOfWeek(frozenFilterDaysRef.current);
    }
  }, [focusModeOpen, setFilterYears, setFilterMonths, setFilterDaysOfWeek]);

  const rowsForBackground = focusModeOpen ? frozenRowsRef.current : filteredRows;
  const displayKpis       = focusModeOpen ? frozenKpisRef.current  : liveDisplayKpis;

  const yearAware = filterYears.length > 0;

  // M-view: year + content filtered, NOT month/day clipped — month filter drives highlights only
  const yearFilteredRows = useMemo(() => {
    let rows = rawDetailTable;
    if (filterYears.length > 0) {
      rows = rows.filter((r) => {
        const d = new Date(r.date);
        return !isNaN(d.getTime()) && filterYears.includes(d.getFullYear());
      });
    }
    if (categoryFilters.length > 0) rows = rows.filter((r) => categoryFilters.includes(r.category));
    if (paymentFilters.length > 0)  rows = rows.filter((r) => paymentFilters.includes(r.payment_method));
    if (productFilters.length > 0)  rows = rows.filter((r) => productFilters.includes(r.product));
    return rows;
  }, [rawDetailTable, filterYears, categoryFilters, paymentFilters, productFilters]);

  // "0000-MM" keys when no year filter — safe for M-view only (year string never shown as label)
  const rawMonthlyForChart = useMemo(
    () => toRawMonthly(yearFilteredRows, yearAware),
    [yearFilteredRows, yearAware],
  );

  // Q/Y views: always year-aware (real YYYY keys) so labels never show "0000"
  const rawMonthlyYA    = useMemo(() => toRawMonthly(filteredRows,         true), [filteredRows]);
  const rawMonthlyAll   = useMemo(() => toRawMonthly(rawDetailTable, yearAware), [rawDetailTable, yearAware]);
  const rawMonthlyAllYA = useMemo(() => toRawMonthly(rawDetailTable, true), [rawDetailTable]);

  const monthlySales = useMemo((): SalesTrendChartPoint[] => {
    if (salesGran === "Q") return toQuarterlySales(rawMonthlyYA);
    if (salesGran === "Y") return toYearlySales(rawMonthlyYA);
    return toMonthlySalesPoints(rawMonthlyForChart);
  }, [rawMonthlyYA, rawMonthlyForChart, salesGran]);

  const monthlySalesUnderlay = useMemo((): SalesTrendChartPoint[] => {
    if (salesGran === "Q") return toQuarterlySales(rawMonthlyAllYA);
    if (salesGran === "Y") return toYearlySales(rawMonthlyAllYA);
    return toMonthlySalesPoints(rawMonthlyAll);
  }, [rawMonthlyAllYA, rawMonthlyAll, salesGran]);

  const monthlyProfit = useMemo((): ProfitTrendChartPoint[] => {
    if (profitGran === "Q") return toQuarterlyProfit(rawMonthlyYA);
    if (profitGran === "Y") return toYearlyProfit(rawMonthlyYA);
    return toMonthlyProfitPoints(rawMonthlyForChart);
  }, [rawMonthlyYA, rawMonthlyForChart, profitGran]);

  const monthlyProfitUnderlay = useMemo((): ProfitTrendChartPoint[] => {
    if (profitGran === "Q") return toQuarterlyProfit(rawMonthlyAllYA);
    if (profitGran === "Y") return toYearlyProfit(rawMonthlyAllYA);
    return toMonthlyProfitPoints(rawMonthlyAll);
  }, [rawMonthlyAllYA, rawMonthlyAll, profitGran]);

  const quantityByCategory = useMemo(() => {
    const sourceRows = hasContentFilter ? filteredRows : detailTable;
    const totals: Record<string, number> = {};
    sourceRows.forEach((r) => { totals[r.category] = (totals[r.category] ?? 0) + r.quantity; });
    return Object.entries(totals)
      .map(([category, quantity]) => ({ category, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredRows, hasContentFilter, detailTable]);
  const quantityByCategoryUnderlay = useMemo(() => {
    const totals: Record<string, number> = {};
    rawDetailTable.forEach((r) => { totals[r.category] = (totals[r.category] ?? 0) + r.quantity; });
    return Object.entries(totals)
      .map(([category, quantity]) => ({ category, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [rawDetailTable]);

  // 36px per bar so every category label has room to render without Recharts dropping ticks.
  const categoryChartHeight = Math.max(200, quantityByCategoryUnderlay.length * 36);

  const paymentDist = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRows.forEach((r) => { counts[r.payment_method] = (counts[r.payment_method] ?? 0) + 1; });
    return Object.entries(counts)
      .map(([payment_method, transactions]) => ({ payment_method, transactions }))
      .sort((a, b) => b.transactions - a.transactions);
  }, [filteredRows]);
  const paymentDistUnderlay = useMemo(() => {
    const counts: Record<string, number> = {};
    rawDetailTable.forEach((r) => { counts[r.payment_method] = (counts[r.payment_method] ?? 0) + 1; });
    return Object.entries(counts)
      .map(([payment_method, transactions]) => ({ payment_method, transactions }))
      .sort((a, b) => b.transactions - a.transactions);
  }, [rawDetailTable]);

  // ── Spotlight: Volume by Category ─────────────────────────────────────────
  const categoryTick = useMemo(() => {
    const selected = categoryFilters;
    const active   = selected.length > 0;
    return function CategoryNameTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string } }): React.ReactElement {
      const name = payload?.value ?? "";
      const isSelected = active && selected.includes(name);
      const display = name.length > 18 ? name.slice(0, 18) + "…" : name;
      return (
        <text x={Number(x ?? 0)} y={Number(y ?? 0)} dy={4} textAnchor="end"
          fontSize={isSelected ? 13 : 12} fontWeight={isSelected ? 700 : 400}
          fill={isSelected ? CHART_PRIMARY_VAR : "#94a3b8"}>
          {display}
        </text>
      );
    };
  }, [categoryFilters]);

  const categoryValueLabel = useMemo(() => {
    const selected = categoryFilters;
    const active   = selected.length > 0;
    const data     = focusModeOpen ? quantityByCategoryUnderlay : quantityByCategory;
    return function CategoryValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }): React.ReactElement | null {
      if (!active || props.index === undefined) return null;
      const entry = data[props.index];
      if (!entry || !selected.includes(entry.category)) return null;
      const lx = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
      const ly = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
      return (
        <text x={lx} y={ly} dominantBaseline="central" fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
          {entry.quantity.toLocaleString()}
        </text>
      );
    };
  }, [categoryFilters, focusModeOpen, quantityByCategory, quantityByCategoryUnderlay]);

  const focusCategoryValueLabel = useMemo(() => {
    const selected = categoryFilters;
    const active   = selected.length > 0;
    return function FocusCategoryValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }): React.ReactElement | null {
      if (!active || props.index === undefined) return null;
      const entry = quantityByCategory[props.index];
      if (!entry || !selected.includes(entry.category)) return null;
      const lx = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
      const ly = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
      return (
        <text x={lx} y={ly} dominantBaseline="central" fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
          {entry.quantity.toLocaleString()}
        </text>
      );
    };
  }, [categoryFilters, quantityByCategory]);

  // ── Spotlight: line chart month-highlight tick & dot (matches Intermediate) ─
  const salesTick = useMemo(() => {
    const months = filterMonths;
    const active  = salesGran === "M" && months.length > 0;
    return function HighlightTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string | number } }): React.ReactElement {
      const label       = String(payload?.value ?? "");
      const monthIdx    = MONTHS_SHORT_AGG.indexOf(label as typeof MONTHS_SHORT_AGG[number]);
      const highlighted = active && monthIdx !== -1 && months.includes(monthIdx);
      return (
        <g transform={`translate(${Number(x ?? 0)},${Number(y ?? 0)})`}>
          <text dy={4} textAnchor="middle" fontSize={12} fontWeight={highlighted ? 700 : 400} fill={highlighted ? CHART_PRIMARY_VAR : "#94a3b8"}>
            {label}
          </text>
        </g>
      );
    };
  }, [filterMonths, salesGran]);

  const profitTick = useMemo(() => {
    const months = filterMonths;
    const active  = profitGran === "M" && months.length > 0;
    return function HighlightTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string | number } }): React.ReactElement {
      const label       = String(payload?.value ?? "");
      const monthIdx    = MONTHS_SHORT_AGG.indexOf(label as typeof MONTHS_SHORT_AGG[number]);
      const highlighted = active && monthIdx !== -1 && months.includes(monthIdx);
      return (
        <g transform={`translate(${Number(x ?? 0)},${Number(y ?? 0)})`}>
          <text dy={4} textAnchor="middle" fontSize={12} fontWeight={highlighted ? 700 : 400} fill={highlighted ? CHART_PRIMARY_VAR : "#94a3b8"}>
            {label}
          </text>
        </g>
      );
    };
  }, [filterMonths, profitGran]);

  const salesDot = useMemo(() => {
    const months = filterMonths;
    const active  = salesGran === "M" && months.length > 0;
    return function HighlightDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { month?: string; sales?: number } }): React.ReactElement | null {
      if (!active || !cx || !cy || !payload?.month) return null;
      const mIdx = parseInt(payload.month.split("-")[1] ?? "0", 10) - 1;
      if (!months.includes(mIdx)) return null;
      const mNum   = parseInt(payload.month.split("-")[1] ?? "1", 10);
      const anchor = mNum === 1 ? "start" : mNum === 12 ? "end" : "middle";
      const lx     = mNum === 1 ? cx + 4  : mNum === 12 ? cx - 4  : cx;
      return (
        <g>
          <circle cx={cx} cy={cy} r={5} fill={CHART_PRIMARY_VAR} stroke="#fff" strokeWidth={2} />
          <text x={lx} y={cy - 12} textAnchor={anchor} fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
            {formatNaira(payload.sales ?? 0)}
          </text>
        </g>
      );
    };
  }, [filterMonths, salesGran]);

  const profitDot = useMemo(() => {
    const months = filterMonths;
    const active  = profitGran === "M" && months.length > 0;
    return function HighlightDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { month?: string; profit?: number } }): React.ReactElement | null {
      if (!active || !cx || !cy || !payload?.month) return null;
      const mIdx = parseInt(payload.month.split("-")[1] ?? "0", 10) - 1;
      if (!months.includes(mIdx)) return null;
      const mNum   = parseInt(payload.month.split("-")[1] ?? "1", 10);
      const anchor = mNum === 1 ? "start" : mNum === 12 ? "end" : "middle";
      const lx     = mNum === 1 ? cx + 4  : mNum === 12 ? cx - 4  : cx;
      return (
        <g>
          <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="#fff" strokeWidth={2} />
          <text x={lx} y={cy - 12} textAnchor={anchor} fontSize={13} fontWeight={700} fill="#10b981">
            {formatNaira(payload.profit ?? 0)}
          </text>
        </g>
      );
    };
  }, [filterMonths, profitGran]);

  return (
    <>
      <KpiStrip title="Key Numbers">
        <KpiCard label="Total Sales"   value={formatNaira(displayKpis.total_sales)}               tooltip="Total money brought in from all sales." accent="blue" compact className="w-[185px] shrink-0" />
        <KpiCard label="Total Profit"  value={formatNaira(displayKpis.total_profit)}              tooltip="What you kept after paying for stock." accent="blue" compact className="w-[185px] shrink-0" />
        <KpiCard label="Total Cost"    value={formatNaira(displayKpis.total_cost)}                tooltip="How much you spent buying the goods you sold." compact className="w-[185px] shrink-0" />
        <KpiCard label="Units Sold"    value={displayKpis.units_sold.toLocaleString()}            tooltip="Total number of individual items sold." compact className="w-[185px] shrink-0" />
        <KpiCard label="Avg. Price"    value={formatNaira(displayKpis.average_selling_price)}     tooltip="On average, how much each unit sold for." compact className="w-[185px] shrink-0" />
        <KpiCard label="Transactions"  value={displayKpis.total_transactions.toLocaleString()}    tooltip="How many separate sales were made." compact className="w-[185px] shrink-0" />
        <KpiCard label="Transfer Rate" value={`${(displayKpis.transfer_rate * 100).toFixed(0)}%`} tooltip="Share of customers who paid by bank transfer." compact className="w-[185px] shrink-0" />
      </KpiStrip>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
        <ChartCard
          title="How did your sales grow?"
          subtitle="Sales Trend"
          tooltip="Shows total money brought in each month. Peaks mean you had a strong month. A rising trend overall is what you want."
          focusable
          controls={<GranularityToggle value={salesGran} onChange={setSalesGran} />}
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              {salesGran === "Y" ? (
                <BarChart data={monthlySales} margin={{ top: 28, right: 24, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                  <Bar dataKey="sales" fill={`url(#${GRAD.blueV})`} radius={[4, 4, 0, 0]} maxBarSize={80} name="Sales">
                    <LabelList dataKey="sales" position="top" formatter={(v: unknown) => formatNaira(Number(v))} style={{ fontSize: 13, fontWeight: 700, fill: CHART_PRIMARY_VAR }} />
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={monthlySales} margin={{ top: 28, right: 16, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={salesGran === "M" ? salesTick : TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tickFormatter={formatNaira} tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} labelFormatter={(_, payload) => { const p = payload?.[0]?.payload as SalesTrendChartPoint | undefined; return p?.tooltipLabel ?? p?.label ?? ""; }} />
                  <Area type="monotone" dataKey="sales" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} fill={`url(#${GRAD.blueArea})`} dot={salesDot} activeDot={{ r: 5, fill: CHART_PRIMARY_VAR, stroke: "#fff", strokeWidth: 2 }} name="Sales" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            {salesGran === "Y" ? (
              <BarChart data={focusModeOpen ? monthlySalesUnderlay : monthlySales} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Bar dataKey="sales" fill={`url(#${GRAD.blueV})`} radius={[4, 4, 0, 0]} maxBarSize={80} name="Sales">
                  <LabelList dataKey="sales" position="top" formatter={(v: unknown) => formatNaira(Number(v))} style={{ fontSize: 13, fontWeight: 700, fill: CHART_PRIMARY_VAR }} />
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={focusModeOpen ? monthlySalesUnderlay : monthlySales} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={salesGran === "M" ? salesTick : TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} labelFormatter={(_, payload) => { const p = payload?.[0]?.payload as SalesTrendChartPoint | undefined; return p?.tooltipLabel ?? p?.label ?? ""; }} />
                <Area type="monotone" dataKey="sales" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} fill={`url(#${GRAD.blueArea})`} dot={salesDot} activeDot={{ r: 5, fill: CHART_PRIMARY_VAR, stroke: "#fff", strokeWidth: 2 }} name="Sales" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="How did profit move over time?"
          subtitle="Profit Trend"
          tooltip="Profit is what you keep after paying for your stock. A rising line here means your business is becoming more efficient."
          focusable
          controls={<GranularityToggle value={profitGran} onChange={setProfitGran} />}
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              {profitGran === "Y" ? (
                <BarChart data={monthlyProfit} margin={{ top: 28, right: 24, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                  <Bar dataKey="profit" fill={`url(#${GRAD.greenV})`} radius={[4, 4, 0, 0]} maxBarSize={80} name="Profit">
                    <LabelList dataKey="profit" position="top" formatter={(v: unknown) => formatNaira(Number(v))} style={{ fontSize: 13, fontWeight: 700, fill: "#10b981" }} />
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={monthlyProfit} margin={{ top: 28, right: 16, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={profitGran === "M" ? profitTick : TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tickFormatter={formatNaira} tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} labelFormatter={(_, payload) => { const p = payload?.[0]?.payload as ProfitTrendChartPoint | undefined; return p?.tooltipLabel ?? p?.label ?? ""; }} />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill={`url(#${GRAD.greenArea})`} dot={profitDot} activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} name="Profit" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            {profitGran === "Y" ? (
              <BarChart data={focusModeOpen ? monthlyProfitUnderlay : monthlyProfit} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Bar dataKey="profit" fill={`url(#${GRAD.greenV})`} radius={[4, 4, 0, 0]} maxBarSize={80} name="Profit">
                  <LabelList dataKey="profit" position="top" formatter={(v: unknown) => formatNaira(Number(v))} style={{ fontSize: 13, fontWeight: 700, fill: "#10b981" }} />
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={focusModeOpen ? monthlyProfitUnderlay : monthlyProfit} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={profitGran === "M" ? profitTick : TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} labelFormatter={(_, payload) => { const p = payload?.[0]?.payload as ProfitTrendChartPoint | undefined; return p?.tooltipLabel ?? p?.label ?? ""; }} />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill={`url(#${GRAD.greenArea})`} dot={profitDot} activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} name="Profit" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Which categories moved the most units?"
          subtitle="Volume by Category"
          tooltip="Click a bar to filter all charts and the transaction log. Longer bar = more units sold in that category."
          focusable
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={quantityByCategory} layout="vertical" margin={{ top: 0, right: 72, left: 0, bottom: 4 }}>
                <GradDefs />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={categoryTick} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<DashTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="quantity" radius={[0, 6, 6, 0]} name="Units" cursor="pointer">
                  {quantityByCategory.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLOURS.primaryMid}
                      fillOpacity={categoryFilters.length === 0 || categoryFilters.includes(entry.category) ? 1 : 0.3}
                      stroke={categoryFilters.includes(entry.category) ? CHART_COLOURS.primary : "none"}
                      strokeWidth={categoryFilters.includes(entry.category) ? 2 : 0}
                      onClick={() => entry.category ? toggleCategory(entry.category) : undefined}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                  <LabelList dataKey="quantity" content={focusCategoryValueLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
        >
          <div className="overflow-y-auto" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height={categoryChartHeight}>
            <BarChart data={focusModeOpen ? quantityByCategoryUnderlay : quantityByCategory} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 4 }}>
              <GradDefs />
              <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={categoryTick} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<DashTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="quantity" radius={[0, 6, 6, 0]} name="Units" cursor="pointer">
                {(focusModeOpen ? quantityByCategoryUnderlay : quantityByCategory).map((entry, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLOURS.primaryMid}
                    fillOpacity={categoryFilters.length === 0 || categoryFilters.includes(entry.category) ? 1 : 0.3}
                    stroke={categoryFilters.includes(entry.category) ? CHART_COLOURS.primary : "none"}
                    strokeWidth={categoryFilters.includes(entry.category) ? 2 : 0}
                    onClick={() => entry.category ? toggleCategory(entry.category) : undefined}
                    style={{ cursor: "pointer" }}
                  />
                ))}
                <LabelList dataKey="quantity" content={categoryValueLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
          {!focusModeOpen && categoryFilters.length > 0 && (
            <p className="text-[10px] text-primary dark:text-blue-400 font-semibold mt-1 px-1">
              Showing: {categoryFilters.join(", ")} · <button onClick={() => setCategoryFilters([])} className="underline underline-offset-1">clear</button>
            </p>
          )}
        </ChartCard>

        <ChartCard
          title="How do your customers prefer to pay?"
          subtitle="Payment Method Breakdown"
          tooltip="Click a segment to filter all charts and the transaction log by payment method."
          focusable
          focusContent={
            <div className="flex flex-col items-center gap-6 py-4">
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <Pie
                    data={paymentDist}
                    dataKey="transactions"
                    nameKey="payment_method"
                    cx="50%"
                    cy="50%"
                    innerRadius={88}
                    outerRadius={140}
                    paddingAngle={3}
                    label={({ name, value, percent }: { name?: string; value?: number; percent?: number }) =>
                      `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}% (${value ?? 0})`
                    }
                    labelLine={{ stroke: "rgba(255,255,255,0.3)", strokeWidth: 1 }}
                  >
                    {paymentDist.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLOURS[i % DONUT_COLOURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DashTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          }
        >
          <div className="flex items-center gap-6" style={{ minHeight: 280 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={focusModeOpen ? paymentDistUnderlay : paymentDist}
                  dataKey="transactions"
                  nameKey="payment_method"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={3}
                  cursor="pointer"
                >
                  {(focusModeOpen ? paymentDistUnderlay : paymentDist).map((entry, i) => (
                    <Cell
                      key={i}
                      fill={DONUT_COLOURS[i % DONUT_COLOURS.length]}
                      opacity={paymentFilters.length === 0 || paymentFilters.includes(entry.payment_method) ? 1 : 0.2}
                      stroke={paymentFilters.includes(entry.payment_method) ? "#001BB7" : "none"}
                      strokeWidth={paymentFilters.includes(entry.payment_method) ? 3 : 0}
                      onClick={() => entry.payment_method ? togglePayment(entry.payment_method) : undefined}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DashTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2.5">
              {(focusModeOpen ? paymentDistUnderlay : paymentDist).map((item, i) => (
                <button
                  key={item.payment_method}
                  onClick={() => togglePayment(item.payment_method)}
                  className={cn(
                    "flex items-center gap-2 text-xs w-full text-left rounded-lg px-1.5 py-1 transition-all",
                    paymentFilters.includes(item.payment_method)
                      ? "bg-primary/10 dark:bg-blue-900/40"
                      : "hover:bg-gray-50 dark:hover:bg-slate-800",
                    paymentFilters.length > 0 && !paymentFilters.includes(item.payment_method) && "opacity-30",
                  )}
                >
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLOURS[i % DONUT_COLOURS.length] }} />
                  <span className="text-gray-600 dark:text-slate-300 capitalize">{item.payment_method}</span>
                  <span className="ml-auto font-bold text-gray-800 dark:text-slate-200 tabular-nums">{item.transactions}</span>
                </button>
              ))}
            </div>
          </div>
          {!focusModeOpen && paymentFilters.length > 0 && (
            <p className="text-[10px] text-primary dark:text-blue-400 font-semibold mt-1 px-1">
              Showing: {paymentFilters.join(", ")} · <button onClick={() => setPaymentFilters([])} className="underline underline-offset-1">clear</button>
            </p>
          )}
        </ChartCard>
      </div>
      <BasicDetailTable
        categoryFilters={categoryFilters}
        paymentFilters={paymentFilters}
        productFilters={productFilters}
        overrideRows={focusModeOpen ? rowsForBackground : undefined}
      />
    </>
  );
}

// ── Intermediate tier content ──────────────────────────────────────────────────

function IntContent({ data }: { data: IntermediateAnalysisResult["page_1"] }): React.ReactElement {
  const { kpis, charts } = data;
  const { filterYears, filterMonths } = useDashboardStore();
  const filteredData = useFilteredData();

  // ── Granularity toggle state (per-chart) ──────────────────────────────────
  const [salesGran,  setSalesGran]  = useState<TimeGranularity>("M");
  const [profitGran, setProfitGran] = useState<TimeGranularity>("M");

  // ── Custom x-axis tick: highlight selected months in monthly view ─────────
  const salesTick = useMemo(() => {
    const months = filterMonths;
    const active  = salesGran === "M" && months.length > 0;
    return function HighlightTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string | number } }): React.ReactElement {
      const label       = String(payload?.value ?? "");
      const monthIdx    = MONTHS_SHORT_AGG.indexOf(label as typeof MONTHS_SHORT_AGG[number]);
      const highlighted = active && monthIdx !== -1 && months.includes(monthIdx);
      return (
        <g transform={`translate(${Number(x ?? 0)},${Number(y ?? 0)})`}>
          <text dy={4} textAnchor="middle" fontSize={12} fontWeight={highlighted ? 700 : 400} fill={highlighted ? CHART_PRIMARY_VAR : "#94a3b8"}>
            {label}
          </text>
        </g>
      );
    };
  }, [filterMonths, salesGran]);

  const profitTick = useMemo(() => {
    const months = filterMonths;
    const active  = profitGran === "M" && months.length > 0;
    return function HighlightTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string | number } }): React.ReactElement {
      const label       = String(payload?.value ?? "");
      const monthIdx    = MONTHS_SHORT_AGG.indexOf(label as typeof MONTHS_SHORT_AGG[number]);
      const highlighted = active && monthIdx !== -1 && months.includes(monthIdx);
      return (
        <g transform={`translate(${Number(x ?? 0)},${Number(y ?? 0)})`}>
          <text dy={4} textAnchor="middle" fontSize={12} fontWeight={highlighted ? 700 : 400} fill={highlighted ? CHART_PRIMARY_VAR : "#94a3b8"}>
            {label}
          </text>
        </g>
      );
    };
  }, [filterMonths, profitGran]);

  // ── Custom dot: render marker only on highlighted months ──────────────────
  const salesDot = useMemo(() => {
    const months = filterMonths;
    const active  = salesGran === "M" && months.length > 0;
    return function HighlightDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { month?: string; sales?: number } }): React.ReactElement | null {
      if (!active || !cx || !cy || !payload?.month) return null;
      const mIdx = parseInt(payload.month.split("-")[1] ?? "0", 10) - 1;
      if (!months.includes(mIdx)) return null;
      // Anchor away from edges: Jan → align left, Dec → align right, else centre
      const mNum   = parseInt(payload.month.split("-")[1] ?? "1", 10);
      const anchor = mNum === 1 ? "start" : mNum === 12 ? "end" : "middle";
      const lx     = mNum === 1 ? cx + 4  : mNum === 12 ? cx - 4  : cx;
      return (
        <g>
          <circle cx={cx} cy={cy} r={5} fill={CHART_PRIMARY_VAR} stroke="#fff" strokeWidth={2} />
          <text x={lx} y={cy - 12} textAnchor={anchor} fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
            {formatNaira(payload.sales ?? 0)}
          </text>
        </g>
      );
    };
  }, [filterMonths, salesGran]);

  const profitDot = useMemo(() => {
    const months = filterMonths;
    const active  = profitGran === "M" && months.length > 0;
    return function HighlightDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { month?: string; profit?: number } }): React.ReactElement | null {
      if (!active || !cx || !cy || !payload?.month) return null;
      const mIdx = parseInt(payload.month.split("-")[1] ?? "0", 10) - 1;
      if (!months.includes(mIdx)) return null;
      const mNum   = parseInt(payload.month.split("-")[1] ?? "1", 10);
      const anchor = mNum === 1 ? "start" : mNum === 12 ? "end" : "middle";
      const lx     = mNum === 1 ? cx + 4  : mNum === 12 ? cx - 4  : cx;
      return (
        <g>
          <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="#fff" strokeWidth={2} />
          <text x={lx} y={cy - 12} textAnchor={anchor} fontSize={13} fontWeight={700} fill="#10b981">
            {formatNaira(payload.profit ?? 0)}
          </text>
        </g>
      );
    };
  }, [filterMonths, profitGran]);

  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [staffFilters,    setStaffFilters]    = useState<string[]>([]);
  const [paymentFilters,  setPaymentFilters]  = useState<string[]>([]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (v: string) => setter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const categoryOptions = charts.revenue_by_category.map((d) => d.category);
  const staffOptions    = charts.staff_performance.map((d) => d.name);
  const paymentOptions  = charts.payment_method_distribution.map((d) => d.method);

  useRegisterPageFilters([
    {
      id: "category",
      label: "Category",
      options: categoryOptions,
      selected: categoryFilters,
      onToggle: toggle(setCategoryFilters),
      onClearAll: () => setCategoryFilters([]),
    },
    {
      id: "staff",
      label: "Staff",
      options: staffOptions,
      selected: staffFilters,
      onToggle: toggle(setStaffFilters),
      onClearAll: () => setStaffFilters([]),
    },
    {
      id: "payment",
      label: "Payment Method",
      options: paymentOptions,
      selected: paymentFilters,
      onToggle: toggle(setPaymentFilters),
      onClearAll: () => setPaymentFilters([]),
    },
  ]);

  // ── Derive KPIs from filtered rows when period or chart filter is active ─────
  // staffFilters intentionally excluded: detail_table has no staff field,
  // so staff filter only affects chart visual spotlight — not KPIs or trends.
  const displayKpis = useMemo((): IntPage1Kpis => {
    const hasPeriodFilter = filteredData?.isFiltered ?? false;
    const hasChartFilter  = categoryFilters.length > 0 || paymentFilters.length > 0;
    if (!hasPeriodFilter && !hasChartFilter) return kpis;
    if (!filteredData) return kpis;

    let rows = getBasicDetailTable(filteredData);
    if (categoryFilters.length > 0) rows = rows.filter((r) => categoryFilters.includes(r.category));
    if (paymentFilters.length  > 0) rows = rows.filter((r) => paymentFilters.includes(r.payment_method));

    if (rows.length === 0) {
      return { total_sales: 0, total_cost: 0, gross_profit: 0, net_sales: 0, discount_impact: 0, order_count: 0, aov: 0, daily_avg_sales: 0, profit_margin: 0 };
    }

    const total_sales   = rows.reduce((s, r) => s + r.total_sales_auto, 0);
    const gross_profit  = rows.reduce((s, r) => s + r.profit_auto, 0);
    const total_cost    = total_sales - gross_profit;
    const order_count   = rows.length;
    const aov           = total_sales / order_count;
    const profit_margin = total_sales > 0 ? parseFloat(((gross_profit / total_sales) * 100).toFixed(2)) : 0;
    const uniqueDays    = new Set(rows.map((r) => r.date)).size;
    const daily_avg_sales = uniqueDays > 0 ? total_sales / uniqueDays : 0;
    // discount_impact isn't in BasicDetailRow — scale proportionally from full-dataset value
    const scale           = kpis.total_sales > 0 ? total_sales / kpis.total_sales : 0;
    const discount_impact = kpis.discount_impact * scale;
    const net_sales       = total_sales - discount_impact;

    return { total_sales, total_cost, gross_profit, net_sales, discount_impact, order_count, aov, daily_avg_sales, profit_margin };
  }, [kpis, filteredData, categoryFilters, paymentFilters]);

  // ── Derived monthly trend from detail_table when chart filters are active ──
  // filteredData is already period-filtered; we apply category/payment on top.
  const filteredMonthTrend = useMemo(() => {
    const hasChartFilter = categoryFilters.length > 0 || paymentFilters.length > 0;
    if (!hasChartFilter || !filteredData) return null;

    let rows = getBasicDetailTable(filteredData);
    if (categoryFilters.length > 0) rows = rows.filter((r) => categoryFilters.includes(r.category));
    if (paymentFilters.length  > 0) rows = rows.filter((r) => paymentFilters.includes(r.payment_method));

    const map: Record<string, { sales: number; profit: number }> = {};
    rows.forEach((r) => {
      const month = r.date.slice(0, 7); // "2025-03"
      if (!map[month]) map[month] = { sales: 0, profit: 0 };
      map[month].sales  += r.total_sales_auto;
      map[month].profit += r.profit_auto;
    });

    const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    const monthShort = (m: string): string =>
      MONTHS_SHORT_AGG[parseInt(m.slice(5, 7), 10) - 1] ?? m.slice(5, 7);

    return {
      sales_trend:  entries.map(([month, { sales }])  => ({ month, month_short: monthShort(month), sales })),
      profit_trend: entries.map(([month, { profit }]) => ({ month, month_short: monthShort(month), profit })),
    };
  }, [filteredData, categoryFilters, paymentFilters]);

  // ── Payment chart values filtered by active category ──────────────────────
  // Bar values update when a category is selected; Cell opacity tracks paymentFilters separately.
  const filteredPaymentData = useMemo(() => {
    if (categoryFilters.length === 0 || !filteredData) return charts.payment_method_distribution;
    const rows = getBasicDetailTable(filteredData)
      .filter((r) => categoryFilters.includes(r.category));
    const map: Record<string, number> = {};
    rows.forEach((r) => { map[r.payment_method] = (map[r.payment_method] ?? 0) + r.total_sales_auto; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([method, revenue]) => ({ method, revenue }));
  }, [filteredData, categoryFilters, charts.payment_method_distribution]);

  // ── Revenue by Category re-derived when payment filter is active ───────────
  // detail_table has both category + payment_method, so cross-filtering works.
  // Staff filter can't cross-filter here — detail_table has no staff field.
  const filteredRevByCategory = useMemo(() => {
    if (paymentFilters.length === 0 || !filteredData) return null;
    const rows = getBasicDetailTable(filteredData)
      .filter((r) => paymentFilters.includes(r.payment_method));
    const map: Record<string, number> = {};
    rows.forEach((r) => { map[r.category] = (map[r.category] ?? 0) + r.total_sales_auto; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([category, revenue]) => ({ category, revenue }));
  }, [filteredData, paymentFilters]);

  // ── Sales Trend chart data — uses filteredMonthTrend when chart filters are on ──
  const salesData = useMemo((): SalesTrendChartPoint[] => {
    if (filteredMonthTrend) {
      const t = filteredMonthTrend.sales_trend;
      if (salesGran === "M") return t.map((d) => ({ label: d.month_short, sales: d.sales, month: d.month }));
      if (salesGran === "Q") return toQuarterlySales(t);
      return toYearlySales(t);
    }
    const yearFiltered = filterMonthlyTrend(charts.sales_trend, filterYears, []);
    if (salesGran === "M") return yearFiltered.map((d) => ({ label: d.month_short, sales: d.sales, month: d.month }));
    if (salesGran === "Q") return toQuarterlySales(filterMonthlyTrend(charts.sales_trend, filterYears, filterMonths));
    return toYearlySales(filterMonthlyTrend(charts.sales_trend, filterYears, filterMonths));
  }, [salesGran, charts.sales_trend, filterYears, filterMonths, filteredMonthTrend]);

  // ── Profit Trend chart data — uses filteredMonthTrend when chart filters are on ──
  const profitData = useMemo((): ProfitTrendChartPoint[] => {
    if (filteredMonthTrend) {
      const t = filteredMonthTrend.profit_trend;
      if (profitGran === "M") return t.map((d) => ({ label: d.month_short, profit: d.profit, month: d.month }));
      if (profitGran === "Q") return toQuarterlyProfit(t);
      return toYearlyProfit(t);
    }
    const yearFiltered = filterMonthlyTrend(charts.profit_trend, filterYears, []);
    if (profitGran === "M") return yearFiltered.map((d) => ({ label: d.month_short, profit: d.profit, month: d.month }));
    if (profitGran === "Q") return toQuarterlyProfit(filterMonthlyTrend(charts.profit_trend, filterYears, filterMonths));
    return toYearlyProfit(filterMonthlyTrend(charts.profit_trend, filterYears, filterMonths));
  }, [profitGran, charts.profit_trend, filterYears, filterMonths, filteredMonthTrend]);

  // ── Staff Performance: custom Y-axis tick (name highlight) ────────────────
  const staffTick = useMemo(() => {
    const selected = staffFilters;
    const active   = selected.length > 0;
    return function StaffNameTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string } }): React.ReactElement {
      const name = payload?.value ?? "";
      const isSelected = active && selected.includes(name);
      return (
        <text
          x={Number(x ?? 0)}
          y={Number(y ?? 0)}
          dy={4}
          textAnchor="end"
          fontSize={isSelected ? 13 : 12}
          fontWeight={isSelected ? 700 : 400}
          fill={isSelected ? CHART_PRIMARY_VAR : "#94a3b8"}
        >
          {name}
        </text>
      );
    };
  }, [staffFilters]);

  // ── Staff Performance: value label right of bar, only for selected staff ──
  const staffLabel = useMemo(() => {
    const selected  = staffFilters;
    const active    = selected.length > 0;
    const staffData = charts.staff_performance;
    return function StaffValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }): React.ReactElement | null {
      if (!active || props.index === undefined) return null;
      const entry = staffData[props.index];
      if (!entry || !selected.includes(entry.name)) return null;
      const lx = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
      const ly = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
      return (
        <text x={lx} y={ly} dominantBaseline="central" fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
          {formatNaira(Number(props.value ?? 0))}
        </text>
      );
    };
  }, [staffFilters, charts.staff_performance]);

  // ── Category bar: highlighted Y-axis name + value label on selected ───────
  const categoryTickInt = useMemo(() => {
    const selected = categoryFilters;
    const active   = selected.length > 0;
    return function CategoryNameTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string } }): React.ReactElement {
      const name = payload?.value ?? "";
      const isSelected = active && selected.includes(name);
      return (
        <text x={Number(x ?? 0)} y={Number(y ?? 0)} dy={4} textAnchor="end"
          fontSize={isSelected ? 13 : 12} fontWeight={isSelected ? 700 : 400}
          fill={isSelected ? CHART_PRIMARY_VAR : "#94a3b8"}>
          {name}
        </text>
      );
    };
  }, [categoryFilters]);

  const categoryLabelInt = useMemo(() => {
    const selected = categoryFilters;
    const active   = selected.length > 0;
    return function CategoryValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; payload?: { category?: string } }): React.ReactElement | null {
      if (!active || !selected.includes(props.payload?.category ?? "")) return null;
      const lx = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
      const ly = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
      return (
        <text x={lx} y={ly} dominantBaseline="central" fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
          {formatNaira(Number(props.value ?? 0))}
        </text>
      );
    };
  }, [categoryFilters]);

  // ── Payment bar: highlighted Y-axis name + value label on selected ────────
  const paymentTickInt = useMemo(() => {
    const selected = paymentFilters;
    const active   = selected.length > 0;
    return function PaymentNameTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string } }): React.ReactElement {
      const name = payload?.value ?? "";
      const isSelected = active && selected.includes(name);
      return (
        <text x={Number(x ?? 0)} y={Number(y ?? 0)} dy={4} textAnchor="end"
          fontSize={isSelected ? 13 : 12} fontWeight={isSelected ? 700 : 400}
          fill={isSelected ? CHART_PRIMARY_VAR : "#94a3b8"}>
          {name}
        </text>
      );
    };
  }, [paymentFilters]);

  const paymentLabelInt = useMemo(() => {
    const selected = paymentFilters;
    const active   = selected.length > 0;
    return function PaymentValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; payload?: { method?: string } }): React.ReactElement | null {
      if (!active || !selected.includes(props.payload?.method ?? "")) return null;
      const lx = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
      const ly = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
      return (
        <text x={lx} y={ly} dominantBaseline="central" fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
          {formatNaira(Number(props.value ?? 0))}
        </text>
      );
    };
  }, [paymentFilters]);

  return (
    <>
      <KpiStrip title="Key Numbers">
        {[
          { label: "Total Sales",              value: formatNaira(displayKpis.total_sales),            tooltip: "Total money brought in from all sales.",                                         accent: "blue"  as const },
          { label: "Total Cost",               value: formatNaira(displayKpis.total_cost),             tooltip: "Total cost of goods sold in this period.",                                       accent: "none"  as const },
          { label: "Gross Profit",             value: formatNaira(displayKpis.gross_profit),           tooltip: "Sales minus cost of goods.",                                                     accent: (displayKpis.gross_profit > 0 ? "blue" : "red") as "blue" | "red" },
          { label: "Net Sales After Discount", value: formatNaira(displayKpis.net_sales),             tooltip: "Revenue after deducting all discounts given.",                                   accent: "none"  as const },
          { label: "Discount Impact",          value: formatNaira(displayKpis.discount_impact),        tooltip: "Total value of discounts given — money left on the table.",                      accent: "amber" as const },
          { label: "Order Count",              value: displayKpis.order_count.toLocaleString(),        tooltip: "Number of orders placed in this period.",                                        accent: "none"  as const },
          { label: "Avg Order Value",          value: formatNaira(displayKpis.aov),                    tooltip: "Average revenue per order.",                                                     accent: "none"  as const },
          { label: "Daily Avg Sales",          value: formatNaira(displayKpis.daily_avg_sales),        tooltip: "Average daily revenue across the period.",                                       accent: "none"  as const },
          { label: "Profit Margin",            value: `${displayKpis.profit_margin}%`,                 tooltip: "What percentage of sales you keep as profit.",                                   accent: (displayKpis.profit_margin > 15 ? "green" : "amber") as "green" | "amber" },
        ].map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} compact className="w-[185px] shrink-0" />
        ))}
      </KpiStrip>

      {/* ── Sales Trend — full width ── */}
      <div className="mt-2">
        <ChartCard
          title="How did your sales grow month by month?"
          subtitle="Sales Trend"
          tooltip="Shows how much money came in from sales each month. A rising trend overall is what you want."
          focusable
          controls={<GranularityToggle value={salesGran} onChange={setSalesGran} />}
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              {salesGran === "Y" ? (
                <BarChart data={salesData} margin={{ top: 28, right: 24, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                  <Bar dataKey="sales" fill={`url(#${GRAD.blueV})`} radius={[4, 4, 0, 0]} maxBarSize={80} name="Sales">
                    <LabelList dataKey="sales" position="top" formatter={(v: unknown) => formatNaira(Number(v))} style={{ fontSize: 13, fontWeight: 700, fill: CHART_PRIMARY_VAR }} />
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={salesData} margin={{ top: 28, right: 24, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={salesTick} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                  <Area type="monotone" dataKey="sales" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} fill={`url(#${GRAD.blueArea})`} dot={salesDot} activeDot={{ r: 5, fill: CHART_PRIMARY_VAR, stroke: "#fff", strokeWidth: 2 }} name="Sales" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            {salesGran === "Y" ? (
              <BarChart data={salesData} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Bar dataKey="sales" fill={`url(#${GRAD.blueV})`} radius={[4, 4, 0, 0]} maxBarSize={80} name="Sales">
                  <LabelList dataKey="sales" position="top" formatter={(v: unknown) => formatNaira(Number(v))} style={{ fontSize: 13, fontWeight: 700, fill: CHART_PRIMARY_VAR }} />
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={salesData} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={salesTick} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Area type="monotone" dataKey="sales" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} fill={`url(#${GRAD.blueArea})`} dot={salesDot} activeDot={{ r: 5, fill: CHART_PRIMARY_VAR, stroke: "#fff", strokeWidth: 2 }} name="Sales" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Profit Trend — full width ── */}
      <div>
        <ChartCard
          title="How did profit move each month?"
          subtitle="Profit Trend"
          tooltip="Profit is what you keep after paying for stock. A rising line means your business is becoming more efficient month on month."
          focusable
          controls={<GranularityToggle value={profitGran} onChange={setProfitGran} />}
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              {profitGran === "Y" ? (
                <BarChart data={profitData} margin={{ top: 28, right: 24, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                  <Bar dataKey="profit" fill={`url(#${GRAD.greenV})`} radius={[4, 4, 0, 0]} maxBarSize={80} name="Profit">
                    <LabelList dataKey="profit" position="top" formatter={(v: unknown) => formatNaira(Number(v))} style={{ fontSize: 13, fontWeight: 700, fill: "#10b981" }} />
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={profitData} margin={{ top: 28, right: 24, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={profitTick} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill={`url(#${GRAD.greenArea})`} dot={profitDot} activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} name="Profit" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            {profitGran === "Y" ? (
              <BarChart data={profitData} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Bar dataKey="profit" fill={`url(#${GRAD.greenV})`} radius={[4, 4, 0, 0]} maxBarSize={80} name="Profit">
                  <LabelList dataKey="profit" position="top" formatter={(v: unknown) => formatNaira(Number(v))} style={{ fontSize: 13, fontWeight: 700, fill: "#10b981" }} />
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={profitData} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={profitTick} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} width={62} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill={`url(#${GRAD.greenArea})`} dot={profitDot} activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} name="Profit" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Bottom row — Category | Payment | Staff (3-col horizontal bars) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* revByCatData: re-derived when payment filter is active, else pre-aggregated */}
        {(() => {
          const revByCatData = filteredRevByCategory ?? charts.revenue_by_category;
          return (
        <ChartCard
          title="Revenue by category"
          subtitle="Category Breakdown"
          tooltip="Click a bar to highlight that category and dim the rest. Click again to deselect."
          focusable
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={revByCatData} layout="vertical" margin={{ top: 0, right: 72, left: 0, bottom: 4 }}>
                <GradDefs />
                <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={categoryTickInt} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} cursor={{ fill: "transparent" }} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue" cursor="pointer">
                  {revByCatData.map((entry, i) => (
                    <Cell key={i} fill={`url(#${GRAD.blueH})`}
                      opacity={categoryFilters.length === 0 || categoryFilters.includes(entry.category) ? 1 : 0.2}
                      stroke={categoryFilters.includes(entry.category) ? CHART_COLOURS.primary : "none"}
                      strokeWidth={categoryFilters.includes(entry.category) ? 2 : 0}
                      onClick={() => toggle(setCategoryFilters)(entry.category)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                  <LabelList dataKey="revenue" content={categoryLabelInt} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revByCatData} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 4 }}>
              <GradDefs />
              <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={categoryTickInt} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue" cursor="pointer">
                {revByCatData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={`url(#${GRAD.blueH})`}
                    opacity={categoryFilters.length === 0 || categoryFilters.includes(entry.category) ? 1 : 0.2}
                    stroke={categoryFilters.includes(entry.category) ? CHART_COLOURS.primary : "none"}
                    strokeWidth={categoryFilters.includes(entry.category) ? 2 : 0}
                    onClick={() => toggle(setCategoryFilters)(entry.category)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
                <LabelList dataKey="revenue" content={categoryLabelInt} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {categoryFilters.length > 0 && (
            <p className="text-[11px] text-primary dark:text-blue-400 font-semibold mt-1 px-1">
              Showing: {categoryFilters.join(", ")} · <button onClick={() => setCategoryFilters([])} className="underline underline-offset-1">clear</button>
            </p>
          )}
        </ChartCard>
          );
        })()}

        {/* Payment — horizontal bar replaces donut for scannability */}
        <ChartCard
          title="How do customers prefer to pay?"
          subtitle="Payment Methods"
          tooltip="Click a bar to filter by payment method. Click again to deselect."
          focusable
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={filteredPaymentData} layout="vertical" margin={{ top: 0, right: 72, left: 0, bottom: 4 }}>
                <GradDefs />
                <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="method" tick={paymentTickInt} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} cursor={{ fill: "transparent" }} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue" cursor="pointer">
                  {filteredPaymentData.map((entry, i) => (
                    <Cell key={i} fill={`url(#${GRAD.blueH})`}
                      opacity={paymentFilters.length === 0 || paymentFilters.includes(entry.method) ? 1 : 0.2}
                      stroke={paymentFilters.includes(entry.method) ? CHART_COLOURS.primary : "none"}
                      strokeWidth={paymentFilters.includes(entry.method) ? 2 : 0}
                      onClick={() => toggle(setPaymentFilters)(entry.method)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                  <LabelList dataKey="revenue" content={paymentLabelInt} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={filteredPaymentData} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 4 }}>
              <GradDefs />
              <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="method" tick={paymentTickInt} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue" cursor="pointer">
                {filteredPaymentData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={`url(#${GRAD.blueH})`}
                    opacity={paymentFilters.length === 0 || paymentFilters.includes(entry.method) ? 1 : 0.2}
                    stroke={paymentFilters.includes(entry.method) ? CHART_COLOURS.primary : "none"}
                    strokeWidth={paymentFilters.includes(entry.method) ? 2 : 0}
                    onClick={() => toggle(setPaymentFilters)(entry.method)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
                <LabelList dataKey="revenue" content={paymentLabelInt} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {paymentFilters.length > 0 && (
            <p className="text-[11px] text-primary dark:text-blue-400 font-semibold mt-1 px-1">
              Showing: {paymentFilters.join(", ")} · <button onClick={() => setPaymentFilters([])} className="underline underline-offset-1">clear</button>
            </p>
          )}
        </ChartCard>

        {/* Staff — horizontal bar for easier name reading */}
        <ChartCard
          title="Which staff brought in the most revenue?"
          subtitle="Staff Performance"
          tooltip="Click a bar to highlight that staff member and dim the rest. Click again to deselect."
          focusable
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={charts.staff_performance} layout="vertical" margin={{ top: 4, right: 72, left: 0, bottom: 4 }}>
                <GradDefs />
                <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={staffTick} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} cursor={{ fill: "transparent" }} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue" cursor="pointer">
                  {charts.staff_performance.map((entry, i) => (
                    <Cell key={i} fill={`url(#${GRAD.blueH})`}
                      opacity={staffFilters.length === 0 || staffFilters.includes(entry.name) ? 1 : 0.2}
                      stroke={staffFilters.includes(entry.name) ? CHART_COLOURS.primary : "none"}
                      strokeWidth={staffFilters.includes(entry.name) ? 2 : 0}
                      onClick={() => toggle(setStaffFilters)(entry.name)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                  <LabelList dataKey="revenue" content={staffLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.staff_performance} layout="vertical" margin={{ top: 4, right: 64, left: 0, bottom: 4 }}>
              <GradDefs />
              <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={staffTick} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue" cursor="pointer">
                {charts.staff_performance.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={`url(#${GRAD.blueH})`}
                    opacity={staffFilters.length === 0 || staffFilters.includes(entry.name) ? 1 : 0.2}
                    stroke={staffFilters.includes(entry.name) ? CHART_COLOURS.primary : "none"}
                    strokeWidth={staffFilters.includes(entry.name) ? 2 : 0}
                    onClick={() => toggle(setStaffFilters)(entry.name)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
                <LabelList dataKey="revenue" content={staffLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {staffFilters.length > 0 && (
            <p className="text-[11px] text-primary dark:text-blue-400 font-semibold mt-1 px-1">
              Showing: {staffFilters.join(", ")} · <button onClick={() => setStaffFilters([])} className="underline underline-offset-1">clear</button>
            </p>
          )}
        </ChartCard>
      </div>
    </>
  );
}

// ── Advanced tier content ──────────────────────────────────────────────────────

function AdvContent({ data }: { data: AdvancedAnalysisResult["page_1"] }): React.ReactElement {
  const { kpis, charts } = data;
  const { filterYears, filterMonths } = useDashboardStore();
  const filteredData = useFilteredData();
  const fromM = (v: number): string => formatNaira(v * 1_000_000);

  const revenueTrend = filterMonthlyTrend(
    charts.revenue_trend as Array<{ month: string; month_short: string; revenue: number }>,
    filterYears, filterMonths,
  );
  const profitTrend = filterMonthlyTrend(
    charts.profit_trend as Array<{ month: string; month_short: string; profit: number }>,
    filterYears, filterMonths,
  );

  const waterfallSteps = (charts.profit_waterfall as { steps?: WaterfallStep[] } | null)?.steps ?? [];
  const waterfallData = waterfallSteps.map((s) => ({
    label:      s.label,
    value:      Math.abs(s.value),
    isNegative: s.value < 0,
    type:       s.type,
    raw:        s.value,
  }));

  // ── Derive KPIs from filtered rows when period filter is active ───────────
  const displayKpis = useMemo((): AdvPage1Kpis => {
    const hasPeriodFilter = filteredData?.isFiltered ?? false;
    if (!hasPeriodFilter || !filteredData) return kpis;

    const rows = getBasicDetailTable(filteredData);
    if (rows.length === 0) return kpis;

    const total_sales  = rows.reduce((s, r) => s + r.total_sales_auto, 0);
    const gross_profit = rows.reduce((s, r) => s + r.profit_auto, 0);
    const order_count  = rows.length;
    const profit_pct   = total_sales > 0 ? (gross_profit / total_sales) * 100 : 0;

    // net_profit: scale from original by gross_profit ratio
    // (can't subtract full expenses — expense rows aren't in BasicDetailRow)
    const origGP       = parseNairaStr(kpis.gross_profit);
    const scale        = origGP > 0 ? gross_profit / origGP : 0;
    const net_profit   = formatNaira(parseNairaStr(kpis.net_profit) * scale);

    return {
      ...kpis,
      gross_revenue: formatNaira(total_sales),
      gross_profit:  formatNaira(gross_profit),
      net_profit,
      profit_margin: `${profit_pct.toFixed(1)}%`,
      order_count,
    };
  }, [kpis, filteredData]);

  return (
    <>
      <KpiStrip title="Key Numbers">
        <KpiCard label="Gross Revenue" value={displayKpis.gross_revenue}   tooltip="Total money earned from all sales before deductions." compact className="w-[185px] shrink-0" />
        <KpiCard label="Gross Profit"  value={displayKpis.gross_profit}    tooltip="Revenue minus cost of goods sold." compact className="w-[185px] shrink-0" />
        <KpiCard label="Net Profit"    value={displayKpis.net_profit}      tooltip="Profit after all operating expenses." accent={displayKpis.net_profit.startsWith("₦-") ? "red" : "green"} compact className="w-[185px] shrink-0" />
        <KpiCard label="Profit Margin" value={displayKpis.profit_margin}   tooltip="Percentage of revenue kept as net profit." accent={displayKpis.profit_margin.startsWith("-") ? "red" : "green"} compact className="w-[185px] shrink-0" />
        <KpiCard label="Orders"        value={displayKpis.order_count.toLocaleString()} tooltip="Total number of orders placed." compact className="w-[185px] shrink-0" />
      </KpiStrip>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Monthly revenue trend" subtitle="Revenue Trend" tooltip="Shows how your total revenue moved month by month. A rising curve means the business is growing." focusable focusContent={
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={revenueTrend} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
                <Area type="monotone" dataKey="revenue" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} fill={`url(#${GRAD.blueArea})`} dot={false} name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          }>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <GradDefs />
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
              <YAxis tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
              <Area type="monotone" dataKey="revenue" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} fill={`url(#${GRAD.blueArea})`} dot={false} name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="How did profit move each month?" subtitle="Profit Trend" tooltip="Profit is what you keep after paying for stock and expenses. Rising line = the business is becoming more efficient." focusable focusContent={
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={profitTrend} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          }>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={profitTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <GradDefs />
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
              <YAxis tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={false} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue by category" subtitle="Category Breakdown" tooltip="How much money each product group earned. Longer bar = more revenue from that category." focusable focusContent={
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={charts.revenue_by_category} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 4 }}>
                <GradDefs />
                <XAxis type="number" tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={TICK} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
                <Bar dataKey="revenue" fill={`url(#${GRAD.blueH})`} radius={[0, 6, 6, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          }>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.revenue_by_category} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 4 }}>
              <GradDefs />
              <XAxis type="number" tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={TICK} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
              <Bar dataKey="revenue" fill={`url(#${GRAD.blueH})`} radius={[0, 6, 6, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="How do customers prefer to pay?" subtitle="Payment Methods" tooltip="Shows how customers are paying — cash, transfer, or card. Use this to plan how you handle money." focusable focusContent={
            <div className="flex flex-col items-center justify-center h-[500px]">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={charts.payment_method_distribution}
                    dataKey="revenue"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    innerRadius={88}
                    outerRadius={140}
                    paddingAngle={3}
                    label={({ name, value }: { name?: string; value?: number }) =>
                      `${name ?? ""}: ${fromM(value ?? 0)}`
                    }
                    labelLine={{ stroke: "rgba(255,255,255,0.3)", strokeWidth: 1 }}
                  >
                    {charts.payment_method_distribution.map((_e, i) => <Cell key={i} fill={DONUT_COLOURS[i % DONUT_COLOURS.length]} />)}
                  </Pie>
                  <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
                  <Legend formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          }>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={charts.payment_method_distribution} dataKey="revenue" nameKey="method" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3}>
                  {charts.payment_method_distribution.map((_e, i) => <Cell key={i} fill={DONUT_COLOURS[i % DONUT_COLOURS.length]} />)}
                </Pie>
                <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2.5">
              {charts.payment_method_distribution.map((item, i) => (
                <div key={item.method} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLOURS[i % DONUT_COLOURS.length] }} />
                  <span className="text-gray-600 dark:text-slate-300 capitalize">{item.method}</span>
                  <span className="ml-auto font-bold text-gray-800 dark:text-slate-200 tabular-nums">{fromM(item.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
        {waterfallData.length > 0 && (
          <ChartCard title="Where did the profit go?" subtitle="Profit Waterfall" tooltip="Starts from your gross profit and subtracts each expense. The final bar is your net profit — what the business truly kept." className="col-span-full lg:col-span-2" focusable focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={waterfallData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v) => typeof v === "number" ? fromM(v) : String(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((entry, i) => (
                      <Cell key={i} fill={
                        entry.type === "start" ? "#001BB7" :
                        entry.type === "end"   ? (entry.raw < 0 ? "#ef4444" : "#10b981") :
                        "#ef4444"
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={waterfallData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v) => typeof v === "number" ? fromM(v) : String(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.type === "start" ? "#001BB7" :
                        entry.type === "end"   ? (entry.raw < 0 ? "#ef4444" : "#10b981") :
                        "#ef4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </>
  );
}

// ── Named export — used by the thin page shell ────────────────────────────────

export interface SalesContentProps {
  firstName: string;
}

export function SalesContent({ firstName }: SalesContentProps): React.ReactElement | null {
  const tierData    = useSalesPageData();
  const basicRaw    = useBasicAnalysis();
  const filteredData = useFilteredData();
  const metadata    = useTierMetadata();
  const { focusModeOpen } = useDashboardStore();

  // Refs must be declared before any early return (Rules of Hooks).
  // Typed wide enough to hold either BasicMetadata (date_range.start: string|null) or TierMetadata.
  const frozenMetaRef = useRef<{ date_range: { start: string | null; end: string | null }; record_count: number } | null>(null);
  const prevFocusRef  = useRef(false);

  if (!tierData) return null;

  const fmtDate = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  // For Basic tier, derive metadata from filtered data when available.
  // For Int/Adv, use tier metadata directly.
  const liveMeta = tierData.tier === "basic"
    ? (filteredData?.metadata ?? metadata)
    : metadata;

  // Freeze header metadata when focus mode opens so the header doesn't update mid-focus.
  if (focusModeOpen && !prevFocusRef.current) {
    frozenMetaRef.current = liveMeta;
  }
  prevFocusRef.current = focusModeOpen;
  const displayMeta = focusModeOpen ? (frozenMetaRef.current ?? liveMeta) : liveMeta;

  const greeting = getGreeting();

  return (
    <>
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Sales</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          {greeting}, <EditableGreeting fallbackName={firstName} /> 👋
        </h1>
        {displayMeta && (
          <div className="flex items-center gap-2 mt-1">
            <CalendarIcon className="size-3.5 text-gray-400 dark:text-slate-500" />
            <p className="text-sm text-gray-400 dark:text-slate-500">
              {fmtDate(displayMeta.date_range.start)} – {fmtDate(displayMeta.date_range.end)}
              {" · "}{displayMeta.record_count} transactions
            </p>
          </div>
        )}
      </div>

      {tierData.tier === "basic" && filteredData?.page_1 && basicRaw?.page_1 && (
        <BasicContent data={filteredData.page_1} rawData={basicRaw.page_1} />
      )}
      {tierData.tier === "intermediate" && <IntContent data={tierData.data} />}
      {tierData.tier === "advanced"     && <AdvContent data={tierData.data} />}
    </>
  );
}
