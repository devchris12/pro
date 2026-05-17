"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
  Cell,
} from "recharts";
import { useIntermediateAnalysis, useAdvancedAnalysis } from "@/app/hooks/useDashboardData";
import { filterMonthlyTrend, toDate } from "@/app/hooks/useFilteredData";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import { formatNaira, cn, fmtTableDate, getGreeting } from "@/lib/utils";
import {
  DashTooltip, GradDefs, GRAD,
  SectionHeader, ChartCard, KpiCard, KpiStrip,
  TICK, GRID_STROKE, CHART_PRIMARY_VAR,
} from "@/app/components/ui/dashboard/ChartUtils";
import { EditableGreeting } from "@/app/components/ui/dashboard/EditableGreeting";
import { useRegisterPageFilters } from "@/app/hooks/useRegisterPageFilters";
import type { IntermediateAnalysisResult } from "@/app/types/intermediateAnalysis";
import type { AdvancedAnalysisResult } from "@/app/types/advancedAnalysis";

// ── Shared types + helpers ────────────────────────────────────────────────────

interface WaterfallStep {
  label: string;
  value: number;
  type: "start" | "decrease" | "end";
}
interface WaterfallObj { steps?: WaterfallStep[] }

function matchesDateFilters(
  dateStr: string,
  filterYears: number[],
  filterMonths: number[],
  filterDaysOfWeek: number[],
): boolean {
  const d = toDate(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  if (filterYears.length > 0 && !filterYears.includes(d.getFullYear())) return false;
  if (filterMonths.length > 0 && !filterMonths.includes(d.getMonth())) return false;
  if (filterDaysOfWeek.length > 0 && !filterDaysOfWeek.includes(d.getDay())) return false;
  return true;
}

function parseCurrency(value: string): number {
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildWaterfallData(steps: WaterfallStep[]): Array<{ label: string; value: number; isNegative: boolean; type: string; raw: number }> {
  return steps.map((s) => ({
    label:      s.label,
    value:      Math.abs(s.value),
    isNegative: s.value < 0,
    type:       s.type,
    raw:        s.value,
  }));
}

function WaterfallBars({ data, valueFmt }: { data: ReturnType<typeof buildWaterfallData>; valueFmt: (v: number) => string }): React.ReactElement {
  return (
    <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
      <GradDefs />
      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
      <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
      <YAxis tickFormatter={valueFmt} tick={TICK} axisLine={false} tickLine={false} width={70} />
      <Tooltip formatter={(v) => typeof v === "number" ? valueFmt(v) : String(v)} />
      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
        {data.map((entry, i) => (
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
  );
}

function OperatingProfitWaterfall({
  waterfall,
  liveWaterfall,
  valueFmt,
  className = "col-span-full lg:col-span-2",
}: {
  waterfall: WaterfallObj | unknown;
  liveWaterfall?: WaterfallObj | unknown;
  valueFmt: (v: number) => string;
  className?: string;
}): React.ReactElement | null {
  const steps = (waterfall as WaterfallObj)?.steps;
  if (!steps || steps.length === 0) return null;

  const data     = buildWaterfallData(steps);
  const liveSteps = (liveWaterfall as WaterfallObj)?.steps ?? steps;
  const liveData  = buildWaterfallData(liveSteps);

  return (
    <ChartCard
      title="Where did gross profit go?"
      subtitle="Operating Profit Waterfall"
      tooltip="Starts at gross profit and subtracts each operating cost one by one. The final bar is your operating profit — what the business truly earned after all expenses."
      className={className}
      focusable
      focusContent={
        <ResponsiveContainer width="100%" height={500}>
          <WaterfallBars data={liveData} valueFmt={valueFmt} />
        </ResponsiveContainer>
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <GradDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
          <YAxis tickFormatter={valueFmt} tick={TICK} axisLine={false} tickLine={false} width={70} />
          <Tooltip formatter={(v) => typeof v === "number" ? valueFmt(v) : String(v)} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
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
  );
}

// ── Expense detail table — Intermediate ──────────────────────────────────────

function IntExpenseTable({ allRows }: { allRows: IntermediateAnalysisResult["page_4"]["expense_detail_table"] }): React.ReactElement {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const [paidToFilters, setPaidToFilters] = useState<string[]>([]);
  const togglePaidTo = (v: string): void =>
    setPaidToFilters((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const paidToOptions = useMemo(
    () => [...new Set(allRows.map((r) => r.paid_to).filter(Boolean))].sort(),
    [allRows]
  );
  const rows = paidToFilters.length > 0
    ? allRows.filter((r) => paidToFilters.includes(r.paid_to))
    : allRows;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  React.useEffect(() => { setPage(0); }, [paidToFilters]);

  useRegisterPageFilters([
    {
      id: "paidto",
      label: "Paid To",
      options: paidToOptions,
      selected: paidToFilters,
      onToggle: togglePaidTo,
      onClearAll: () => setPaidToFilters([]),
    },
  ]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Expense Log</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{rows.length} of {allRows.length} expense transactions</p>
      </div>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
              {["Date", "Amount", "Paid To", "Notes"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={i} className={cn("relative border-b border-gray-50 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:scale-[1.01] hover:z-10 transition-all duration-150", i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50/40 dark:bg-slate-800/30")}>
                <td className="px-4 py-2.5 text-gray-400 dark:text-slate-500 whitespace-nowrap tabular-nums">{fmtTableDate(row.date)}</td>
                <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-slate-200 tabular-nums">{formatNaira(row.amount)}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300">{row.paid_to}</td>
                <td className="px-4 py-2.5 text-gray-400 dark:text-slate-500 max-w-[200px] truncate">{row.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-400 dark:text-slate-500">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-xs text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-blue-500/50 text-xs text-gray-600 dark:text-blue-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-blue-500/10 transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Expense detail table — Advanced ──────────────────────────────────────────

function AdvExpenseTable({ allRows }: { allRows: AdvancedAnalysisResult["page_5"]["expense_detail_table"] }): React.ReactElement {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const [typeFilters, setTypeFilters]     = useState<string[]>([]);
  const [branchFilters, setBranchFilters] = useState<string[]>([]);
  const toggleType   = (v: string): void =>
    setTypeFilters((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  const toggleBranch = (v: string): void =>
    setBranchFilters((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const typeOptions   = useMemo(() => [...new Set(allRows.map((r) => r.expense_type).filter(Boolean))].sort(), [allRows]);
  const branchOptions = useMemo(() => [...new Set(allRows.map((r) => r.branch).filter(Boolean))].sort(), [allRows]);

  const rows = allRows.filter((r) => {
    if (typeFilters.length > 0   && !typeFilters.includes(r.expense_type))   return false;
    if (branchFilters.length > 0 && !branchFilters.includes(r.branch)) return false;
    return true;
  });

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  React.useEffect(() => { setPage(0); }, [typeFilters, branchFilters]);

  useRegisterPageFilters([
    { id: "type",   label: "Expense Type", options: typeOptions,   selected: typeFilters,   onToggle: toggleType,   onClearAll: () => setTypeFilters([])   },
    { id: "branch", label: "Branch",       options: branchOptions, selected: branchFilters, onToggle: toggleBranch, onClearAll: () => setBranchFilters([]) },
  ]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Expense Log</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{rows.length} of {allRows.length} expense transactions</p>
      </div>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
              {["Date", "Branch", "Type", "Amount", "Paid To", "Receipt", "Approved By"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={i} className={cn("relative border-b border-gray-50 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:scale-[1.01] hover:z-10 transition-all duration-150", i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50/40 dark:bg-slate-800/30")}>
                <td className="px-4 py-2.5 text-gray-400 dark:text-slate-500 whitespace-nowrap">{fmtTableDate(row.date)}</td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-slate-400">{row.branch}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50">{row.expense_type}</span>
                </td>
                <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-slate-200 tabular-nums">{row.amount}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300">{row.paid_to}</td>
                <td className="px-4 py-2.5 text-gray-400 dark:text-slate-500 font-mono text-[10px]">{row.receipt_no}</td>
                <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400">{row.approved_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-400 dark:text-slate-500">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-xs text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-blue-500/50 text-xs text-gray-600 dark:text-blue-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-blue-500/10 transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Intermediate content ──────────────────────────────────────────────────────

function IntContent({ data, liveData }: { data: IntermediateAnalysisResult["page_4"]; liveData: IntermediateAnalysisResult["page_4"] }): React.ReactElement {
  const { kpis, charts } = data;
  const { charts: liveCharts } = liveData;

  // Derive expense by category from the notes field on each detail row
  const expenseByCategoryData = useMemo(() => {
    const grouped: Record<string, number> = {};
    data.expense_detail_table.forEach((row) => {
      const cat = row.notes || "Other";
      grouped[cat] = (grouped[cat] ?? 0) + row.amount;
    });
    return Object.entries(grouped)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [data.expense_detail_table]);

  return (
    <>
      <KpiStrip title="Key Numbers">
        <KpiCard label="Total Expenses"   value={formatNaira(kpis.total_expenses)}      tooltip="All money spent running your business in this period." compact className="w-[185px] shrink-0" />
        <KpiCard label="Operating Profit" value={formatNaira(kpis.operating_profit)}    tooltip="Gross profit minus all operating expenses." accent={kpis.operating_profit < 0 ? "red" : "green"} compact className="w-[185px] shrink-0" />
        <KpiCard label="Expense Share"    value={`${kpis.expense_share}%`}              tooltip="What percentage of your revenue went to expenses." compact className="w-[185px] shrink-0" />
        <KpiCard label="Monthly Average"  value={formatNaira(kpis.monthly_avg_expense)} tooltip="Average spend per month across the period." compact className="w-[185px] shrink-0" />
        <KpiCard label="Profit Margin"    value={`${kpis.net_profit_margin}%`}          tooltip="Operating profit as a percentage of total revenue." accent={kpis.net_profit_margin < 0 ? "red" : "green"} compact className="w-[185px] shrink-0" />
      </KpiStrip>

      {/* ── Row 1: Expense Trend | Expense vs Sales ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {charts.expense_moving_avg.length > 0 && (
          <ChartCard
            title="How your spending changed over time"
            subtitle="Monthly Expense Trend"
            tooltip="Bars show your total spending each month. The dashed line is a 3-month rolling average — it smooths out one-off spikes so you can see the real trend."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={liveCharts.expense_moving_avg} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatNaira(v)} width={70} />
                  <Tooltip content={<DashTooltip valueFormatter={(v) => formatNaira(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="amount" name="Monthly Expenses" fill={`url(#${GRAD.amberV})`} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="moving_avg" name="Moving Avg" stroke="#d97706" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={charts.expense_moving_avg} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatNaira(v)} width={70} />
                <Tooltip content={<DashTooltip valueFormatter={(v) => formatNaira(v)} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="amount" name="Monthly Expenses" fill={`url(#${GRAD.amberV})`} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="moving_avg" name="Moving Avg" stroke="#d97706" strokeWidth={2} strokeDasharray="4 2" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {charts.expense_vs_sales.length > 0 && (
          <ChartCard
            title="Are your expenses eating into your sales?"
            subtitle="Expenses vs Sales"
            tooltip="Bars = expenses per month. Line = sales. You want a big gap between them. If the bars start approaching the line, your profit margin is being squeezed."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={liveCharts.expense_vs_sales} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatNaira(v)} width={70} />
                  <Tooltip content={<DashTooltip valueFormatter={(v) => formatNaira(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="expenses" name="Expenses" fill={`url(#${GRAD.amberV})`} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="sales" name="Sales" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={charts.expense_vs_sales} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatNaira(v)} width={70} />
                <Tooltip content={<DashTooltip valueFormatter={(v) => formatNaira(v)} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="expenses" name="Expenses" fill={`url(#${GRAD.amberV})`} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* ── Row 2: Expense Log (left) | Waterfall (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <IntExpenseTable allRows={data.expense_detail_table} />
        <OperatingProfitWaterfall
          waterfall={charts.operating_profit_waterfall}
          liveWaterfall={liveCharts.operating_profit_waterfall}
          valueFmt={formatNaira}
          className=""
        />
      </div>

      {/* ── Expense by Category — derived from notes field (renders only if notes data exists) ── */}
      {expenseByCategoryData.length > 0 && (
        <div className="mt-4">
          <ChartCard
            title="Where is most of your money going?"
            subtitle="Expense by Category"
            tooltip="Breaks down your total expenses by category based on transaction notes. The longest bar = your biggest cost area."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={expenseByCategoryData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" tick={TICK} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                  <Bar dataKey="amount" name="Amount" fill={`url(#${GRAD.amberH})`} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={expenseByCategoryData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 4 }}>
                <GradDefs />
                <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={TICK} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Bar dataKey="amount" name="Amount" fill={`url(#${GRAD.amberH})`} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </>
  );
}

// ── Advanced content ──────────────────────────────────────────────────────────

function AdvContent({ data, liveData }: { data: AdvancedAnalysisResult["page_5"]; liveData: AdvancedAnalysisResult["page_5"] }): React.ReactElement {
  const { kpis, charts } = data;
  const { charts: liveCharts } = liveData;
  const fromM = (v: number): string => formatNaira(v * 1_000_000);
  const xFmt = (v: string): string => { const d = new Date(v); return isNaN(d.getTime()) ? String(v).slice(0, 6) : d.toLocaleDateString("en", { month: "short", day: "numeric" }); };

  const DONUT_COLOURS_LOCAL = ["#001BB7","#2563eb","#60a5fa","#f59e0b","#ef4444","#10b981","#8b5cf6","#f97316"];
  const catData     = (charts.expense_by_category as Array<{ category: string; amount: number }>).slice(0, 6);
  const liveCatData = (liveCharts.expense_by_category as Array<{ category: string; amount: number }>).slice(0, 6);

  return (
    <>
      <KpiStrip title="Key Numbers">
        <KpiCard label="Total Expenses"   value={kpis.total_expenses}           tooltip="All money spent running your business in this period." compact className="w-[185px] shrink-0" />
        <KpiCard label="Operating Profit" value={kpis.operating_profit}         tooltip="Gross profit minus all operating expenses." accent={kpis.operating_profit.startsWith("₦-") ? "red" : "green"} compact className="w-[185px] shrink-0" />
        <KpiCard label="Expense Share"    value={kpis.expense_share}            tooltip="What percentage of your revenue went to expenses." compact className="w-[185px] shrink-0" />
        <KpiCard label="Largest Category" value={kpis.largest_expense_category} tooltip="The type of expense that cost you the most." compact className="w-[185px] shrink-0" />
        <KpiCard label="Monthly Average"  value={kpis.monthly_avg_expense}      tooltip="Average spend per month across the period." compact className="w-[185px] shrink-0" />
        <KpiCard label="Transactions"     value={String(kpis.expense_transactions)} tooltip="Number of individual expense entries recorded." compact className="w-[185px] shrink-0" />
      </KpiStrip>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {charts.expense_trend.length > 0 && (
          <ChartCard
            title="How your spending changed over time"
            subtitle="Expense Trend"
            tooltip="Shows how much you spent over time. A rising trend means costs are going up — watch this alongside your sales to make sure expenses don't outpace revenue."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <AreaChart data={liveCharts.expense_trend} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date_str" tick={TICK} tickLine={false} axisLine={false} tickFormatter={xFmt} interval="preserveStartEnd" padding={{ left: 15, right: 15 }} />
                  <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => fromM(v)} width={70} />
                  <Tooltip content={<DashTooltip valueFormatter={(v) => fromM(v)} />} />
                  <Area type="monotone" dataKey="expenses" fill={`url(#${GRAD.amberV})`} stroke="#d97706" strokeWidth={2} dot={false} name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.expense_trend} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="date_str" tick={TICK} tickLine={false} axisLine={false} tickFormatter={xFmt} interval="preserveStartEnd" padding={{ left: 15, right: 15 }} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => fromM(v)} width={70} />
                <Tooltip content={<DashTooltip valueFormatter={(v) => fromM(v)} />} />
                <Area type="monotone" dataKey="expenses" fill={`url(#${GRAD.amberV})`} stroke="#d97706" strokeWidth={2} dot={false} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {charts.expense_vs_sales.length > 0 && (
          <ChartCard
            title="Are your expenses eating into your sales?"
            subtitle="Expenses vs Sales"
            tooltip="Bars = expenses per month. Line = sales. You want a big gap between them. If the bars start approaching the line, your profit margin is being squeezed."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={liveCharts.expense_vs_sales} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => fromM(v)} width={70} />
                  <Tooltip content={<DashTooltip valueFormatter={(v) => fromM(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="expenses" name="Expenses" fill={`url(#${GRAD.amberV})`} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="sales" name="Sales" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={charts.expense_vs_sales} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => fromM(v)} width={70} />
                <Tooltip content={<DashTooltip valueFormatter={(v) => fromM(v)} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="expenses" name="Expenses" fill={`url(#${GRAD.amberV})`} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {catData.length > 0 && (
          <ChartCard
            title="Where is most of your money going?"
            subtitle="Expense by Category"
            tooltip="Breaks down your total expenses by category. The longest bar = your biggest cost area. Focus here first to reduce spending."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={liveCatData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <XAxis type="number" tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" tick={TICK} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {liveCatData.map((_e, i) => (<Cell key={i} fill={DONUT_COLOURS_LOCAL[i % DONUT_COLOURS_LOCAL.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          >
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 4 }}>
                  <GradDefs />
                  <XAxis type="number" tickFormatter={fromM} tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" tick={TICK} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<DashTooltip valueFormatter={fromM} />} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {catData.map((_e, i) => (<Cell key={i} fill={DONUT_COLOURS_LOCAL[i % DONUT_COLOURS_LOCAL.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {catData.map((item, i) => (
                  <div key={item.category} className="flex items-center gap-2 text-xs">
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLOURS_LOCAL[i % DONUT_COLOURS_LOCAL.length] }} />
                    <span className="text-gray-600 dark:text-slate-300 truncate max-w-[120px]">{item.category}</span>
                    <span className="ml-auto font-bold text-gray-800 dark:text-slate-200 tabular-nums">{fromM(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        )}

        <OperatingProfitWaterfall waterfall={charts.operating_profit_waterfall} liveWaterfall={liveCharts.operating_profit_waterfall} valueFmt={fromM} />
      </div>
    </>
  );
}

// ── Named export — used by the thin page shell ────────────────────────────────

export interface ExpensesContentProps {
  firstName: string;
}

export function ExpensesContent({ firstName }: ExpensesContentProps): React.ReactElement {
  const {
    devTier, filterYears, filterMonths, filterDaysOfWeek, focusModeOpen,
    setFilterYears, setFilterMonths, setFilterDaysOfWeek,
  } = useDashboardStore();

  const intData = useIntermediateAnalysis();
  const advData = useAdvancedAnalysis();
  const isFiltered = filterYears.length > 0 || filterMonths.length > 0 || filterDaysOfWeek.length > 0;

  const filteredIntPage4 = useMemo(() => {
    const rows = intData.page_4.expense_detail_table.filter((r) =>
      matchesDateFilters(r.date, filterYears, filterMonths, filterDaysOfWeek),
    );
    const expenseTrend = intData.page_4.charts.expense_trend.filter((p) =>
      matchesDateFilters(p.date, filterYears, filterMonths, filterDaysOfWeek),
    );
    const expenseVsSales = filterMonthlyTrend(intData.page_4.charts.expense_vs_sales, filterYears, filterMonths);
    const expenseMovingAvg = filterMonthlyTrend(intData.page_4.charts.expense_moving_avg, filterYears, filterMonths);

    const totalExpenses = rows.reduce((sum, r) => sum + r.amount, 0);
    const monthKeySet = new Set(
      rows
        .map((r) => toDate(r.date))
        .filter((d) => !isNaN(d.getTime()))
        .map((d) => `${d.getFullYear()}-${d.getMonth()}`),
    );
    const salesTotal = expenseVsSales.reduce((sum, r) => sum + r.sales, 0);
    const monthlyAvg = monthKeySet.size > 0 ? totalExpenses / monthKeySet.size : 0;
    const operatingProfit = salesTotal - totalExpenses;
    const expenseShare = salesTotal > 0 ? (totalExpenses / salesTotal) * 100 : 0;
    const profitMargin = salesTotal > 0 ? (operatingProfit / salesTotal) * 100 : 0;

    return {
      ...intData.page_4,
      kpis: {
        ...intData.page_4.kpis,
        total_expenses: totalExpenses,
        operating_profit: operatingProfit,
        expense_share: Number(expenseShare.toFixed(1)),
        monthly_avg_expense: monthlyAvg,
        operating_profit_margin: Number(profitMargin.toFixed(1)),
        net_profit_margin: Number(profitMargin.toFixed(1)),
      },
      charts: {
        ...intData.page_4.charts,
        expense_trend: expenseTrend,
        expense_vs_sales: expenseVsSales,
        expense_moving_avg: expenseMovingAvg,
      },
      expense_detail_table: rows,
    };
  }, [intData.page_4, filterYears, filterMonths, filterDaysOfWeek]);

  const filteredAdvPage5 = useMemo(() => {
    const rows = advData.page_5.expense_detail_table.filter((r) =>
      matchesDateFilters(r.date, filterYears, filterMonths, filterDaysOfWeek),
    );
    const expenseTrend = advData.page_5.charts.expense_trend.filter((p) =>
      matchesDateFilters(p.date, filterYears, filterMonths, filterDaysOfWeek),
    );
    const expenseVsSales = filterMonthlyTrend(advData.page_5.charts.expense_vs_sales, filterYears, filterMonths);

    const totalExpenses = rows.reduce((sum, r) => sum + parseCurrency(r.amount), 0);
    const monthKeySet = new Set(
      rows
        .map((r) => toDate(r.date))
        .filter((d) => !isNaN(d.getTime()))
        .map((d) => `${d.getFullYear()}-${d.getMonth()}`),
    );
    const salesTotal = expenseVsSales.reduce((sum, r) => sum + (r.sales * 1_000_000), 0);
    const monthlyAvg = monthKeySet.size > 0 ? totalExpenses / monthKeySet.size : 0;
    const operatingProfit = salesTotal - totalExpenses;
    const expenseShare = salesTotal > 0 ? (totalExpenses / salesTotal) * 100 : 0;

    const byType: Record<string, number> = {};
    rows.forEach((r) => { byType[r.expense_type] = (byType[r.expense_type] ?? 0) + parseCurrency(r.amount); });
    const expenseByCategory = Object.entries(byType)
      .map(([category, amount]) => ({ category, amount: amount / 1_000_000 }))
      .sort((a, b) => b.amount - a.amount);
    const largestCategory = expenseByCategory[0]?.category ?? advData.page_5.kpis.largest_expense_category;

    return {
      ...advData.page_5,
      kpis: {
        ...advData.page_5.kpis,
        total_expenses: formatNaira(totalExpenses),
        operating_profit: formatNaira(operatingProfit),
        expense_share: `${expenseShare.toFixed(1)}%`,
        expense_transactions: rows.length,
        largest_expense_category: largestCategory,
        monthly_avg_expense: formatNaira(monthlyAvg),
      },
      charts: {
        ...advData.page_5.charts,
        expense_trend: expenseTrend,
        expense_vs_sales: expenseVsSales,
        expense_by_category: expenseByCategory,
      },
      expense_detail_table: rows,
    };
  }, [advData.page_5, filterYears, filterMonths, filterDaysOfWeek]);

  // ── Focus mode freeze + period filter restore ─────────────────────────────
  const frozenIntRef          = useRef(filteredIntPage4);
  const frozenAdvRef          = useRef(filteredAdvPage5);
  const frozenFilterYearsRef  = useRef(filterYears);
  const frozenFilterMonthsRef = useRef(filterMonths);
  const frozenFilterDaysRef   = useRef(filterDaysOfWeek);
  const prevFocusRef          = useRef(focusModeOpen);
  const focusSessionRef       = useRef(false);

  if (focusModeOpen && !prevFocusRef.current) {
    frozenIntRef.current          = filteredIntPage4;
    frozenAdvRef.current          = filteredAdvPage5;
    frozenFilterYearsRef.current  = [...filterYears];
    frozenFilterMonthsRef.current = [...filterMonths];
    frozenFilterDaysRef.current   = [...filterDaysOfWeek];
    focusSessionRef.current       = true;
  }
  prevFocusRef.current = focusModeOpen;

  useEffect(() => {
    if (!focusModeOpen && focusSessionRef.current) {
      focusSessionRef.current = false;
      setFilterYears(frozenFilterYearsRef.current);
      setFilterMonths(frozenFilterMonthsRef.current);
      setFilterDaysOfWeek(frozenFilterDaysRef.current);
    }
  }, [focusModeOpen, setFilterYears, setFilterMonths, setFilterDaysOfWeek]);

  const bgIntData = focusModeOpen ? frozenIntRef.current : filteredIntPage4;
  const bgAdvData = focusModeOpen ? frozenAdvRef.current : filteredAdvPage5;

  const greeting = getGreeting();

  return (
    <>
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Expenses</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          {greeting}, <EditableGreeting fallbackName={firstName} /> 👋
        </h1>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">Here is a full breakdown of your operating costs.</p>
      </div>

      {!focusModeOpen && isFiltered && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/50 text-xs text-blue-700 dark:text-blue-300 font-medium">
          <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
          Showing filtered expense data for selected period.
        </div>
      )}

      {devTier === "intermediate" && <IntContent data={bgIntData} liveData={filteredIntPage4} />}
      {devTier === "advanced"     && <AdvContent data={bgAdvData} liveData={filteredAdvPage5} />}

      {devTier === "advanced" && (
        <div>
          <SectionHeader title="Expense Records" />
          <AdvExpenseTable allRows={bgAdvData.expense_detail_table} />
        </div>
      )}
    </>
  );
}
