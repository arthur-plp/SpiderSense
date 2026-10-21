import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/site/container";
import { PageHeader } from "@/components/ui/panel";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Comment Heros-SOS traite vos données personnelles (RGPD) : données collectées, finalités, durées de conservation et droits.",
};

const SECTIONS = [
  { id: "donnees", title: "Données collectées" },
  { id: "finalites", title: "Pourquoi nous les utilisons" },
  { id: "destinataires", title: "Qui y a accès" },
  { id: "conservation", title: "Durées de conservation" },
  { id: "newsletter", title: "Newsletter" },
  { id: "cookies", title: "Cookies" },
  { id: "droits", title: "Vos droits" },
];

/** Short GDPR notice, linked from the sign-up consent and the footer. */
export default function PrivacyPage() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="RGPD"
          title="Politique de confidentialité"
          description="Heros-SOS ne collecte que ce qui est nécessaire pour mettre en relation citoyens et super-héros. Voici, simplement, ce que nous faisons de vos données."
        />

        <nav aria-label="Sommaire" className="glass mb-10 rounded-3xl p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Sommaire</p>
          <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-sky-300 hover:text-sky-200 hover:underline">
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="prose-hero [&_h2]:scroll-mt-24">
          <p>
            Le responsable du traitement est l&apos;équipe Heros-SOS. Pour toute question, écrivez à{" "}
            <a href="mailto:dpo@heros-sos.test">dpo@heros-sos.test</a>.
          </p>

          <h2 id="donnees">1. Données collectées</h2>
          <ul>
            <li>
              <strong>Compte</strong> : civilité, nom, prénom, date de naissance, adresse email, téléphone mobile et adresse postale, mot de
              passe (stocké uniquement sous forme chiffrée), photo de profil facultative.
            </li>
            <li>
              <strong>Super-héros</strong> : alias, pouvoirs, biographie et, pendant le service, la dernière position connue.
            </li>
            <li>
              <strong>Signalements</strong> : type d&apos;incident, description, lieu et position, date, nombre de personnes impliquées.
            </li>
            <li>
              <strong>Avis</strong> : note et commentaire laissés après une intervention.
            </li>
            <li>
              <strong>Données techniques</strong> : sessions de connexion (adresse IP, navigateur) et journal des actions, pour la sécurité et
              la modération.
            </li>
          </ul>

          <h2 id="finalites">2. Pourquoi nous les utilisons</h2>
          <p>
            Pour gérer votre compte, transmettre vos signalements aux super-héros et aux modérateurs, suivre les interventions, publier la
            réputation des héros, établir des statistiques anonymes et, si vous le souhaitez, vous envoyer la newsletter. Le traitement repose
            sur votre consentement donné à l&apos;inscription et sur la nécessité de fournir le service.
          </p>

          <h2 id="destinataires">3. Qui y a accès</h2>
          <p>
            Les modérateurs et administrateurs de la plateforme. Les super-héros voient les signalements et les coordonnées du citoyen
            concerné le temps de l&apos;intervention. Les coordonnées des héros ne sont visibles que par les membres connectés. Aucune donnée
            n&apos;est vendue ni cédée à des tiers.
          </p>

          <h2 id="conservation">4. Durées de conservation</h2>
          <ul>
            <li>Compte : tant qu&apos;il est actif, puis suppression sur simple demande.</li>
            <li>Sessions de connexion : 30 jours maximum.</li>
            <li>Liens d&apos;activation : 7 jours ; liens de réinitialisation du mot de passe : 1 heure.</li>
            <li>
              Signalements : conservés pour l&apos;historique et les statistiques ; si votre compte est supprimé, ils sont détachés de votre
              identité.
            </li>
            <li>Newsletter : jusqu&apos;à votre désinscription.</li>
          </ul>

          <h2 id="newsletter">5. Newsletter</h2>
          <p>
            L&apos;inscription se fait avec votre seule adresse email. Chaque envoi contient un lien de désinscription : une confirmation suffit
            et votre adresse est alors <strong>supprimée</strong> de nos fichiers, pas seulement désactivée. Les membres connectés gèrent
            aussi leur abonnement depuis « Mon compte ».
          </p>

          <h2 id="cookies">6. Cookies</h2>
          <p>
            Nous n&apos;utilisons aucun traceur publicitaire ni outil de mesure d&apos;audience tiers. Deux cookies strictement nécessaires
            sont déposés : le cookie de session, quand vous êtes connecté(e), et un cookie qui retient votre inscription à la newsletter
            (1 an) pour ne plus vous afficher le formulaire.
          </p>

          <h2 id="droits">7. Vos droits</h2>
          <p>
            Vous pouvez accéder à vos données, les rectifier, les faire effacer, en demander la portabilité ou vous opposer à leur traitement.
            La plupart des informations se modifient directement depuis « Mon compte » ; un changement d&apos;adresse email est validé par un
            modérateur. Pour toute autre demande, écrivez à <a href="mailto:dpo@heros-sos.test">dpo@heros-sos.test</a>. Vous pouvez aussi
            saisir la <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">CNIL</a>.
          </p>
        </div>

        <p className="mt-12 text-sm text-slate-500">
          Une question sur la plateforme ? Consultez le <Link href="/blog" className="text-sky-300 hover:underline">blog</Link> ou revenez à
          l&apos;<Link href="/" className="text-sky-300 hover:underline">accueil</Link>.
        </p>
      </div>
    </Container>
  );
}
