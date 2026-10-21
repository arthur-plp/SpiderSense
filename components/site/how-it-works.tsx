import { BellRing, type LucideIcon, Siren, Star } from "lucide-react";
import { Container } from "./container";
import { SectionHeading } from "./section-heading";

const STEPS: { title: string; text: string; icon: LucideIcon; tone: string }[] = [
  {
    title: "Signalez avec le buzzer",
    text: "Un appui sur le gros bouton SOS de l'application : type d'incident, position et quelques mots suffisent. L'alerte part en quelques secondes.",
    icon: Siren,
    tone: "bg-sos/15 text-rose-200 ring-sos/30",
  },
  {
    title: "Les héros sont alertés",
    text: "Les super-héros en service et les modérateurs sont prévenus immédiatement. Le héros le plus proche prend l'intervention en charge.",
    icon: BellRing,
    tone: "bg-sky-400/15 text-sky-200 ring-sky-300/30",
  },
  {
    title: "Suivez, puis notez",
    text: "Suivez l'intervention en direct sur la carte. Une fois l'incident clos, notez le héros : votre avis construit sa réputation.",
    icon: Star,
    tone: "bg-brand/15 text-amber-200 ring-brand/30",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="comment-ca-marche" className="py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="comment-ca-marche"
          eyebrow="Comment ça marche"
          title="Trois étapes, zéro panique"
          description="Citoyens et super-héros utilisent la même plateforme : l'application mobile pour donner l'alerte, le centre de commande pour intervenir."
          align="center"
        />
        <ol className="relative mt-12 grid gap-5 md:grid-cols-3">
          <span aria-hidden className="absolute left-[16%] right-[16%] top-12 hidden border-t border-dashed border-sky-300/20 md:block" />
          {STEPS.map(({ title, text, icon: Icon, tone }, index) => (
            <li key={title} className="glass relative rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <span className={`grid size-12 place-items-center rounded-2xl ring-1 ${tone}`}>
                  <Icon size={22} aria-hidden />
                </span>
                <span aria-hidden className="text-5xl font-black tabular-nums text-white/7">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">
                <span className="sr-only">Étape {index + 1} : </span>
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
