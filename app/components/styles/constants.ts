export const styles = {
  squish: `active:scale-95 hover:scale-98 transition-all duration-300`,
  defaultLabel: `text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5 block`,
  defaultInput: `w-full min-h-11 transition-all p-3 rounded-md border-2 border-primary/10 focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 dark:bg-slate-900 dark:border-slate-700`,
  defaultButton: `flex flex-row items-center justify-center gap-2 min-h-11 bg-primary text-white px-6 py-3 rounded-md text-sm font-semibold hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary`,
};

export const colors = {
  primary: "oklch(0.3706 0.2318 264.2)",
  primaryDark: "oklch(0.1413 0.0884 264.2)",
  ghostWhite: "oklch(0.9865 0.0066 286.28)",
  secondary: "oklch(0.6041 0.2164 258.12)",
  secondaryGreen: "oklch(0.8952 0.1426 177.21)",
};
