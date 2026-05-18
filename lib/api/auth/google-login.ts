export interface GoogleConsentUrlResponse {
  redirect_url: string;
}
export interface GoogleConsentUrlError {
  error: string;
  details?: string;
}

/**
 * Get Google OAuth consent URL via same-origin BFF (avoids CORS on mag-byte-api).
 */
export async function getGoogleOAuthConsentUrl(): Promise<GoogleConsentUrlResponse> {
  const response = await fetch("/api/auth/google/login", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Something went wrong — please try again.");
  }

  const data = (await response.json()) as GoogleConsentUrlResponse;
  if (!data.redirect_url) {
    throw new Error("Missing redirect_url in response");
  }

  return data;
}
