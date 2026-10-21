"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the server page periodically while an incident is still active. */
export function AutoRefresh({ intervalMs = 15_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === "visible" && router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
