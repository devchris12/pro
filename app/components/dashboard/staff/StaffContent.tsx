"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useAdvancedAnalysis } from "@/app/hooks/useDashboardData";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import { getGreeting, cn } from "@/lib/utils";
import {
  DashTooltip,
  GradDefs,
  GRAD,
  SectionHeader,
  ChartCard,
  KpiCard,
  KpiStrip,
  TICK,
  GRID_STROKE,
  CHART_COLOURS,
} from "@/app/components/ui/dashboard/ChartUtils";
import { EditableGreeting } from "@/app/components/ui/dashboard/EditableGreeting";

interface StaffContentProps {
  firstName: string;
}

// ── Staff leaderboard table ──────────────────────────────────────────────────

function StaffLeaderboard(): React.ReactElement {
  const { page_4 } = useAdvancedAnalysis();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const rows = page_4.staff_leaderboard;
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Staff Leaderboard</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
          Ranked by revenue generated · {rows.length} staff members
        </p>
      </div>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
              {["Rank", "Staff", "Branch", "Revenue", "Profit", "Orders", "Avg Sale", "Commission", "Salary"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => {
              const rank = page * PAGE_SIZE + i + 1;
              return (
                <tr
                  key={i}
                  className={cn(
                    "relative border-b border-gray-50 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:scale-[1.01] hover:z-10 transition-all duration-150",
                    i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50/40 dark:bg-slate-800/30"
                  )}
                >
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "inline-flex items-center justify-center size-6 rounded-full text-[10px] font-bold",
                      rank === 1 ? "bg-amber-100 text-amber-700" :
                      rank === 2 ? "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300" :
                      rank === 3 ? "bg-orange-50 text-orange-600" :
                      "bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500"
                    )}>
                      {rank}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-slate-200">{row.staff_name}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
                      {row.branch}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-slate-200 tabular-nums">{row.revenue}</td>
                  <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">{row.profit}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 tabular-nums">{row.orders_handled}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-slate-400 tabular-nums">{row.avg_sale}</td>
                  <td className="px-4 py-2.5 text-purple-600 dark:text-purple-400 font-medium tabular-nums">{row.commission}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400 tabular-nums">{row.salary}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-400 dark:text-slate-500">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-xs text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 rounded-lg border border-gray-200 dark:border-blue-500/50 text-xs text-gray-600 dark:text-blue-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-blue-500/10 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Named export ─────────────────────────────────────────────────────────────

export function StaffContent({ firstName }: StaffContentProps): React.ReactElement {
  const { page_4 } = useAdvancedAnalysis();
  const { filterYears, filterMonths, filterDaysOfWeek } = useDashboardStore();
  const isFiltered = filterYears.length > 0 || filterMonths.length > 0 || filterDaysOfWeek.length > 0;

  const greeting = getGreeting();
  const { kpis, charts } = page_4;
  const achievementNum = parseFloat(kpis.achievement_percentage);

  return (
    <>
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
          Staff Performance
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{greeting}, <EditableGreeting fallbackName={firstName} /> 👋</h1>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">
          Track how each team member is contributing to your revenue.
        </p>
      </div>

      {isFiltered && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-400 font-medium">
          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
          Staff metrics currently use the full dataset — the active period filter does not apply here yet.
        </div>
      )}

      <KpiStrip title="Key Numbers">
        <KpiCard label="Total Staff"        value={String(kpis.total_staff)}          tooltip="Number of staff members recorded in this dataset." compact className="w-[185px] shrink-0" />
        <KpiCard label="Total Orders"       value={String(kpis.total_orders)}         tooltip="Total number of sales transactions handled by your team." compact className="w-[185px] shrink-0" />
        <KpiCard label="Avg Sale Per Staff" value={kpis.avg_sale_per_staff}           tooltip="Average revenue generated per staff member." compact className="w-[185px] shrink-0" />
        <KpiCard label="Target Achievement" value={kpis.achievement_percentage}       tooltip="How far your team's combined performance is to the set target." accent={achievementNum >= 100 ? "green" : "amber"} compact className="w-[185px] shrink-0" />
        <KpiCard label="Top Performer Rank" value={`#${kpis.staff_productivity_rank}`} tooltip="Your top performer's rank by productivity score." compact className="w-[185px] shrink-0" />
      </KpiStrip>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charts.branch_performance.length > 0 && (
          <div>
            <SectionHeader title="Revenue by Branch" />
            <ChartCard
              title="Which location is generating the most"
              tooltip="Revenue contributed by each branch or location. Longer bar = more revenue from that location. Use this to see which store is your strongest performer."
              focusable
              focusContent={
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={charts.branch_performance} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                    <defs><GradDefs /></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="branch" tick={TICK} tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<DashTooltip />} />
                    <Bar dataKey="revenue" fill={`url(#${GRAD.blueH})`} radius={[0, 6, 6, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              }
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={charts.branch_performance} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <defs><GradDefs /></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="branch" tick={TICK} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<DashTooltip />} />
                  <Bar dataKey="revenue" fill={`url(#${GRAD.blueH})`} radius={[0, 6, 6, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {charts.staff_sales.length > 0 && (
          <div>
            <SectionHeader title="Revenue by Staff" />
            <ChartCard
              title="Individual contribution to total sales (top 10)"
              tooltip="Shows how much revenue each of your top 10 staff members generated. Use this to reward your best performers and identify who may need support."
              focusable
              focusContent={
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={charts.staff_sales.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                    <defs><GradDefs /></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="staff_name" tick={TICK} tickLine={false} axisLine={false} width={75} />
                    <Tooltip content={<DashTooltip />} />
                    <Bar dataKey="revenue" fill={CHART_COLOURS.purple} radius={[0, 6, 6, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              }
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={charts.staff_sales.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <defs><GradDefs /></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="staff_name" tick={TICK} tickLine={false} axisLine={false} width={65} />
                  <Tooltip content={<DashTooltip />} />
                  <Bar dataKey="revenue" fill={CHART_COLOURS.purple} radius={[0, 6, 6, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>

      <div>
        <SectionHeader title="Full Leaderboard" />
        <StaffLeaderboard />
      </div>
    </>
  );
}
