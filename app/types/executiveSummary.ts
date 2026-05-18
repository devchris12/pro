// Types for executive_summary_*.py output (all tiers)
// Matches the output of build_executive_summary()

export interface HealthScoreComponent {
  name: string;
  weight: string;
  raw: number;
  pts: number;
  max_pts: number;
  detail: string;
  colour: "green" | "amber" | "red";
}

export interface DataCompleteness {
  pct_clean: number;
  has_issues: boolean;
  issue_count: number;
  badge: string;
}

export interface HealthScore {
  score: number;
  delta_pts: number;
  delta_label: string;
  label: string;
  colour: "green" | "amber" | "red";
  based_on: string;
  components: HealthScoreComponent[];
  data_completeness: DataCompleteness;
}

export interface VitalSignCard {
  label: string;
  value: string;
  sub: string;
  delta: string;
  sentiment: "green" | "amber" | "red";
  trend_pct?: number | null;
}

// VitalSigns keys vary by tier — optional fields for tier-specific cards
export interface VitalSigns {
  revenue: VitalSignCard;
  top_product: VitalSignCard;
  biggest_risk: VitalSignCard;
  overall_trend: VitalSignCard;
  // Basic + Intermediate
  orders?: VitalSignCard;
  // Intermediate only
  expense_ratio?: VitalSignCard;
  // Intermediate + Advanced
  customers?: VitalSignCard;
  // Advanced only
  net_profit?: VitalSignCard;
  staff_performance?: VitalSignCard;
}

export interface DataQuality {
  has_issues: boolean;
  issue_count: number;
  issues: string[];
  pct_clean: number;
}

export interface Comparison {
  period_label: string;
  current_label: string;
  prev_label: string | null;
  revenue_current: number;
  revenue_prev: number | null;
  revenue_delta_pct: number | null;
  orders_current: number;
  orders_prev: number | null;
  orders_delta_pct: number | null;
  has_comparison: boolean;
}

export interface CurrentMonth {
  month: string;
  forecast_value: number;
  forecast_fmt: string;
  actual_to_date: number;
  actual_fmt: string;
  pct_to_target: number;
  still_needed: number;
  still_needed_fmt: string;
  days_elapsed: number;
  days_remaining: number;
  total_days: number;
  daily_run_rate: number;
  daily_needed: number;
  projected_total: number;
  on_track: boolean;
  status_label: string;
  status_colour: "green" | "amber" | "red";
  narrative: string;
  reliable: boolean;
}

export interface NextForecast {
  month: string;
  forecast_value: number;
  forecast_fmt: string;
  vs_last_actual: string;
  direction: "up" | "down" | "flat";
  growth_pct: string;
  reliable: boolean;
  narrative: string;
}

export interface ForecastAccuracy {
  status: string;
  forecast_month: string | null;
  forecast_value: number | null;
  actual_value: number | null;
  error_pct: number | null;
  accuracy_pct: number | null;
  accuracy_label: string;
  score_pct: number;
  narrative: string;
}

export interface ForecastInsight {
  current_month: CurrentMonth | null;
  next_forecast: NextForecast | null;
  accuracy: ForecastAccuracy;
  see_more_page: string;
  // Advanced only
  days_until_stockout?: number | null;
}

export interface Signal {
  type: "alert" | "positive" | "warning";
  headline: string;
  body: string;
  linked_page: string;
  /** Chart IDs on the linked page that should glow when the user navigates there */
  chart_refs?: string[];
}

// ── Chart data item types ────────────────────────────────────────────────────

export interface ParetoBarItem {
  name: string;
  revenue: number;
  pct_of_total: number;
  profit?: number;
}

export interface CategoryDonutItem {
  category: string;
  revenue: number;
  pct_of_total: number;
  profit?: number;
  avg_margin?: number;
}

export interface RevenueTrendItem {
  date: string;
  sales: number;
}

// Intermediate: expenses vs sales over time
export interface ExpenseVsSalesItem {
  month: string;
  month_short: string;
  expenses: number;
  sales: number;
}

// Intermediate + Advanced: repeat vs new customer donut
export interface RepeatVsNewItem {
  segment: string;
  count: number;
  pct: number;
}

// Advanced: gross profit → expenses → net profit waterfall
export interface WaterfallItem {
  label: string;
  value: number;
  type: "start" | "end" | "bar";
}

// Advanced: revenue by branch
export interface BranchBarItem {
  branch: string;
  revenue: number;
  pct_of_total: number;
}

export type ChartDataItem =
  | ParetoBarItem
  | CategoryDonutItem
  | RevenueTrendItem
  | ExpenseVsSalesItem
  | RepeatVsNewItem
  | WaterfallItem
  | BranchBarItem;

export interface ChartData {
  chart_type:
    | "pareto_bar"
    | "category_donut"
    | "revenue_trend_line"
    | "period_comparison_bar"
    | "expense_vs_sales_combo"
    | "repeat_vs_new_donut"
    | "waterfall"
    | "branch_bar";
  dynamic_title: string;
  subtitle: string;
  linked_page?: string;
  data: ChartDataItem[];
}

export interface Play {
  priority: "urgent" | "this_week" | "when_you_can";
  tag: string;
  text: string;
  metric: string;
}

export interface AiBrief {
  business_type: string;
  tier: string;
  period_filter: string;
  period: { start: string; end: string };
  health_score: { score: number; label: string; delta: string };
  key_metrics: {
    revenue: string;
    revenue_delta: string;
    top_product: string;
    orders: string;
    orders_delta: string;
  };
  [key: string]: unknown;
}

export interface ExecMetadata {
  period: { start: string; end: string };
  record_count: number;
  generated_at: string;
  tier: string;
}

export interface ExecutiveSummaryResult {
  period_filter: string;
  data_quality: DataQuality;
  health_score: HealthScore;
  vital_signs: VitalSigns;
  comparison: Comparison;
  forecast_insight: ForecastInsight;
  signals: Signal[];
  charts: ChartData[];
  plays: Play[];
  ai_brief: AiBrief;
  metadata: ExecMetadata;
  tier?: string;
}
