import axios from "axios";

/** Authenticated BFF client — session token is read from httpOnly cookie server-side. */
export const apiClient = axios.create({
  baseURL: "/api/proxy",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
