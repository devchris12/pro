"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useGetProfile } from "@/app/components/hooks/user/useGetProfile";
import { useUpdateProfile } from "@/app/components/hooks/user/useUpdateProfile";
import { useUploadData } from "@/app/components/hooks/data/useUploadData";
import type { AnalyzedDataResponse } from "@/lib/api/data/get-analyzed";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, LockClosedIcon } from "@heroicons/react/24/solid";
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon, LinkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

// ── Industries ───────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { id: "Retail & Provision Stores",     label: "Retail & Provisions",   emoji: "🛍️", live: true  },
  { id: "Food & Restaurants",            label: "Food & Restaurants",    emoji: "🍽️", live: false },
  { id: "Agriculture & Agro-Processing", label: "Agriculture",           emoji: "🌾", live: false },
  { id: "Fashion & Tailoring",           label: "Fashion & Tailoring",   emoji: "👗", live: false },
  { id: "Beauty, Salon & Barber",        label: "Beauty & Salon",        emoji: "✂️", live: false },
  { id: "Transport & Logistics",         label: "Transport & Logistics", emoji: "🚚", live: false },
  { id: "Education",                     label: "Education",             emoji: "📚", live: false },
  { id: "Construction & Artisan",        label: "Construction",          emoji: "🏗️", live: false },
  { id: "Health & Pharmacy",             label: "Health & Pharmacy",     emoji: "💊", live: false },
  { id: "Manufacturing & Production",    label: "Manufacturing",         emoji: "🏭", live: false },
  { id: "Events & Entertainment",        label: "Events",                emoji: "🎉", live: false },
  { id: "Digital & Tech Services",       label: "Digital & Tech",        emoji: "💻", live: false },
] as const;

// ── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Your Business",  sub: "Name & contact"     },
  { n: 2, label: "Your Industry",  sub: "Select your sector"  },
  { n: 3, label: "Your Data",      sub: "Upload your records" },
] as const;

type StepNum = 1 | 2 | 3;

// ── Left panel — vertical step list (desktop) ───────────────────────────────

function LeftPanel({ current, bizName }: { current: StepNum; bizName: string }): React.ReactElement {
  return (
    <div className="flex flex-col justify-between h-full px-8 py-10">
      <div>
        <div className="mb-10">
          <Link href="/">
            <img
              src="/InViewLogoWhite.svg"
              alt="InView by MagByte"
              className="h-8 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </Link>
        </div>

        <div className="flex flex-col gap-0">
          {STEPS.map((step, i) => {
            const done   = step.n < current;
            const active = step.n === current;
            return (
              <div key={step.n} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300",
                    done   && "bg-white text-primary",
                    active && "bg-white text-primary ring-4 ring-white/20",
                    !done && !active && "bg-white/10 text-white/30",
                  )}>
                    {done ? <CheckCircleIcon className="size-4" /> : step.n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      "w-px flex-1 my-1 min-h-[32px] transition-all duration-500",
                      done ? "bg-white/50" : "bg-white/15",
                    )} />
                  )}
                </div>

                <div className="pb-8">
                  <p className={cn(
                    "text-sm font-semibold leading-tight transition-colors duration-200",
                    active ? "text-white" : done ? "text-white/70" : "text-white/30",
                  )}>
                    {step.label}
                  </p>
                  <p className={cn(
                    "text-xs mt-0.5 transition-colors duration-200",
                    active ? "text-white/60" : done ? "text-white/40" : "text-white/20",
                  )}>
                    {step.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-aqua/60 leading-relaxed">
        {bizName
          ? `Setting up ${bizName} on InView`
          : "Your data stays private and is never shared."}
      </p>
    </div>
  );
}

// ── Mobile step bar — compact horizontal indicator shown above the form ──────

function MobileStepBar({ current }: { current: StepNum }): React.ReactElement {
  return (
    <div className="flex items-center gap-3 px-5 py-4 bg-[#00022D]">
      <Link href="/" className="shrink-0">
        <img
          src="/InViewLogoWhite.svg"
          alt="InView by MagByte"
          className="h-6 w-auto object-contain opacity-90"
        />
      </Link>
      <div className="flex items-center gap-1.5 ml-auto">
        {STEPS.map((step) => {
          const done = step.n < current;
          const active = step.n === current;
          return (
            <div
              key={step.n}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                active ? "w-8 bg-white" : done ? "w-4 bg-white/60" : "w-4 bg-white/20",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Template download URLs (export as .xlsx) ─────────────────────────────────
// Add an entry here when a new industry template is ready.
// The sheet must be shared "Anyone with the link → viewer" for the download to work.

const INDUSTRY_TEMPLATE_URLS: Partial<Record<string, string>> = {
  "Retail & Provision Stores":
    "https://docs.google.com/spreadsheets/d/1j_1my5kzPl_hIIR5ZfKHcXAAD_7Y78lTOnJXWIH6DdU/export?format=xlsx",
};

// ── Upload step ──────────────────────────────────────────────────────────────

interface UploadPayload {
  file?: File;
  sheetsUrl?: string;
}

interface UploadStepProps {
  industry: string;
  onBack: () => void;
  onComplete: (payload: UploadPayload) => void;
  isPending: boolean;
  errorMessage: string | null;
}

type UploadMode = "file" | "sheets";

function isValidSheetsUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.hostname === "docs.google.com" &&
      parsed.pathname.startsWith("/spreadsheets/")
    );
  } catch {
    return false;
  }
}

function UploadStep({ industry, onBack, onComplete, isPending, errorMessage }: UploadStepProps): React.ReactElement {
  const [mode, setMode]           = useState<UploadMode>("file");
  const [file, setFile]           = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const templateUrl = INDUSTRY_TEMPLATE_URLS[industry] ?? null;

  const sheetsValid = isValidSheetsUrl(sheetsUrl);
  const sheetsTyped = sheetsUrl.trim().length > 0;

  const canSubmit =
    (mode === "file" && file !== null) ||
    (mode === "sheets" && sheetsValid);

  // Enter submits when a file is loaded (sheets URL is handled by its input directly).
  // Skips when typing inside an input so the user can still type freely.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key !== "Enter") return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (mode === "file" && file && !isPending) {
        e.preventDefault();
        onComplete({ file });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, file, isPending, onComplete]);

  const handleFile = useCallback((f: File) => {
    const allowed = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "application/vnd.ms-excel"];
    if (allowed.includes(f.type) || f.name.endsWith(".xlsx") || f.name.endsWith(".csv")) {
      setFile(f);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  return (
    <div className="flex flex-col gap-5 flex-1">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
          We&apos;ll show you exactly where you&apos;re making — and losing — money.
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
          Upload your{" "}
          <span className="font-semibold text-gray-700 dark:text-slate-300">{industry}</span>
          {" "}sales records. We&apos;ll analyse them and have your dashboard ready in seconds.
        </p>
        {templateUrl !== null && (
          <a
            href={templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary dark:text-blue-400 font-semibold hover:underline"
          >
            <ArrowDownTrayIcon className="size-3.5" />
            Download the MagByte template
          </a>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800">
        {(["file", "sheets"] as UploadMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150",
              mode === m
                ? "bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm"
                : "text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300",
            )}
          >
            {m === "file"
              ? <><CloudArrowUpIcon className="size-3.5" /> Upload file</>
              : <><LinkIcon className="size-3.5" /> Google Sheets</>
            }
          </button>
        ))}
      </div>

      {/* Swappable content area — fixed min-height prevents layout shift between modes */}
      <div className="min-h-[200px] md:min-h-[220px]">

      {/* File drop zone */}
      {mode === "file" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 py-7 md:py-10",
            dragging
              ? "border-primary bg-blue-50/60 dark:bg-blue-950/40 scale-[1.01]"
              : file
                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-gray-200 dark:border-slate-700 hover:border-primary/50 hover:bg-blue-50/20 dark:hover:bg-blue-950/20",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {file ? (
            <>
              <DocumentIcon className="size-8 text-emerald-500" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{file.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {(file.size / 1024).toFixed(0)} KB · ready to upload
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
              >
                <XMarkIcon className="size-3.5" /> Remove
              </button>
            </>
          ) : (
            <>
              <CloudArrowUpIcon className="size-9 text-gray-300 dark:text-slate-600" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Drop your file here, or click to browse
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  Supports .xlsx and .csv
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Google Sheets URL input */}
      {mode === "sheets" && (
        <div className="flex flex-col gap-3">
          <div className={cn(
            "flex items-center gap-3 rounded-2xl border-2 px-4 py-4 transition-all duration-200",
            sheetsValid
              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20"
              : "border-gray-200 dark:border-slate-700 focus-within:border-primary/50",
          )}>
            <LinkIcon className={cn(
              "size-5 shrink-0 transition-colors",
              sheetsValid ? "text-emerald-500" : "text-gray-300 dark:text-slate-600",
            )} />
            <input
              type="url"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && onComplete({ sheetsUrl })}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-300 dark:placeholder:text-slate-600 focus:outline-none"
              autoFocus
            />
            {sheetsValid && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                Valid ✓
              </span>
            )}
          </div>

          {sheetsTyped && !sheetsValid && (
            <p className="text-xs text-red-500 font-medium px-1">
              That doesn&apos;t look like a Google Sheets link. Make sure it starts with docs.google.com/spreadsheets/
            </p>
          )}

          {!sheetsTyped && (
            <p className="text-xs text-gray-400 dark:text-slate-500 px-1">
              Make sure the sheet is set to <span className="font-semibold">Anyone with the link can view</span> before submitting.
            </p>
          )}
        </div>
      )}

      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 px-4 py-3">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">Something went wrong</p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 leading-relaxed">{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-3 mt-auto pt-2">
        <button
          onClick={onBack}
          disabled={isPending}
          className="px-5 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        <button
          onClick={() => onComplete(mode === "sheets" ? { sheetsUrl } : { file: file ?? undefined })}
          disabled={!canSubmit || isPending}
          className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending
            ? "Analysing your data…"
            : mode === "sheets"
              ? "Connect & analyse →"
              : "Upload & analyse →"
          }
        </button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function UpdateUserPage(): React.ReactElement {
  const router             = useRouter();
  const queryClient        = useQueryClient();
  const { data: user }     = useGetProfile();
  const updateProfile      = useUpdateProfile();
  const uploadData         = useUploadData();

  const [step, setStep]           = useState<StepNum>(1);
  const [bizName, setBizName]     = useState("");
  const [phone, setPhone]         = useState("");
  const [industry, setIndustry]   = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const isPending = updateProfile.isPending || uploadData.isPending || isAnalysing;

  // Pre-fill from existing profile so returning users don't retype their details
  React.useEffect(() => {
    if (!user) return;
    setBizName((prev) => prev || user.business_name || "");
    setPhone((prev) => prev || user.phone || "");
    setIndustry((prev) => prev || user.business_industry || "");
  }, [user]);

  function handleStep1(): void {
    if (!bizName.trim()) return;
    setStep(2);
  }

  function handleStep2(): void {
    if (!industry) return;
    setStep(3);
  }

  // Global Enter handler — advances to the next step when required fields are filled.
  // Skips when the user is typing inside an input/textarea (those have their own onKeyDown).
  // preventDefault stops a focused button (e.g. "Back") from firing its click in parallel.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key !== "Enter") return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (step === 1 && bizName.trim()) {
        e.preventDefault();
        handleStep1();
      } else if (step === 2 && industry) {
        e.preventDefault();
        handleStep2();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, bizName, industry]);

  // Two-step flow:
  // 1. Save business profile to Django (persists industry so Django knows which GEX token to use)
  // 2. POST /api/data/upload/ — Django resolves GEX token, calls magbyte-micro, saves results to profile
  // Then seed the React Query cache directly from the upload response and navigate.
  // We do NOT refetch the profile here — a GET fired immediately after the upload can race
  // with Django's DB write and return null, permanently showing "No data yet".
  async function handleSubmit(payload: UploadPayload): Promise<void> {
    if (isPending) return;
    setUploadError(null);
    setIsAnalysing(true);
    try {
      await updateProfile.mutateAsync({
        business_name: bizName.trim(),
        phone: phone.trim(),
        business_industry: industry,
      });

      // Capture the result — it already contains the full analysis.
      const uploadResult = await uploadData.mutateAsync(
        payload.sheetsUrl ? { link: payload.sheetsUrl } : { file: payload.file },
      );

      // Seed the analyzed-data cache so the dashboard renders immediately.
      // The dashboard reads from ["data-analyzed"] (GET /api/data/analyzed/), not from the profile.
      queryClient.setQueryData<AnalyzedDataResponse>(["data-analyzed"], {
        analyzed_data: uploadResult.response.analysis_result,
        executive_summary: uploadResult.response.executive_summary_result,
      });

      router.replace("/dashboard");
    } catch (err: unknown) {
      console.error("[handleSubmit] error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "error" in err
            ? String((err as { error: unknown }).error)
            : "Something went wrong — please try again.";
      setUploadError(msg);
    } finally {
      setIsAnalysing(false);
    }
  }

  const stepLabel = `Step ${step} of 3`;

  const headings: Record<StepNum, string> = {
    1: user?.first_name ? `Hey ${user.first_name}, tell us about your business` : "Tell us about your business",
    2: "What industry are you in?",
    3: "Upload your data",
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center px-3 py-4 md:px-4 md:py-10">
      <div className="w-full max-w-3xl">

        <div className="relative flex flex-col md:flex-row rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl md:min-h-[540px]">

          {/* ── Mobile step bar — visible only on small screens ── */}
          <div className="md:hidden">
            <MobileStepBar current={step} />
          </div>

          {/* ── Left — midnight blue (desktop only) ── */}
          <div className="hidden md:block w-64 shrink-0 bg-[#00022D]">
            <LeftPanel current={step} bizName={bizName} />
          </div>

          {/* ── Right — form ── */}
          <div className="flex-1 bg-white dark:bg-slate-900 flex flex-col justify-between px-5 py-6 md:px-10 md:py-10">

            <div className="mb-5 md:mb-6">
              <p className="text-[11px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                {stepLabel}
              </p>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {headings[step]}
              </h1>
              {step === 2 && (
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  Pick the one that best describes{" "}
                  <span className="font-semibold text-gray-700 dark:text-slate-300">{bizName}</span>.
                </p>
              )}
            </div>

            {/* ── Step 1: Business details ── */}
            {step === 1 && (
              <div className="flex flex-col gap-5 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    Business name <span className="text-red-400 normal-case font-normal">*</span>
                  </label>
                  <input
                    type="text"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    placeholder="e.g. Rida's Provisions, Mama Nkechi Foods…"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleStep1()}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    Phone number <span className="text-gray-300 dark:text-slate-600 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleStep1()}
                  />
                </div>

                <div className="mt-auto pt-4">
                  <button
                    onClick={handleStep1}
                    disabled={!bizName.trim()}
                    className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Industry grid ── */}
            {step === 2 && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
                  {INDUSTRIES.map((ind) => {
                    const selected = industry === ind.id;
                    const locked   = !ind.live;
                    return (
                      <button
                        key={ind.id}
                        onClick={() => { if (!locked) setIndustry(ind.id); }}
                        disabled={locked}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 px-2 py-3 md:py-4 rounded-xl md:rounded-2xl border text-center transition-all duration-150",
                          selected  && "bg-primary border-primary shadow-lg shadow-primary/20 scale-[1.03]",
                          !selected && !locked && "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-primary/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 hover:scale-[1.02] active:scale-[0.98]",
                          locked    && "bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-800 opacity-50 cursor-not-allowed",
                        )}
                      >
                        {selected && !locked && (
                          <CheckCircleIcon className="absolute top-2 right-2 size-3.5 text-white" />
                        )}
                        {locked && (
                          <LockClosedIcon className="absolute top-2 right-2 size-3 text-gray-400 dark:text-slate-600" />
                        )}
                        <span className="text-xl md:text-2xl leading-none">{ind.emoji}</span>
                        <span className={cn(
                          "text-[11px] md:text-[10px] font-semibold leading-tight",
                          selected ? "text-white" : "text-gray-600 dark:text-slate-300",
                        )}>
                          {ind.label}
                        </span>
                        {locked && (
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 font-medium">Coming soon</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-auto pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleStep2}
                    disabled={!industry}
                    className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Upload ── */}
            {step === 3 && (
              <UploadStep
                industry={industry}
                onBack={() => setStep(2)}
                onComplete={handleSubmit}
                isPending={isPending}
                errorMessage={uploadError}
              />
            )}

          </div>

          {/* ── Analysing overlay — covers both panels while upload is in flight ── */}
          {isPending && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[#00022D]/80 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(0,27,183,0.4),transparent_65%)]" />
              <img
                src="/InViewLogoWhite.svg"
                alt="InView"
                className="h-8 w-auto opacity-90 relative z-10"
              />
              <div className="flex items-center gap-2 relative z-10">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="size-2.5 rounded-full bg-aqua animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <div className="text-center relative z-10 px-6">
                <p className="text-white font-semibold text-sm">Analysing your data…</p>
                <p className="text-white/50 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                  We&apos;re crunching your numbers. This takes a few seconds.
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-slate-600 mt-4">
          You can update these details any time from your profile settings.
        </p>
      </div>
    </div>
  );
}
