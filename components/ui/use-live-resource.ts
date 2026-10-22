"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type LiveChange, subscribeLive, subscribeLiveStatus } from "@/lib/live-events";

type Options = {
  /** Polling period when the live feed is down. */
  intervalMs?: number;
  /** Reload as soon as an event of these aggregates is appended to the journal (Server-Sent Events). */
  live?: LiveChange["aggregateType"][];
};

/** While the live feed works, polling is only a safety net. */
const FALLBACK_WHEN_LIVE_MS = 60_000;
/** Events often come in bursts (take + position): one reload for the burst. */
const DEBOUNCE_MS = 300;

/**
 * Server-rendered data kept fresh by a JSON route: reloaded on every relevant
 * event of the live feed, and polled when the feed is down. Polling pauses
 * while the tab is hidden and resumes with an immediate refresh.
 */
export function useLiveResource<T>(url: string, initial: T, pick: (body: unknown) => T, { intervalMs = 10_000, live }: Options = {}) {
  const [data, setData] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [connected, setConnected] = useState(false);
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

  const topics = live?.join(",") ?? "";
  useEffect(() => {
    if (!topics) return;
    const wanted = new Set(topics.split(","));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeLive((change) => {
      if (!wanted.has(change.aggregateType)) return;
      clearTimeout(timer);
      timer = setTimeout(() => void reload(), DEBOUNCE_MS);
    });
    const unsubscribeStatus = subscribeLiveStatus((value) => {
      // Back online: catch up with what happened while disconnected.
      if (value) void reload();
      setConnected(value);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
      unsubscribeStatus();
    };
  }, [topics, reload]);

  const period = connected ? Math.max(intervalMs, FALLBACK_WHEN_LIVE_MS) : intervalMs;
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, period);
    const onVisible = () => document.visibilityState === "visible" && void reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload, period]);

  return { data, setData, reload, updatedAt, online, live: connected };
}
