import axios from "axios";
import { API_BASE_URL } from "../api-url";
import { AUTH_ENDPOINTS } from "./auth-urls";

export interface LoginBody {
  email: string;
  password: string;
}
export interface LoginSuccessResponse {
  message: string; // "User logged in successfully"
  access_token: string;
}
export interface LoginErrorResponse {
  error: string;
  details?: unknown;
}
/**
 * Log in user
 * @param body Login body object
 * @returns {Promise<LoginSuccessResponse>} User login status and JWT
 * @throws {Error} Handles all documented error scenarios
 */
export async function loginUser(
  body: LoginBody
): Promise<LoginSuccessResponse> {
  try {
    const response = await axios.post<LoginSuccessResponse>(
      `${API_BASE_URL}${AUTH_ENDPOINTS.LOGIN}`,
      body
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.error) {
      throw new Error(String(err.response.data.error));
    }
    throw new Error("Something went wrong — please try again.");
  }
}
