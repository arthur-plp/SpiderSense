"use client";

import { ChevronRight, Mail, Phone, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/panel";
import { fullName } from "@/lib/format";
import { VILLAIN_STATUS_LABELS } from "@/lib/labels";
import type { HeroContactDto } from "@/lib/server/services/heroes";
import type { VillainDto } from "@/lib/server/services/villains";

type Tab = "heros" | "vilains";

/** 6.1.4: hero list (5.5) and villain list (5.6), searchable. */
export function Encyclopedia({ heroes, villains, initialTab }: { heroes: HeroContactDto[]; villains: VillainDto[]; initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const matches = (...values: (string | null | undefined)[]) => !term || values.some((value) => value?.toLowerCase().includes(term));
  const shownHeroes = heroes.filter((hero) => matches(hero.alias, hero.firstName, hero.lastName, ...hero.powers));
  const shownVillains = villains.filter((villain) => matches(villain.alias, villain.firstName, villain.lastName, villain.mainSector, ...villain.specialties.map((s) => s.label)));

  return (
    <div>
      <div role="tablist" aria-label="Encyclopédie" className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-ink-900/80 p-1">
        {(
          [
            ["heros", `Super-héros (${heroes.length})`],
            ["vilains", `Super-vilains (${villains.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn("rounded-xl py-2 text-sm font-semibold", tab === value ? (value === "heros" ? "bg-sky-400/20 text-sky-50 ring-1 ring-sky-300/40" : "bg-rose-500/20 text-rose-50 ring-1 ring-rose-300/40") : "text-slate-400")}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="relative mb-4 block">
        <span className="sr-only">Rechercher</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "heros" ? "Nom, pseudo, pouvoir…" : "Nom, spécialité, secteur…"} className="field pl-10" />
      </label>

      {tab === "heros" ? (
        shownHeroes.length === 0 ? (
          <EmptyState title="Aucun super-héros trouvé" />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {shownHeroes.map((hero) => (
              <li key={hero.id} className="glass rounded-2xl p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar src={hero.avatarUrl} label={hero.alias} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{hero.alias}</p>
                    <p className="text-xs text-slate-400">{fullName(hero) || "Identité inconnue"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-1 text-xs text-slate-300">
                  <a href={`mailto:${hero.email}`} className="flex items-center gap-2 truncate">
                    <Mail className="size-3.5 shrink-0 text-sky-300/80" aria-hidden /> {hero.email}
                  </a>
                  <a href={`tel:${hero.phone.replace(/\s/g, "")}`} className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-sky-300/80" aria-hidden /> {hero.phone}
                  </a>
                </div>
                <Link href={`/citoyen/encyclopedie/heros/${hero.id}`} className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-white/6 py-2 text-sm font-semibold text-sky-100">
                  Voir toutes ses informations <ChevronRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : shownVillains.length === 0 ? (
        <EmptyState title="Aucun super-vilain trouvé" />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shownVillains.map((villain) => (
            <li key={villain.id} className="glass rounded-2xl p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{villain.alias}</p>
                  <p className="text-xs text-slate-400">{fullName(villain) || "Identité inconnue"}</p>
                </div>
                <Badge tone={villain.status === "IMPRISONED" ? "success" : "danger"} dot>
                  {VILLAIN_STATUS_LABELS[villain.status]}
                </Badge>
              </div>
              <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-slate-500">Spécialité</dt>
                <dd className="text-slate-300">{villain.specialties.map((specialty) => specialty.label).join(", ") || "—"}</dd>
                <dt className="text-slate-500">Secteur</dt>
                <dd className="text-slate-300">{villain.mainSector ?? "—"}</dd>
              </dl>
              <Link href={`/citoyen/encyclopedie/vilains/${villain.id}`} className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-white/6 py-2 text-sm font-semibold text-rose-100">
                Voir toutes ses informations <ChevronRight className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
