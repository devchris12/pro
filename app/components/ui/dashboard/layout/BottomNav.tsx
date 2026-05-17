"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/app/stores/dashboard/useDashboardStore";
import type { DashboardTier } from "@/app/stores/dashboard/useDashboardStore";
import {
  HomeIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  ReceiptPercentIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  BanknotesIcon as BanknotesIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  ArrowTrendingUpIcon as ArrowTrendingUpIconSolid,
  ReceiptPercentIcon as ReceiptPercentIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  UsersIcon as UsersIconSolid,
} from "@heroicons/react/24/solid";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  iconActive: React.ElementType;
  exact: boolean;
}

const FORECAST_ITEM: NavItem = {
  label: "Forecast",
  href: "/dashboard/forecast",
  icon: ArrowTrendingUpIcon,
  iconActive: ArrowTrendingUpIconSolid,
  exact: false,
};

const BASE_NAV: NavItem[] = [
  { label: "Cockpit",  href: "/dashboard",         icon: HomeIcon,         iconActive: HomeIconSolid,         exact: true  },
  { label: "Sales",    href: "/dashboard/sales",    icon: BanknotesIcon,    iconActive: BanknotesIconSolid,    exact: false },
  { label: "Products", href: "/dashboard/products", icon: ShoppingBagIcon,  iconActive: ShoppingBagIconSolid,  exact: false },
  FORECAST_ITEM,
];

const INTERMEDIATE_NAV: NavItem[] = [
  { label: "Cockpit",   href: "/dashboard",           icon: HomeIcon,            iconActive: HomeIconSolid,            exact: true  },
  { label: "Sales",     href: "/dashboard/sales",     icon: BanknotesIcon,       iconActive: BanknotesIconSolid,       exact: false },
  { label: "Products",  href: "/dashboard/products",  icon: ShoppingBagIcon,     iconActive: ShoppingBagIconSolid,     exact: false },
  { label: "Customers", href: "/dashboard/customers", icon: UsersIcon,           iconActive: UsersIconSolid,           exact: false },
  { label: "Expenses",  href: "/dashboard/expenses",  icon: ReceiptPercentIcon,  iconActive: ReceiptPercentIconSolid,  exact: false },
  FORECAST_ITEM,
];

const ADVANCED_NAV: NavItem[] = [
  { label: "Cockpit",   href: "/dashboard",           icon: HomeIcon,            iconActive: HomeIconSolid,            exact: true  },
  { label: "Sales",     href: "/dashboard/sales",     icon: BanknotesIcon,       iconActive: BanknotesIconSolid,       exact: false },
  { label: "Products",  href: "/dashboard/products",  icon: ShoppingBagIcon,     iconActive: ShoppingBagIconSolid,     exact: false },
  { label: "Customers", href: "/dashboard/customers", icon: UsersIcon,           iconActive: UsersIconSolid,           exact: false },
  { label: "Expenses",  href: "/dashboard/expenses",  icon: ReceiptPercentIcon,  iconActive: ReceiptPercentIconSolid,  exact: false },
  { label: "Staff",     href: "/dashboard/staff",     icon: UserGroupIcon,       iconActive: UserGroupIconSolid,       exact: false },
  FORECAST_ITEM,
];

function navForTier(tier: DashboardTier): NavItem[] {
  if (tier === "advanced") return ADVANCED_NAV;
  if (tier === "intermediate") return INTERMEDIATE_NAV;
  return BASE_NAV;
}

export default function BottomNav(): React.ReactElement | null {
  const pathname = usePathname();
  const { devTier } = useDashboardStore();
  const navItems = navForTier(devTier);

  if (pathname.startsWith("/dashboard/user")) return null;

  // Compress item padding when more than 4 items to keep everything on one line
  const compact = navItems.length > 4;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-primary-dark border-t border-white/10 flex items-center justify-around safe-area-pb">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = isActive ? item.iconActive : item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all duration-150",
              compact ? "px-1.5" : "px-3",
              isActive ? "text-white" : "text-white/40"
            )}
          >
            <Icon className="size-5" />
            <span className={cn("font-medium", compact ? "text-[9px]" : "text-[10px]")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
