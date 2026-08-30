'use client';

/* MALICA KOT PICA — 3D glina, ista kot Pupa (Tina, 30. 8. 2026).
 *
 * Šest rezin po pet minut. Rezina, ki je »pojedena«, odplava navzven in zbledi
 * — kos res izgine, ne le pobeli. Slika je ena sama; vsaka rezina je isti
 * posnetek, obrezan na svoj izsek, zato se med rezinami ne vidi šiva.
 *
 * Med tekočo malico se rezine jedo same (minute prihajajo od štoparice), sicer
 * pa klikneš rezino in malica je toliko dolga — klik na zadnjo jo odgrizne.
 */

import { useId } from 'react';

const REZIN = 6;
const MINUT_NA_REZINO = 5;
const SLIKA = '/flow-pica.png';

/* Rezina kot krožni izsek: iz sredine po loku in nazaj. Polmer je večji od
   slike, da izsek zajame tudi skorjo na robu. */
function izsek(i: number, r = 72) {
  const kot = (2 * Math.PI) / REZIN;
  const od = i * kot - Math.PI / 2;
  const doKota = od + kot;
  const x1 = 50 + r * Math.cos(od), y1 = 50 + r * Math.sin(od);
  const x2 = 50 + r * Math.cos(doKota), y2 = 50 + r * Math.sin(doKota);
  return `M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/* Smer, v katero rezina odplava, ko jo poješ. */
function odmik(i: number, d = 14) {
  const kot = (2 * Math.PI) / REZIN;
  const sredina = i * kot - Math.PI / 2 + kot / 2;
  return { x: d * Math.cos(sredina), y: d * Math.sin(sredina) };
}

export default function PizzaMalica({
  minute, onSpremeni, jeEn = false, samoOgled = false, velikost = 132,
}: {
  minute: number;
  onSpremeni: (minute: number) => void;
  jeEn?: boolean;
  samoOgled?: boolean;
  velikost?: number;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const kljuc = useId().replace(/:/g, '');
  /* Pica je PREOSTANEK malice, ne njena dolžina: polna pica = celih trideset
     minut pred tabo, in kos izgine, kakor jo ješ (Tina, 30. 8. 2026: »kosi pice
     izginjajo«). Zadnji kos ne izgine na mah — bledi z minutami, da se med
     malico ves čas nekaj dogaja. */
  const preostanek = Math.max(0, REZIN * MINUT_NA_REZINO - minute) / MINUT_NA_REZINO;
  const celih = Math.floor(preostanek);
  const delni = preostanek - celih;

  return (
    <div className="pica">
      <svg viewBox="0 0 100 100" width={velikost} height={velikost} role="group"
        aria-label={L('Dolžina malice', 'Break length')}>
        <defs>
          {Array.from({ length: REZIN }, (_, i) => (
            <clipPath key={i} id={`${kljuc}-r${i}`}><path d={izsek(i)} /></clipPath>
          ))}
        </defs>

        {Array.from({ length: REZIN }, (_, i) => {
          const jeTu = i < celih;
          const jeDelni = i === celih && delni > 0;
          const d = odmik(i);
          return (
            <g key={i} clipPath={`url(#${kljuc}-r${i})`}
              style={{
                opacity: jeTu ? 1 : jeDelni ? delni : 0,
                transform: jeTu || jeDelni ? 'none' : `translate(${d.x}px, ${d.y}px)`,
                transformOrigin: '50px 50px',
                transition: 'opacity .32s cubic-bezier(.23,1,.32,1), transform .32s cubic-bezier(.23,1,.32,1)',
              }}>
              <image href={SLIKA} x="2" y="2" width="96" height="96" preserveAspectRatio="xMidYMid meet" />
            </g>
          );
        })}

        {/* obris prazne pladnja, da se vidi, koliko je manjka */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(17,17,17,.14)" strokeWidth="1" strokeDasharray="3 4" />

        {/* Klik po rezinah nastavi malico na roko: koliko kosov naj OSTANE. */}
        {!samoOgled && Array.from({ length: REZIN }, (_, i) => {
          const ostanejo = i < celih ? i : i + 1;
          const minut = (REZIN - ostanejo) * MINUT_NA_REZINO;
          return (
            <path key={`k${i}`} d={izsek(i, 48)} fill="transparent" className="klik"
              role="button" tabIndex={0} aria-label={`${minut} min`}
              onClick={() => onSpremeni(minut)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSpremeni(minut); }} />
          );
        })}
      </svg>

      <style jsx>{`
        /* Pogled naravnost od zgoraj, brez vrtenja: animacija je to, da kosi
           izginjajo — vrtenje je z njo tekmovalo in odvračalo pogled
           (Tina, 30. 8. 2026). */
        .pica { display: grid; place-items: center; }
        .pica :global(.klik) { cursor: pointer; outline: none; }
        .pica :global(.klik:focus-visible) { fill: rgba(124,92,240,.16); }
      `}</style>
    </div>
  );
}
