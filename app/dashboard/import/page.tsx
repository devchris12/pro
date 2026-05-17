"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { uploadAndAnalyse, type UploadAnalysisResult } from "@/lib/api/analysis/upload";
import type { AnalyzedDataResponse } from "@/lib/api/data/get-analyzed";
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  LinkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// ── Field definitions ─────────────────────────────────────────────────────────

type FieldKey =
  | "date"
  | "total_sales"
  | "order_no"
  | "payment_method"
  | "product"
  | "category"
  | "quantity"
  | "cost";

interface FieldMeta {
  key: FieldKey;
  label: string;
  required: boolean;
}

const FIELDS: FieldMeta[] = [
  { key: "date",           label: "Date",           required: true  },
  { key: "total_sales",    label: "Total Sales",    required: true  },
  { key: "order_no",       label: "Order / Ref No", required: false },
  { key: "payment_method", label: "Payment Method", required: false },
  { key: "product",        label: "Product",        required: false },
  { key: "category",       label: "Category",       required: false },
  { key: "quantity",       label: "Quantity",       required: false },
  { key: "cost",           label: "Cost Price",     required: false },
];

// Mirrors the aliases in the v2 Python analysis scripts
const FIELD_ALIASES: Record<FieldKey, string[]> = {
  date:           ["date", "transaction_date", "date_time", "sale_date", "order_date", "day"],
  total_sales:    ["total_sales", "sales", "revenue", "amount", "transaction_amount", "total", "sale_amount"],
  order_no:       ["order_no", "order_id", "transaction_id", "transaction_reference", "reference", "invoice_no", "receipt_no", "terminal_id"],
  payment_method: ["payment_method", "payment", "payment_type", "transaction_type", "channel", "mode_of_payment"],
  product:        ["product", "product_name", "item", "item_name", "description", "goods"],
  category:       ["category", "product_category", "dept", "department", "group"],
  quantity:       ["quantity", "qty", "units", "qty_sold", "pieces", "no_of_items", "count"],
  cost:           ["cost", "cost_price", "unit_cost", "cogs", "purchase_price", "buying_price"],
};

// Columns that uniquely identify a Moniepoint export
const MONIEPOINT_SIGNALS = ["transaction_date", "transaction_reference", "transaction_type", "terminal_id"];

const INDUSTRY = "Retail & Provision Stores";

// ── Column detection helpers ──────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function detectField(header: string): FieldKey | "skip" {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [FieldKey, string[]][]) {
    if (aliases.includes(norm)) return field;
  }
  return "skip";
}

function parseCSVHeaders(text: string): string[] {
  const firstLine = text.split("\n")[0] ?? "";
  return firstLine
    .split(",")
    .map((h) => h.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function isMoniepoint(headers: string[]): boolean {
  const normed = headers.map(normalizeHeader);
  return MONIEPOINT_SIGNALS.filter((s) => normed.includes(s)).length >= 2;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = "file" | "sheets";
type StepNum = 1 | 2 | 3;
type ProcessStatus = "idle" | "uploading" | "success" | "error";

interface ColumnMapping {
  rawHeader: string;
  mappedField: FieldKey | "skip";
  autoDetected: boolean;
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Source" },
  { n: 2, label: "Columns" },
  { n: 3, label: "Upload" },
] as const;

function StepIndicator({ current }: { current: StepNum }): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.n}>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                current > step.n
                  ? "bg-primary text-white"
                  : current === step.n
                  ? "bg-primary text-white ring-2 ring-primary/30"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400"
              )}
            >
              {current > step.n ? (
                <CheckCircleIcon className="size-3.5" />
              ) : (
                step.n
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium transition-colors",
                current === step.n
                  ? "text-primary dark:text-sky-400"
                  : current > step.n
                  ? "text-slate-500 dark:text-slate-400"
                  : "text-slate-400 dark:text-slate-600"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "flex-1 h-px w-8",
                current > step.n
                  ? "bg-primary/40"
                  : "bg-slate-200 dark:bg-slate-700"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Step 1: Source ────────────────────────────────────────────────────────────

interface SourceStepProps {
  sourceType: SourceType;
  file: File | null;
  sheetsUrl: string;
  onSourceTypeChange: (t: SourceType) => void;
  onFile: (f: File) => void;
  onClearFile: () => void;
  onSheetsUrl: (url: string) => void;
  onNext: () => void;
}

function SourceStep({
  sourceType,
  file,
  sheetsUrl,
  onSourceTypeChange,
  onFile,
  onClearFile,
  onSheetsUrl,
  onNext,
}: SourceStepProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFile(dropped);
    },
    [onFile]
  );

  const canProceed =
    sourceType === "file"
      ? !!file
      : sheetsUrl.trim().startsWith("http");

  return (
    <div className="flex flex-col gap-6">
      {/* Source type selector */}
      <div className="flex gap-2">
        {(["file", "sheets"] as SourceType[]).map((type) => (
          <button
            key={type}
            onClick={() => onSourceTypeChange(type)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all",
              sourceType === type
                ? "border-primary bg-primary/10 text-primary dark:text-sky-400"
                : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
            )}
          >
            {type === "file" ? (
              <DocumentIcon className="size-4" />
            ) : (
              <LinkIcon className="size-4" />
            )}
            {type === "file" ? "Upload File" : "Google Sheets"}
          </button>
        ))}
      </div>

      {sourceType === "file" ? (
        <div>
          {file ? (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
              <DocumentIcon className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={onClearFile}
                className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <XMarkIcon className="size-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <ArrowUpTrayIcon className="size-8 text-slate-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Drop a file here, or click to browse
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  CSV or XLSX — Moniepoint exports accepted
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Google Sheets URL
          </label>
          <input
            type="url"
            value={sheetsUrl}
            onChange={(e) => onSheetsUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs text-slate-400">
            The sheet must be publicly viewable or shared with the service account.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
            canProceed
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
          )}
        >
          Continue <ArrowRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Column Mapper ─────────────────────────────────────────────────────

interface MapStepProps {
  mappings: ColumnMapping[];
  moniepointDetected: boolean;
  onMappingChange: (index: number, field: FieldKey | "skip") => void;
  onBack: () => void;
  onNext: () => void;
  isBypass: boolean; // true for XLSX / Sheets — no client-side header parse
}

function MapStep({
  mappings,
  moniepointDetected,
  onMappingChange,
  onBack,
  onNext,
  isBypass,
}: MapStepProps): React.ReactElement {
  const requiredMapped = FIELDS.filter((f) => f.required).every((f) =>
    mappings.some((m) => m.mappedField === f.key)
  );
  const partialFields = FIELDS.filter(
    (f) => !f.required && !mappings.some((m) => m.mappedField === f.key)
  ).map((f) => f.label);

  // XLSX / Sheets — engine handles column detection server-side
  if (isBypass) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
          <DocumentIcon className="size-5 text-sky-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
              XLSX / Sheets — columns auto-mapped by engine
            </p>
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">
              Column detection is handled server-side by the v2 analysis scripts.
              Client-side preview is only available for CSV files.
            </p>
          </div>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <ArrowLeftIcon className="size-4" /> Back
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all"
          >
            Continue <ArrowRightIcon className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Moniepoint badge */}
      {moniepointDetected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 w-fit">
          <CheckCircleIcon className="size-4 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            Moniepoint CSV detected
          </span>
        </div>
      )}

      {/* Partial data warning */}
      {partialFields.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <ExclamationTriangleIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Partial data
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Not mapped: {partialFields.join(", ")}. Sales and Forecast will work;
              Product and Profit insights may be limited.
            </p>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 dark:text-slate-400">
              <th className="text-left px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                Detected Column
              </th>
              <th className="text-left px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                Maps to Field
              </th>
              <th className="text-left px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m, i) => (
              <tr
                key={m.rawHeader}
                className="border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                  {m.rawHeader}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={m.mappedField}
                    onChange={(e) =>
                      onMappingChange(i, e.target.value as FieldKey | "skip")
                    }
                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="skip">— Skip —</option>
                    {FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  {m.autoDetected && m.mappedField !== "skip" ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-sky-400 font-semibold">
                      auto
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400">
                      manual
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeftIcon className="size-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!requiredMapped}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
            requiredMapped
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
          )}
        >
          Continue <ArrowRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Process ───────────────────────────────────────────────────────────

interface ProcessStepProps {
  file: File | null;
  sheetsUrl: string;
  mappings: ColumnMapping[];
  status: ProcessStatus;
  error: string;
  onBack: () => void;
  onUpload: () => void;
}

function ProcessStep({
  file,
  sheetsUrl,
  mappings,
  status,
  error,
  onBack,
  onUpload,
}: ProcessStepProps): React.ReactElement {
  const mappedCount = mappings.filter((m) => m.mappedField !== "skip").length;
  const partialFields = FIELDS.filter(
    (f) => !f.required && !mappings.some((m) => m.mappedField === f.key)
  ).map((f) => f.label);

  const busy = status === "uploading" || status === "success";

  return (
    <div className="flex flex-col gap-6">
      {/* Summary card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col gap-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Upload summary
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">Source</p>
            <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
              {file?.name ?? sheetsUrl}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Industry</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">
              Retail & Provisions
            </p>
          </div>
          {mappings.length > 0 && (
            <div>
              <p className="text-xs text-slate-400">Columns mapped</p>
              <p className="font-medium text-slate-700 dark:text-slate-200">
                {mappedCount} of {mappings.length}
              </p>
            </div>
          )}
          {partialFields.length > 0 && (
            <div>
              <p className="text-xs text-amber-500">Missing (optional)</p>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {partialFields.join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {status === "error" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <ExclamationTriangleIcon className="size-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Upload failed
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Success state */}
      {status === "success" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <CheckCircleIcon className="size-5 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Upload complete — redirecting to dashboard...
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeftIcon className="size-4" /> Back
        </button>
        <button
          onClick={onUpload}
          disabled={busy}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
            busy
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary/90"
          )}
        >
          {status === "uploading" ? (
            <>
              <ArrowPathIcon className="size-4 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <ArrowUpTrayIcon className="size-4" /> Upload & Analyse
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ImportPage(): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<StepNum>(1);
  const [sourceType, setSourceType] = useState<SourceType>("file");
  const [file, setFile] = useState<File | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [moniepointDetected, setMoniepointDetected] = useState(false);
  const [isBypass, setIsBypass] = useState(false);
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isDevMode = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

  // Parse CSV headers client-side when a file is chosen
  async function handleFile(f: File): Promise<void> {
    setFile(f);
    const isCSV = f.name.toLowerCase().endsWith(".csv");
    if (!isCSV) {
      setIsBypass(true);
      setMappings([]);
      setMoniepointDetected(false);
      return;
    }
    setIsBypass(false);
    try {
      const text = await f.text();
      const headers = parseCSVHeaders(text);
      setMoniepointDetected(isMoniepoint(headers));
      setMappings(
        headers.map((h): ColumnMapping => {
          const field = detectField(h);
          return { rawHeader: h, mappedField: field, autoDetected: field !== "skip" };
        })
      );
    } catch {
      setMappings([]);
    }
  }

  function handleSourceTypeChange(t: SourceType): void {
    setSourceType(t);
    setFile(null);
    setMappings([]);
    setMoniepointDetected(false);
    setIsBypass(false);
  }

  function handleClearFile(): void {
    setFile(null);
    setMappings([]);
    setMoniepointDetected(false);
    setIsBypass(false);
  }

  function handleNext(): void {
    if (step === 1) {
      if (sourceType === "sheets") {
        setIsBypass(true);
        setMappings([]);
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  }

  function handleMappingChange(index: number, field: FieldKey | "skip"): void {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, mappedField: field, autoDetected: false } : m
      )
    );
  }

  async function handleUpload(): Promise<void> {
    setStatus("uploading");
    setErrorMsg("");
    try {
      const result: UploadAnalysisResult = await uploadAndAnalyse({
        file: sourceType === "file" ? (file ?? undefined) : undefined,
        sheetsUrl: sourceType === "sheets" ? sheetsUrl : undefined,
        industry: INDUSTRY,
      });

      // Seed React Query cache so the dashboard reflects the upload immediately
      const cached: AnalyzedDataResponse = {
        analyzed_data: result.analysis_result,
        executive_summary: result.executive_summary_result,
      };
      queryClient.setQueryData(["data-analyzed"], cached);

      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  }

  if (!isDevMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-400">This page is only available in dev mode.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-start justify-center pt-12 pb-20 px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 mb-4">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Dev Mode
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Import Data
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload a CSV, XLSX, or Google Sheets link. Moniepoint exports are
            auto-detected.
          </p>
        </div>

        {/* Step card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="mb-6">
            <StepIndicator current={step} />
          </div>

          {step === 1 && (
            <SourceStep
              sourceType={sourceType}
              file={file}
              sheetsUrl={sheetsUrl}
              onSourceTypeChange={handleSourceTypeChange}
              onFile={(f) => { void handleFile(f); }}
              onClearFile={handleClearFile}
              onSheetsUrl={setSheetsUrl}
              onNext={handleNext}
            />
          )}

          {step === 2 && (
            <MapStep
              mappings={mappings}
              moniepointDetected={moniepointDetected}
              onMappingChange={handleMappingChange}
              onBack={() => setStep(1)}
              onNext={handleNext}
              isBypass={isBypass}
            />
          )}

          {step === 3 && (
            <ProcessStep
              file={file}
              sheetsUrl={sheetsUrl}
              mappings={mappings}
              status={status}
              error={errorMsg}
              onBack={() => {
                setStatus("idle");
                setErrorMsg("");
                setStep(2);
              }}
              onUpload={() => { void handleUpload(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
