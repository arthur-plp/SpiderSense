import type { Metadata } from "next";
import { Suspense } from "react";
import { CitizenHome } from "@/components/citizen/citizen-home";
import { requireUser } from "@/lib/server/auth";
import { getAccount } from "@/lib/server/services/account";
import { listHeroes } from "@/lib/server/services/heroes";
import { listActiveIncidents, listIncidentTypes } from "@/lib/server/services/incidents";
import { listRateableInterventions } from "@/lib/server/services/reviews";

export const metadata: Metadata = { title: "Alerte SOS" };

export default function CitizenHomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const user = await requireUser();
  const [incidents, heroes, types, rateable, account] = await Promise.all([
    listActiveIncidents(),
    listHeroes(),
    listIncidentTypes(),
    listRateableInterventions(user.id),
    getAccount(user.id),
  ]);
  return (
    <CitizenHome
      user={{ id: user.id, firstName: user.firstName, avatarUrl: user.avatarUrl }}
      // Citizens only learn who reported their own incidents.
      initialIncidents={incidents.map((incident) => ({ ...incident, reporterId: incident.reporterId === user.id ? user.id : null }))}
      initialHeroes={heroes}
      types={types.map(({ id, code, label }) => ({ id, code, label }))}
      rateableCount={rateable.length}
      homeAddress={{
        street: account?.street ?? "",
        postalCode: account?.postalCode ?? "",
        city: account?.city ?? "",
        country: account?.country ?? "France",
      }}
    />
  );
}

function HomeSkeleton() {
  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(70%_50%_at_50%_40%,#0b1a33,#04060d)]">
      <div className="size-40 animate-pulse rounded-full bg-sos/30" />
      <div className="glass absolute inset-x-0 bottom-0 h-32 rounded-t-[28px]" />
    </div>
  );
}
