"use client";

import { useMutation } from "@tanstack/react-query";

interface GoogleLoginResponse {
  redirect_url: string;
}

async function googleLogin() {
  const response = await fetch("/api/auth/google/login", {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to initiate Google login");
  }

  return response.json() as Promise<GoogleLoginResponse>;
}

export function useGoogleLogin() {
  return useMutation<GoogleLoginResponse, Error>({
    mutationFn: googleLogin,
  });
}
