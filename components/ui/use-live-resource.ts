"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Server-rendered data kept fresh by polling a JSON route. Polling pauses
 * while the tab is hidden and resumes with an immediate refresh.
 */
export function useLiveResource<T>(url: string, initial: T, pick: (body: unknown) => T, intervalMs = 10_000) {
  const [data, setData] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });

  const reload = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setData(pickRef.current(await response.json()));
      setUpdatedAt(Date.now());
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [url]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, intervalMs);
    const onVisible = () => document.visibilityState === "visible" && void reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload, intervalMs]);

  return { data, setData, reload, updatedAt, online };
}
