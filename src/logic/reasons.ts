import type { LucideIcon } from "lucide-react";
import {
  CloudLightning,
  Waves,
  Users,
  Coffee,
  Hourglass,
  Flame,
  Target,
  PartyPopper,
  CircleHelp,
} from "lucide-react";

export interface SmokeReasonDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const SMOKE_REASONS: SmokeReasonDef[] = [
  { id: "stres", label: "Stres", icon: CloudLightning },
  { id: "keyif", label: "Keyif / Rahatlama", icon: Waves },
  { id: "sosyal", label: "Sosyal", icon: Users },
  { id: "aliskanlik", label: "Alışkanlık", icon: Coffee },
  { id: "sikinti", label: "Sıkıntı", icon: Hourglass },
  { id: "ofke", label: "Öfke / Sinir", icon: Flame },
  { id: "konsantrasyon", label: "Konsantrasyon", icon: Target },
  { id: "kutlama", label: "Kutlama", icon: PartyPopper },
];

const UNSPECIFIED: SmokeReasonDef = {
  id: "belirtilmedi",
  label: "Belirtilmedi",
  icon: CircleHelp,
};

export function getReasonDef(id: string | null | undefined): SmokeReasonDef {
  return SMOKE_REASONS.find((r) => r.id === id) ?? UNSPECIFIED;
}

export interface ReasonBreakdownItem extends SmokeReasonDef {
  count: number;
  percent: number; // 0-100
}

/**
 * Verilen sigara kayıtlarını sebebe göre gruplar. Sebep belirtilmemiş kayıtlar
 * "Belirtilmedi" altında toplanır. Sonuç, sayıya göre azalan sırada döner.
 */
export function calculateReasonBreakdown(
  smokes: { reason?: string | null }[]
): ReasonBreakdownItem[] {
  const total = smokes.length;
  const counts = new Map<string, number>();

  for (const s of smokes) {
    const id = s.reason && SMOKE_REASONS.some((r) => r.id === s.reason) ? s.reason : UNSPECIFIED.id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const allDefs = [...SMOKE_REASONS, UNSPECIFIED];

  return allDefs
    .map((def) => {
      const count = counts.get(def.id) ?? 0;
      return {
        ...def,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Sadece bilgilendirici, nötr bir özet cümlesi üretir (öğüt vermez).
 * "Belirtilmedi" çoğunluktaysa veya yeterli veri yoksa null döner.
 */
export function buildReasonInsight(breakdown: ReasonBreakdownItem[]): string | null {
  const specified = breakdown.filter((b) => b.id !== "belirtilmedi");
  if (specified.length === 0) return null;

  const top = specified[0];
  if (top.count < 3) return null; // çok az veriyle anlamlı bir özet çıkarma

  return `En sık nedenin: ${top.label} (%${top.percent})`;
}
