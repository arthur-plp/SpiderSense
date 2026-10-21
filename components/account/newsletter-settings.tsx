import { BellOff, BellRing, Mail } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { setNewsletterEnabledAction, subscribeMeAction, unsubscribeMeAction } from "@/lib/actions/account";

/** 4.2: subscribe with the account email, pause, or unsubscribe. */
export function NewsletterSettings({ subscription }: { subscription: { isEnabled: boolean } | null }) {
  if (!subscription) {
    return (
      <div className="flex flex-col gap-3 text-sm text-slate-300">
        <p>Recevez chaque mois les statistiques des incidents, le bilan des interventions et nos articles.</p>
        <form action={subscribeMeAction}>
          <SubmitButton size="sm" pendingLabel="Inscription…">
            <Mail className="size-4" aria-hidden /> M&apos;inscrire avec mon adresse email
          </SubmitButton>
        </form>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="flex items-center gap-2 text-slate-200">
        {subscription.isEnabled ? <BellRing className="size-4 text-emerald-300" aria-hidden /> : <BellOff className="size-4 text-slate-400" aria-hidden />}
        {subscription.isEnabled ? "Vous recevez la newsletter." : "Réception de la newsletter désactivée."}
      </p>
      <div className="flex flex-wrap gap-2">
        <form action={setNewsletterEnabledAction.bind(null, !subscription.isEnabled)}>
          <SubmitButton variant="secondary" size="sm">
            {subscription.isEnabled ? "Désactiver la réception" : "Réactiver la réception"}
          </SubmitButton>
        </form>
        <form action={unsubscribeMeAction}>
          <SubmitButton variant="ghost" size="sm" className="text-rose-300 hover:text-rose-200">
            Me désinscrire
          </SubmitButton>
        </form>
      </div>
      <p className="text-xs text-slate-500">La désinscription supprime votre adresse de la liste de diffusion.</p>
    </div>
  );
}
