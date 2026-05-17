"use client";

import dynamic from "next/dynamic";
import DashboardSkeleton from "@/app/components/ui/loaders/DashboardSkeleton";
import { useDashboardPageReady } from "@/app/hooks/useDashboardPageReady";

const DASHBOARD_SHELL = "p-4 md:p-6 space-y-6 max-w-7xl mx-auto";

const CockpitContent = dynamic(
  () =>
    import("@/app/components/dashboard/cockpit/CockpitContent").then((m) => ({
      default: m.CockpitContent,
    })),
  { ssr: false },
);

export default function CockpitPage(): React.ReactElement {
  const { ready, firstName } = useDashboardPageReady();

  if (!ready) return <DashboardSkeleton />;

  return (
    <div className={DASHBOARD_SHELL}>
      <CockpitContent firstName={firstName} />
    </div>
  );
}
