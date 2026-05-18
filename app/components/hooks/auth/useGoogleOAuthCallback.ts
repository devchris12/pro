"use client";

import { useMutation } from "@tanstack/react-query";
import {
  handleGoogleOAuthCallback,
  GoogleOAuthCallbackResponse,
} from "@/lib/api/auth/google-oauth-callback";

export function useGoogleOAuthCallback() {
  return useMutation<GoogleOAuthCallbackResponse, Error, string>({
    mutationFn: (code: string) => handleGoogleOAuthCallback(code),
  });
}

