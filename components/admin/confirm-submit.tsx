"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { type ButtonSize, type ButtonVariant, buttonClasses } from "@/components/ui/button";

type ConfirmSubmitProps = {
  children: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Optional fields shown in the dialog (e.g. a deletion reason). */
  fields?: ReactNode;
};

/**
 * Submit button of the enclosing form that asks for confirmation first, in a
 * native modal dialog (focus trap, Escape to cancel). Must be rendered inside a <form>.
 */
export function ConfirmSubmit({
  children,
  title,
  description,
  confirmLabel = "Confirmer",
  variant = "danger",
  size = "sm",
  className,
  fields,
}: ConfirmSubmitProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { pending } = useFormStatus();
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className={buttonClasses(variant, size, className)}
      >
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="panel fixed inset-0 m-auto h-fit w-[min(30rem,calc(100vw-2rem))] rounded-2xl p-0 text-slate-200 backdrop:bg-ink-950/75 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-4 p-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-1.5 text-sm text-slate-400">
                {description}
              </div>
            )}
          </div>
          {fields}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClasses("secondary", "md")}>
              Annuler
            </button>
            {/* Closing first: the parent form submits and shows its own pending state. */}
            <button type="submit" onClick={() => dialogRef.current?.close()} className={buttonClasses(variant, "md")}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
