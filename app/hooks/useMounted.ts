"use client";

import { useEffect, useState } from "react";

/** False on the server and on the first client render — true after hydration. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
