import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type Role, type Tone } from "@/lib/labels";

const ROLE_TONES: Record<Role, Tone> = {
  CITIZEN: "neutral",
  HERO: "brand",
  MODERATOR: "info",
  ADMIN: "danger",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Badge>;
}

/** Account state: disabled, not activated yet, verified citizen. */
export function AccountBadges({
  disabledAt,
  emailVerifiedAt,
  verifiedAt,
}: {
  disabledAt: string | Date | null;
  emailVerifiedAt: string | Date | null;
  verifiedAt: string | Date | null;
}) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {disabledAt && (
        <Badge tone="danger" dot>
          Désactivé
        </Badge>
      )}
      {!emailVerifiedAt && <Badge tone="warning">Non activé</Badge>}
      {verifiedAt && (
        <Badge tone="success">
          <BadgeCheck className="size-3" aria-hidden />
          Citoyen vérifié
        </Badge>
      )}
      {!disabledAt && emailVerifiedAt && !verifiedAt && <Badge tone="neutral">Actif</Badge>}
    </span>
  );
}
