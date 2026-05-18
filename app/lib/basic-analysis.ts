import type { BasicAnalysisResult, DetailRow } from "@/app/types/basicAnalysis";

/** True when analyzed_data has the row-level detail table required for basic-tier filters. */
export function isBasicAnalysisWithDetailTable(
  data: unknown,
): data is BasicAnalysisResult {
  return Array.isArray((data as BasicAnalysisResult | null)?.page_1?.detail_table);
}

export function getBasicDetailTable(
  analysis: BasicAnalysisResult | null | undefined,
): DetailRow[] {
  const table = analysis?.page_1?.detail_table;
  return Array.isArray(table) ? table : [];
}
