import axios from "axios";
import { apiClient } from "../api-client";
import { DATA_ENDPOINTS } from "./data-urls";
import type { BasicAnalysisResult } from "@/app/types/basicAnalysis";
import type { ExecutiveSummaryResult } from "@/app/types/executiveSummary";

export interface AnalyzedDataResponse {
  analyzed_data?: BasicAnalysisResult | null;
  executive_summary?: ExecutiveSummaryResult | null;
}

export interface GetAnalyzedNotFoundError {
  error: string;
}

export async function getAnalyzedData(): Promise<AnalyzedDataResponse> {
  try {
    const path = DATA_ENDPOINTS.GET_ANALYZED.replace(/^\//, "");
    const response = await apiClient.get<AnalyzedDataResponse>(path);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        throw err.response.data as GetAnalyzedNotFoundError;
      }
      throw new Error(
        (err.response?.data as { error?: string })?.error ??
          "Something went wrong — please try again."
      );
    }
    throw new Error("Something went wrong — please try again.");
  }
}
