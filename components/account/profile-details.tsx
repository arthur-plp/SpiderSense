import { Badge } from "@/components/ui/badge";
import { formatDate, fullName } from "@/lib/format";
import { CIVILITY_LABELS, type Civility, ROLE_LABELS, type Role } from "@/lib/labels";

export type ProfileInfo = {
  civility: Civility;
  firstName: string;
  lastName: string;
  alias: string | null;
  birthDate: string;
  email: string;
  createdAt: Date;
  emailVerifiedAt: Date | null;
  verifiedAt: Date | null;
  street: string;
  addressComplement: string | null;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  role: Role;
};

/** Read-only profile, as listed in section 5.7 of the specification. */
export function ProfileDetails({ profile }: { profile: ProfileInfo }) {
  const rows: [string, React.ReactNode][] = [
    ["Nom - Prénom", `${CIVILITY_LABELS[profile.civility]} ${fullName(profile)}`],
    ...(profile.alias ? ([["Pseudo de super-héros", profile.alias]] as [string, string][]) : []),
    ["Date de naissance", formatDate(`${profile.birthDate}T12:00:00Z`)],
    ["Adresse email", profile.email],
    ["Numéro de portable", profile.phone],
    [
      "Adresse postale",
      <span key="address">
        {profile.street}
        {profile.addressComplement && (
          <>
            <br />
            {profile.addressComplement}
          </>
        )}
        <br />
        {profile.postalCode} {profile.city}, {profile.country}
      </span>,
    ],
    ["Rôle", <Badge key="role" tone={profile.role === "CITIZEN" ? "neutral" : "info"}>{ROLE_LABELS[profile.role]}</Badge>],
    ["Compte créé le", formatDate(profile.createdAt)],
    ["Actif depuis le", profile.emailVerifiedAt ? formatDate(profile.emailVerifiedAt) : "Compte non activé"],
    [
      "Vérification",
      profile.verifiedAt ? (
        <Badge key="verified" tone="success">Vérifié le {formatDate(profile.verifiedAt)}</Badge>
      ) : (
        <Badge key="verified" tone="neutral">En attente de vérification</Badge>
      ),
    ],
  ];
  return (
    <dl className="divide-y divide-white/6">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-1 gap-0.5 py-2.5 sm:grid-cols-[180px_1fr] sm:gap-4">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 sm:pt-0.5">{label}</dt>
          <dd className="text-sm text-slate-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
