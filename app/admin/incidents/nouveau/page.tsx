import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IncidentCreateForm } from "@/components/admin/incident-form";
import { PageHeader } from "@/components/ui/panel";
import { createIncidentAction } from "@/lib/actions/admin/incidents";
import { requireStaff } from "@/lib/server/auth";
import { listIncidentTypes } from "@/lib/server/services/incidents";

export const metadata: Metadata = { title: "Signaler un incident" };

export default async function NewIncidentPage() {
  await requireStaff();
  const types = await listIncidentTypes();
  return (
    <>
      <Link href="/admin/incidents" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="size-4" aria-hidden />
        Tous les incidents
      </Link>
      <PageHeader
        eyebrow="Modération"
        title="Signaler un incident"
        description="Vous déclarez l'incident en votre nom, comme un citoyen. Les super-héros et les modérateurs sont prévenus immédiatement ; vous pouvez fixer la priorité dès maintenant."
      />
      <IncidentCreateForm action={createIncidentAction} types={types.map((type) => ({ id: type.id, label: type.label }))} />
    </>
  );
}
