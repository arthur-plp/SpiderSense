"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime, formatRelative } from "@/lib/format";

// One shared ticking clock for every relative date on the page.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => {
    now = Date.now();
    listeners.forEach((notify) => notify());
  }, 30_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Current time, refreshed every 30 s. Null during SSR and hydration. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, () => now, () => null);
}

/** "il y a 5 minutes"; renders the absolute date on the server to avoid hydration mismatches. */
export function RelativeTime({ value, className }: { value: string; className?: string }) {
  const current = useNow();
  return (
    <time dateTime={value} title={formatDateTime(value)} className={className}>
      {current === null ? formatDateTime(value) : formatRelative(value, current)}
    </time>
  );
}
