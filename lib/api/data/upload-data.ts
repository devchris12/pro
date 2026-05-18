import axios from "axios";
import { apiClient } from "../api-client";
import { DATA_ENDPOINTS } from "./data-urls";
import type { BasicAnalysisResult } from "@/app/types/basicAnalysis";
import type { ExecutiveSummaryResult } from "@/app/types/executiveSummary";

export interface DataUploadInput {
  file?: File;
  link?: string;
}

export interface DataUploadResponseBody {
  n8n_extract: unknown;
  analysis_result: BasicAnalysisResult;
  executive_summary_result: ExecutiveSummaryResult;
  forecast_log: unknown[] | null;
}

export interface DataUploadSuccess {
  message: string;
  response: DataUploadResponseBody;
}

export interface DataUploadBadRequestError {
  error: string;
}

export interface DataUploadGatewayError {
  error: string;
  detail?: unknown;
  raw?: unknown;
}

export async function uploadData(input: DataUploadInput): Promise<DataUploadSuccess> {
  if (!input.file && !input.link) {
    throw new Error("Either a file or a link must be provided.");
  }

  const path = DATA_ENDPOINTS.UPLOAD.replace(/^\//, "");

  try {
    if (input.file) {
      const formData = new FormData();
      formData.append("file", input.file);
      const response = await apiClient.post<DataUploadSuccess>(path, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    }

    const response = await apiClient.post<DataUploadSuccess>(path, {
      link: input.link,
    });
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 400) {
        throw err.response.data as DataUploadBadRequestError;
      }
      if (err.response?.status === 502) {
        throw err.response.data as DataUploadGatewayError;
      }
      throw new Error(
        (err.response?.data as { error?: string })?.error ??
          "Something went wrong — please try again."
      );
    }
    throw new Error("Something went wrong — please try again.");
  }
}
