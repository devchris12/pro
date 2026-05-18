import axios from "axios";
import { MICRO_BASE_URL } from "../api-url";
import type { BasicAnalysisResult } from "@/app/types/basicAnalysis";
import type { ExecutiveSummaryResult } from "@/app/types/executiveSummary";

// Maps business_industry values to GEX tokens used by magbyte-micro.
// GEX tells the micro which n8n webhook + analysis script to run.
const INDUSTRY_GEX_MAP: Record<string, string> = {
  "Retail & Provision Stores": "#%RTB",
};

export function getGexForIndustry(industry: string): string | null {
  return INDUSTRY_GEX_MAP[industry] ?? null;
}

// Shape of what magbyte-micro returns after a successful upload + analysis.
export interface UploadAnalysisResult {
  n8n_extract: unknown;
  analysis_result: BasicAnalysisResult;       // page_1, page_2, page_3, metadata, anomalies
  executive_summary_result: ExecutiveSummaryResult;
  forecast_log: unknown[];
}

export interface UploadPayload {
  file?: File;
  sheetsUrl?: string;
  industry: string;
}

export async function uploadAndAnalyse(
  payload: UploadPayload
): Promise<UploadAnalysisResult> {
  const gex = getGexForIndustry(payload.industry);
  if (!gex) {
    throw new Error(`No GEX token configured for industry: ${payload.industry}`);
  }

  const url = `${MICRO_BASE_URL}/upload?GEX=${encodeURIComponent(gex)}`;

  if (payload.sheetsUrl) {
    // Google Sheets path — pass URL as a query param called `link`
    const response = await axios.post<UploadAnalysisResult>(
      `${url}&link=${encodeURIComponent(payload.sheetsUrl)}`
    );
    return response.data;
  }

  if (payload.file) {
    // File upload path — send as multipart/form-data
    const formData = new FormData();
    formData.append("file", payload.file);
    const response = await axios.post<UploadAnalysisResult>(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  throw new Error("Either a file or a Google Sheets URL is required.");
}
