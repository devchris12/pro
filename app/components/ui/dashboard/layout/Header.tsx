"use client";
import React from "react";
import Account from "./header/Account";
import Link from "next/link";
import { styles } from "@/app/components/styles/constants";
export default function Header() {
  return (
    <nav className="w-full sticky top-0 z-50 bg-white py-5">
      <header className="flex flex-row items-center justify-between w-full max-w-xl mx-auto">
        <Link href="/" className={`${styles.squish}`}>
          <img
            className="w-[140px] h-auto object-contain"
            src="/MagByteLogo.png"
            alt="MagByte"
          />
        </Link>
        <Account />
      </header>
    </nav>
  );
}
