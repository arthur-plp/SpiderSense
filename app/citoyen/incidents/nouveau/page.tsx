import type { Metadata } from "next";
import { Suspense } from "react";
import { DeclareForm } from "@/components/citizen/declare-form";
import { MobilePage, MobilePageSkeleton } from "@/components/citizen/mobile-page";
import { requireUser } from "@/lib/server/auth";
import { listIncidentTypes } from "@/lib/server/services/incidents";

export const metadata: Metadata = { title: "Déclarer un incident" };

export default function DeclarePage() {
  return (
    <Suspense fallback={<MobilePageSkeleton title="Déclarer un incident" />}>
      <Declare />
    </Suspense>
  );
}

async function Declare() {
  await requireUser();
  const types = await listIncidentTypes();
  return (
    <MobilePage title="Déclarer un incident" back="/citoyen/incidents">
      <DeclareForm types={types.map(({ id, code, label }) => ({ id, code, label }))} />
    </MobilePage>
  );
}
