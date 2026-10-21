import {
  Bomb,
  Crosshair,
  Footprints,
  Ghost,
  HandHelping,
  Lock,
  type LucideIcon,
  ShieldAlert,
  Skull,
  Sparkles,
} from "lucide-react";
import { createElement } from "react";
import { cn } from "./cn";

const ICONS: Record<string, LucideIcon> = {
  THEFT: HandHelping,
  BURGLARY: Lock,
  MURDER: Skull,
  ATTEMPTED_MURDER: Crosshair,
  TERROR_ATTACK: Bomb,
  HOSTAGE_TAKING: ShieldAlert,
  KIDNAPPING: Ghost,
  ATTEMPTED_KIDNAPPING: Footprints,
  OTHER: Sparkles,
};

export function incidentIcon(code: string): LucideIcon {
  return ICONS[code] ?? Sparkles;
}

export function IncidentIcon({ code, className, size = 18 }: { code: string; className?: string; size?: number }) {
  return createElement(incidentIcon(code), { size, className: cn("shrink-0", className), "aria-hidden": true });
}
