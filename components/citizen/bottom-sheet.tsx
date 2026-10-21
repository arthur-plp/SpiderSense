"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

export type SheetSnap = "peek" | "half" | "full";
const ORDER: SheetSnap[] = ["peek", "half", "full"];

type BottomSheetProps = {
  label: string;
  /** Always visible part (title, summary). */
  header: ReactNode;
  children: ReactNode;
  peekHeight?: number;
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
};

/**
 * Draggable bottom sheet with three detents (reduced / half / full screen).
 * Drag the handle area, flick for momentum, or use the keyboard on the handle.
 */
export function BottomSheet({ label, header, children, peekHeight = 132, snap, onSnapChange }: BottomSheetProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [containerHeight, setContainerHeight] = useState(844);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const gesture = useRef<{ startY: number; startHeight: number; samples: { y: number; t: number }[]; moved: boolean } | null>(null);

  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height));
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const heights: Record<SheetSnap, number> = {
    peek: peekHeight,
    half: Math.round(containerHeight * 0.52),
    full: Math.round(containerHeight * 0.9),
  };
  const full = heights.full;
  const visible = dragHeight ?? heights[snap];

  const settle = (height: number, velocity: number) => {
    // Flick (> 0.45 px/ms): next detent past the release point, in the flick direction.
    if (velocity > 0.45) {
      onSnapChange(ORDER.find((candidate) => heights[candidate] > height) ?? "full");
      return;
    }
    if (velocity < -0.45) {
      onSnapChange([...ORDER].reverse().find((candidate) => heights[candidate] < height) ?? "peek");
      return;
    }
    const nearest = ORDER.reduce((best, candidate) =>
      Math.abs(heights[candidate] - height) < Math.abs(heights[best] - height) ? candidate : best,
    );
    onSnapChange(nearest);
  };

  return (
    <section
      ref={rootRef}
      aria-label={label}
      className={cn(
        "glass glass-strong absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] border-b-0",
        dragHeight === null && "transition-transform duration-[380ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
      )}
      style={{ height: full, transform: `translateY(${full - visible}px)` }}
    >
      <div
        className="cursor-grab touch-none select-none px-4 pb-2 pt-2.5 active:cursor-grabbing"
        onPointerDown={(event) => {
          gesture.current = { startY: event.clientY, startHeight: visible, samples: [{ y: event.clientY, t: event.timeStamp }], moved: false };
        }}
        onPointerMove={(event) => {
          const current = gesture.current;
          if (!current) return;
          const delta = current.startY - event.clientY;
          if (!current.moved && Math.abs(delta) > 4) {
            current.moved = true;
            // Capture only once it's a drag, so a simple tap still clicks the handle.
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (!current.moved) return;
          current.samples = [...current.samples.slice(-4), { y: event.clientY, t: event.timeStamp }];
          setDragHeight(Math.min(full, Math.max(peekHeight * 0.8, current.startHeight + delta)));
        }}
        onPointerUp={() => {
          const current = gesture.current;
          gesture.current = null;
          if (!current) return;
          if (!current.moved) {
            setDragHeight(null);
            return;
          }
          const first = current.samples[0];
          const last = current.samples[current.samples.length - 1];
          const velocity = (first.y - last.y) / Math.max(1, last.t - first.t);
          const height = dragHeight ?? visible;
          setDragHeight(null);
          settle(height, velocity);
        }}
        onPointerCancel={() => {
          gesture.current = null;
          setDragHeight(null);
        }}
      >
        <button
          type="button"
          aria-label={snap === "full" ? "Réduire la liste" : "Agrandir la liste"}
          aria-expanded={snap !== "peek"}
          onClick={() => onSnapChange(snap === "peek" ? "half" : snap === "half" ? "full" : "peek")}
          onKeyDown={(event) => {
            const index = ORDER.indexOf(snap);
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onSnapChange(ORDER[Math.min(2, index + 1)]);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              onSnapChange(ORDER[Math.max(0, index - 1)]);
            }
          }}
          className="mx-auto mb-2 block h-5 w-16 rounded-full"
        >
          <span className="mx-auto block h-1.5 w-11 rounded-full bg-white/30" />
        </button>
        {header}
      </div>
      <div
        className={cn("flex-1 overscroll-contain px-4", snap === "peek" && dragHeight === null ? "overflow-hidden" : "overflow-y-auto")}
        // Keeps the last items reachable when the sheet is not fully open.
        style={{ paddingBottom: full - visible + 24 }}
        inert={snap === "peek" && dragHeight === null}
      >
        {children}
      </div>
    </section>
  );
}
