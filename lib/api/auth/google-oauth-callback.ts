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

/** Same-origin BFF — avoids browser CORS to mag-byte-api. */
export async function handleGoogleOAuthCallback(
  code: string
): Promise<GoogleOAuthCallbackResponse> {
  if (!code) {
    throw new Error("Authorization code is missing");
  }

  const params = new URLSearchParams({ code });
  const response = await fetch(`/api/auth/google/callback?${params}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Something went wrong — please try again.");
  }

  return response.json() as Promise<GoogleOAuthCallbackResponse>;
}
