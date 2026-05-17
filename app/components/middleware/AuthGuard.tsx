"use client";
import { useAuthGuard } from "./hooks/useAuthGuard";

interface AuthGuardProps {
  redirectTo?: string;
}

export default function AuthGuard({ redirectTo }: AuthGuardProps): React.ReactElement {
  const { sessionExpired } = useAuthGuard(redirectTo);

  if (!sessionExpired) return <div className="hidden" />;

  return (
    // Semi-transparent overlay shown while the 2.5s timer runs before redirect
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3 max-w-xs w-full mx-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 text-center">
          Your session has expired
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
          Taking you back to login&hellip;
        </p>
      </div>
    </div>
  );
}
