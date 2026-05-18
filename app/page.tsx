"use client";
import { GoogleIcon } from "./components/icons/react-icons";
import { useGoogleLogin } from "./components/hooks/auth/useGoogleLogin";
import Spinner from "./components/ui/loaders/Spinner";
import { useAuthGuard } from "./components/middleware/hooks/useAuthGuard";
import Link from "next/link";
import {
  ChartBarIcon,
  BoltIcon,
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

const FEATURES = [
  {
    icon: BoltIcon,
    title: "See it in seconds",
    body: "Upload your data and your business appears — no setup, no analyst, no waiting.",
  },
  {
    icon: ChartBarIcon,
    title: "See what's working",
    body: "Every chart shows you what is selling, what is slipping, and what needs attention.",
  },
  {
    icon: GlobeAltIcon,
    title: "Built to see your world",
    body: "12 industries supported — retail, food, fashion, logistics and more.",
  },
];

export default function Home(): React.ReactElement {
  useAuthGuard("/dashboard");
  const googleMutation = useGoogleLogin();

  function handleGoogleLogin(): void {
    googleMutation.mutate(undefined, {
      onSuccess: ({ redirect_url }) => {
        if (redirect_url) {
          window.location.href = redirect_url;
        } else {
          throw new Error("Failed to get Google authentication URL");
        }
      },
      onError: () => {
        throw new Error("Error connecting to Google authentication service");
      },
    });
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — midnight brand hero (hidden on mobile) ── */}
      <div className="hidden lg:flex w-1/2 bg-[#00022D] flex-col px-12 py-10 relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,27,183,0.35),transparent_60%)]" />

        {/* Nav row — logo left, magbyte.biz right */}
        <div className="flex items-center justify-between relative z-10">
          <img
            src="/InViewLogoWhiteFull.svg"
            alt="InView by MagByte"
            className="h-8 w-auto object-contain"
          />
          <a
            href="https://magbyte.biz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-aqua/60 hover:text-aqua transition-colors tracking-wide"
          >
            magbyte.biz ↗
          </a>
        </div>

        {/* Hero copy — vertically centered in remaining space */}
        <div className="flex-1 flex flex-col justify-center relative z-10 py-10">
          <h1 className="text-5xl font-bold text-white leading-[1.1] mb-5 max-w-xs">
            See your business clearly.
          </h1>
          <p className="text-white/50 text-base leading-relaxed mb-10 max-w-sm">
            Your numbers, in plain sight — for the first time.
          </p>

          {/* Feature bullets */}
          <div className="flex flex-col gap-5 mb-10">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 size-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon className="size-4 text-white/70" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90 leading-snug">{title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Industry deep-link */}
          <a
            href="https://magbyte.biz/industries/retail-and-provision-stores"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-aqua/60 hover:text-aqua transition-colors group w-fit"
          >
            Learn more about InView for Retail
            <ArrowTopRightOnSquareIcon className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>

          {/* Dashboard preview */}
          <div className="mt-10 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 w-full">
            <img
              src="/dashboard-preview.jpg"
              alt="InView dashboard on mobile — business health score in your pocket"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-white/20 relative z-10">
          © 2025 MagByte. Your data stays private and is never shared.
        </p>
      </div>

      {/* ── Right panel — sign in ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <img
              src="/InViewLogoFull.svg"
              alt="InView by MagByte"
              className="h-10 w-auto object-contain dark:hidden"
            />
            <img
              src="/InViewLogoWhiteFull.svg"
              alt="InView by MagByte"
              className="h-10 w-auto object-contain hidden dark:block"
            />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-8">
            Sign in to your InView dashboard.
          </p>

          <button
            disabled={googleMutation.isPending}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border-2 border-primary dark:border-blue-500 bg-white dark:bg-slate-900 text-primary dark:text-blue-400 text-sm font-semibold hover:bg-primary/5 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {googleMutation.isPending ? (
              <Spinner className="text-primary dark:text-blue-400" />
            ) : (
              <>
                <GoogleIcon className="text-xl shrink-0" />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {googleMutation.isError && (
            <p className="text-red-500 dark:text-red-400 text-xs font-semibold mt-3 text-center">
              {googleMutation.error.message}
            </p>
          )}

          <p className="text-center text-xs text-gray-400 dark:text-slate-600 mt-6">
            By continuing, you agree to InView&apos;s terms and privacy policy.
          </p>

          <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-4">
            New to InView?{" "}
            <a
              href="https://magbyte.biz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary dark:text-blue-400 font-semibold hover:underline"
            >
              Learn more →
            </a>
          </p>

          {/* Dev shortcuts */}
          {process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true" && (
            <div className="flex flex-col items-center gap-1.5 mt-8 pt-6 border-t border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-600 mb-1">
                <span className="h-px w-12 bg-gray-200 dark:bg-slate-800" />
                <span>dev shortcuts</span>
                <span className="h-px w-12 bg-gray-200 dark:bg-slate-800" />
              </div>
              <Link
                href="/dashboard"
                className="text-sm text-primary dark:text-blue-400 underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                View Demo Dashboard
              </Link>
              <Link
                href="/dashboard/user/update"
                className="text-sm text-primary dark:text-blue-400 underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                Preview Onboarding Page
              </Link>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
