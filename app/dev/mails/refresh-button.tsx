"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

/** Emails are stored right after the response, so a new one may need a refresh. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" onClick={() => startTransition(() => router.refresh())} disabled={pending} aria-busy={pending}>
      <RefreshCw size={16} className={cn(pending && "animate-spin")} aria-hidden />
      Actualiser
    </Button>
  );
}
