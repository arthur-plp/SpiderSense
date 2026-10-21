"use client";

import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { cn } from "./cn";

export type Toast = {
  id: number;
  tone: "success" | "error" | "info";
  title: string;
  description?: ReactNode;
  action?: { label: string; onClick: () => void };
};

/** Local toast stack; render <ToastViewport> once where it should appear. */
export function useToasts(timeoutMs = 6000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((toast) => toast.id !== id)), []);
  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-3), { ...toast, id }]);
      setTimeout(() => dismiss(id), timeoutMs);
    },
    [dismiss, timeoutMs],
  );
  return { toasts, push, dismiss };
}

const ICONS = { success: CircleCheck, error: TriangleAlert, info: Info };
const TONES = {
  success: "text-emerald-300",
  error: "text-rose-300",
  info: "text-sky-300",
};

export function ToastViewport({ toasts, dismiss, className }: { toasts: Toast[]; dismiss: (id: number) => void; className?: string }) {
  return (
    <div aria-live="polite" className={cn("pointer-events-none flex flex-col gap-2", className)}>
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone];
        return (
          <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className="glass glass-strong pointer-events-auto flex w-80 max-w-full items-start gap-3 rounded-2xl p-3.5 animate-slide-up">
            <Icon className={cn("mt-0.5 size-5 shrink-0", TONES[toast.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{toast.title}</p>
              {toast.description && <div className="mt-0.5 text-xs text-slate-300">{toast.description}</div>}
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.onClick();
                    dismiss(toast.id);
                  }}
                  className="mt-2 text-xs font-semibold text-sky-300 hover:text-sky-200"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button type="button" onClick={() => dismiss(toast.id)} className="text-slate-400 hover:text-white" aria-label="Fermer la notification">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
