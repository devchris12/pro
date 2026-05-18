"use client";

import dynamic from "next/dynamic";
import DashboardSkeleton from "@/app/components/ui/loaders/DashboardSkeleton";
import { useDashboardPageReady } from "@/app/hooks/useDashboardPageReady";

const DASHBOARD_SHELL = "p-4 md:p-6 space-y-6 max-w-7xl mx-auto";

const SalesContent = dynamic(
  () =>
    import("@/app/components/dashboard/sales/SalesContent").then((m) => ({
      default: m.SalesContent,
    })),
  { ssr: false },
);

export default function SalesOverviewPage(): React.ReactElement {
  const { ready, firstName } = useDashboardPageReady();

  if (!ready) return <DashboardSkeleton />;

  return (
    <div className={DASHBOARD_SHELL}>
      <SalesContent firstName={firstName} />
    </div>
  );
}
