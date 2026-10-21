"use client";

import { useCallback, useEffect, useState } from "react";
import type { LatLng } from "@/lib/geo";

export type GeolocationState =
  | { status: "idle" | "locating" }
  | { status: "ready"; position: LatLng; accuracy: number }
  | { status: "denied" | "unavailable"; message: string };

/** Browser position, watched while the component is mounted. */
export function useGeolocation(watch = true): GeolocationState & { retry: () => void } {
  const [state, setState] = useState<GeolocationState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!watch) return;
    if (!("geolocation" in navigator)) {
      // Feature detection result is only known on the client.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "unavailable", message: "La géolocalisation n'est pas disponible sur cet appareil." });
      return;
    }
    setState((previous) => (previous.status === "ready" ? previous : { status: "locating" }));
    const id = navigator.geolocation.watchPosition(
      (position) =>
        setState({
          status: "ready",
          position: { lat: position.coords.latitude, lng: position.coords.longitude },
          accuracy: position.coords.accuracy,
        }),
      (error) =>
        setState(
          error.code === error.PERMISSION_DENIED
            ? { status: "denied", message: "Position refusée : activez la localisation pour être localisé précisément." }
            : { status: "unavailable", message: "Position introuvable pour le moment." },
        ),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [watch, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, retry };
}
