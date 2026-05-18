"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, Cell,
} from "recharts";
import { getBasicDetailTable } from "@/app/lib/basic-analysis";
import { useFilteredData } from "@/app/hooks/useFilteredData";
import { useProductsPageData, useTierMetadata } from "@/app/hooks/useDashboardData";
import { formatNaira, cn, getGreeting } from "@/lib/utils";
import { CalendarIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  DashTooltip, GradDefs, GRAD, SectionHeader, ChartCard, KpiCard, KpiStrip, TICK, GRID_STROKE, DONUT_COLOURS, CHART_COLOURS, CHART_PRIMARY_VAR,
} from "@/app/components/ui/dashboard/ChartUtils";
import { EditableGreeting } from "@/app/components/ui/dashboard/EditableGreeting";
import { useRegisterPageFilters } from "@/app/hooks/useRegisterPageFilters";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import type { ProductTableRow } from "@/app/types/basicAnalysis";
import type { IntermediateAnalysisResult, IntPage2Kpis, IntStockByCategoryPoint } from "@/app/types/intermediateAnalysis";
import type { AdvancedAnalysisResult } from "@/app/types/advancedAnalysis";

// ── Basic product table ──────────────────────────────────────────────────────

interface BasicProductTableProps {
  filteredProducts: ProductTableRow[];
  totalCount: number;
}

function BasicProductTable({ filteredProducts, totalCount }: BasicProductTableProps): React.ReactElement {
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<"revenue" | "profit" | "units_sold">("revenue");

  const PAGE_SIZE = 15;
  const sorted = [...filteredProducts].sort((a, b) => b[sortBy] - a[sortBy]);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const slice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  React.useEffect(() => { setPage(0); }, [filteredProducts, sortBy]);

  const sortBtn = (key: typeof sortBy, label: string) => (
    <button onClick={() => { setSortBy(key); setPage(0); }}
      className={cn("px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
        sortBy === key ? "bg-primary dark:bg-secondary text-white shadow-sm dark:hover:bg-secondary/90" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700")}>
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">All Products</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sorted.length} of {totalCount} products{sorted.length < totalCount ? " · filtered" : ""} · sorted by</p>
        </div>
        <div className="flex gap-1.5">{sortBtn("revenue","Revenue")}{sortBtn("profit","Profit")}{sortBtn("units_sold","Units")}</div>
      </div>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead><tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
            {["Product","Category","Units Sold","Revenue","Profit","Margin","Reorder?"].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>{slice.map((row, i) => (
            <tr key={i} className={cn("relative border-b border-gray-50 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:scale-[1.01] hover:z-10 transition-all duration-150", i%2===0?"bg-white dark:bg-slate-900":"bg-gray-50/40 dark:bg-slate-800/30")}>
              <td className="px-4 py-2.5 text-gray-800 dark:text-slate-200 font-medium max-w-[160px] truncate">{row.product}</td>
              <td className="px-4 py-2.5 text-gray-500 dark:text-slate-500">{row.category}</td>
              <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 tabular-nums">{row.units_sold.toLocaleString()}</td>
              <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-slate-200 tabular-nums">{formatNaira(row.revenue)}</td>
              <td className={cn("px-4 py-2.5 font-bold tabular-nums", row.profit>0?"text-emerald-600":"text-red-500")}>{formatNaira(row.profit)}</td>
              <td className="px-4 py-2.5 tabular-nums">
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                  row.profit_margin>0.3?"bg-emerald-100 text-emerald-700 border border-emerald-200":
                  row.profit_margin>0?"bg-amber-100 text-amber-700 border border-amber-200":"bg-red-100 text-red-700 border border-red-200")}>
                  {(row.profit_margin*100).toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-2.5">
                {row.needs_reorder
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200"><ExclamationTriangleIcon className="size-3"/>Reorder</span>
                  : <span className="text-gray-200 dark:text-slate-700">—</span>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {totalPages>1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-400 dark:text-slate-500">Page {page+1} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page===0} onClick={() => setPage((p)=>p-1)} className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium">Previous</button>
            <button disabled={page===totalPages-1} onClick={() => setPage((p)=>p+1)} className="px-3 py-1.5 text-xs rounded-lg bg-primary dark:bg-secondary text-white disabled:opacity-40 hover:opacity-90 dark:hover:bg-secondary/90 active:scale-[0.97] transition-all font-medium">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Basic tier content ────────────────────────────────────────────────────────

function BasicContentInner({ filteredData }: { filteredData: NonNullable<ReturnType<typeof useFilteredData>> }): React.ReactElement {

  const { page_2 } = filteredData;
  const detailTable = getBasicDetailTable(filteredData);
  const { kpis, top_products, category_performance } = page_2;

  const [glowIds, setGlowIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const glow = params.get("glow");
    if (glow) setGlowIds(new Set(glow.split(",")));
  }, []);
  useEffect(() => {
    if (glowIds.size === 0) return;
    const el = document.getElementById([...glowIds][0]);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 500);
  }, [glowIds]);

  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [productFilters,  setProductFilters]  = useState<string[]>([]);
  const [paymentFilters,  setPaymentFilters]  = useState<string[]>([]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (v: string) => setter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const categoryOptions = useMemo(
    () => [...new Set(page_2.product_table.map((r) => r.category))].sort(),
    [page_2.product_table],
  );
  const productOptions = useMemo(
    () => [...new Set(page_2.product_table.map((r) => r.product))].sort(),
    [page_2.product_table],
  );
  const paymentOptions = useMemo(
    () => [...new Set(detailTable.map((r) => r.payment_method))].filter(Boolean).sort(),
    [detailTable],
  );

  useRegisterPageFilters([
    { id: "category", label: "Category",       options: categoryOptions, selected: categoryFilters, onToggle: toggle(setCategoryFilters), onClearAll: () => setCategoryFilters([]) },
    { id: "product",  label: "Product",         options: productOptions,  selected: productFilters,  onToggle: toggle(setProductFilters),  onClearAll: () => setProductFilters([])  },
    { id: "payment",  label: "Payment Method",  options: paymentOptions,  selected: paymentFilters,  onToggle: toggle(setPaymentFilters),  onClearAll: () => setPaymentFilters([])  },
  ]);

  const hasContentFilter =
    categoryFilters.length > 0 || productFilters.length > 0 || paymentFilters.length > 0;

  const baseProductTable = useMemo(() => {
    if (paymentFilters.length === 0) return page_2.product_table;

    const txRows = detailTable.filter((r) => paymentFilters.includes(r.payment_method));
    const prodMap: Record<string, { units: number; revenue: number; profit: number; category: string }> = {};
    txRows.forEach((r) => {
      if (!prodMap[r.product]) prodMap[r.product] = { units: 0, revenue: 0, profit: 0, category: r.category };
      prodMap[r.product].units   += r.quantity;
      prodMap[r.product].revenue += r.total_sales_auto;
      prodMap[r.product].profit  += r.profit_auto;
    });
    return page_2.product_table
      .filter((p) => prodMap[p.product])
      .map((p) => ({
        ...p,
        units_sold:    prodMap[p.product].units,
        revenue:       prodMap[p.product].revenue,
        profit:        prodMap[p.product].profit,
        profit_margin: prodMap[p.product].revenue > 0 ? prodMap[p.product].profit / prodMap[p.product].revenue : 0,
      }));
  }, [paymentFilters, detailTable, page_2.product_table]);

  const filteredProducts = useMemo(() => {
    let r = baseProductTable;
    if (categoryFilters.length > 0) r = r.filter((p) => categoryFilters.includes(p.category));
    if (productFilters.length > 0)  r = r.filter((p) => productFilters.includes(p.product));
    return r;
  }, [baseProductTable, categoryFilters, productFilters]);

  const topData = useMemo(() => {
    const src = hasContentFilter ? filteredProducts : top_products.slice(0, 10);
    return [...src]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      // full name kept for filter matching — the Spotlight tick truncates for display
      .map((p) => ({ name: p.product, revenue: p.revenue, profit: p.profit }));
  }, [filteredProducts, hasContentFilter, top_products]);

  const catData = useMemo(() => {
    if (!hasContentFilter) {
      return Object.entries(category_performance)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([category, sales]) => ({ category, sales }));
    }
    const totals: Record<string, number> = {};
    filteredProducts.forEach((p) => { totals[p.category] = (totals[p.category] ?? 0) + p.revenue; });
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, sales]) => ({ category, sales }));
  }, [filteredProducts, hasContentFilter, category_performance]);

  const liveDisplayKpis = useMemo(() => {
    if (!hasContentFilter) return kpis;
    const product_revenue = filteredProducts.reduce((s, p) => s + p.revenue, 0);
    const product_profit  = filteredProducts.reduce((s, p) => s + p.profit, 0);
    const units_sold      = filteredProducts.reduce((s, p) => s + p.units_sold, 0);
    const current_profit_margin = product_revenue > 0 ? product_profit / product_revenue : 0;
    const reorder_alerts  = filteredProducts.filter((p) => p.needs_reorder).length;
    return { product_revenue, product_profit, units_sold, current_profit_margin, reorder_alerts };
  }, [filteredProducts, hasContentFilter, kpis]);

  const {
    focusModeOpen,
    filterYears, filterMonths, filterDaysOfWeek,
    setFilterYears, setFilterMonths, setFilterDaysOfWeek,
  } = useDashboardStore();

  const frozenProductsRef        = useRef(filteredProducts);
  const frozenTopDataRef         = useRef(topData);
  const frozenCatDataRef         = useRef(catData);
  const frozenKpisRef            = useRef(liveDisplayKpis);
  const frozenCategoryFiltersRef  = useRef(categoryFilters);
  const frozenPaymentFiltersRef   = useRef(paymentFilters);
  const frozenProductFiltersRef   = useRef(productFilters);
  const frozenFilterYearsRef      = useRef(filterYears);
  const frozenFilterMonthsRef     = useRef(filterMonths);
  const frozenFilterDaysRef       = useRef(filterDaysOfWeek);
  const prevFocusRef              = useRef(focusModeOpen);
  const focusSessionRef           = useRef(false);

  if (focusModeOpen && !prevFocusRef.current) {
    frozenProductsRef.current        = filteredProducts;
    frozenTopDataRef.current         = topData;
    frozenCatDataRef.current         = catData;
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

  const bgTopData   = focusModeOpen ? frozenTopDataRef.current  : topData;
  const bgCatData   = focusModeOpen ? frozenCatDataRef.current  : catData;
  const bgProducts  = focusModeOpen ? frozenProductsRef.current : filteredProducts;
  const displayKpis = focusModeOpen ? frozenKpisRef.current     : liveDisplayKpis;

  // ── Spotlight effect ─────────────────────────────────────────────────────────
  // Bold + primary-colour the Y-axis label for selected products; truncate display name.
  const productNameTick = useMemo(() => {
    const selected = productFilters;
    const active = selected.length > 0;
    return function ProductNameTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string } }): React.ReactElement {
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
  }, [productFilters]);

  // Revenue value label to the right of selected bars (default chart).
  const productValueLabel = useMemo(() => {
    const selected = productFilters;
    const active = selected.length > 0;
    return function ProductValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }): React.ReactElement | null {
      if (!active || props.index === undefined) return null;
      const entry = bgTopData[props.index];
      if (!entry || !selected.includes(entry.name)) return null;
      const lx = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
      const ly = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
      return (
        <text x={lx} y={ly} dominantBaseline="central" fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
          {formatNaira(Number(props.value ?? 0))}
        </text>
      );
    };
  }, [productFilters, bgTopData]);

  // Same label, used inside focusContent which renders topData (not bgTopData).
  const focusProductValueLabel = useMemo(() => {
    const selected = productFilters;
    const active = selected.length > 0;
    return function FocusProductValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }): React.ReactElement | null {
      if (!active || props.index === undefined) return null;
      const entry = topData[props.index];
      if (!entry || !selected.includes(entry.name)) return null;
      const lx = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
      const ly = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
      return (
        <text x={lx} y={ly} dominantBaseline="central" fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
          {formatNaira(Number(props.value ?? 0))}
        </text>
      );
    };
  }, [productFilters, topData]);

  // Bold + primary-colour the Y-axis label for selected categories.
  const catNameTick = useMemo(() => {
    const selected = categoryFilters;
    const active = selected.length > 0;
    return function CatNameTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: string } }): React.ReactElement {
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

  // Sales value label to the right of selected bars (default chart uses bgCatData).
  const catValueLabel = useMemo(() => {
    const selected = categoryFilters;
    const active = selected.length > 0;
    return function CatValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }): React.ReactElement | null {
      if (!active || props.index === undefined) return null;
      const entry = bgCatData[props.index];
      if (!entry || !selected.includes(entry.category)) return null;
      const lx = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
      const ly = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
      return (
        <text x={lx} y={ly} dominantBaseline="central" fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
          {formatNaira(entry.sales)}
        </text>
      );
    };
  }, [categoryFilters, bgCatData]);

  // Same label, used inside focusContent which renders catData (not bgCatData).
  const focusCatValueLabel = useMemo(() => {
    const selected = categoryFilters;
    const active = selected.length > 0;
    return function FocusCatValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown; index?: number }): React.ReactElement | null {
      if (!active || props.index === undefined) return null;
      const entry = catData[props.index];
      if (!entry || !selected.includes(entry.category)) return null;
      const lx = Number(props.x ?? 0) + Number(props.width ?? 0) + 6;
      const ly = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
      return (
        <text x={lx} y={ly} dominantBaseline="central" fontSize={13} fontWeight={700} fill={CHART_PRIMARY_VAR}>
          {formatNaira(entry.sales)}
        </text>
      );
    };
  }, [categoryFilters, catData]);

  return (
    <>
      <KpiStrip title="Key Numbers">
        <KpiCard label="Revenue"        value={formatNaira(displayKpis.product_revenue)}                    tooltip="Total money made from all product sales." accent="blue" compact className="w-[185px] shrink-0" />
        <KpiCard label="Total Profit"   value={formatNaira(displayKpis.product_profit)}                     tooltip="What you kept after paying for stock." accent="blue" compact className="w-[185px] shrink-0" />
        <KpiCard label="Units Sold"     value={displayKpis.units_sold.toLocaleString()}                     tooltip="Total number of items sold across all products." compact className="w-[185px] shrink-0" />
        <KpiCard label="Profit Margin"  value={`${(displayKpis.current_profit_margin * 100).toFixed(1)}%`}  tooltip="Out of every ₦100 you earn, how much you keep." accent="blue" compact className="w-[185px] shrink-0" />
        <KpiCard label="Reorder Alerts" value={displayKpis.reorder_alerts.toString()} alert={displayKpis.reorder_alerts > 0} tooltip="Products at or below minimum stock." compact className="w-[185px] shrink-0" />
      </KpiStrip>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
        <ChartCard
          title="Which products bring in the most revenue?"
          subtitle="Top 10 by Revenue"
          tooltip="Your top 10 earners. Blue bars = revenue, green bars = profit. A product with high revenue but small green bar means your margin is thin there."
          chartId="top_products"
          glowing={glowIds.has("top_products")}
          focusable
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={topData} layout="vertical" margin={{top:0,right:72,left:0,bottom:0}}>
                <GradDefs />
                <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={productNameTick} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{fontSize:10}} />
                <Bar dataKey="revenue" name="Revenue" fill={`url(#${GRAD.blueH})`} radius={[0,4,4,0]}
                  onClick={(entry: { name?: string }) => { if (entry.name) toggle(setProductFilters)(entry.name); }}
                  style={{ cursor: "pointer" }}>
                  {topData.map((entry, i) => (
                    <Cell key={i}
                      fillOpacity={productFilters.length === 0 || productFilters.includes(entry.name) ? 1 : 0.3}
                      stroke={productFilters.includes(entry.name) ? CHART_PRIMARY_VAR : "none"}
                      strokeWidth={productFilters.includes(entry.name) ? 2 : 0}
                    />
                  ))}
                  <LabelList dataKey="revenue" content={focusProductValueLabel} />
                </Bar>
                <Bar dataKey="profit" name="Profit" fill={`url(#${GRAD.greenH})`} radius={[0,4,4,0]}
                  onClick={(entry: { name?: string }) => { if (entry.name) toggle(setProductFilters)(entry.name); }}
                  style={{ cursor: "pointer" }}>
                  {topData.map((entry, i) => (
                    <Cell key={i}
                      fillOpacity={productFilters.length === 0 || productFilters.includes(entry.name) ? 1 : 0.3}
                      stroke={productFilters.includes(entry.name) ? CHART_PRIMARY_VAR : "none"}
                      strokeWidth={productFilters.includes(entry.name) ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bgTopData} layout="vertical" margin={{top:0,right:64,left:0,bottom:0}}>
              <GradDefs />
              <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={productNameTick} axisLine={false} tickLine={false} width={114} />
              <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{fontSize:10}} />
              <Bar dataKey="revenue" name="Revenue" fill={`url(#${GRAD.blueH})`} radius={[0,4,4,0]}
                onClick={(entry: { name?: string }) => { if (entry.name) toggle(setProductFilters)(entry.name); }}
                style={{ cursor: "pointer" }}>
                {bgTopData.map((entry, i) => (
                  <Cell key={i}
                    fillOpacity={productFilters.length === 0 || productFilters.includes(entry.name) ? 1 : 0.3}
                    stroke={productFilters.includes(entry.name) ? CHART_PRIMARY_VAR : "none"}
                    strokeWidth={productFilters.includes(entry.name) ? 2 : 0}
                  />
                ))}
                <LabelList dataKey="revenue" content={productValueLabel} />
              </Bar>
              <Bar dataKey="profit" name="Profit" fill={`url(#${GRAD.greenH})`} radius={[0,4,4,0]}
                onClick={(entry: { name?: string }) => { if (entry.name) toggle(setProductFilters)(entry.name); }}
                style={{ cursor: "pointer" }}>
                {bgTopData.map((entry, i) => (
                  <Cell key={i}
                    fillOpacity={productFilters.length === 0 || productFilters.includes(entry.name) ? 1 : 0.3}
                    stroke={productFilters.includes(entry.name) ? CHART_PRIMARY_VAR : "none"}
                    strokeWidth={productFilters.includes(entry.name) ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="How do categories compare in total sales?"
          subtitle="Category Sales"
          tooltip="Which product groups made the most money overall. Longer bar = more total sales from that category."
          chartId="category_performance"
          glowing={glowIds.has("category_performance")}
          focusable
          focusContent={
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={catData} layout="vertical" margin={{top:0,right:72,left:0,bottom:0}}>
                <GradDefs />
                <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={catNameTick} axisLine={false} tickLine={false} width={130} />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Bar dataKey="sales" name="Sales" fill={`url(#${GRAD.blueH})`} radius={[0,4,4,0]} style={{ cursor: "pointer" }}>
                  {catData.map((entry, i) => (
                    <Cell key={i}
                      fillOpacity={categoryFilters.length === 0 || categoryFilters.includes(entry.category) ? 1 : 0.3}
                      stroke={categoryFilters.includes(entry.category) ? CHART_PRIMARY_VAR : "none"}
                      strokeWidth={categoryFilters.includes(entry.category) ? 2 : 0}
                      onClick={() => toggle(setCategoryFilters)(entry.category)}
                    />
                  ))}
                  <LabelList dataKey="sales" content={focusCatValueLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bgCatData} layout="vertical" margin={{top:0,right:64,left:0,bottom:0}}>
              <GradDefs />
              <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={catNameTick} axisLine={false} tickLine={false} width={114} />
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
              <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
              <Bar dataKey="sales" name="Sales" fill={`url(#${GRAD.blueH})`} radius={[0,4,4,0]} style={{ cursor: "pointer" }}>
                {bgCatData.map((entry, i) => (
                  <Cell key={i}
                    fillOpacity={categoryFilters.length === 0 || categoryFilters.includes(entry.category) ? 1 : 0.3}
                    stroke={categoryFilters.includes(entry.category) ? CHART_PRIMARY_VAR : "none"}
                    strokeWidth={categoryFilters.includes(entry.category) ? 2 : 0}
                    onClick={() => toggle(setCategoryFilters)(entry.category)}
                  />
                ))}
                <LabelList dataKey="sales" content={catValueLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <BasicProductTable filteredProducts={bgProducts} totalCount={page_2.product_table.length} />
    </>
  );
}


function BasicContent(): React.ReactElement | null {
  const filteredData = useFilteredData();
  if (!filteredData) return null;
  return <BasicContentInner filteredData={filteredData} />;
}

// ── Stock Alert Gauge ─────────────────────────────────────────────────────────

const MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface StockAlertGaugeProps {
  productsBelow: number;
  totalProducts: number;
}

function StockAlertGauge({ productsBelow, totalProducts }: StockAlertGaugeProps): React.ReactElement {
  const pct = totalProducts > 0 ? productsBelow / totalProducts : 0;
  const r = 70; const cx = 110; const cy = 95;

  const endX = cx - r * Math.cos(pct * Math.PI);
  const endY = cy - r * Math.sin(pct * Math.PI);
  // A semicircle gauge always spans ≤ 180° — large-arc-flag must always be 0.
  // Using 1 when pct > 0.5 was the bug: SVG took the "long way round" below the baseline.
  const largeArc = 0;

  const fillColor = pct === 0 ? CHART_COLOURS.green : pct < 0.5 ? CHART_COLOURS.amber : CHART_COLOURS.red;
  const label = pct === 0 ? "All stocked" : pct < 0.5 ? "Some low" : "Critically low";

  return (
    <div className="flex flex-col items-center justify-center h-full py-2">
      {/* viewBox tall enough for arc + center text + bottom endpoint labels */}
      <svg viewBox="0 0 220 125" className="w-full max-w-[260px]">
        {/* Background track — full semicircle (sweep=1 = CW on screen = left→top→right) */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#e2e8f0" strokeWidth={18} strokeLinecap="round"
        />
        {/* Filled portion — only drawn when there's something to show */}
        {pct > 0.01 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`}
            fill="none" stroke={fillColor} strokeWidth={18} strokeLinecap="round"
          />
        )}
        {/* Centre value */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={34} fontWeight="800" fill={fillColor}>{productsBelow}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fontWeight="600" fill={fillColor}>{label}</text>
        {/* Endpoint labels: 0 on the left, total on the right */}
        <text x={cx - r} y={cy + 20} textAnchor="middle" fontSize={11} fill="#94a3b8">0</text>
        <text x={cx + r} y={cy + 20} textAnchor="middle" fontSize={11} fill="#94a3b8">{totalProducts}</text>
      </svg>
      <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center mt-1">
        Products below reorder threshold
      </p>
    </div>
  );
}

// ── Intermediate Products content ─────────────────────────────────────────────

function IntContent({ data }: { data: IntermediateAnalysisResult["page_2"] }): React.ReactElement {
  const { kpis, charts, product_table } = data;
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [productFilters,  setProductFilters]  = useState<string[]>([]);
  const [supplierFilters, setSupplierFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"profit" | "margin" | "stock_asc">("profit");

  const toggleCategory = (v: string): void =>
    setCategoryFilters((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  const toggleProduct = (v: string): void =>
    setProductFilters((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  const toggleSupplier = (v: string): void =>
    setSupplierFilters((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const categoryOptions = [...new Set(product_table.map((r) => r.category))].sort();
  const productOptions  = [...new Set(product_table.map((r) => r.product))].sort();
  const supplierOptions = charts.supplier_ranking.map((s) => s.name);

  const baseFiltered = useMemo(() => {
    let r = product_table;
    if (categoryFilters.length > 0) r = r.filter((p) => categoryFilters.includes(p.category));
    if (productFilters.length  > 0) r = r.filter((p) => productFilters.includes(p.product));
    return r;
  }, [product_table, categoryFilters, productFilters]);

  const filteredProductTable = useMemo(() => {
    const copy = [...baseFiltered];
    if (sortBy === "profit")    return copy.sort((a, b) => b.profit - a.profit);
    if (sortBy === "margin")    return copy.sort((a, b) => b.profit_margin - a.profit_margin);
    if (sortBy === "stock_asc") return copy.sort((a, b) => a.stock_balance - b.stock_balance);
    return copy;
  }, [baseFiltered, sortBy]);

  const filteredSuppliers = supplierFilters.length > 0
    ? charts.supplier_ranking.filter((s) => supplierFilters.includes(s.name))
    : charts.supplier_ranking;
  const filteredRestock = supplierFilters.length > 0
    ? charts.restock_history.filter((r) => supplierFilters.includes(r.supplier))
    : charts.restock_history;

  const totalPages = Math.ceil(filteredProductTable.length / PAGE_SIZE);
  const slice = filteredProductTable.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  React.useEffect(() => { setPage(0); }, [categoryFilters, productFilters, sortBy]);

  useRegisterPageFilters([
    { id: "category", label: "Category", options: categoryOptions, selected: categoryFilters, onToggle: toggleCategory, onClearAll: () => setCategoryFilters([]) },
    { id: "product",  label: "Product",  options: productOptions,  selected: productFilters,  onToggle: toggleProduct,  onClearAll: () => setProductFilters([])  },
    { id: "supplier", label: "Supplier", options: supplierOptions, selected: supplierFilters, onToggle: toggleSupplier, onClearAll: () => setSupplierFilters([]) },
  ]);

  const restockSuppliers = [...new Set(filteredRestock.map(d => d.supplier))];
  const restockMonths = [...new Set(filteredRestock.map(d => d.month))].sort(
    (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
  );
  const restockPivoted = restockMonths.map(month => {
    const entry: Record<string, number | string> = { month };
    for (const supplier of restockSuppliers) {
      const row = filteredRestock.find(d => d.month === month && d.supplier === supplier);
      entry[supplier] = row?.qty ?? 0;
    }
    return entry;
  });

  const hasFilter = categoryFilters.length > 0 || productFilters.length > 0;

  // KPIs — override derivable fields when product/category filter is active
  const displayKpis = useMemo((): IntPage2Kpis => {
    if (!hasFilter) return kpis;
    const totalRevenue = baseFiltered.reduce((s, p) => s + p.revenue, 0);
    const totalProfit  = baseFiltered.reduce((s, p) => s + p.profit, 0);
    return {
      ...kpis,
      profit_margin:         totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0,
      units_sold:            baseFiltered.reduce((s, p) => s + p.units_sold, 0),
      total_products:        baseFiltered.length,
      categories:            new Set(baseFiltered.map((p) => p.category)).size,
      current_stock_balance: baseFiltered.reduce((s, p) => s + p.stock_balance, 0),
      avg_stock_level:       baseFiltered.length > 0
        ? baseFiltered.reduce((s, p) => s + p.stock_balance, 0) / baseFiltered.length
        : 0,
    };
  }, [hasFilter, baseFiltered, kpis]);

  // Top products chart — use filtered table when filters are active
  const topProductsData = useMemo(() => {
    const src = hasFilter
      ? [...baseFiltered].sort((a, b) => b.units_sold - a.units_sold).slice(0, 10)
      : charts.top_products.slice(0, 10);
    return src.map((p) => ({
      name: p.product.length > 20 ? p.product.slice(0, 20) + "…" : p.product,
      units_sold: p.units_sold,
    }));
  }, [hasFilter, baseFiltered, charts.top_products]);

  // Stock by category — derive from filtered table when filters are active
  const stockByCategoryData = useMemo((): IntStockByCategoryPoint[] => {
    if (!hasFilter) return charts.stock_by_category;
    const map: Record<string, number> = {};
    baseFiltered.forEach((p) => { map[p.category] = (map[p.category] ?? 0) + p.stock_balance; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([category, stock_level]) => ({ category, stock_level }));
  }, [hasFilter, baseFiltered, charts.stock_by_category]);

  const fmtCompact = (v: number): string =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000   ? `${(v / 1_000).toFixed(1)}K`
    : v.toLocaleString();

  return (
    <>
      <KpiStrip title="Key Numbers">
        <KpiCard label="Profit Margin"    value={`${displayKpis.profit_margin}%`}                    tooltip="Out of every ₦100 you earn, how much you keep after cost of goods." accent="blue" compact className="w-[185px] shrink-0" />
        <KpiCard label="Units Sold"       value={displayKpis.units_sold.toLocaleString()}             tooltip="Total units sold this period." accent="blue" compact className="w-[185px] shrink-0" />
        <KpiCard label="Total Products"   value={displayKpis.total_products.toString()}               tooltip="Total distinct products tracked in your stock." compact className="w-[185px] shrink-0" />
        <KpiCard label="Below Reorder"    value={displayKpis.products_below_reorder.toString()}       tooltip="Products with stock levels below their reorder point." alert={displayKpis.products_below_reorder > 0} compact className="w-[185px] shrink-0" />
        <KpiCard label="Categories"       value={displayKpis.categories.toString()}                   tooltip="Number of distinct product categories." compact className="w-[185px] shrink-0" />
        <KpiCard label="Stock Added"      value={fmtCompact(displayKpis.stock_added)}                 tooltip="Total units added to stock (restocked) this period." compact className="w-[185px] shrink-0" />
        <KpiCard label="Restock Cost"     value={formatNaira(displayKpis.restock_cost)}               tooltip="Total money spent on restocking." compact className="w-[185px] shrink-0" />
        <KpiCard label="Stock Balance"    value={displayKpis.current_stock_balance.toLocaleString()}  tooltip="Total units currently on hand across all products." compact className="w-[185px] shrink-0" />
        {displayKpis.avg_stock_level !== undefined && (
          <KpiCard label="Avg Stock Level" value={displayKpis.avg_stock_level.toFixed(0)}            tooltip="Average units held in stock per product." compact className="w-[185px] shrink-0" />
        )}
        {displayKpis.stock_turnover_rate !== undefined && (
          <KpiCard label="Turnover Rate"  value={displayKpis.stock_turnover_rate.toFixed(1)}         tooltip="How quickly your stock sells and is replaced. Higher = faster turnover." compact className="w-[185px] shrink-0" />
        )}
      </KpiStrip>

      {/* ── Row 1: Top Products | Restock History (grouped) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {charts.top_products.length > 0 && (
          <ChartCard
            title="Which products keep customers coming back?"
            subtitle="Top Products by Units Sold"
            tooltip="Your most-purchased products by number of items sold. High units = high demand — make sure these are always in stock."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={topProductsData} layout="vertical" margin={{top:0,right:24,left:0,bottom:0}}>
                  <GradDefs />
                  <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={TICK} axisLine={false} tickLine={false} width={140} />
                  <Tooltip content={<DashTooltip />} />
                  <Bar dataKey="units_sold" name="Units Sold" fill={`url(#${GRAD.blueH})`} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            }
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topProductsData} layout="vertical" margin={{top:0,right:16,left:0,bottom:0}}>
                <GradDefs />
                <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={TICK} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<DashTooltip />} />
                <Bar dataKey="units_sold" name="Units Sold" fill={`url(#${GRAD.blueH})`} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {restockPivoted.length > 0 && (
          <ChartCard
            title="When did each supplier deliver stock?"
            subtitle="Restock History by Supplier"
            tooltip="Each bar group shows units delivered per month, split by supplier. Gaps mean no delivery that month — useful for spotting supply gaps."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={restockPivoted} margin={{top:4,right:8,left:0,bottom:0}}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<DashTooltip />} />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{fontSize:10}} />
                  {restockSuppliers.map((supplier, i) => (
                    <Bar key={supplier} dataKey={supplier} name={supplier} fill={DONUT_COLOURS[i % DONUT_COLOURS.length]} radius={[4,4,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            }
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={restockPivoted} margin={{top:4,right:8,left:0,bottom:0}}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<DashTooltip />} />
                <Legend iconType="square" iconSize={8} wrapperStyle={{fontSize:10}} />
                {restockSuppliers.map((supplier, i) => (
                  <Bar key={supplier} dataKey={supplier} name={supplier} fill={DONUT_COLOURS[i % DONUT_COLOURS.length]} radius={[4,4,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* ── Row 2: Stock Level Trend (left) | Supplier Ranking (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {charts.stock_level_trend.length > 0 && (
          <ChartCard
            title="How has your average stock level changed over time?"
            subtitle="Stock Level Trend"
            tooltip="Shows the average units in stock each month. A sharp drop means you're selling faster than you're restocking. Use this to spot when to reorder before you run out."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={charts.stock_level_trend} margin={{top:4,right:24,left:0,bottom:0}}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date_str" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<DashTooltip />} />
                  <Line type="monotone" dataKey="avg_stock" name="Avg Stock" stroke={CHART_COLOURS.green} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLOURS.green }} activeDot={{ r: 6 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charts.stock_level_trend} margin={{top:4,right:8,left:0,bottom:0}}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="date_str" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<DashTooltip />} />
                <Line type="monotone" dataKey="avg_stock" name="Avg Stock" stroke={CHART_COLOURS.green} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLOURS.green }} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {filteredSuppliers.length > 0 && (
          <ChartCard
            title="Which suppliers do you spend the most with?"
            subtitle="Supplier Ranking"
            tooltip="Total money paid to each supplier. Your biggest supplier gets the most of your cash — that's your best negotiating position for a price deal."
            focusable
            focusContent={
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={filteredSuppliers} layout="vertical" margin={{top:0,right:24,left:0,bottom:0}}>
                  <GradDefs />
                  <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={TICK} axisLine={false} tickLine={false} width={130} />
                  <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                  <Bar dataKey="total_spent" name="Total Spent" fill={`url(#${GRAD.blueH})`} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filteredSuppliers} layout="vertical" margin={{top:0,right:16,left:0,bottom:0}}>
                <GradDefs />
                <XAxis type="number" tickFormatter={formatNaira} tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={TICK} axisLine={false} tickLine={false} width={120} />
                <Tooltip content={<DashTooltip valueFormatter={formatNaira} />} />
                <Bar dataKey="total_spent" name="Total Spent" fill={`url(#${GRAD.blueH})`} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* ── Row 3: Product Table (left) | Gauge + StockByCategory (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Product Detail</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{filteredProductTable.length} of {product_table.length} products</p>
            </div>
            <div className="flex gap-1.5">
              {(["profit","margin","stock_asc"] as const).map((key) => {
                const label = key === "profit" ? "Profit" : key === "margin" ? "Margin" : "Lowest Stock";
                return (
                  <button key={key} onClick={() => setSortBy(key)}
                    className={cn("px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
                      sortBy === key
                        ? "bg-primary dark:bg-secondary text-white shadow-sm"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700")}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
                {["Product","Category","Units Sold","Revenue","Profit","Margin","Stock"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody>{slice.map((row, i) => (
                <tr key={i} className={cn("relative border-b border-gray-50 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:scale-[1.01] hover:z-10 transition-all duration-150", i%2===0?"bg-white dark:bg-slate-900":"bg-gray-50/40 dark:bg-slate-800/30")}>
                  <td className="px-4 py-2.5 text-gray-800 dark:text-slate-200 font-medium max-w-[160px] truncate">{row.product}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-slate-500">{row.category}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 tabular-nums">{row.units_sold.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-slate-200 tabular-nums">{formatNaira(row.revenue)}</td>
                  <td className={cn("px-4 py-2.5 font-bold tabular-nums", row.profit>0?"text-emerald-600":"text-red-500")}>{formatNaira(row.profit)}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      row.profit_margin>15?"bg-emerald-100 text-emerald-700 border border-emerald-200":
                      row.profit_margin>0?"bg-amber-100 text-amber-700 border border-amber-200":"bg-red-100 text-red-700 border border-red-200")}>
                      {row.profit_margin}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 tabular-nums">{row.stock_balance}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {totalPages>1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
              <p className="text-xs text-gray-400 dark:text-slate-500">Page {page+1} of {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-700 font-medium">Previous</button>
                <button disabled={page===totalPages-1} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 text-xs rounded-lg bg-primary dark:bg-secondary text-white disabled:opacity-40 hover:opacity-90 dark:hover:bg-secondary/90 font-medium">Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Gauge + StockByCategory stacked */}
        <div className="flex flex-col gap-4">
          <ChartCard
            title="How many products need restocking right now?"
            subtitle="Stock Alert Gauge"
            tooltip="The gauge fills red as more products drop below their reorder point. 0 = all good. Any fill = action needed."
          >
            <StockAlertGauge
              productsBelow={charts.stock_alert_gauge.products_below_reorder}
              totalProducts={charts.stock_alert_gauge.total_products}
            />
          </ChartCard>

          {stockByCategoryData.length > 0 && (
            <ChartCard
              title="How much stock does each category hold?"
              subtitle="Stock by Category"
              tooltip="Current units in stock for each product category. A very low bar means that whole category is close to running out."
              focusable
              focusContent={
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={stockByCategoryData} margin={{top:4,right:24,left:0,bottom:0}}>
                    <GradDefs />
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="category" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                    <YAxis tick={TICK} axisLine={false} tickLine={false} />
                    <Tooltip content={<DashTooltip />} />
                    <Bar dataKey="stock_level" name="Stock Level" fill={`url(#${GRAD.greenV})`} radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              }
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stockByCategoryData} margin={{top:4,right:8,left:0,bottom:0}}>
                  <GradDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="category" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<DashTooltip />} />
                  <Bar dataKey="stock_level" name="Stock Level" fill={`url(#${GRAD.greenV})`} radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      </div>
    </>
  );
}

// ── Advanced Products content ──────────────────────────────────────────────────

function AdvContent({ data }: { data: AdvancedAnalysisResult["page_2"] }): React.ReactElement {
  const { kpis, charts, product_health_table } = data;
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;
  const alerts = product_health_table.filter(r => r.reorder_alert);
  const totalPages = Math.ceil(product_health_table.length / PAGE_SIZE);
  const slice = product_health_table.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <KpiStrip title="Key Numbers">
        <KpiCard label="Total Products"  value={kpis.total_products.toString()} tooltip="Distinct products in inventory." compact className="w-[185px] shrink-0" />
        <KpiCard label="Units Sold"      value={kpis.units_sold}               tooltip="Total units sold this period." compact className="w-[185px] shrink-0" />
        <KpiCard label="Stock Level"     value={kpis.current_stock_level}      tooltip="Total units currently on hand." compact className="w-[185px] shrink-0" />
        <KpiCard label="Inventory Value" value={kpis.inventory_value}          tooltip="Estimated value of current stock." compact className="w-[185px] shrink-0" />
        <KpiCard label="Restock Cost"    value={kpis.restock_cost}             tooltip="Total cost of restocking this period." compact className="w-[185px] shrink-0" />
        <KpiCard label="Reorder Alerts"  value={alerts.length.toString()} alert={alerts.length>0} tooltip="Products flagged for reordering." compact className="w-[185px] shrink-0" />
      </KpiStrip>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {charts.inventory_level_trend.length > 0 && (
          <ChartCard title="How has your total stock changed over time?" subtitle="Inventory Trend" tooltip="Tracks whether your total inventory is growing or shrinking over time. A steady level is usually healthy — a sharp drop means stock is running out faster than you're restocking.">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.inventory_level_trend} margin={{top:4,right:8,left:0,bottom:0}}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="date_str" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" padding={{ left: 15, right: 15 }} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<DashTooltip />} />
                <Area type="monotone" dataKey="total_stock" name="Total Stock" stroke="#10b981" strokeWidth={2.5} fill={`url(#${GRAD.greenArea})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        {charts.stock_by_category.length > 0 && (
          <ChartCard title="How much stock does each category hold?" subtitle="Stock by Category" tooltip="How many units of each category you currently have in stock. Use this to spot where stock is building up or running dangerously low.">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.stock_by_category} margin={{top:4,right:8,left:0,bottom:0}}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="category" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<DashTooltip />} />
                <Bar dataKey="stock_level" name="Stock Level" fill={`url(#${GRAD.greenV})`} radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        {charts.top_products.length > 0 && (
          <ChartCard title="Which products sell the most units?" subtitle="Top Products by Volume" tooltip="Your fastest-moving products by number of items sold. High volume = high demand — make sure these are always in stock.">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.top_products.slice(0,10)} layout="vertical" margin={{top:0,right:16,left:0,bottom:0}}>
                <GradDefs />
                <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="product" tick={TICK} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<DashTooltip />} />
                <Bar dataKey="quantity" name="Units Sold" fill={`url(#${GRAD.blueH})`} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800">
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Product Health</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{product_health_table.length} products · {alerts.length} require restocking</p>
        </div>
        <div className="table-scroll">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
              {["Product","Category","Current Stock","Min Stock","Days Cover","Reorder?"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>{slice.map((row, i) => (
              <tr key={i} className={cn("relative border-b border-gray-50 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:scale-[1.01] hover:z-10 transition-all duration-150", i%2===0?"bg-white dark:bg-slate-900":"bg-gray-50/40 dark:bg-slate-800/30")}>
                <td className="px-4 py-2.5 text-gray-800 dark:text-slate-200 font-medium max-w-[160px] truncate">{row.product}</td>
                <td className="px-4 py-2.5 text-gray-500 dark:text-slate-500">{row.category}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 tabular-nums">{row.current_stock}</td>
                <td className="px-4 py-2.5 text-gray-500 dark:text-slate-500 tabular-nums">{row.min_stock}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 tabular-nums">{row.days_inventory}d</td>
                <td className="px-4 py-2.5">
                  {row.reorder_alert
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200"><ExclamationTriangleIcon className="size-3"/>Reorder</span>
                    : <span className="text-gray-200 dark:text-slate-700">—</span>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {totalPages>1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
            <p className="text-xs text-gray-400 dark:text-slate-500">Page {page+1} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-700 font-medium">Previous</button>
              <button disabled={page===totalPages-1} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 text-xs rounded-lg bg-primary dark:bg-secondary text-white disabled:opacity-40 hover:opacity-90 dark:hover:bg-secondary/90 font-medium">Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Named export — used by the thin page shell ────────────────────────────────

export interface ProductsContentProps {
  firstName: string;
}

export function ProductsContent({ firstName }: ProductsContentProps): React.ReactElement | null {
  const tierData     = useProductsPageData();
  const filteredData = useFilteredData();
  const metadata     = useTierMetadata();

  if (!tierData) return null;

  const fmtDate = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const displayMeta = tierData.tier === "basic"
    ? (filteredData?.metadata ?? metadata)
    : metadata;

  const isFiltered    = filteredData?.isFiltered ?? false;
  const filteredCount = filteredData?.filteredCount ?? 0;
  const greeting      = getGreeting();

  return (
    <>
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Products</p>
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

      {tierData.tier === "basic"        && <BasicContent />}
      {tierData.tier === "intermediate" && <IntContent   data={tierData.data} />}
      {tierData.tier === "advanced"     && <AdvContent   data={tierData.data} />}
    </>
  );
}

