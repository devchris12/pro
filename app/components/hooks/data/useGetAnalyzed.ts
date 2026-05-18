"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getAnalyzedData } from "@/lib/api/data/get-analyzed";
import type { AnalyzedDataResponse } from "@/lib/api/data/get-analyzed";
import { normalizeBasicAnalysis } from "@/app/lib/basic-analysis";
import { useTokenStore } from "@/app/components/stores/auth/useTokenStore";

function sanitizeAnalyzedResponse(
  data: AnalyzedDataResponse
): AnalyzedDataResponse {
  return {
    executive_summary: data.executive_summary ?? null,
    analyzed_data: normalizeBasicAnalysis(data.analyzed_data),
  };
}

export function useGetAnalyzed() {
  const isAuthenticated = useTokenStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ["data-analyzed"],
    queryFn: async (): Promise<AnalyzedDataResponse | null> => {
      try {
        const data = await getAnalyzedData();
        return sanitizeAnalyzedResponse(data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}
