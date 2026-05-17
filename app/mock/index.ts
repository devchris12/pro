// Mock data exports for all three tiers — used by dev demo mode.
// Real Basic data (when present from the API) always overrides the basic mock.

import execSummaryBasicData from "./executive_summary_basic.json";
import execSummaryIntermediateData from "./executive_summary_intermediate.json";
import execSummaryAdvancedData from "./executive_summary_advanced.json";
import basicData from "./basic_analysis_output.json";
import intermediateData from "./intermediate_dashboard_data.json";
import advancedData from "./advanced_analysis_output.json";
import type { ExecutiveSummaryResult } from "@/app/types/executiveSummary";
import type { BasicAnalysisResult } from "@/app/types/basicAnalysis";
import type { IntermediateAnalysisResult } from "@/app/types/intermediateAnalysis";
import type { AdvancedAnalysisResult } from "@/app/types/advancedAnalysis";

export const mockBasicExecutiveSummary = execSummaryBasicData as unknown as ExecutiveSummaryResult;
export const mockIntermediateExecutiveSummary = execSummaryIntermediateData as unknown as ExecutiveSummaryResult;
export const mockAdvancedExecutiveSummary = execSummaryAdvancedData as unknown as ExecutiveSummaryResult;
export const mockBasicAnalysis = basicData as unknown as BasicAnalysisResult;
export const mockIntermediateAnalysis = intermediateData as unknown as IntermediateAnalysisResult;
export const mockAdvancedAnalysis = advancedData as unknown as AdvancedAnalysisResult;
