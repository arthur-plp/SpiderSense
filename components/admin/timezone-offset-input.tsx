"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Posts the browser's time zone offset with a datetime-local field, so the
 * server can interpret the typed time (0 until hydrated).
 */
export function TimezoneOffsetInput({ name = "timezoneOffset" }: { name?: string }) {
  const offset = useSyncExternalStore(
    subscribe,
    () => new Date().getTimezoneOffset(),
    () => 0,
  );
  return <input type="hidden" name={name} value={offset} />;
}
