"use client";

import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 max-w-md mx-auto p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
        Something went wrong loading your dashboard
      </h2>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        {error.message.includes("detail_table")
          ? "Your analysis data is still processing or incomplete. Try again in a moment."
          : "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90"
        >
          Try again
        </button>
        <Link
          href="/dashboard/import"
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Upload data
        </Link>
      </div>
    </div>
  );
}
