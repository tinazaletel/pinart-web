'use client';

/* Datum in ura — na Pupi in na nadzorni plošči, pod glavo desno.
 *
 * Videz: mehka steklena pilula v jeziku Flowa — ura v serifu (kot številke v
 * dokumentih), datum nad njo v majhnih razprtih črkah. Navadno sivo besedilo
 * je bilo videti kot izpis razvijalca, ne kot del vmesnika.
 *
 * Montažna vrata (`zdaj === null` do prvega useEffect) niso previdnost, ampak
 * nujnost: če bi čas izrisali že na strežniku, bi se ob hidraciji razlikoval
 * od brskalnikovega in React bi javil »Text content does not match«.
 * Osvežuje se vsako minuto in ob vrnitvi v okno. */

import { useEffect, useState } from 'react';

export default function DatumUra({ jeEn = false, className, zgoscen = false }: { jeEn?: boolean; className?: string; zgoscen?: boolean }) {
  const [zdaj, setZdaj] = useState<Date | null>(null);

  useEffect(() => {
    const osvezi = () => setZdaj(new Date());
    osvezi();
    const iv = window.setInterval(osvezi, 30_000);
    window.addEventListener('focus', osvezi);
    return () => { window.clearInterval(iv); window.removeEventListener('focus', osvezi); };
  }, []);

  if (!zdaj) return null;

  const jezik = jeEn ? 'en-GB' : 'sl-SI';
  const dan = new Intl.DateTimeFormat(jezik, { weekday: 'long' }).format(zdaj);
  const datum = new Intl.DateTimeFormat(jezik, { day: 'numeric', month: 'long' }).format(zdaj);
  const ura = new Intl.DateTimeFormat(jezik, { hour: '2-digit', minute: '2-digit' }).format(zdaj);

  return (
    <div className={`du${zgoscen ? ' du-zgoscen' : ''}${className ? ` ${className}` : ''}`} suppressHydrationWarning>
      <time dateTime={zdaj.toISOString()}>
        <span className="du-dan">{dan.charAt(0).toUpperCase() + dan.slice(1)}, {datum}</span>
        <span className="du-ura">{ura}</span>
      </time>
      <style jsx>{`
        /* Brez polnila, obrisa in sence: ura je zapis, ne gumb (Tina, 27. 8. 2026
           — najprej na Pupi, nato se na plosci). Ostane le rahla zameglitev,
           da besedilo drzi berljivost, ko pod njim tece barvni preliv. */
        .du {
          display: inline-flex;
          padding: .15rem .1rem;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .du :global(time) { display: flex; flex-direction: column; align-items: flex-end; gap: .1rem; line-height: 1; }
        .du-dan {
          font: 700 .6rem var(--font-sans), sans-serif;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: color-mix(in oklch, var(--ink, #1a1a1a) 58%, transparent);
          white-space: nowrap;
        }
        .du-ura {
          /* Brez skatle ura ne sme biti prevelika: v glavi ze stoji velik
             serifni pozdrav, dve veliki serifni stvari druga ob drugi pa se
             prepirata (Tina, 27. 8. 2026). */
          font: 500 1.15rem/1 var(--font-serif), Georgia, serif;
          font-synthesis: none;
          color: var(--ink, #1a1a1a);
          font-variant-numeric: tabular-nums;
        }
        /* Zgoscen: ena vrsta, visoka kot okrogli gumbi ob njej — a BREZ polnila,
           obrisa in sence. Gumba sta stvari, ki se jih klikne, in si obris
           zasluzita; ura je zapis, ne gumb. Ostane le rahla zameglitev, da
           besedilo drzi berljivost, ko cez gre gradient. */
        .du-zgoscen { height: 2.4rem; padding: 0 .4rem; align-items: center; }
        .du-zgoscen :global(time) { flex-direction: row; align-items: baseline; gap: .5rem; }
        .du-zgoscen .du-ura { font-size: 1.05rem; }
      `}</style>
    </div>
  );
}
