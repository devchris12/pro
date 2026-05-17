// Types for Advanced tier analysis output.
// page_1 = Sales, page_2 = Products+Stock, page_3 = Customers,
// page_4 = Staff, page_5 = Expenses, page_6 = Forecast.
// Most KPI values are pre-formatted strings (e.g. "₦26M") — display as-is.
// Exception: numeric fields like order_count, unique_customers remain numbers.

// ── Page 1 — Sales ─────────────────────────────────────────────────────────

export interface AdvPage1Kpis {
  gross_revenue: string;
  cogs: string;
  gross_profit: string;
  total_expenses: string;
  net_profit: string;
  profit_margin: string;
  avg_basket: string;
  discount_impact: string;
  order_count: number;
}

export interface AdvRevenueTrendPoint { month: string; month_short: string; revenue: number; } // revenue in millions
export interface AdvPaymentMethodPoint { method: string; revenue: number; } // revenue in millions

export interface AdvPage1 {
  kpis: AdvPage1Kpis;
  charts: {
    revenue_trend: AdvRevenueTrendPoint[];
    profit_trend: unknown[];
    revenue_by_category: Array<{ category: string; revenue: number }>;
    payment_method_distribution: AdvPaymentMethodPoint[];
    top_products: Array<{ product: string; revenue: number }>;
    profit_waterfall: unknown[];
  };
}

// ── Page 2 — Products + Inventory ─────────────────────────────────────────

export interface AdvPage2Kpis {
  total_products: number;
  units_sold: string;
  product_revenue: string;
  product_profit: string;
  total_restocked: string;
  restock_cost: string;
  current_stock_level: string;
  inventory_value: string;
  stock_turnover_rate: string;
}

export interface AdvProductHealthRow {
  product: string;
  category: string;
  current_stock: number;
  min_stock: number;
  days_inventory: number;
  reorder_alert: boolean;
}

export interface AdvInventoryTrendPoint { date_str: string; total_stock: number; }
export interface AdvTopProductPoint { product: string; quantity: number; }
export interface AdvStockByCategoryPoint { category: string; stock_level: number; }

export interface AdvPage2 {
  kpis: AdvPage2Kpis;
  charts: {
    inventory_level_trend: AdvInventoryTrendPoint[];
    top_products: AdvTopProductPoint[];
    supplier_ranking: unknown[];
    stock_by_category: AdvStockByCategoryPoint[];
    inventory_value_card: unknown;
  };
  product_health_table: AdvProductHealthRow[];
}

// ── Page 3 — Customers ─────────────────────────────────────────────────────

export interface AdvPage3Kpis {
  unique_customers: number;
  repeat_customers: number;
  repeat_rate: string;
  avg_spend: string;
  customer_lifetime_value: string;
  total_visits: number;
  last_visit: string;
  new_customers: number;
  churned_customers: number;
  avg_visits: number;
  retention_rate: string;
}

export interface AdvClvLeaderboardRow {
  customer: string;
  phone: string;
  total_spent: string;
  visits: number;
  last_visit: string;
}

export interface AdvCustomerRankingRow {
  customer: string;
  total_spent: string;
}

export interface AdvMonthlyActivePoint { month: string; month_short: string; active_customers: number; }
export interface AdvSpendingDistPoint { bucket: string; count: number; }

export interface AdvPage3 {
  kpis: AdvPage3Kpis;
  charts: {
    customer_ranking: AdvCustomerRankingRow[];
    monthly_active: AdvMonthlyActivePoint[];
    repeat_vs_new: unknown;
    spending_distribution: AdvSpendingDistPoint[];
  };
  clv_leaderboard: AdvClvLeaderboardRow[];
}

// ── Page 4 — Staff Performance ─────────────────────────────────────────────

export interface AdvStaffKpis {
  total_staff: number;
  total_orders: number;
  avg_sale_per_staff: string;
  achievement_percentage: string;
  staff_productivity_rank: string;
}

export interface AdvStaffLeaderboardRow {
  staff_name: string;
  branch: string;
  revenue: string;
  profit: string;
  orders_handled: number;
  avg_sale: string;
  commission: string;
  salary: string;
}

export interface AdvBranchPerformancePoint { branch: string; revenue: number; }

export interface AdvPage4 {
  kpis: AdvStaffKpis;
  charts: {
    staff_sales: Array<{ staff_name: string; revenue: string }>;
    orders_comparison: unknown[];
    branch_performance: AdvBranchPerformancePoint[];
    staff_vs_target_gauge: unknown[];
  };
  staff_leaderboard: AdvStaffLeaderboardRow[];
}

// ── Page 5 — Expenses ──────────────────────────────────────────────────────

export interface AdvExpenseKpis {
  total_expenses: string;
  operating_profit: string;
  expense_share: string;
  expense_transactions: number;
  largest_expense_category: string;
  monthly_avg_expense: string;
  ytd_expenses: string;
}

export interface AdvExpenseDetailRow {
  date: string;
  branch: string;
  expense_type: string;
  amount: string;
  paid_to: string;
  receipt_no: string;
  approved_by: string;
}

// Advanced expense chart values are in millions (float)
export interface AdvExpenseVsSalesPoint { month: string; month_short: string; expenses: number; sales: number; }
export interface AdvExpenseByCategoryPoint { category: string; amount: number; }
export interface AdvExpenseTrendPoint { date: string; expenses: number; date_str: string; }

export interface AdvPage5 {
  kpis: AdvExpenseKpis;
  charts: {
    expense_trend: AdvExpenseTrendPoint[];
    expense_moving_avg: unknown[];
    expense_by_category: AdvExpenseByCategoryPoint[];
    expense_vs_sales: AdvExpenseVsSalesPoint[];
    monthly_expense_breakdown: unknown[];
    operating_profit_waterfall: unknown[];
  };
  expense_detail_table: AdvExpenseDetailRow[];
}

// ── Page 6 — Forecast ─────────────────────────────────────────────────────

export interface AdvPage6Kpis {
  forecasted_sales: string;
  forecasted_profit: string;
  sales_growth_rate: string;
  forecast_confidence: string;
  days_until_stockout: number;
  historical_profit_margin: string;
}

// sales value is in millions (float) — multiply by 1_000_000 to format
export interface AdvForecastLinePoint {
  date: string;
  sales: number;
  type: "historical" | "forecast";
  upper_band?: number | null;
  lower_band?: number | null;
}

// current + forecast values are in millions (float)
export interface AdvCategoryPrediction {
  category: string;
  current: number;
  forecast: number;
  growth: number; // percentage
}

export interface AdvSeasonalityPattern {
  sales_by_day_of_week: Array<{ day: string; day_short: string; avg_sales: number }>;
  sales_by_month: Array<{ month: string; month_short: string; avg_sales: number }>;
  weekday_vs_weekend: Array<{ type: string; avg_sales: number }>;
}

export interface AdvPage6 {
  status: string;
  kpis: AdvPage6Kpis;
  charts: {
    forecast_line: AdvForecastLinePoint[];
    category_prediction: AdvCategoryPrediction[];
    product_demand_projection: unknown[];
    projected_profit_trend: unknown[];
    seasonality_pattern: AdvSeasonalityPattern;
  };
  forecast_meta: import("./intermediateAnalysis").ForecastMeta;
}

// ── Root ───────────────────────────────────────────────────────────────────

export interface AdvancedAnalysisResult {
  page_1: AdvPage1;
  page_2: AdvPage2;
  page_3: AdvPage3;
  page_4: AdvPage4;
  page_5: AdvPage5;
  page_6: AdvPage6;
  anomalies: unknown;
  metadata: {
    date_range: { start: string; end: string };
    record_count: number;
    [key: string]: unknown;
  };
}
