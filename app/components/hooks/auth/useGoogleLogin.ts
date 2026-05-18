"use client";

import { useMutation } from "@tanstack/react-query";
import {
  getGoogleOAuthConsentUrl,
  GoogleConsentUrlResponse,
} from "@/lib/api/auth/google-login";

export function useGoogleLogin() {
  return useMutation<GoogleConsentUrlResponse, Error>({
    mutationFn: () => getGoogleOAuthConsentUrl(),
  });
}
