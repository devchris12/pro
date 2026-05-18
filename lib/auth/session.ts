import { cookies } from "next/headers";
import axios from "axios";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "./constants";
import { getServerApiBaseUrl } from "@/lib/env";
import { AUTH_ENDPOINTS } from "@/lib/api/auth/auth-urls";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SEC,
};

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function setSessionToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);
}

export async function clearSessionToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function validateSessionToken(token: string): Promise<boolean> {
  try {
    await axios.get(`${getServerApiBaseUrl()}${AUTH_ENDPOINTS.VALIDATE}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });
    return true;
  } catch {
    return false;
  }
}
