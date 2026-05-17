import axios from "axios";
import { apiClient } from "../api-client";
import { USER_ENDPOINTS } from "./user-urls";
import type { BasicAnalysisResult } from "@/app/types/basicAnalysis";
import type { ExecutiveSummaryResult } from "@/app/types/executiveSummary";

export interface UpdateUserProfileBody {
  pfp?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  business_name?: string;
  business_industry?: string;
  analyzed_data?: BasicAnalysisResult;
  executive_summary?: ExecutiveSummaryResult;
  forecast_logs?: unknown[];
  data?: unknown[];
}
export interface UpdateUserProfileSuccess {
  message: string;
}
export interface UpdateUserProfileAuthError {
  detail: string;
  code: string;
}
export interface UpdateUserProfileNotFoundError {
  error: string;
}
export interface UpdateUserProfileServerError {
  error: string;
}

export async function updateUserProfile(
  data: UpdateUserProfileBody
): Promise<UpdateUserProfileSuccess> {
  try {
    const path = USER_ENDPOINTS.UPDATE_PROFILE.replace(/^\//, "");
    const response = await apiClient.patch<UpdateUserProfileSuccess>(path, data);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401 && err.response.data) {
        throw err.response.data as UpdateUserProfileAuthError;
      }
      if (err.response?.status === 404 && err.response.data) {
        throw err.response.data as UpdateUserProfileNotFoundError;
      }
      if (err.response?.status === 500 && err.response.data) {
        throw err.response.data as UpdateUserProfileServerError;
      }
    }
    throw new Error("Something went wrong — please try again.");
  }
}
