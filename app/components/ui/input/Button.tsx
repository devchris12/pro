"use client";
import React from "react";
import { twMerge as tw } from "tailwind-merge";
import { styles } from "../../styles/constants";

export default function Button({
  children,
  onClick,
  disabled,
  className,
  style,
  hidden,
  type = "button",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  hidden?: boolean;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      hidden={hidden}
      onClick={onClick}
      disabled={disabled}
      style={style}
      aria-label={ariaLabel}
      className={tw(styles.defaultButton, className)}
    >
      {children}
    </button>
  );
}
