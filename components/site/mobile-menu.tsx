"use client";

import { Menu, X } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

/** Burger menu for small screens: navigation links plus the account area. */
export function MobileMenu({ nav, account, className }: { nav: ReactNode; account: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Following a link or submitting (logout) closes the menu.
  function closeOnNavigation(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a[href], button[type='submit']")) setOpen(false);
  }

  return (
    <div className={cn("md:hidden", className)}>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={buttonClasses("ghost", "icon")}
      >
        {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
      </button>
      {open && (
        <div aria-hidden className="fixed inset-x-0 bottom-0 top-16 z-30 bg-ink-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}
      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        onClick={closeOnNavigation}
        className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] animate-slide-up overflow-y-auto border-b border-white/10 bg-ink-900/95 px-4 pb-6 pt-3 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl"
      >
        <nav aria-label="Navigation principale">{nav}</nav>
        <div className="mt-4 border-t border-white/10 pt-4">{account}</div>
      </div>
    </div>
  );
}
