import { Check, Minus, X } from "lucide-react";
import { getPreferences } from "@/lib/preferences";

const icons = { win: Check, draw: Minus, loss: X };

export async function MatchResult({ scored, conceded }: { scored: number; conceded: number }) {
  const { t } = await getPreferences();
  const outcome = scored === conceded ? "draw" : scored > conceded ? "win" : "loss";
  const Icon = icons[outcome];

  return <dd className="match-result">
    <strong>{scored}:{conceded}</strong>
    <span className="result-badge" data-outcome={outcome}>
      <Icon size={13} aria-hidden="true" />{t[outcome]}
    </span>
  </dd>;
}
