// Types for analyze_retail_basic.py output
// Matches the canonical output structure from analyze_basic()

// ── Page 1: Sales Overview ────────────────────────────────────────────────

export interface Page1Kpis {
  total_sales: number;
  total_cost: number;
  total_profit: number;
  units_sold: number;
  average_selling_price: number;
  total_transactions: number;
  transfer_rate: number;
}

export interface SalesTrendPoint {
  date: string;
  sales: number;
}

export interface ProfitTrendPoint {
  date: string;
  profit: number;
}

export interface CategoryQtyPoint {
  category: string;
  quantity: number;
}

export interface PaymentDistPoint {
  payment_method: string;
  transactions: number;
}

export interface DetailRow {
  date: string;
  product: string;
  category: string;
  order_no: string | number;
  quantity: number;
  selling_price: number;
  payment_method: string;
  total_sales_auto: number;
  profit_auto: number;
}

export interface Page1Charts {
  sales_trend: SalesTrendPoint[];
  profit_trend: ProfitTrendPoint[];
  quantity_by_category: CategoryQtyPoint[];
  payment_method_distribution: PaymentDistPoint[];
}

export interface Page1 {
  kpis: Page1Kpis;
  charts: Page1Charts;
  detail_table: DetailRow[];
  error?: string;
}

// ── Page 2: Product Performance ───────────────────────────────────────────

export interface Page2Kpis {
  units_sold: number;
  product_revenue: number;
  product_profit: number;
  current_profit_margin: number;
  reorder_alerts: number;
}

export interface TopProduct {
  product: string;
  category: string;
  units_sold: number;
  revenue: number;
  profit: number;
  profit_margin: number;
  needs_reorder: boolean;
  reorder_level_piecespacks: number;
  current_unit_cost: number;
  current_selling_price: number;
  avg_selling_price: number;
  transaction_count: number;
}

export interface ProductTableRow {
  product: string;
  category: string;
  units_sold: number;
  revenue: number;
  profit: number;
  profit_margin: number;
  needs_reorder: boolean;
  reorder_level_piecespacks: number;
  current_unit_cost: number;
  current_selling_price: number;
}

export interface Page2 {
  kpis: Page2Kpis;
  top_products: TopProduct[];
  product_table: ProductTableRow[];
  category_performance: Record<string, number>;
  error?: string;
}

// ── Page 3: Forecast Insights ─────────────────────────────────────────────

export interface Page3Kpis {
  forecasted_sales: number;
  forecasted_profit: number;
  sales_growth_rate: number;
  forecast_confidence: number;
  profit_margin: number;
}

export interface ForecastLinePoint {
  date: string;
  sales: number;
  type: "historical" | "forecast";
  upper_band?: number;
  lower_band?: number;
}

export interface CategoryForecastBar {
  category: string;
  current_3m: number;
  forecast_3m: number;
  forecast_share: number;
}

export interface TopItemForecastRow {
  product: string;
  category: string;
  forecast_30d: number;
  total_sales: number;
  growth: string;
  profit: number;
  margin: number;
  units: number;
}

export interface SeasonalityDayPoint {
  day: string;
  day_short: string;
  avg_sales: number;
}

export interface SeasonalityMonthPoint {
  month: string;
  month_short: string;
  avg_sales: number;
}

export interface WeekdayWeekendPoint {
  type: "Weekday" | "Weekend";
  avg_sales: number;
}

export interface QuarterSalesPoint {
  quarter: string;
  sales: number;
}

export interface SeasonalityPattern {
  sales_by_day_of_week: SeasonalityDayPoint[];
  sales_by_month: SeasonalityMonthPoint[];
  weekday_vs_weekend: WeekdayWeekendPoint[];
  sales_by_quarter: QuarterSalesPoint[];
}

export interface Page3Charts {
  forecast_line: ForecastLinePoint[];
  category_forecast_bars: CategoryForecastBar[];
  top_item_forecast_table: TopItemForecastRow[];
  seasonality_pattern: SeasonalityPattern;
}

export interface ForecastMeta {
  months_of_data: number;
  min_months_required: number;
  sufficient_data: boolean;
  horizon_days: number;
  daily_avg_forecast: number;
  confidence_note: string;
}

export interface Page3 {
  status: "success" | "error";
  kpis: Page3Kpis;
  charts: Page3Charts;
  forecast_meta: ForecastMeta;
  error?: string;
}

// ── Anomalies ─────────────────────────────────────────────────────────────

export interface AnomalyPoint {
  date: string;
  product: string;
  total_sales_auto?: number;
  sales_z?: number;
  margin?: number;
  margin_z?: number;
  quantity?: number;
  qty_z?: number;
}

export interface AnomalySummary {
  sales_anomalies: number;
  margin_anomalies: number;
  quantity_anomalies: number;
  total_anomalies: number;
}

export interface Anomalies {
  summary: AnomalySummary;
  sales_anomalies: AnomalyPoint[];
  margin_anomalies: AnomalyPoint[];
  quantity_anomalies: AnomalyPoint[];
  error?: string;
}

// ── Metadata ──────────────────────────────────────────────────────────────

export interface BasicMetadata {
  record_count: number;
  has_product_list: boolean;
  date_range: {
    start: string | null;
    end: string | null;
  };
}

// ── Root result ───────────────────────────────────────────────────────────

export interface BasicAnalysisResult {
  page_1: Page1;
  page_2: Page2;
  page_3: Page3;
  anomalies: Anomalies;
  metadata: BasicMetadata;
}
