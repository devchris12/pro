import axios from "axios";
import { API_BASE_URL } from "../api-url";
import { AUTH_ENDPOINTS } from "./auth-urls";

export interface GoogleConsentUrlResponse {
  redirect_url: string;
}
export interface GoogleConsentUrlError {
  error: string;
  details?: string;
}
/**
 * Get Google OAuth consent URL
 * @returns {Promise<GoogleConsentUrlResponse>} A promise with the redirect_url string
 * @throws {Error} When API returns an error or unexpected response
 */
export async function getGoogleOAuthConsentUrl(): Promise<GoogleConsentUrlResponse> {
  try {
    const response = await axios.get<GoogleConsentUrlResponse>(
      `${API_BASE_URL}${AUTH_ENDPOINTS.GOOGLE_LOGIN}`
    );
    if (response.data && response.data.redirect_url) {
      return response.data;
    } else {
      throw new Error("Missing redirect_url in response");
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.error) {
      throw new Error(String(err.response.data.error));
    }
    throw new Error("Something went wrong — please try again.");
  }
}
