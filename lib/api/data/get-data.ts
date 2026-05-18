import axios from "axios";
import { apiClient } from "../api-client";
import { DATA_ENDPOINTS } from "./data-urls";

export interface GetDataNotFoundError {
  error: string;
}

export async function getRawData(): Promise<unknown> {
  try {
    const path = DATA_ENDPOINTS.GET_RAW.replace(/^\//, "");
    const response = await apiClient.get<unknown>(path);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        throw err.response.data as GetDataNotFoundError;
      }
      throw new Error(
        (err.response?.data as { error?: string })?.error ??
          "Something went wrong — please try again."
      );
    }
    throw new Error("Something went wrong — please try again.");
  }
}
