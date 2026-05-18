"use client";

// Data access hooks for the dashboard.
// Basic tier reads real data from GET /api/data/analyzed/ (persisted by Django after upload).
// In dev demo mode (NEXT_PUBLIC_DEV_BYPASS_AUTH=true), the SideRail tier switcher
// can show mock data for any tier — letting us demo the full app without real uploads.

import {
  mockBasicExecutiveSummary,
  mockIntermediateExecutiveSummary,
  mockAdvancedExecutiveSummary,
  mockBasicAnalysis,
  mockIntermediateAnalysis,
  mockAdvancedAnalysis,
} from "@/app/mock";
import { useGetAnalyzed } from "@/app/components/hooks/data/useGetAnalyzed";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import { isBasicAnalysisWithDetailTable } from "@/app/lib/basic-analysis";
import type { BasicAnalysisResult } from "@/app/types/basicAnalysis";
import type { ExecutiveSummaryResult } from "@/app/types/executiveSummary";
import type { IntermediateAnalysisResult } from "@/app/types/intermediateAnalysis";
import type { AdvancedAnalysisResult } from "@/app/types/advancedAnalysis";

// Gate for all mock fallbacks. Real (production) users never see mock data —
// they either have real analyzed_data or land on "No data yet".
const IS_DEV_DEMO = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

function resolveBasicAnalysis(
  analyzed: unknown,
  devTier: string,
): BasicAnalysisResult | null {
  if (isBasicAnalysisWithDetailTable(analyzed)) return analyzed;
  if (IS_DEV_DEMO && devTier === "basic") return mockBasicAnalysis;
  return null;
}

export function useBasicAnalysis(): BasicAnalysisResult | null {
  const { devTier } = useDashboardStore();
  const { data } = useGetAnalyzed();
  return resolveBasicAnalysis(data?.analyzed_data, devTier);
}

export function useExecutiveSummary(): ExecutiveSummaryResult | null {
  const { data } = useGetAnalyzed();
  return data?.executive_summary ?? null;
}

// Returns the exec summary for the active tier.
// Real data wins. Otherwise the dev tier switcher controls which mock is shown.
export function useExecutiveSummaryData(): ExecutiveSummaryResult | null {
  const { devTier } = useDashboardStore();
  const { data } = useGetAnalyzed();

  if (data?.executive_summary) return data.executive_summary;
  if (!IS_DEV_DEMO) return null;
  if (devTier === "basic")        return mockBasicExecutiveSummary;
  if (devTier === "intermediate") return mockIntermediateExecutiveSummary;
  if (devTier === "advanced")     return mockAdvancedExecutiveSummary;
  return null;
}

// Int/Adv analysis hooks still use mock until their Python pipeline is wired to the API.
export function useIntermediateAnalysis(): IntermediateAnalysisResult {
  return mockIntermediateAnalysis;
}

export function useAdvancedAnalysis(): AdvancedAnalysisResult {
  return mockAdvancedAnalysis;
}

// ── Tier-aware page hooks ────────────────────────────────────────────────────
// When the user has real analyzed_data, always return basic with real data.
// Otherwise (dev demo only) the devTier switcher drives which mock to show.

export function useSalesPageData():
  | { tier: "basic";        data: BasicAnalysisResult["page_1"] }
  | { tier: "intermediate"; data: IntermediateAnalysisResult["page_1"] }
  | { tier: "advanced";     data: AdvancedAnalysisResult["page_1"] }
  | null {
  const { devTier } = useDashboardStore();
  const { data } = useGetAnalyzed();

  const basic = resolveBasicAnalysis(data?.analyzed_data, devTier);
  if (basic) return { tier: "basic", data: basic.page_1 };
  if (!IS_DEV_DEMO) return null;
  if (devTier === "basic")        return { tier: "basic",        data: mockBasicAnalysis.page_1 };
  if (devTier === "intermediate") return { tier: "intermediate", data: mockIntermediateAnalysis.page_1 };
  if (devTier === "advanced")     return { tier: "advanced",     data: mockAdvancedAnalysis.page_1 };
  return null;
}

export function useProductsPageData():
  | { tier: "basic";        data: BasicAnalysisResult["page_2"] }
  | { tier: "intermediate"; data: IntermediateAnalysisResult["page_2"] }
  | { tier: "advanced";     data: AdvancedAnalysisResult["page_2"] }
  | null {
  const { devTier } = useDashboardStore();
  const { data } = useGetAnalyzed();

  const basic = resolveBasicAnalysis(data?.analyzed_data, devTier);
  if (basic) return { tier: "basic", data: basic.page_2 };
  if (!IS_DEV_DEMO) return null;
  if (devTier === "basic")        return { tier: "basic",        data: mockBasicAnalysis.page_2 };
  if (devTier === "intermediate") return { tier: "intermediate", data: mockIntermediateAnalysis.page_2 };
  if (devTier === "advanced")     return { tier: "advanced",     data: mockAdvancedAnalysis.page_2 };
  return null;
}

// Customers is only available on intermediate/advanced — returns null for basic.
export function useCustomersPageData():
  | { tier: "intermediate"; data: IntermediateAnalysisResult["page_3"] }
  | { tier: "advanced";     data: AdvancedAnalysisResult["page_3"] }
  | null {
  const { devTier } = useDashboardStore();
  if (!IS_DEV_DEMO) return null;
  if (devTier === "intermediate") return { tier: "intermediate", data: mockIntermediateAnalysis.page_3 };
  if (devTier === "advanced")     return { tier: "advanced",     data: mockAdvancedAnalysis.page_3 };
  return null;
}

// Forecast: Basic → page_3 · Intermediate → page_5 · Advanced → page_6
export function useForecastPageData():
  | { tier: "basic";        data: BasicAnalysisResult["page_3"] }
  | { tier: "intermediate"; data: IntermediateAnalysisResult["page_5"] }
  | { tier: "advanced";     data: AdvancedAnalysisResult["page_6"] }
  | null {
  const { devTier } = useDashboardStore();
  const { data } = useGetAnalyzed();

  const basic = resolveBasicAnalysis(data?.analyzed_data, devTier);
  if (basic) return { tier: "basic", data: basic.page_3 };
  if (!IS_DEV_DEMO) return null;
  if (devTier === "basic")        return { tier: "basic",        data: mockBasicAnalysis.page_3 };
  if (devTier === "intermediate") return { tier: "intermediate", data: mockIntermediateAnalysis.page_5 };
  if (devTier === "advanced")     return { tier: "advanced",     data: mockAdvancedAnalysis.page_6 };
  return null;
}

export function useTierMetadata(): { date_range: { start: string; end: string }; record_count: number } | null {
  const { devTier } = useDashboardStore();
  const { data } = useGetAnalyzed();

  const basic = resolveBasicAnalysis(data?.analyzed_data, devTier);
  if (basic) {
    return basic.metadata as {
      date_range: { start: string; end: string };
      record_count: number;
    };
  }
  if (!IS_DEV_DEMO) return null;
  if (devTier === "basic") {
    // BasicMetadata permits nullable dates in the type; in practice the mock has both filled.
    return mockBasicAnalysis.metadata as { date_range: { start: string; end: string }; record_count: number };
  }
  if (devTier === "intermediate") return mockIntermediateAnalysis.metadata;
  if (devTier === "advanced") {
    return mockAdvancedAnalysis.metadata as { date_range: { start: string; end: string }; record_count: number };
  }
  return null;
}

// Returns true when there is data to display — real data OR active dev mock via tier switcher.
export function useHasAnalysisData(): boolean {
  const { data } = useGetAnalyzed();
  if (isBasicAnalysisWithDetailTable(data?.analyzed_data)) return true;
  return IS_DEV_DEMO; // any tier shows a mock in dev demo mode
}
