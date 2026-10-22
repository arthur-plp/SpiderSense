"use client";

import { CircleCheck, LoaderCircle, MapPin, Minus, Plus, TriangleAlert, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { RelativeTime } from "@/components/ui/relative-time";
import { apiRequest, formDataToBody } from "@/lib/api-client";
import { formatDistance, type LatLng } from "@/lib/geo";
import type { IncidentDto } from "@/lib/server/services/incidents";

export type IncidentTypeOption = { id: number; code: string; label: string };
type Address = { street: string | null; postalCode: string | null; city: string | null; country: string | null };

type SosDialogProps = {
  open: boolean;
  onClose: () => void;
  onSent: (incidentId: string) => void;
  types: IncidentTypeOption[];
  position: LatLng | null;
  precise: boolean;
  /** Profile address, used when the device position can't be resolved. */
  fallbackAddress: Address;
};

type SosSent = { incidentId: string; heroesAvailable: number };
type Nearby = IncidentDto & { distance: number };

type Step =
  | { name: "form" }
  | { name: "sending" }
  | { name: "sent"; result: SosSent }
  | { name: "queued" }
  | { name: "error"; message: string };

/** Confirmation step of the buzzer: what, how many people, where — then send. */
export function SosDialog({ open, onClose, onSent, types, position, precise, fallbackAddress }: SosDialogProps) {
  const [step, setStep] = useState<Step>({ name: "form" });
  const [typeId, setTypeId] = useState<number | null>(null);
  const [people, setPeople] = useState(1);
  const [details, setDetails] = useState("");
  const [villain, setVillain] = useState("");
  const [address, setAddress] = useState<Address | null>(null);
  const [nearby, setNearby] = useState<Nearby[]>([]);
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const positionKey = position ? `${position.lat.toFixed(4)},${position.lng.toFixed(4)}` : null;

  // Resolve the address and look for duplicates around the citizen.
  useEffect(() => {
    if (!open || !position) return;
    let cancelled = false;
    fetch(`/api/geocode/reverse?lat=${position.lat}&lng=${position.lng}`)
      .then((response) => response.json() as Promise<{ address: Address | null }>)
      .then((body) => !cancelled && setAddress(body.address))
      .catch(() => undefined);
    apiRequest<{ incidents: Nearby[] }>("GET", `/api/incidents/nearby?lat=${position.lat}&lng=${position.lng}`).then(
      (result) => !cancelled && result.ok && !result.queued && setNearby(result.data.incidents),
    );
    return () => {
      cancelled = true;
    };
    // Re-run only when the rounded position changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, positionKey]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const where = address?.city ? address : fallbackAddress;
  const selectedType = types.find((type) => type.id === typeId);

  const send = async () => {
    if (!selectedType) return;
    setStep({ name: "sending" });
    const data = new FormData();
    data.set("typeId", String(selectedType.id));
    data.set("peopleInvolved", String(people));
    data.set(
      "description",
      details.trim().length >= 10 ? details.trim() : `Alerte SOS lancée depuis le buzzer : ${selectedType.label.toLowerCase()}. ${details.trim()}`.trim(),
    );
    data.set("reportedVillainName", villain.trim());
    if (position) {
      data.set("latitude", String(position.lat));
      data.set("longitude", String(position.lng));
    }
    data.set("street", where.street ?? "");
    data.set("postalCode", where.postalCode ?? "");
    data.set("city", where.city ?? "");
    data.set("country", where.country ?? "France");
    const result = await apiRequest<{ id: string; heroesAvailable: number }>("POST", "/api/incidents", formDataToBody(data), {
      offline: `Alerte SOS : ${selectedType.label}`,
    });
    if (result.ok && result.queued) {
      navigator.vibrate?.([80, 40, 80]);
      setStep({ name: "queued" });
    } else if (result.ok) {
      navigator.vibrate?.([80, 40, 80]);
      setStep({ name: "sent", result: { incidentId: result.data.id, heroesAvailable: result.data.heroesAvailable } });
      onSent(result.data.id);
      router.refresh();
    } else if (result.status === 0) {
      setStep({ name: "error", message: "Connexion impossible. Si le danger est immédiat, appelez le 112." });
    } else {
      setStep({ name: "error", message: result.status === 400 ? "Alerte incomplète : vérifiez le type et le lieu." : result.error });
    }
  };

  const close = () => {
    onClose();
    // Reset for the next alert once the closing animation is over.
    setTimeout(() => {
      setStep({ name: "form" });
      setTypeId(null);
      setPeople(1);
      setDetails("");
      setVillain("");
    }, 200);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-ink-950/70 backdrop-blur-sm animate-fade-in" onClick={(event) => event.target === event.currentTarget && step.name !== "sending" && close()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-title"
        className="glass glass-strong max-h-[92%] w-full overflow-y-auto rounded-t-[28px] p-5 pb-8 animate-slide-up"
      >
        {step.name === "queued" ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-amber-300/15 text-amber-200 ring-1 ring-amber-200/40">
              <WifiOff className="size-10" aria-hidden />
            </span>
            <h2 id="sos-title" className="mt-4 text-xl font-bold text-white">Alerte enregistrée</h2>
            <p className="mt-2 text-sm text-slate-300">
              Pas de réseau pour le moment : votre alerte est gardée sur le téléphone et partira automatiquement dès le retour
              de la connexion, avec l&apos;heure à laquelle vous l&apos;avez lancée.
            </p>
            <p className="mt-1 text-xs text-slate-500">En cas d&apos;urgence vitale, appelez le 112 : les appels d&apos;urgence passent même sans réseau mobile.</p>
            <Button variant="ghost" className="mt-6 w-full" onClick={close} data-autofocus>
              Fermer
            </Button>
          </div>
        ) : step.name === "sent" ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/40">
              <CircleCheck className="size-11" aria-hidden />
            </span>
            <h2 id="sos-title" className="mt-4 text-xl font-bold text-white">Alerte envoyée !</h2>
            <p className="mt-2 text-sm text-slate-300">
              {step.result.heroesAvailable > 0
                ? `${step.result.heroesAvailable} super-héros en service ont été prévenus, ainsi que les modérateurs.`
                : "Les modérateurs ont été prévenus. Aucun héros n'est en service pour le moment."}
            </p>
            <p className="mt-1 text-xs text-slate-500">Mettez-vous en sécurité. En cas d&apos;urgence vitale, appelez aussi le 112.</p>
            <div className="mt-6 flex w-full flex-col gap-2">
              <LinkButton href={`/citoyen/incidents/${step.result.incidentId}`} size="lg" data-autofocus>
                Suivre l&apos;intervention
              </LinkButton>
              <Button variant="ghost" onClick={close}>
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sos">Confirmation</p>
                <h2 id="sos-title" className="text-xl font-bold text-white">Que se passe-t-il ?</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={close} aria-label="Annuler l'alerte" disabled={step.name === "sending"}>
                <X className="size-5" />
              </Button>
            </div>

            <fieldset className="mt-4">
              <legend className="sr-only">Type d&apos;incident</legend>
              <div className="grid grid-cols-3 gap-2">
                {types.map((type, index) => (
                  <label
                    key={type.id}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl bg-white/5 px-1 py-3 text-center text-[11px] font-semibold leading-tight text-slate-300 ring-1 ring-inset ring-white/10 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-400",
                      typeId === type.id && "bg-sos/20 text-white ring-sos/70",
                    )}
                  >
                    <input type="radio" name="sos-type" value={type.id} checked={typeId === type.id} onChange={() => setTypeId(type.id)} className="sr-only" data-autofocus={index === 0 ? true : undefined} />
                    <IncidentIcon code={type.code} size={20} className={typeId === type.id ? "text-rose-200" : "text-slate-400"} />
                    {type.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-inset ring-white/10">
              <span id="people-label" className="text-sm text-slate-200">Personnes en danger</span>
              <div className="flex items-center gap-3" role="group" aria-labelledby="people-label">
                <Button variant="secondary" size="icon" className="size-9 rounded-full" onClick={() => setPeople((value) => Math.max(0, value - 1))} aria-label="Une personne de moins">
                  <Minus className="size-4" />
                </Button>
                <output className="w-8 text-center text-lg font-bold text-white" aria-live="polite">{people}</output>
                <Button variant="secondary" size="icon" className="size-9 rounded-full" onClick={() => setPeople((value) => Math.min(999, value + 1))} aria-label="Une personne de plus">
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <label className="mt-3 block">
              <span className="sr-only">Détails (facultatif)</span>
              <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={2} maxLength={2000} placeholder="Détails utiles (facultatif) : description, direction prise…" className="field resize-none text-sm" />
            </label>
            <label className="mt-2 block">
              <span className="sr-only">Super-vilain aperçu (facultatif)</span>
              <input value={villain} onChange={(event) => setVillain(event.target.value)} maxLength={100} placeholder="Super-vilain aperçu (facultatif)" className="field text-sm" />
            </label>

            <p className="mt-3 flex items-start gap-2 text-xs text-slate-400">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-sky-300" aria-hidden />
              <span>
                {[where.street, where.postalCode, where.city].filter(Boolean).join(", ") || "Adresse inconnue"}
                <span className="block text-slate-500">
                  {position ? (precise ? "Position GPS de votre téléphone" : "Position approximative") : "Position du téléphone indisponible : adresse de votre profil"}
                </span>
              </span>
            </p>

            {nearby.length > 0 && (
              <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/8 p-3 text-xs text-amber-100">
                <p className="flex items-center gap-1.5 font-semibold">
                  <TriangleAlert className="size-4" aria-hidden />
                  {nearby.length} incident(s) déjà signalé(s) à proximité
                </p>
                <ul className="mt-2 space-y-1">
                  {nearby.slice(0, 3).map((incident) => (
                    <li key={incident.id}>
                      <Link href={`/citoyen/incidents/${incident.id}`} className="underline decoration-amber-200/40 underline-offset-2">
                        {incident.typeLabel} à {formatDistance(incident.distance)}
                      </Link>{" "}
                      · <RelativeTime value={incident.createdAt} />
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-amber-200/70">S&apos;il s&apos;agit du même incident, inutile de le signaler à nouveau.</p>
              </div>
            )}

            {step.name === "error" && (
              <p role="alert" className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {step.message}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <Button variant="danger" size="lg" className="h-14 text-base" disabled={!selectedType || step.name === "sending"} onClick={() => void send()}>
                {step.name === "sending" ? (
                  <>
                    <LoaderCircle className="size-5 animate-spin" aria-hidden /> Envoi de l&apos;alerte…
                  </>
                ) : selectedType ? (
                  `Envoyer l'alerte : ${selectedType.label}`
                ) : (
                  "Choisissez le type d'incident"
                )}
              </Button>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={close} disabled={step.name === "sending"}>
                  Annuler
                </Button>
                <Link href="/citoyen/incidents/nouveau" className="text-xs font-semibold text-sky-300">
                  Formulaire détaillé →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
