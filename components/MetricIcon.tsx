import { FileText, CheckCircle, Wallet, Repeat, TrendUp, Target, Clock, Briefcase, ChartLineUp } from '@phosphor-icons/react';

export type MetricIconType = 'document' | 'paid' | 'cost' | 'profit' | 'recurring'
  /* Cena & cas: cilj = tarca, urna vrednost = ura, projekti = aktovka,
     dejanska urna vrednost = graf (ne kljukica — ta pomeni "placano") */
  | 'cilj' | 'ura' | 'projekti' | 'graf';

/* Ikone poenotene na Phosphor. Inline fill/stroke preglasi stare stroke-based
   CSS pravila (fill:none), da so Phosphor ikone vidne. */
const IKONA_SLOG = { fill: 'currentColor', stroke: 'none' } as const;

export default function MetricIcon({ type }: { type: MetricIconType }) {
  const Icon = type === 'document' ? FileText
    : type === 'paid' ? CheckCircle
    : type === 'cost' ? Wallet
    : type === 'recurring' ? Repeat
    : type === 'cilj' ? Target
    : type === 'ura' ? Clock
    : type === 'projekti' ? Briefcase
    : type === 'graf' ? ChartLineUp
    : TrendUp;
  return <Icon size={36} weight="regular" aria-hidden="true" style={IKONA_SLOG} />;
}
