import type { Metadata } from "next";
import AuthGuard from "../components/middleware/AuthGuard";
import TopBar from "../components/ui/dashboard/layout/TopBar";
import SideRail from "../components/ui/dashboard/layout/SideRail";
import BottomNav from "../components/ui/dashboard/layout/BottomNav";
import FilterPane from "../components/ui/dashboard/layout/FilterPane";
import { FilterPaneProvider } from "../contexts/FilterPaneContext";

export const metadata: Metadata = {
  title: "Dashboard | InView",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FilterPaneProvider>
      <div className="h-screen bg-ghost-white dark:bg-slate-950 flex flex-col overflow-hidden">
        <AuthGuard />
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <SideRail />
          <main
            id="dashboard-main"
            className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0 page-enter"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
        <BottomNav />
        <FilterPane />
      </div>
    </FilterPaneProvider>
  );
}
