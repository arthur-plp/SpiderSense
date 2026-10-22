"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js (offline pages, Background Sync). Production only:
 * in development its caches would fight hot reloading, so it is removed
 * unless NEXT_PUBLIC_ENABLE_SW=true.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "true") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => console.warn("[sw]", error));
    } else {
      void navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()));
    }
  }, []);
  return null;
}
