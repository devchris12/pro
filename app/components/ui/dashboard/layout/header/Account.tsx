"use client";
import { useGetProfile } from "@/app/components/hooks/user/useGetProfile";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { styles } from "@/app/components/styles/constants";
import Spinner from "../../../loaders/Spinner";
import { useTokenStore } from "@/app/components/stores/auth/useTokenStore";
import Button from "../../../input/Button";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRightStartOnRectangleIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

/** Only allow http/https image URLs — blocks javascript:, data:, etc. */
function isSafeImageUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function Account() {
  const { data: user, isLoading, isError } = useGetProfile();
  const { isAuthenticated, logout } = useTokenStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const replacingData = pathname.startsWith("/dashboard/user");

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    void logout().then(() => router.replace("/"));
  }

  if (isLoading && isAuthenticated)
    return (
      <div className="size-[45px] flex items-center justify-center">
        <Spinner />
      </div>
    );

  if (isError || !user || !isAuthenticated) {
    return (
      <Link href={"/"} className={``}>
        <Button>
          <p>Sign in</p>
        </Button>
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex flex-row gap-2 items-center justify-center ${styles.squish}`}
        aria-label="Account menu"
        aria-expanded={open}
      >
        <small className="select-none font-semibold text-xs md:text-sm text-white/90">
          {`${user.first_name} ${user.last_name}`}
        </small>
        {isSafeImageUrl(user.pfp) ? (
          <img
            referrerPolicy="no-referrer"
            src={user.pfp as string}
            alt="user profile picture"
            className="object-cover size-10 rounded-full overflow-hidden ring-2 ring-primary"
          />
        ) : (
          <div className="size-10 rounded-full bg-primary/20 ring-2 ring-primary flex items-center justify-center text-sm font-bold text-primary">
            {user.first_name?.[0] ?? "?"}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              {user.email}
            </p>
          </div>

          {/* Actions */}
          <Link
            href="/dashboard/user/update"
            onClick={() => setOpen(false)}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium transition-colors",
              replacingData
                ? "bg-primary/8 text-primary"
                : "text-gray-600 hover:bg-gray-50",
            )}
          >
            <ArrowUpTrayIcon className="size-4 shrink-0" />
            Replace your data
            {replacingData && (
              <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-primary/70">In progress</span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-red-600 font-medium hover:bg-red-50 transition-colors border-t border-gray-50"
          >
            <ArrowRightStartOnRectangleIcon className="size-4 shrink-0" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
