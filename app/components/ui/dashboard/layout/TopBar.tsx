"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Account from "./header/Account";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import { useExecutiveSummaryData } from "@/app/hooks/useDashboardData";
import { useGetProfile } from "@/app/components/hooks/user/useGetProfile";
import { cn } from "@/lib/utils";
import {
  Bars3Icon, MoonIcon, SunIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon,
  HomeIcon, BanknotesIcon, ShoppingBagIcon, UsersIcon, ReceiptPercentIcon,
  UserGroupIcon, ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import type { DashboardTier } from "@/app/stores/dashboard/useDashboardStore";

// ── Page navigation per tier ──────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  exact: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const FORECAST_NAV: NavItem = { label: "Forecast Insights", href: "/dashboard/forecast", exact: false, icon: ArrowTrendingUpIcon };

const NAV_BY_TIER: Record<DashboardTier, NavItem[]> = {
  basic: [
    { label: "Cockpit",             href: "/dashboard",          exact: true,  icon: HomeIcon         },
    { label: "Sales Overview",      href: "/dashboard/sales",    exact: false, icon: BanknotesIcon    },
    { label: "Product Performance", href: "/dashboard/products", exact: false, icon: ShoppingBagIcon  },
    FORECAST_NAV,
  ],
  intermediate: [
    { label: "Cockpit",             href: "/dashboard",           exact: true,  icon: HomeIcon           },
    { label: "Sales Overview",      href: "/dashboard/sales",     exact: false, icon: BanknotesIcon      },
    { label: "Product Performance", href: "/dashboard/products",  exact: false, icon: ShoppingBagIcon    },
    { label: "Customers",           href: "/dashboard/customers", exact: false, icon: UsersIcon          },
    { label: "Expenses",            href: "/dashboard/expenses",  exact: false, icon: ReceiptPercentIcon },
    FORECAST_NAV,
  ],
  advanced: [
    { label: "Cockpit",             href: "/dashboard",           exact: true,  icon: HomeIcon           },
    { label: "Sales Overview",      href: "/dashboard/sales",     exact: false, icon: BanknotesIcon      },
    { label: "Product Performance", href: "/dashboard/products",  exact: false, icon: ShoppingBagIcon    },
    { label: "Customers",           href: "/dashboard/customers", exact: false, icon: UsersIcon          },
    { label: "Expenses",            href: "/dashboard/expenses",  exact: false, icon: ReceiptPercentIcon },
    { label: "Staff Performance",   href: "/dashboard/staff",     exact: false, icon: UserGroupIcon      },
    FORECAST_NAV,
  ],
};

// ── Health score helpers ──────────────────────────────────────────────────────

function scoreColour(colour: string): string {
  if (colour === "green") return "text-emerald-400";
  if (colour === "red")   return "text-red-400";
  return "text-amber-400";
}

function HealthMiniWidget({ score, colour }: { score: number; colour: string }): React.ReactElement {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const gap = circumference - filled;
  const ringColour = colour === "green" ? "#34d399" : colour === "red" ? "#f87171" : "#fbbf24";

  return (
    <Link href="/dashboard" title={`Business Health: ${score}/100`} className="flex items-center gap-1.5 group">
      <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
        <circle
          cx="16" cy="16" r={radius}
          fill="none" stroke={ringColour} strokeWidth="3"
          strokeDasharray={`${filled} ${gap}`} strokeLinecap="round"
        />
      </svg>
      <span className={cn("text-xs font-bold tabular-nums", scoreColour(colour))}>{score}</span>
    </Link>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────

export default function TopBar(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const {
    toggleSideRail,
    sideRailExpanded,
    devTier,
    theme,
    toggleTheme,
    toggleFilterPane,
    filterPaneOpen,
    filterYears,
    filterMonths,
    filterDaysOfWeek,
  } = useDashboardStore();
  const summary = useExecutiveSummaryData();
  const { isLoading: profileLoading } = useGetProfile();

  const isDevMode = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
  const navItems = NAV_BY_TIER[devTier];
  const dateActiveCount = filterYears.length + filterMonths.length + filterDaysOfWeek.length;
  const { score, colour } = summary?.health_score ?? { score: 0, colour: "amber" };

  // Real users with no data yet — show only logo + account (no nav, no filters)
  if (!isDevMode && !profileLoading && !summary) {
    return (
      <header className="sticky top-0 z-50 w-full bg-primary-dark border-b border-white/10 shadow-sm">
        <div className="h-16 flex items-center px-4 md:px-6 gap-4">
          <Link href="/dashboard" className="active:scale-95 transition-transform">
            <img src="/InViewLogoWhite.svg" alt="InView by MagByte" className="h-7 w-auto object-contain" />
          </Link>
          <div className="ml-auto">
            <Account />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-primary-dark border-b border-white/10 shadow-sm">
      {/* Main row */}
      <div className="h-16 flex items-center px-2 md:px-4 gap-4">

        {/* ── Left: hamburger + logo ── */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleSideRail}
            aria-label="Toggle sidebar"
            aria-expanded={sideRailExpanded}
            className={cn(
              "p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors",
              isDevMode ? "flex" : "hidden md:flex"
            )}
          >
            <Bars3Icon className="size-6" />
          </button>
          <Link href="/dashboard" className="active:scale-95 transition-transform">
            <img
              src="/InViewLogoWhite.svg"
              alt="InView by MagByte"
              className="h-7 w-auto object-contain"
            />
          </Link>
        </div>

        {/* ── Center: back/forward + page nav pills (desktop only) ── */}
        <nav className="hidden lg:flex items-center gap-1 mx-auto">
          {/* Browser history buttons — sit beside the Cockpit/first nav pill */}
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            onClick={() => router.forward()}
            aria-label="Go forward"
            className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRightIcon className="size-4" />
          </button>
          <div className="w-px h-4 bg-white/15 mx-0.5" aria-hidden />
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 select-none",
                  isActive
                    ? "bg-white text-primary-dark font-semibold"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <item.icon className="size-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right cluster ── */}
        <div className="flex items-center gap-3 ml-auto shrink-0">


          {/* Health mini-widget */}
          <HealthMiniWidget score={score} colour={colour} />

          {/* Filter pane toggle (desktop) */}
          <button
            onClick={toggleFilterPane}
            aria-label={filterPaneOpen ? "Close filter pane" : "Open filter pane"}
            className={cn(
              "hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
              filterPaneOpen || dateActiveCount > 0
                ? "bg-white/20 border-white/40 text-white"
                : "bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/15"
            )}
          >
            <FunnelIcon className="size-3.5" />
            <span>Filters</span>
            {dateActiveCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-white/30 text-white text-[9px] font-bold px-1">
                {dateActiveCount}
              </span>
            )}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
          </button>

          {/* Account avatar */}
          <Account />
        </div>
      </div>
    </header>
  );
}
