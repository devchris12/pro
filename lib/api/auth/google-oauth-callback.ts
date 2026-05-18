import axios from "axios";
import { API_BASE_URL } from "../api-url";
import { AUTH_ENDPOINTS } from "./auth-urls";

export interface GoogleOAuthCallbackExistingUserResponse {
  message: string;
  access_token: string;
  new_user?: false;
}
export interface GoogleOAuthCallbackNewUserResponse {
  message: string;
  access_token: string;
  new_user: true;
}
export type GoogleOAuthCallbackResponse =
  | GoogleOAuthCallbackExistingUserResponse
  | GoogleOAuthCallbackNewUserResponse;
export interface GoogleOAuthCallbackError {
  error: string;
  details?: unknown;
}

export async function handleGoogleOAuthCallback(
  code: string
): Promise<GoogleOAuthCallbackResponse> {
  if (!code) {
    throw new Error("Authorization code is missing");
  }
  try {
    const response = await axios.get<GoogleOAuthCallbackResponse>(
      `${API_BASE_URL}${AUTH_ENDPOINTS.GOOGLE_OAUTH_CALLBACK}`,
      { params: { code } }
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.error) {
      throw new Error(String(err.response.data.error));
    }
    throw new Error("Something went wrong — please try again.");
  }
}
