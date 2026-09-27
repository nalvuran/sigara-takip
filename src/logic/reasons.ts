export interface SmokeReasonDef {
  id: string;
  label: string;
  emoji: string;
  color: string; // baloncuk arka plan rengi (pastel ton)
}

export const SMOKE_REASONS: SmokeReasonDef[] = [
  { id: "stres", label: "Stres", emoji: "😰", color: "#fee2e2" },
  { id: "keyif", label: "Keyif / Rahatlama", emoji: "😌", color: "#fef3c7" },
  { id: "sosyal", label: "Sosyal", emoji: "👥", color: "#dbeafe" },
  { id: "aliskanlik", label: "Alışkanlık", emoji: "☕", color: "#e7dfd7" },
  { id: "sikinti", label: "Sıkıntı", emoji: "😐", color: "#e5e7eb" },
];

const UNSPECIFIED: SmokeReasonDef = {
  id: "belirtilmedi",
  label: "Belirtilmedi",
  emoji: "❔",
  color: "#e5e7eb",
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
