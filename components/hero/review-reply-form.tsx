"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useApiForm } from "@/lib/use-api-form";

export function ReviewReplyForm({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useApiForm({ method: "PUT", path: `/api/reviews/${reviewId}/reply` });
  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="mt-2 px-0 text-sky-300 hover:bg-transparent" onClick={() => setOpen(true)}>
        Répondre
      </Button>
    );
  }
  return (
    <form action={action} className="mt-3 flex flex-col gap-2">
      <label htmlFor={`reply-${reviewId}`} className="sr-only">Votre réponse</label>
      <Textarea id={`reply-${reviewId}`} name="reply" rows={2} maxLength={1000} placeholder="Merci pour votre retour…" defaultValue={state.values?.reply} invalid={Boolean(state.fieldErrors?.reply)} required autoFocus />
      {state.fieldErrors?.reply && <p className="text-xs text-rose-300">{state.fieldErrors.reply[0]}</p>}
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton size="sm" pendingLabel="Publication…">Publier la réponse</SubmitButton>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
      </div>
    </form>
  );
}
