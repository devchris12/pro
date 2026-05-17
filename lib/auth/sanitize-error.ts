import axios from "axios";

const GENERIC_MESSAGE = "Something went wrong — please try again.";

/** Strip stack traces and internal details before sending errors to the client. */
export function sanitizeClientError(err: unknown): { message: string; status: number } {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 500;
    const data = err.response?.data as { error?: string; detail?: string } | undefined;
    const message =
      status === 401
        ? "Session expired — please sign in again."
        : typeof data?.error === "string"
          ? data.error
          : typeof data?.detail === "string"
            ? data.detail
            : GENERIC_MESSAGE;
    return { message, status };
  }

  if (err instanceof Error && err.message && !err.message.includes(" at ")) {
    return { message: err.message, status: 500 };
  }

  return { message: GENERIC_MESSAGE, status: 500 };
}

/** Log server-side only — never log tokens or full request bodies. */
export function logServerError(context: string, err: unknown): void {
  if (process.env.NODE_ENV === "production") {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[${context}]`, message);
    return;
  }
  console.error(`[${context}]`, err);
}
