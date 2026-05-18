import axios from "axios";
import { apiClient } from "../api-client";
import { USER_ENDPOINTS } from "./user-urls";
import type { BasicAnalysisResult } from "@/app/types/basicAnalysis";
import type { ExecutiveSummaryResult } from "@/app/types/executiveSummary";

export interface UserProfileResponse {
  first_name: string;
  last_name: string;
  email: string;
  google_user: boolean;
  pfp: string;
  phone: string;
  business_name: string;
  business_industry: string;
  analyzed_data: BasicAnalysisResult | null;
  executive_summary: ExecutiveSummaryResult | null;
  forecast_logs: unknown[] | null;
  data: unknown[] | null;
}
export interface UserProfileNotFoundError {
  error: string;
}
export interface UserProfileAuthError {
  detail: string;
  code: string;
}

export type GetUserProfileResponse = UserProfileResponse;

export async function getUserProfile(): Promise<GetUserProfileResponse> {
  try {
    const path = USER_ENDPOINTS.GET_PROFILE.replace(/^\//, "");
    const response = await apiClient.get<UserProfileResponse>(path);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) {
        throw { detail: "Session expired", code: "token_not_valid" } as UserProfileAuthError;
      }
      if (err.response?.status === 404) {
        throw { error: "Profile not found" } as UserProfileNotFoundError;
      }
    }
    throw new Error("Something went wrong — please try again.");
  }
}
