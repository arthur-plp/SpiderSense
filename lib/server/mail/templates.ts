import "server-only";
import { PRIORITY_LABELS, STATUS_LABELS, type IncidentPriority } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export type MailContent = { subject: string; html: string; text: string };

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type Layout = {
  subject: string;
  title: string;
  /** Plain-text paragraphs, escaped before rendering. */
  paragraphs: string[];
  details?: [string, string][];
  cta?: { label: string; url: string };
  /** Trusted HTML (sanitized newsletter content). */
  rawHtml?: string;
  footer?: string;
};

function render({ subject, title, paragraphs, details, cta, rawHtml, footer }: Layout): MailContent {
  const detailRows = (details ?? [])
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#94a3b8;font-size:13px;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#04060d;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#04060d;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b1222;border:1px solid #1e2b45;border-radius:18px;overflow:hidden">
<tr><td style="padding:22px 28px;background:linear-gradient(135deg,#0c1f3f,#0b1222);border-bottom:1px solid #1e2b45">
<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#ff3d5a;color:#fff;font-weight:700;font-size:12px;letter-spacing:.08em">SOS</span>
<span style="color:#f8fafc;font-weight:700;font-size:18px;margin-left:8px">Heros-SOS</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;color:#f8fafc;font-size:22px;line-height:1.3">${escapeHtml(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.6">${escapeHtml(p)}</p>`).join("")}
${detailRows ? `<table role="presentation" style="margin:8px 0 18px;border-top:1px solid #1e2b45;padding-top:8px">${detailRows}</table>` : ""}
${rawHtml ? `<div style="color:#cbd5e1;font-size:15px;line-height:1.6">${rawHtml}</div>` : ""}
${cta ? `<p style="margin:22px 0 6px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#38bdf8;color:#04121f;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${escapeHtml(cta.label)}</a></p><p style="margin:10px 0 0;color:#64748b;font-size:12px;word-break:break-all">${escapeHtml(cta.url)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #1e2b45;color:#64748b;font-size:12px;line-height:1.5">${escapeHtml(footer ?? "Heros-SOS — la plateforme qui rapproche citoyens et super-héros. Cet email vous a été envoyé automatiquement.")}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    title,
    "",
    ...paragraphs,
    ...(details ?? []).map(([label, value]) => `${label} : ${value}`),
    ...(rawHtml ? ["", rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()] : []),
    ...(cta ? ["", `${cta.label} : ${cta.url}`] : []),
    "",
    footer ?? "Heros-SOS",
  ].join("\n");
  return { subject, html, text };
}

export type IncidentMailInfo = {
  typeLabel: string;
  city: string;
  street: string | null;
  occurredAt: Date;
  priority: IncidentPriority | null;
  description: string;
  peopleInvolved: number;
};

const incidentDetails = (incident: IncidentMailInfo): [string, string][] => [
  ["Type", incident.typeLabel],
  ["Lieu", [incident.street, incident.city].filter(Boolean).join(", ")],
  ["Date", formatDateTime(incident.occurredAt)],
  ["Priorité", incident.priority ? PRIORITY_LABELS[incident.priority] : "À définir"],
  ["Personnes impliquées", String(incident.peopleInvolved)],
];

export const mailTemplates = {
  activation: (firstName: string, url: string) =>
    render({
      subject: "Activez votre compte Heros-SOS",
      title: `Bienvenue ${firstName} !`,
      paragraphs: [
        "Votre inscription sur Heros-SOS est presque terminée.",
        "Cliquez sur le bouton ci-dessous pour activer votre compte. Le lien est valable 7 jours.",
      ],
      cta: { label: "Activer mon compte", url },
    }),

  moderatorsNewUser: (user: { firstName: string; lastName: string; email: string; city: string }, url: string) =>
    render({
      subject: `Nouvelle inscription : ${user.firstName} ${user.lastName}`,
      title: "Un nouveau citoyen s'est inscrit",
      paragraphs: ["Vous pouvez vérifier son compte et lui attribuer le statut « Citoyen vérifié » depuis le dashboard."],
      details: [
        ["Nom", `${user.firstName} ${user.lastName}`],
        ["Email", user.email],
        ["Ville", user.city],
      ],
      cta: { label: "Ouvrir le dashboard", url },
    }),

  passwordReset: (firstName: string, url: string) =>
    render({
      subject: "Réinitialisation de votre mot de passe",
      title: `Bonjour ${firstName},`,
      paragraphs: [
        "Vous avez demandé à réinitialiser votre mot de passe Heros-SOS.",
        "Ce lien est valable une heure. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.",
      ],
      cta: { label: "Choisir un nouveau mot de passe", url },
    }),

  incidentReported: (incident: IncidentMailInfo, url: string) =>
    render({
      subject: `🚨 Nouvel incident : ${incident.typeLabel} à ${incident.city}`,
      title: "Un citoyen vient de signaler un incident",
      paragraphs: [incident.description],
      details: incidentDetails(incident),
      cta: { label: "Voir l'incident", url },
    }),

  incidentModerated: (firstName: string, incident: IncidentMailInfo, deleted: boolean, reason: string | null, url: string) =>
    render({
      subject: deleted ? "Votre signalement a été retiré" : "Votre signalement a été mis à jour",
      title: `Bonjour ${firstName},`,
      paragraphs: deleted
        ? [
            `Un modérateur a retiré votre signalement « ${incident.typeLabel} » à ${incident.city}.`,
            reason ? `Motif : ${reason}.` : "Il s'agissait probablement d'un doublon d'un incident déjà déclaré au même endroit.",
          ]
        : [
            `Un modérateur a vérifié et mis à jour votre signalement « ${incident.typeLabel} » à ${incident.city}.`,
            "Les super-héros disposent maintenant d'informations fiables pour intervenir.",
          ],
      details: deleted ? undefined : incidentDetails(incident),
      cta: deleted ? undefined : { label: "Voir mon signalement", url },
    }),

  incidentTaken: (heroAlias: string, incident: IncidentMailInfo, url: string) =>
    render({
      subject: `${heroAlias} prend en charge : ${incident.typeLabel} à ${incident.city}`,
      title: "La situation est prise en charge",
      paragraphs: [`${heroAlias} intervient sur l'incident.`],
      details: incidentDetails(incident),
      cta: { label: "Suivre l'intervention", url },
    }),

  incidentClosed: (heroAlias: string, incident: IncidentMailInfo, succeeded: boolean, villainImprisoned: boolean, url: string) =>
    render({
      subject: `${succeeded ? "✅ Intervention réussie" : "❌ Intervention échouée"} — ${incident.typeLabel} à ${incident.city}`,
      title: succeeded ? "Incident résolu" : "L'intervention a échoué",
      paragraphs: [
        `${heroAlias} a terminé son intervention : ${STATUS_LABELS[succeeded ? "SUCCEEDED" : "FAILED"].toLowerCase()}.`,
        ...(villainImprisoned ? ["Le super-vilain a été mis en prison."] : []),
      ],
      details: incidentDetails(incident),
      cta: { label: "Voir l'incident", url },
    }),

  rateHero: (firstName: string, heroAlias: string, succeeded: boolean, url: string) =>
    render({
      subject: `Comment s'est passée l'intervention de ${heroAlias} ?`,
      title: `Bonjour ${firstName},`,
      paragraphs: [
        succeeded
          ? `${heroAlias} est intervenu sur l'incident que vous avez signalé et la situation est résolue.`
          : `${heroAlias} est intervenu sur l'incident que vous avez signalé, malheureusement sans succès.`,
        "Votre avis compte : prenez une minute pour noter le super-héros. Votre note et votre commentaire apparaîtront sur sa page de réputation.",
      ],
      cta: { label: "Noter le super-héros", url },
    }),

  newsletterWelcome: (unsubscribeUrl: string) =>
    render({
      subject: "Inscription à la newsletter Heros-SOS confirmée",
      title: "Merci pour votre inscription !",
      paragraphs: [
        "Vous recevrez chaque mois les statistiques des incidents, le bilan des interventions et nos articles.",
        "Vous pouvez vous désinscrire à tout moment.",
      ],
      cta: { label: "Me désinscrire", url: unsubscribeUrl },
    }),

  newsletter: (subject: string, contentHtml: string, unsubscribeUrl: string) =>
    render({
      subject,
      title: subject,
      paragraphs: [],
      rawHtml: contentHtml,
      footer: `Vous recevez cet email car vous êtes inscrit à la newsletter Heros-SOS. Se désinscrire : ${unsubscribeUrl}`,
    }),

  heroApplicationReceived: (alias: string, applicant: string, url: string) =>
    render({
      subject: `Demande de statut super-héros : ${alias}`,
      title: "Nouvelle demande de super-héros",
      paragraphs: [`${applicant} demande à être reconnu comme super-héros sous le nom « ${alias} ».`],
      cta: { label: "Examiner la demande", url },
    }),

  heroApplicationDecision: (firstName: string, alias: string, approved: boolean, url: string) =>
    render({
      subject: approved ? `Bienvenue parmi les héros, ${alias} !` : "Votre demande de statut super-héros",
      title: `Bonjour ${firstName},`,
      paragraphs: approved
        ? [
            `L'administration a validé votre statut de super-héros sous le nom « ${alias} ».`,
            "Votre espace professionnel est désormais accessible : vous pouvez consulter les incidents et intervenir.",
          ]
        : ["Après examen, l'administration n'a pas pu valider votre demande de statut super-héros.", "Vous pouvez compléter votre profil et refaire une demande."],
      cta: { label: approved ? "Ouvrir mon espace professionnel" : "Mon compte", url },
    }),

  movieDecision: (alias: string, title: string, approved: boolean, url: string) =>
    render({
      subject: approved ? `« ${title} » ajouté à votre vidéothèque` : `« ${title} » n'a pas été validé`,
      title: `Bonjour ${alias},`,
      paragraphs: [
        approved
          ? `Un modérateur a validé le film « ${title} ». Il apparaît maintenant dans votre vidéothèque.`
          : `Un modérateur n'a pas validé le film « ${title} » pour votre vidéothèque.`,
      ],
      cta: { label: "Mes films", url },
    }),

  emailChangeDecision: (firstName: string, newEmail: string, approved: boolean) =>
    render({
      subject: approved ? "Votre adresse email a été modifiée" : "Votre demande de changement d'email",
      title: `Bonjour ${firstName},`,
      paragraphs: [
        approved
          ? `Votre adresse email est désormais ${newEmail}. Utilisez-la pour vous connecter.`
          : `La modération n'a pas validé le changement vers ${newEmail}. Votre adresse actuelle reste inchangée.`,
      ],
    }),
};
