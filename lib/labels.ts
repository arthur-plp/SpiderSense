// French labels and visual tones for the database enums, shared by every UI.

export type Role = "CITIZEN" | "HERO" | "MODERATOR" | "ADMIN";
export type IncidentStatus = "REPORTED" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
export type IncidentPriority = "HIGH" | "NORMAL" | "LOW";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type Civility = "MR" | "MRS" | "OTHER";
export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

export const ROLE_LABELS: Record<Role, string> = {
  CITIZEN: "Citoyen",
  HERO: "Super-héros",
  MODERATOR: "Modérateur",
  ADMIN: "Administrateur",
};

export const CIVILITY_LABELS: Record<Civility, string> = {
  MR: "M.",
  MRS: "Mme",
  OTHER: "Autre",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  REPORTED: "Signalé",
  IN_PROGRESS: "Intervention en cours",
  SUCCEEDED: "Réussi",
  FAILED: "Échoué",
};

export const STATUS_TONES: Record<IncidentStatus, Tone> = {
  REPORTED: "warning",
  IN_PROGRESS: "info",
  SUCCEEDED: "success",
  FAILED: "danger",
};

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  HIGH: "Haute",
  NORMAL: "Normale",
  LOW: "Basse",
};

export const PRIORITY_TONES: Record<IncidentPriority, Tone> = {
  HIGH: "danger",
  NORMAL: "warning",
  LOW: "info",
};

/** Sort order: high priority first, unprioritised incidents just after high. */
export const PRIORITY_RANK: Record<IncidentPriority | "NONE", number> = {
  HIGH: 0,
  NONE: 1,
  NORMAL: 2,
  LOW: 3,
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Validé",
  REJECTED: "Refusé",
};

export const REVIEW_STATUS_TONES: Record<ReviewStatus, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

/** On duty and free, on an intervention, or off duty (see the heroes service). */
export type HeroAvailability = "AVAILABLE" | "BUSY" | "OFF_DUTY";

export const HERO_AVAILABILITY: Record<HeroAvailability, { label: string; tone: Tone }> = {
  AVAILABLE: { label: "Disponible", tone: "success" },
  BUSY: { label: "En intervention", tone: "info" },
  OFF_DUTY: { label: "Hors service", tone: "neutral" },
};

export const VILLAIN_STATUS_LABELS = {
  AT_LARGE: "En liberté",
  IMPRISONED: "Emprisonné",
} as const;

/** Map marker / accent colour per incident status (hex, used outside Tailwind). */
export const STATUS_COLORS: Record<IncidentStatus, string> = {
  REPORTED: "#fbbf24",
  IN_PROGRESS: "#38bdf8",
  SUCCEEDED: "#34d399",
  FAILED: "#fb7185",
};

export const PRIORITY_COLORS: Record<IncidentPriority, string> = {
  HIGH: "#ff3d5a",
  NORMAL: "#fbbf24",
  LOW: "#38bdf8",
};

export const ACTIVITY_LABELS: Record<string, string> = {
  "user.register": "Inscription",
  "user.activate": "Activation du compte",
  "user.login": "Connexion",
  "user.verify": "Citoyen vérifié",
  "user.disable": "Compte désactivé",
  "user.enable": "Compte réactivé",
  "user.role": "Changement de rôle",
  "user.password_reset": "Mot de passe réinitialisé",
  "user.update": "Profil modifié",
  "email.request": "Demande de changement d'email",
  "email.approve": "Changement d'email validé",
  "email.reject": "Changement d'email refusé",
  "hero.apply": "Demande de statut héros",
  "hero.approve": "Héros validé",
  "hero.reject": "Héros refusé",
  "hero.update": "Profil héros modifié",
  "incident.create": "Incident déclaré",
  "incident.update": "Incident modifié",
  "incident.priority": "Priorité définie",
  "incident.take": "Prise en charge",
  "incident.succeed": "Intervention réussie",
  "incident.fail": "Intervention échouée",
  "incident.delete": "Incident supprimé",
  "review.create": "Avis publié",
  "review.reply": "Réponse à un avis",
  "review.hide": "Avis masqué",
  "review.show": "Avis rétabli",
  "movie.request": "Film proposé",
  "movie.approve": "Film validé",
  "movie.reject": "Film refusé",
  "movie.remove": "Film retiré",
  "villain.create": "Vilain ajouté",
  "villain.update": "Vilain modifié",
  "villain.delete": "Vilain supprimé",
  "newsletter.send": "Newsletter envoyée",
  "article.create": "Article créé",
  "article.update": "Article modifié",
  "article.delete": "Article supprimé",
};
