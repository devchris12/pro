import { apiClient } from "../api-client";
import { AUTH_ENDPOINTS } from "./auth-urls";

export interface ValidateAuthResponse {
  message: string;
}

/**
 * Validate user authentication via BFF (session cookie).
 */
export async function validateAuth(): Promise<ValidateAuthResponse> {
  const response = await apiClient.get<ValidateAuthResponse>(
    AUTH_ENDPOINTS.VALIDATE.replace(/^\//, "")
  );
  return response.data;
}
