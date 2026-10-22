"use client";

import { CircleCheck, CloudUpload, TriangleAlert, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "./cn";

type Report = { synced: string[]; rejected: { label: string; error: string }[] };

const SHOW_REPORT_MS = 8000;

const subscribeNetwork = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/**
 * Offline banner of the citizen and hero apps: says when the device is
 * offline and how many actions wait, replays them when the network is back,
 * then reports what was sent and what the server refused (conflicts).
 */
export function OfflineSync({ className }: { className?: string }) {
  const router = useRouter();
  // The server renders "online"; the browser then tells the truth.
  const online = useSyncExternalStore(subscribeNetwork, () => navigator.onLine, () => true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    let cancelled = false;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const outbox = import("@/lib/offline/outbox");

    const show = (next: Report) => {
      if (next.synced.length === 0 && next.rejected.length === 0) return;
      setReport(next);
      clearTimeout(hide);
      hide = setTimeout(() => setReport(null), SHOW_REPORT_MS);
      // The server now knows: refresh the pages with its data.
      router.refresh();
    };

    const flush = async () => {
      const { flushOutbox, listQueued } = await outbox;
      if ((await listQueued()).length === 0) return;
      setSyncing(true);
      const result = await flushOutbox().finally(() => setSyncing(false));
      if (cancelled) return;
      show({
        synced: result.synced.map((action) => action.label),
        rejected: result.rejected.map(({ action, error }) => ({ label: action.label, error })),
      });
    };

    const onOnline = () => void flush();
    const onOutbox = (event: Event) => setPending((event as CustomEvent<{ pending: number }>).detail.pending);
    // Background Sync (service worker) replayed the queue while the page wasn't looking.
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "outbox-synced") return;
      setPending(event.data.pending);
      show({ synced: event.data.synced, rejected: event.data.rejected });
    };

    void outbox.then(async ({ listQueued, OUTBOX_EVENT }) => {
      window.addEventListener(OUTBOX_EVENT, onOutbox);
      if (!cancelled) setPending((await listQueued()).length);
      if (navigator.onLine) void flush();
    });
    window.addEventListener("online", onOnline);
    navigator.serviceWorker?.addEventListener("message", onWorkerMessage);
    return () => {
      cancelled = true;
      clearTimeout(hide);
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
      void outbox.then(({ OUTBOX_EVENT }) => window.removeEventListener(OUTBOX_EVENT, onOutbox));
    };
  }, [router]);

  const waiting = pending > 0 ? `${pending} action${pending > 1 ? "s" : ""} en attente` : null;
  let content: ReactNode = null;
  if (!online) {
    content = (
      <Pill tone="amber" icon={<WifiOff className="size-4" aria-hidden />}>
        Hors ligne{waiting ? ` · ${waiting}` : " · vos actions seront envoyées au retour du réseau"}
      </Pill>
    );
  } else if (syncing || pending > 0) {
    content = (
      <Pill tone="sky" icon={<CloudUpload className="size-4 animate-pulse" aria-hidden />}>
        Synchronisation{waiting ? ` · ${waiting}` : "…"}
      </Pill>
    );
  } else if (report) {
    content = (
      <div className="flex flex-col items-center gap-1.5">
        {report.synced.length > 0 && (
          <Pill tone="emerald" icon={<CircleCheck className="size-4" aria-hidden />}>
            Synchronisé : {report.synced.join(", ")}
          </Pill>
        )}
        {report.rejected.map((item) => (
          <Pill key={item.label + item.error} tone="rose" icon={<TriangleAlert className="size-4" aria-hidden />}>
            {item.label} refusé : {item.error}
          </Pill>
        ))}
      </div>
    );
  }

  return (
    <div aria-live="polite" className={cn("pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-3", className)}>
      {content}
    </div>
  );
}

const PILL_TONES = {
  amber: "border-amber-300/30 bg-amber-950/90 text-amber-100",
  sky: "border-sky-300/30 bg-sky-950/90 text-sky-100",
  emerald: "border-emerald-300/30 bg-emerald-950/90 text-emerald-100",
  rose: "border-rose-300/30 bg-rose-950/90 text-rose-100",
};

function Pill({ tone, icon, children }: { tone: keyof typeof PILL_TONES; icon: ReactNode; children: ReactNode }) {
  return (
    <p className={cn("pointer-events-auto flex max-w-md items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur", PILL_TONES[tone])}>
      {icon}
      <span>{children}</span>
    </p>
  );
}
