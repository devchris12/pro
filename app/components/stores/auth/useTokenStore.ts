"use client";

import { create } from "zustand";
import { clearSession, establishSession } from "@/lib/api/establish-session";

interface AuthState {
  /** In-memory auth flag — JWT lives in httpOnly cookie only. */
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  establishSession: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useTokenStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  establishSession: async (accessToken) => {
    await establishSession(accessToken);
    set({ isAuthenticated: true });
  },
  logout: async () => {
    await clearSession();
    set({ isAuthenticated: false });
  },
}));

/** @deprecated Use isAuthenticated — kept for gradual migration */
export function useHasSession(): boolean {
  return useTokenStore((s) => s.isAuthenticated);
}
