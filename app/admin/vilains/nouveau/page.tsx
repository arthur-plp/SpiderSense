import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarvelEncyclopediaLink } from "@/components/admin/marvel-link";
import { VillainForm } from "@/components/admin/villain-form";
import { PageHeader, Panel } from "@/components/ui/panel";
import { saveVillainAction } from "@/lib/actions/admin/villains";
import { requireStaff } from "@/lib/server/auth";
import { listIncidentTypes } from "@/lib/server/services/incidents";

export const metadata: Metadata = { title: "Ajouter un vilain" };

export default async function NewVillainPage() {
  await requireStaff();
  const types = await listIncidentTypes();
  return (
    <>
      <Link href="/admin/vilains" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="size-4" aria-hidden />
        Répertoire des vilains
      </Link>
      <PageHeader
        eyebrow="Encyclopédie"
        title="Ajouter un vilain"
        description="Complétez la fiche avec ce que l'on sait : seul le nom de super-vilain est obligatoire."
        actions={<MarvelEncyclopediaLink />}
      />
      <Panel className="max-w-4xl p-5 sm:p-6">
        <VillainForm
          action={saveVillainAction.bind(null, null)}
          types={types.map((type) => ({ id: type.id, label: type.label }))}
          submitLabel="Créer la fiche"
        />
      </Panel>
    </>
  );
}
