import { ArrowRight, Lock, Newspaper, ShieldCheck, Siren, Sparkles, Star, Zap } from "lucide-react";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { AccountCta, SignUpCta } from "@/components/site/account-cta";
import { ArticleCard } from "@/components/site/article-card";
import { Container } from "@/components/site/container";
import { HeroCard } from "@/components/site/hero-card";
import { HowItWorks } from "@/components/site/how-it-works";
import { SectionHeading } from "@/components/site/section-heading";
import { CardGridSkeleton, Loading, Skeleton } from "@/components/site/skeleton";
import { SosIllustration } from "@/components/site/sos-illustration";
import { StatsStrip, StatsStripSkeleton } from "@/components/site/stats-strip";
import { SuccessCarousel, type SuccessSlide } from "@/components/site/success-carousel";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { listPublishedArticles } from "@/lib/server/services/articles";
import { listHeroes } from "@/lib/server/services/heroes";
import { listRecentSuccesses } from "@/lib/server/services/incidents";
import { getGlobalStats } from "@/lib/server/services/stats";

const sectionLinkClass = "inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300 hover:text-sky-200";

/**
 * Home (5.1). The static shell (hero banner, how it works, headings) renders
 * instantly; every database-backed section streams in behind its skeleton.
 */
export default function HomePage() {
  return (
    <>
      <HomeHero />

      <section aria-labelledby="interventions-titre" className="pt-16 sm:pt-24">
        <Container>
          <Suspense fallback={<CarouselSkeleton />}>
            <RecentSuccesses />
          </Suspense>
        </Container>
      </section>

      <HowItWorks />

      <section aria-labelledby="heros-titre" className="relative">
        <Container>
          <SectionHeading
            id="heros-titre"
            eyebrow="Ils veillent sur Paris"
            title="Des super-héros vérifiés, notés par les citoyens"
            description="Chaque héros est validé par notre équipe de modération avant de pouvoir intervenir. Sa note vient uniquement des citoyens qu'il a aidés."
            action={
              <Link href="/super-heros" className={sectionLinkClass}>
                Tous les super-héros
                <ArrowRight size={16} aria-hidden />
              </Link>
            }
          />
          <ul className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <TrustItem icon={<ShieldCheck size={18} />} text="Identité et pouvoirs vérifiés par la modération" />
            <TrustItem icon={<Star size={18} />} text="Avis laissés uniquement après une intervention" />
            <TrustItem icon={<Lock size={18} />} text="Coordonnées réservées aux membres connectés" />
          </ul>
          <Suspense fallback={<CardGridSkeleton count={3} className="mt-8" />}>
            <FeaturedHeroes />
          </Suspense>
        </Container>
      </section>

      <section aria-labelledby="blog-titre" className="pt-16 sm:pt-24">
        <Container>
          <SectionHeading
            id="blog-titre"
            eyebrow="Le blog"
            title="Actualités et conseils"
            action={
              <Link href="/blog" className={sectionLinkClass}>
                Tous les articles
                <ArrowRight size={16} aria-hidden />
              </Link>
            }
          />
          <Suspense fallback={<CardGridSkeleton count={3} className="mt-8" cardClassName="h-80" />}>
            <LatestArticles />
          </Suspense>
        </Container>
      </section>

      <JoinBand />
    </>
  );
}

function HomeHero() {
  return (
    <section aria-labelledby="accueil-titre" className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(rgb(148_163_184/0.07)_1px,transparent_1px),linear-gradient(90deg,rgb(148_163_184/0.07)_1px,transparent_1px)] bg-size-[56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]"
      />
      <Container className="grid items-center gap-12 pb-12 pt-10 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:pb-16 lg:pt-20">
        <div className="animate-slide-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative size-2 rounded-full bg-emerald-400" />
            </span>
            Des super-héros en service à Paris, jour et nuit
          </p>
          <h1 id="accueil-titre" className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Un super-vilain dans votre rue ?{" "}
            <span className="bg-gradient-to-r from-sos via-rose-400 to-brand bg-clip-text text-transparent">Appuyez sur SOS.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Spider Sense met en relation les citoyens et les super-héros. Déclarez un incident en un geste depuis votre téléphone : les héros
            disponibles sont alertés, l&apos;un d&apos;eux intervient et vous suivez tout en direct.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/citoyen" variant="danger" size="lg">
              <Siren size={18} aria-hidden />
              Signaler un incident
            </LinkButton>
            <Suspense fallback={<SignUpCta />}>
              <AccountCta />
            </Suspense>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <Zap size={16} className="text-brand" aria-hidden />
              Alerte en quelques secondes
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-sky-300" aria-hidden />
              Héros vérifiés
            </li>
            <li className="flex items-center gap-2">
              <Lock size={16} className="text-emerald-300" aria-hidden />
              Données protégées (RGPD)
            </li>
          </ul>
        </div>
        <SosIllustration />
      </Container>
      <Container>
        <Suspense fallback={<StatsStripSkeleton />}>
          <HomeStats />
        </Suspense>
      </Container>
    </section>
  );
}

async function HomeStats() {
  const stats = await getGlobalStats();
  return <StatsStrip interventions={stats.interventions} citizensSaved={stats.citizensSaved} villainsImprisoned={stats.villainsImprisoned} />;
}

const carouselHeading = (
  <SectionHeading
    id="interventions-titre"
    eyebrow="En direct de Paris"
    title="Dernières interventions réussies"
    description="Les derniers incidents résolus par nos super-héros, quartier par quartier."
  />
);

async function RecentSuccesses() {
  const incidents = await listRecentSuccesses(8);
  if (incidents.length === 0) {
    return (
      <>
        {carouselHeading}
        <EmptyState icon={<Sparkles size={28} aria-hidden />} title="Aucune intervention terminée pour l'instant" className="mt-8">
          Les prochaines interventions réussies apparaîtront ici.
        </EmptyState>
      </>
    );
  }
  // Only what the banner shows: no description, address or reporter.
  const slides: SuccessSlide[] = incidents.map((incident) => ({
    id: incident.id,
    typeCode: incident.typeCode,
    typeLabel: incident.typeLabel,
    city: incident.city,
    heroAlias: incident.hero?.alias ?? null,
    villainAlias: incident.villain?.alias ?? null,
    villainImprisoned: incident.villainImprisoned,
    peopleInvolved: incident.peopleInvolved,
    endedAt: incident.interventionEndedAt ?? incident.createdAt,
  }));
  return <SuccessCarousel slides={slides} heading={carouselHeading} />;
}

function CarouselSkeleton() {
  return (
    <>
      {carouselHeading}
      <Loading label="Chargement des interventions…" className="mt-8 flex gap-4 overflow-hidden">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-48 w-[85%] shrink-0 sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]" rounded="rounded-3xl" />
        ))}
      </Loading>
    </>
  );
}

function TrustItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/7 bg-white/3 px-4 py-3">
      <span aria-hidden className="text-sky-300">
        {icon}
      </span>
      {text}
    </li>
  );
}

async function FeaturedHeroes() {
  const heroes = await listHeroes();
  if (heroes.length === 0) {
    return (
      <EmptyState icon={<ShieldCheck size={28} aria-hidden />} title="Aucun super-héros validé pour le moment" className="mt-8">
        Les premiers héros apparaîtront ici dès leur validation.
      </EmptyState>
    );
  }
  const featured = [...heroes]
    .sort((a, b) => b.interventions - a.interventions || (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);
  return (
    <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {featured.map((hero) => (
        <li key={hero.id} className="flex">
          <HeroCard hero={hero} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

async function LatestArticles() {
  const articles = await listPublishedArticles(3);
  if (articles.length === 0) {
    return (
      <EmptyState icon={<Newspaper size={28} aria-hidden />} title="Aucun article publié" className="mt-8">
        Revenez bientôt pour nos premières actualités.
      </EmptyState>
    );
  }
  return (
    <ul className="mt-8 grid gap-5 md:grid-cols-3">
      {articles.map((article) => (
        <li key={article.id} className="flex">
          <ArticleCard article={article} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

function JoinBand() {
  return (
    <section aria-labelledby="rejoindre-titre" className="pt-20 sm:pt-28">
      <Container>
        <div className="relative isolate overflow-hidden rounded-4xl border border-sky-300/20 bg-gradient-to-br from-sky-500/20 via-indigo-600/15 to-sos/20 px-6 py-12 text-center sm:px-12 sm:py-16">
          <div aria-hidden className="absolute left-1/2 top-0 -z-10 h-64 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/25 blur-3xl" />
          <h2 id="rejoindre-titre" className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
            Citoyen ou super-héros, rejoignez le réseau
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            L&apos;inscription est la même pour tous : créez votre compte, activez-le depuis l&apos;email reçu, puis donnez l&apos;alerte en un
            geste. Vous avez des super-pouvoirs ? Demandez votre statut de héros depuis votre compte.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Suspense fallback={<SignUpCta variant="primary" />}>
              <AccountCta variant="primary" />
            </Suspense>
            <LinkButton href="/super-heros" variant="glass" size="lg">
              <ShieldCheck size={18} aria-hidden />
              Découvrir les héros
            </LinkButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
