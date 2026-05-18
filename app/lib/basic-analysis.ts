import type { BasicAnalysisResult, DetailRow } from "@/app/types/basicAnalysis";

/** True when analyzed_data has the row-level detail table required for basic-tier filters. */
export function isBasicAnalysisWithDetailTable(
  data: unknown,
): data is BasicAnalysisResult {
  if (!data || typeof data !== "object") return false;
  const page1 = (data as BasicAnalysisResult).page_1;
  return !!page1 && Array.isArray(page1.detail_table);
}

/** Returns validated basic analysis or null if the API payload is incomplete. */
export function normalizeBasicAnalysis(data: unknown): BasicAnalysisResult | null {
  if (!isBasicAnalysisWithDetailTable(data)) return null;
  const analysis = data as BasicAnalysisResult;
  if (!analysis.metadata) return null;
  return analysis;
}

export function getBasicDetailTable(
  analysis: BasicAnalysisResult | null | undefined,
): DetailRow[] {
  const table = analysis?.page_1?.detail_table;
  return Array.isArray(table) ? table : [];
}
