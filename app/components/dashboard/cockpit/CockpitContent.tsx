"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
} from "recharts";
import { useExecutiveSummaryData } from "@/app/hooks/useDashboardData";
import { useGetAnalyzed } from "@/app/components/hooks/data/useGetAnalyzed";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import { formatNaira, cn } from "@/lib/utils";
import type {
  Play,
  Signal,
  ChartData,
  ParetoBarItem,
  CategoryDonutItem,
  RevenueTrendItem,
  ExpenseVsSalesItem,
  RepeatVsNewItem,
  WaterfallItem,
  BranchBarItem,
} from "@/app/types/executiveSummary";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  BoltIcon,
  CalendarIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleDownIcon,
} from "@heroicons/react/24/outline";
import {
  DashTooltip,
  GradDefs,
  GRAD,
  DONUT_COLOURS,
  SectionHeader,
  ChartCard,
  TICK,
  GRID_STROKE,
  CHART_PRIMARY_VAR,
} from "@/app/components/ui/dashboard/ChartUtils";
import { EditableGreeting } from "@/app/components/ui/dashboard/EditableGreeting";
import { getGreeting } from "@/lib/utils";

function fmtAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

/** True when a "Mon YYYY" label (e.g. "Apr 2026") is before the current month. */
function isForecastMonthPast(label: string): boolean {
  const SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [mon, yr] = label.split(" ");
  const mIdx = SHORT.indexOf(mon);
  const year = parseInt(yr, 10);
  if (mIdx === -1 || isNaN(year)) return false;
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && mIdx < now.getMonth());
}

const SENTIMENT_RING: Record<string, string> = {
  green: "bg-emerald-50/80 border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800/50",
  red:   "bg-red-50/80 border-red-200/80 dark:bg-red-950/40 dark:border-red-800/50",
  amber: "bg-amber-50/80 border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800/50",
};

const SENTIMENT_TEXT: Record<string, string> = {
  green: "text-emerald-600",
  red:   "text-red-600",
  amber: "text-amber-600",
};

const GAUGE_COLOUR: Record<string, string> = {
  green: "#10b981",
  amber: "#f59e0b",
  red:   "#ef4444",
};

const PRIORITY_CONFIG: Record<string, { dot: string; label: string; bg: string; border: string; text: string }> = {
  urgent:       { dot: "bg-red-500",     label: "Urgent",       bg: "bg-red-50 dark:bg-red-950/30",         border: "border-l-4 border-l-red-400 border border-red-100 dark:border-red-900/50",         text: "text-red-600 dark:text-red-400" },
  this_week:    { dot: "bg-amber-400",   label: "This Week",    bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-l-4 border-l-amber-400 border border-amber-100 dark:border-amber-900/50",   text: "text-amber-700 dark:text-amber-400" },
  when_you_can: { dot: "bg-emerald-400", label: "When You Can", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-l-4 border-l-emerald-400 border border-emerald-100 dark:border-emerald-900/50", text: "text-emerald-700 dark:text-emerald-400" },
};

const SIGNAL_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; colour: string; bg: string; border: string }> = {
  alert:    { icon: ExclamationTriangleIcon, colour: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/30",         border: "border-l-4 border-l-red-400 border border-red-100 dark:border-red-900/50" },
  warning:  { icon: ExclamationCircleIcon,   colour: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-l-4 border-l-amber-400 border border-amber-100 dark:border-amber-900/50" },
  positive: { icon: CheckCircleIcon,          colour: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-l-4 border-l-emerald-400 border border-emerald-100 dark:border-emerald-900/50" },
};

const PAGE_ROUTE: Record<string, string> = {
  "Product Performance":               "/dashboard/products",
  "Sales Overview":                    "/dashboard/sales",
  "Forecast Insights":                 "/dashboard/forecast",
  "Expenses Summary":                  "/dashboard/expenses",
  "Customer Insights":                 "/dashboard/customers",
  "Staff Performance":                 "/dashboard/staff",
  "Financial Control & Expense Summary": "/dashboard/expenses",
  "Forecast & Scenario Insights":      "/dashboard/forecast",
};

function HealthGauge({ score, label, colour, deltaLabel, basedOn, badge }: {
  score: number; label: string; colour: string; deltaLabel: string; basedOn: string; badge: string;
}): React.ReactElement {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const ringColour = GAUGE_COLOUR[colour] ?? "#f59e0b";
  const glowColour = colour === "green" ? "#10b981" : colour === "red" ? "#ef4444" : "#f59e0b";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="196" height="196" viewBox="0 0 196 196" className="-rotate-90">
          <circle cx="98" cy="98" r={radius} fill="none" strokeWidth="14" className="stroke-slate-200 dark:stroke-slate-700" />
          <circle cx="98" cy="98" r={radius} fill="none" stroke={glowColour} strokeWidth="18" strokeDasharray={`${filled} ${circumference - filled}`} strokeLinecap="round" opacity={0.15} />
          <circle cx="98" cy="98" r={radius} fill="none" stroke={ringColour} strokeWidth="14" strokeDasharray={`${filled} ${circumference - filled}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[42px] font-black text-gray-900 dark:text-slate-100 leading-none tabular-nums">{score}</span>
          <span className="text-sm text-gray-400 dark:text-slate-500 font-medium">/100</span>
          <span className={cn("text-xs font-bold mt-1 px-2 py-0.5 rounded-full",
            colour === "green" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" :
            colour === "red"   ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400" :
                                 "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
          )}>{label}</span>
        </div>
      </div>
      <div className="text-center space-y-0.5">
        <p className={cn("text-sm font-bold", SENTIMENT_TEXT[colour])}>{deltaLabel}</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500">{basedOn}</p>
        {badge && <p className="text-[10px] text-gray-400 dark:text-slate-500 italic">{badge}</p>}
      </div>
    </div>
  );
}

function HealthComponents({ components }: {
  components: Array<{ name: string; pts: number; max_pts: number; colour: string; detail: string; weight: string }>;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 flex-1 min-w-0">
      {components.map((c) => {
        const pct = Math.round((c.pts / c.max_pts) * 100);
        const barColour = GAUGE_COLOUR[c.colour] ?? "#f59e0b";
        return (
          <div key={c.name}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-gray-700 dark:text-slate-300">{c.name}</span>
              <span className={cn("font-bold tabular-nums text-[11px]", SENTIMENT_TEXT[c.colour])}>
                {c.pts.toFixed(0)}<span className="font-normal text-gray-400 dark:text-slate-500">/{c.max_pts.toFixed(0)} pts</span>
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColour }} />
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 leading-snug">{c.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

function VitalCard({ label, value, sub, delta, sentiment }: {
  label: string; value: string; sub: string; delta: string; sentiment: string;
}): React.ReactElement {
  const ringStyle = SENTIMENT_RING[sentiment] ?? "bg-white border-gray-200";
  const textStyle = SENTIMENT_TEXT[sentiment] ?? "text-gray-500";
  const barColour = sentiment === "green" ? "bg-emerald-400" : sentiment === "red" ? "bg-red-400" : "bg-amber-400";
  return (
    <div className={cn("rounded-2xl border overflow-hidden", ringStyle)}>
      <div className={cn("h-1 w-full", barColour)} />
      <div className="p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5 leading-snug">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-slate-100 leading-tight tabular-nums">{value}</p>
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 leading-snug">{sub}</p>
        <p className={cn("text-xs font-bold mt-1.5", textStyle)}>{delta}</p>
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }): React.ReactElement {
  const cfg = SIGNAL_CONFIG[signal.type] ?? SIGNAL_CONFIG.warning;
  const Icon = cfg.icon;
  const baseRoute = PAGE_ROUTE[signal.linked_page];
  const targetRoute = baseRoute
    ? signal.chart_refs?.length
      ? `${baseRoute}?glow=${signal.chart_refs.join(",")}`
      : baseRoute
    : null;
  return (
    <div className={cn("rounded-2xl p-4 flex gap-3 transition-all duration-200 hover:shadow-sm", cfg.bg, cfg.border)}>
      <div className={cn("size-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
        signal.type === "alert" ? "bg-red-100 dark:bg-red-900/40" : signal.type === "positive" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-amber-100 dark:bg-amber-900/40"
      )}>
        <Icon className={cn("size-4", cfg.colour)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 leading-snug">{signal.headline}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{signal.body}</p>
        {targetRoute && (
          <Link href={targetRoute} className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-blue-400 mt-2 hover:underline">
            See more <ArrowRightIcon className="size-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function PlayItem({ play }: { play: Play }): React.ReactElement {
  const cfg = PRIORITY_CONFIG[play.priority] ?? PRIORITY_CONFIG.when_you_can;
  return (
    <div className={cn("rounded-2xl p-4 flex gap-3", cfg.bg, cfg.border)}>
      <div className="flex-1 min-w-0">
        <span className={cn("text-[10px] font-black uppercase tracking-widest", cfg.text)}>{cfg.label}</span>
        <p className="text-sm text-gray-800 dark:text-slate-200 mt-0.5 leading-relaxed">{play.text}</p>
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{play.metric}</p>
      </div>
    </div>
  );
}

function ParetoBarChart({ chart }: { chart: ChartData }): React.ReactElement {
  const data = (chart.data as ParetoBarItem[]).filter((d) => d.name !== "All Others");
  return (
    <ChartCard subtitle={chart.subtitle} title={chart.dynamic_title} tooltip="Your top products by revenue. A small number of items usually drive most of your sales — these are the ones to always keep in stock.">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 4 }}>
          <GradDefs />
          <XAxis type="number" tickFormatter={(v) => formatNaira(v)} tick={TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={TICK} axisLine={false} tickLine={false} width={90} />
          <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
          <Bar dataKey="revenue" fill={`url(#${GRAD.blueH})`} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function CategoryDonutChart({ chart }: { chart: ChartData }): React.ReactElement {
  const data = (chart.data as CategoryDonutItem[]).filter((d) => d.revenue > 0);
  return (
    <ChartCard subtitle={chart.subtitle} title={chart.dynamic_title} tooltip="How your total revenue is split across product categories. The bigger the slice, the more that category contributes to your income.">
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={data} dataKey="revenue" nameKey="category" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3}>
              {data.map((_entry, i) => <Cell key={i} fill={DONUT_COLOURS[i % DONUT_COLOURS.length]} />)}
            </Pie>
            <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.slice(0, 5).map((d, i) => (
            <div key={d.category} className="flex items-center gap-2 text-xs">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLOURS[i % DONUT_COLOURS.length] }} />
              <span className="truncate text-gray-600 dark:text-slate-400">{d.category}</span>
              <span className="ml-auto font-bold text-gray-800 dark:text-slate-200 tabular-nums shrink-0">{d.pct_of_total.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

function RevenueTrendChart({ chart }: { chart: ChartData }): React.ReactElement {
  const data = chart.data as RevenueTrendItem[];
  return (
    <ChartCard subtitle={chart.subtitle} title={chart.dynamic_title} tooltip="How your total sales trended over time. An upward curve means the business is growing. A flat or falling line means something needs attention." fullWidth>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <GradDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={70} padding={{ left: 15, right: 15 }} />
          <YAxis tickFormatter={(v) => formatNaira(v)} tick={TICK} axisLine={false} tickLine={false} width={62} />
          <Tooltip content={<DashTooltip valueFormatter={formatNaira} labelFormatter={fmtAxisDate} />} />
          <Area type="monotone" dataKey="sales" stroke={CHART_PRIMARY_VAR} strokeWidth={2.5} fill={`url(#${GRAD.blueArea})`} dot={false} activeDot={{ r: 5, fill: "#001BB7", stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ExpenseVsSalesChart({ chart }: { chart: ChartData }): React.ReactElement {
  const data = chart.data as ExpenseVsSalesItem[];
  return (
    <ChartCard subtitle={chart.subtitle} title={chart.dynamic_title} tooltip="Bars show your expenses each month, line shows sales. You want a big gap between them. If the bars grow close to the line, your profit margin is shrinking." fullWidth>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <GradDefs />
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="month_short" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
          <YAxis tickFormatter={(v) => formatNaira(v)} tick={TICK} axisLine={false} tickLine={false} width={62} />
          <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
          <Bar dataKey="expenses" fill={`url(#${GRAD.blueH})`} radius={[4, 4, 0, 0]} name="Expenses" />
          <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.5} dot={false} name="Sales" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function RepeatVsNewChart({ chart }: { chart: ChartData }): React.ReactElement {
  const data = chart.data as RepeatVsNewItem[];
  const COLOURS = ["#001BB7", "#10b981", "#f59e0b"];
  return (
    <ChartCard subtitle={chart.subtitle} title={chart.dynamic_title} tooltip="Shows how many customers came back vs. bought for the first time. A high repeat share means your customers trust you enough to return.">
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="segment" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3}>
              {data.map((_entry, i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => typeof v === "number" ? v.toLocaleString() : String(v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.map((d, i) => (
            <div key={d.segment} className="flex items-center gap-2 text-xs">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: COLOURS[i % COLOURS.length] }} />
              <span className="truncate text-gray-600 dark:text-slate-400">{d.segment}</span>
              <span className="ml-auto font-bold text-gray-800 dark:text-slate-200 tabular-nums shrink-0">{d.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

function WaterfallChart({ chart }: { chart: ChartData }): React.ReactElement {
  const raw = chart.data as WaterfallItem[];
  const data = raw.map((item) => ({ label: item.label, value: Math.abs(item.value), isNegative: item.value < 0, type: item.type, formatted: formatNaira(Math.abs(item.value)) }));
  return (
    <ChartCard subtitle={chart.subtitle} title={chart.dynamic_title} tooltip="Starts from gross profit and shows each expense that reduced it. Red bars = costs. The final bar is your net profit — what the business truly kept.">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
          <YAxis tickFormatter={(v) => formatNaira(v)} tick={TICK} axisLine={false} tickLine={false} width={62} />
          <Tooltip formatter={(v) => typeof v === "number" ? formatNaira(v) : String(v)} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.isNegative ? "#ef4444" : entry.type === "end" ? "#10b981" : "#001BB7"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function BranchBarChart({ chart }: { chart: ChartData }): React.ReactElement {
  const data = chart.data as BranchBarItem[];
  return (
    <ChartCard subtitle={chart.subtitle} title={chart.dynamic_title} tooltip="Revenue from each branch or location. Longer bar = more revenue from that location. Use this to compare performance across your stores.">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 4 }}>
          <GradDefs />
          <XAxis type="number" tickFormatter={(v) => formatNaira(v)} tick={TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="branch" tick={TICK} axisLine={false} tickLine={false} width={80} />
          <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
          <Bar dataKey="revenue" fill={`url(#${GRAD.blueH})`} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function VitalSignsStrip({ cards }: {
  cards: Array<{ label: string; value: string; sub: string; delta: string; sentiment: string }>;
}): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  function scrollBy(direction: "left" | "right"): void {
    scrollRef.current?.scrollBy({ left: direction === "right" ? 240 : -240, behavior: "smooth" });
  }

  const arrowBase = "relative z-10 size-7 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors";

  return (
    <div className="relative">
      {/* Left fade + arrow */}
      <div className={cn(
        "absolute left-0 top-0 bottom-1 z-10 flex items-center transition-opacity duration-200",
        canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}>
        <div className="absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-gray-50 dark:from-slate-950 to-transparent pointer-events-none" />
        <button onClick={() => scrollBy("left")} aria-label="Scroll left" className={cn(arrowBase, "ml-0.5")}>
          <ChevronLeftIcon className="size-3.5" />
        </button>
      </div>

      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        className="flex gap-3 table-scroll py-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
      >
        {cards.map((card) => (
          <div key={card.label} className="min-w-[210px] shrink-0">
            <VitalCard {...card} />
          </div>
        ))}
      </div>

      {/* Right fade + arrow */}
      <div className={cn(
        "absolute right-0 top-0 bottom-1 z-10 flex items-center transition-opacity duration-200",
        canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}>
        <div className="absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-gray-50 dark:from-slate-950 to-transparent pointer-events-none" />
        <button onClick={() => scrollBy("right")} aria-label="Scroll right" className={cn(arrowBase, "mr-0.5")}>
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function CockpitChart({ chart }: { chart: ChartData }): React.ReactElement | null {
  switch (chart.chart_type) {
    case "pareto_bar":             return <ParetoBarChart chart={chart} />;
    case "category_donut":         return <CategoryDonutChart chart={chart} />;
    case "revenue_trend_line":     return <RevenueTrendChart chart={chart} />;
    case "expense_vs_sales_combo": return <ExpenseVsSalesChart chart={chart} />;
    case "repeat_vs_new_donut":    return <RepeatVsNewChart chart={chart} />;
    case "waterfall":              return <WaterfallChart chart={chart} />;
    case "branch_bar":             return <BranchBarChart chart={chart} />;
    default:                       return null;
  }
}

function KeyVisualsCarousel({ charts }: { charts: ChartData[] }): React.ReactElement {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef(0);
  const total = charts.length;

  const goNext = useCallback((): void => setCurrent((p) => (p + 1) % total), [total]);
  const goPrev = useCallback((): void => setCurrent((p) => (p - 1 + total) % total), [total]);
  const goTo   = (i: number): void => setCurrent(i);

  useEffect(() => {
    if (total <= 1 || isHovered) return;
    const id = setInterval(goNext, 10000);
    return () => clearInterval(id);
  }, [total, isHovered, goNext]);

  const handleTouchStart = (e: React.TouchEvent): void => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent): void => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) { delta > 0 ? goNext() : goPrev(); }
  };

  if (total === 0) return <></>;

  return (
    <div className="flex flex-col gap-3" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="overflow-hidden py-4 -my-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="flex" style={{ transform: `translateX(-${current * 100}%)`, transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)" }}>
          {charts.map((chart, i) => (
            <div key={i} className="w-full shrink-0 min-w-0 px-1.5">
              <CockpitChart chart={chart} />
            </div>
          ))}
        </div>
      </div>
      {total > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={goPrev} aria-label="Previous chart" className="p-1 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeftIcon className="size-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {charts.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} aria-label={`Chart ${i + 1} of ${total}`}
                className={cn("rounded-full transition-all duration-300", i === current ? "w-5 h-1.5 bg-primary dark:bg-blue-400" : "w-1.5 h-1.5 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500")} />
            ))}
          </div>
          <button onClick={goNext} aria-label="Next chart" className="p-1 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function NfBlock({ nf, bordered }: { nf: { month: string; forecast_fmt: string; direction: string; growth_pct: string; narrative: string }; bordered: boolean }): React.ReactElement {
  const stale = isForecastMonthPast(nf.month);
  return (
    <div className={bordered ? "border-l border-gray-100 dark:border-slate-700 pl-5" : ""}>
      <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
        {nf.month} — {stale ? "forecast" : "next month"}
      </span>
      <div className="flex items-center gap-2 mt-1 mb-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">{nf.forecast_fmt}</span>
        <span className={cn("text-sm font-bold", nf.direction === "up" ? "text-emerald-600" : "text-red-500")}>{nf.direction === "up" ? "↑" : "↓"} {nf.growth_pct}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{nf.narrative}</p>
      {stale && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
          Based on your last upload — re-upload data for an up-to-date forecast.
        </p>
      )}
    </div>
  );
}

function ForecastInsightCard({ daysUntilStockout }: { daysUntilStockout?: number | null }): React.ReactElement | null {
  const summary = useExecutiveSummaryData();
  if (!summary) return null;
  const fi = summary.forecast_insight;
  if (!fi) return null;
  const cm = fi.current_month;
  const nf = fi.next_forecast;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="size-4 text-primary dark:text-blue-400" />
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Forecast Insight</p>
        </div>
        <Link href="/dashboard/forecast" className="text-xs text-primary dark:text-blue-400 font-semibold hover:underline flex items-center gap-1">
          Full forecast <ArrowRightIcon className="size-3" />
        </Link>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        {cm ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">{cm.month} — this month</span>
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", cm.status_colour === "green" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400")}>{cm.status_label}</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">{cm.actual_fmt}</span>
              <span className="text-sm text-gray-400 dark:text-slate-500 mb-0.5">of {cm.forecast_fmt}</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1.5">
              <div className={cn("h-full rounded-full transition-all duration-700", cm.status_colour === "green" ? "bg-emerald-500" : cm.status_colour === "red" ? "bg-red-500" : "bg-amber-400")} style={{ width: `${Math.min(cm.pct_to_target, 100)}%` }} />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-slate-500">{cm.pct_to_target}% of target · {cm.days_remaining} days left</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">{cm.narrative}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">No current month data yet</div>
        )}
        {nf && (
          <NfBlock nf={nf} bordered={!!cm} />
        )}
      </div>
      {daysUntilStockout != null && daysUntilStockout <= 90 && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl">
            <ExclamationTriangleIcon className="size-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400"><span className="font-semibold">Stock warning:</span> estimated stockout in {daysUntilStockout} days based on current sales rate.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DataQualityBanner({ pctClean, issueCount }: { pctClean: number; issueCount: number }): React.ReactElement | null {
  if (issueCount === 0) return null;
  return (
    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3">
      <ExclamationTriangleIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-700 dark:text-amber-400">
        <span className="font-semibold">{issueCount} data issue{issueCount > 1 ? "s" : ""} found</span>
        {" · "}Score based on {pctClean}% of your data. Go to <strong>Product Performance</strong> to see details.
      </p>
    </div>
  );
}

export function CockpitContent({ firstName }: { firstName: string }): React.ReactElement | null {
  const summary = useExecutiveSummaryData();
  const { filterYears, filterMonths, filterDaysOfWeek } = useDashboardStore();
  const isFiltered = filterYears.length > 0 || filterMonths.length > 0 || filterDaysOfWeek.length > 0;
  const { isLoading } = useGetAnalyzed();
  const isDevMode = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
  const [showAll, setShowAll] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400 dark:text-slate-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    if (isDevMode) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 max-w-sm mx-auto">
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Dev mode · Basic tier</p>
          <p className="text-sm text-gray-400 dark:text-slate-500">
            No mock data for Basic tier (deleted in Session 7). Switch to{" "}
            <span className="font-bold text-primary">Int</span> or{" "}
            <span className="font-bold text-primary">Adv</span> in the SideRail to see the dashboard.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
          <ChartBarIcon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">No data yet</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            Upload your business records to see your dashboard. It takes about 5–7 seconds to analyse.
          </p>
        </div>
        <Link
          href="/dashboard/user/update"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Set up your business →
        </Link>
      </div>
    );
  }

  const greeting = getGreeting();
  const { health_score, vital_signs, signals, charts, plays, data_quality, forecast_insight } = summary;

  const dateStart = summary.metadata?.period?.start;
  const dateEnd   = summary.metadata?.period?.end;
  const fmtDate = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const vitalCards = Object.values(vital_signs);
  const fullWidthChartTypes = ["revenue_trend_line", "expense_vs_sales_combo"];
  const inlineCharts = charts.filter((c) => !fullWidthChartTypes.includes(c.chart_type));
  const fullWidthCharts = charts.filter((c) => fullWidthChartTypes.includes(c.chart_type));
  const daysUntilStockout = forecast_insight?.days_until_stockout;

  return (
    <>
      {/* Scroll anchor — Back to top scrolls here */}
      <div ref={topRef} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Cockpit</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {greeting}, <EditableGreeting fallbackName={firstName} /> 👋
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <CalendarIcon className="size-3.5 text-gray-400 dark:text-slate-500" />
            <p className="text-sm text-gray-400 dark:text-slate-500">
              {fmtDate(dateStart)} – {fmtDate(dateEnd)}
              {" · "}{summary.metadata?.record_count ?? 0} transactions
            </p>
          </div>
        </div>
        <span className={cn("text-xs font-bold px-3 py-1.5 rounded-full self-start sm:self-auto",
          health_score.colour === "green" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" :
          health_score.colour === "red"   ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400" :
                                            "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
        )}>
          {health_score.label}
        </span>
      </div>

      {isFiltered && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-400 font-medium">
          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
          This summary covers your full dataset. Visit Sales or Products to see filtered data.
        </div>
      )}

      <DataQualityBanner pctClean={data_quality.pct_clean} issueCount={data_quality.issue_count} />

      <SectionHeader title="Business Health Score" />
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <BoltIcon className="size-5 text-primary dark:text-blue-400" />
          <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Overall Score</h2>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <HealthGauge score={health_score.score} label={health_score.label} colour={health_score.colour} deltaLabel={health_score.delta_label} basedOn={health_score.based_on} badge={health_score.data_completeness?.badge ?? ""} />
          <HealthComponents components={health_score.components} />
        </div>
      </div>

      <SectionHeader title="Vital Signs" />
      <VitalSignsStrip cards={vitalCards} />

      {/* Key Visuals — always visible, moved above the fold */}
      {inlineCharts.length > 0 && (
        <>
          <SectionHeader title="Key Visuals" />
          <KeyVisualsCarousel charts={inlineCharts} />
        </>
      )}

      {/* Toggle */}
      <div className="flex justify-center pt-3 pb-6">
        <button
          onClick={() => setShowAll((v) => !v)}
          className="bg-primary dark:bg-aqua text-white dark:text-primary-dark rounded-md flex flex-row items-center justify-center gap-1.5 px-4 py-2 w-44 text-sm font-bold select-none hover:opacity-90 transition-opacity"
        >
          <span>{showAll ? "Show less" : "View all insights"}</span>
          <ChevronDoubleDownIcon
            className={cn(
              "size-4 animate-bounce transition-transform duration-300 shrink-0",
              showAll ? "rotate-180" : "rotate-0",
            )}
          />
        </button>
      </div>

      {/* Expandable — Forecast + What Happened + charts + Plays */}
      {showAll && (
        <>
          <SectionHeader title="Forecast" />
          <ForecastInsightCard daysUntilStockout={daysUntilStockout} />

          <SectionHeader title="What Happened" />
          <div className="flex flex-col gap-3">
            {signals.length > 0
              ? signals.map((signal, i) => <SignalCard key={i} signal={signal} />)
              : <p className="text-sm text-gray-400">No signals detected for this period.</p>
            }
          </div>

          {fullWidthCharts.map((chart, i) => (
            <div key={i}>
              <SectionHeader title={chart.chart_type === "expense_vs_sales_combo" ? "Expenses vs Sales" : "Revenue Trend"} />
              <CockpitChart chart={chart} />
            </div>
          ))}

          <SectionHeader title="Your Plays — What To Do" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plays.map((play, i) => <PlayItem key={i} play={play} />)}
          </div>

          {/* Back to top — same style as the toggle; collapses + scrolls to header */}
          <div className="flex justify-center pt-6 pb-4">
            <button
              onClick={() => {
                setShowAll(false);
                topRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-primary dark:bg-aqua text-white dark:text-primary-dark rounded-md flex flex-row items-center justify-center gap-1.5 px-4 py-2 w-44 text-sm font-bold select-none hover:opacity-90 transition-opacity"
            >
              <span>Show less</span>
              <ChevronDoubleDownIcon className="size-4 rotate-180 shrink-0" />
            </button>
          </div>
        </>
      )}
    </>
  );
}
