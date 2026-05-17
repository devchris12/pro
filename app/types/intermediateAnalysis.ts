// Types for Intermediate tier analysis output.
// page_1 = Sales, page_2 = Products+Stock, page_3 = Customers,
// page_4 = Expenses, page_5 = Forecast.
// All KPI values are raw numbers (not pre-formatted strings).

// ── Page 1 — Sales ─────────────────────────────────────────────────────────

export interface IntPage1Kpis {
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  net_sales: number;
  discount_impact: number;
  order_count: number;
  aov: number;
  daily_avg_sales: number;
  profit_margin: number;
}

export interface IntSalesTrendPoint { month: string; sales: number; month_short: string; }
export interface IntProfitTrendPoint { month: string; profit: number; month_short: string; }
export interface IntStaffPerformancePoint { name: string; revenue: number; }
export interface IntPaymentMethodPoint { method: string; revenue: number; }

export interface IntPage1 {
  kpis: IntPage1Kpis;
  charts: {
    sales_trend: IntSalesTrendPoint[];
    profit_trend: IntProfitTrendPoint[];
    revenue_by_category: Array<{ category: string; revenue: number }>;
    payment_method_distribution: IntPaymentMethodPoint[];
    staff_performance: IntStaffPerformancePoint[];
  };
}

// ── Page 2 — Products + Stock ──────────────────────────────────────────────

export interface IntPage2Kpis {
  profit_margin: number;
  units_sold: number;
  total_products: number;
  products_below_reorder: number;
  categories: number;
  stock_added: number;
  restock_cost: number;
  current_stock_balance: number;
  avg_stock_level?: number;
  stock_turnover_rate?: number;
  supplier_transactions?: number;
}

export interface IntProductTableRow {
  product: string;
  category: string;
  units_sold: number;
  revenue: number;
  cost: number;
  profit: number;
  cost_price: number;
  selling_price: number;
  profit_margin: number; // integer e.g. 10 = 10%
  stock_balance: number;
}

export interface IntTopProductPoint { product: string; units_sold: number; }
export interface IntSupplierRankingPoint { name: string; total_spent: number; transactions: number; }
export interface IntStockByCategoryPoint { category: string; stock_level: number; }
export interface IntStockLevelTrendPoint { date: string; avg_stock: number; date_str: string; }
export interface IntRestockHistoryPoint { month: string; supplier: string; qty: number; }
export interface IntStockAlertGauge { products_below_reorder: number; total_products: number; threshold: number; }

export interface IntPage2 {
  kpis: IntPage2Kpis;
  charts: {
    top_products: IntTopProductPoint[];
    stock_level_trend: IntStockLevelTrendPoint[];
    restock_history: IntRestockHistoryPoint[];
    supplier_ranking: IntSupplierRankingPoint[];
    stock_alert_gauge: IntStockAlertGauge;
    stock_by_category: IntStockByCategoryPoint[];
  };
  product_table: IntProductTableRow[];
}

// ── Page 3 — Customers ─────────────────────────────────────────────────────

export interface IntPage3Kpis {
  unique_customers: number;
  repeat_customers: number;
  repeat_purchase_rate: number;
  clv: number;
  avg_customer_value: number;
  total_spent_list: number;
  total_visits: number;
  avg_visits_per_customer: number;
  last_visit_date: string;
  customers_this_month: number;
  churned_customers: number;
  customer_retention_rate: number;
}

export interface IntCustomerDetailRow {
  customer_name: string;
  customer_phone: string;
  total_spent: number;
  total_visits: number;
  last_visit_date: string;
  clv: number;
}

export interface IntCustomerLeaderboardRow {
  name: string;
  customer_phone: string;
  total_spent: number;
  visits: number;
}

export interface IntMonthlyActivePoint { month: string; month_short: string; active_customers: number; }
export interface IntFrequencyDistPoint { bucket: string; customer_count: number; }

export interface IntClvByCategoryRow {
  customer: string;
  category: string;
  clv: number;
}

export interface IntRepeatVsNew {
  repeat: number;
  new: number;
  repeat_pct: number;
  new_pct: number;
}

export interface IntPage3 {
  kpis: IntPage3Kpis;
  charts: {
    customer_leaderboard: IntCustomerLeaderboardRow[];
    monthly_active: IntMonthlyActivePoint[];
    clv_by_category: IntClvByCategoryRow[];
    repeat_vs_new: IntRepeatVsNew;
    frequency_distribution: IntFrequencyDistPoint[];
  };
  customer_detail_table: IntCustomerDetailRow[];
}

// ── Page 4 — Expenses ──────────────────────────────────────────────────────

export interface IntExpenseKpis {
  total_expenses: number;
  operating_profit: number;
  expense_share: number;
  monthly_avg_expense: number;
  operating_profit_margin: number;
  net_profit_margin: number;
}

export interface IntExpenseTrendPoint { date: string; expenses: number; date_str: string; }
export interface IntExpenseVsSalesPoint { month: string; month_short: string; expenses: number; sales: number; }
export interface IntExpenseMovingAvgPoint { month: string; month_short: string; amount: number; moving_avg: number; }
export interface IntExpenseDetailRow { date: string; amount: number; paid_to: string; notes: string; }

export interface IntPage4 {
  kpis: IntExpenseKpis;
  charts: {
    expense_trend: IntExpenseTrendPoint[];
    expense_moving_avg: IntExpenseMovingAvgPoint[];
    expense_by_category: unknown[];
    expense_vs_sales: IntExpenseVsSalesPoint[];
    monthly_expense_breakdown: unknown[];
    operating_profit_waterfall: unknown;
  };
  expense_detail_table: IntExpenseDetailRow[];
}

// ── Page 5 — Forecast ─────────────────────────────────────────────────────

export interface IntPage5Kpis {
  total_forecasted_sales: number;
  total_forecasted_profit: number;
  sales_growth_rate: number;
  forecast_confidence: number;
  historical_profit_margin: number;
}

export interface IntForecastLinePoint {
  date: string;
  sales: number;
  type: "historical" | "forecast";
  upper_band?: number | null;
  lower_band?: number | null;
}

export interface IntCategoryPrediction {
  category: string;
  current_sales: number;
  forecast_share_pct: number;
  forecasted_sales: number;
}

export interface IntTopItemForecast {
  product: string;
  rank: number;
  day_30_forecast: number;
  target_sales: number;
  total_sales: number;
}

export interface IntSeasonalityPattern {
  sales_by_day_of_week: Array<{ day: string; day_short: string; avg_sales: number }>;
  sales_by_month: Array<{ month: string; month_short: string; avg_sales: number }>;
  weekday_vs_weekend: Array<{ type: string; avg_sales: number }>;
  sales_heatmap?: unknown;
}

export interface ForecastMeta {
  months_of_data: number;
  min_months_required: number;
  sufficient_data: boolean;
  horizon_days: number;
  confidence_note: string;
}

export interface IntPage5 {
  status: string;
  kpis: IntPage5Kpis;
  charts: {
    forecast_line: IntForecastLinePoint[];
    category_prediction: IntCategoryPrediction[];
    top_item_forecast_table: IntTopItemForecast[];
    expected_profit_trend: unknown[];
    seasonality_pattern: IntSeasonalityPattern;
  };
  forecast_meta: ForecastMeta;
}

// ── Root ───────────────────────────────────────────────────────────────────

export interface IntermediateAnalysisResult {
  page_1: IntPage1;
  page_2: IntPage2;
  page_3: IntPage3;
  page_4: IntPage4;
  page_5: IntPage5;
  anomalies: unknown;
  metadata: {
    date_range: { start: string; end: string };
    record_count: number;
    has_stock: boolean;
    has_expenses: boolean;
    has_customers: boolean;
    record_counts: Record<string, number>;
  };
}
