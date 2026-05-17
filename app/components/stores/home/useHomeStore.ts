import { create } from "zustand";

export interface HomeState {
  state: "login" | "signup" | null;
  setState: (state: "login" | "signup" | null) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  state: null,
  setState: (state) => set({ state }),
}));

