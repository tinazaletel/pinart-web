'use client';

/* TRŽNI OKVIR OB CENI — »3.000–7.000 € · 6 preverjenih virov«.
 *
 * Zakaj obstaja: cena, ki jo vrže kalkulator, je za uporabnico prepričljiva
 * ravno toliko, kolikor jo zna zagovarjati pred stranko. Sama številka tega ne
 * omogoča. Razpon trga z objavljenimi ceniki pa spremeni pogovor iz »zakaj
 * toliko?« v »poglejte, koliko računajo drugi«.
 *
 * S klikom se odpre vse, na čemer okvir stoji: ceniki s povezavami, datum
 * preverjanja, obseg vsake postavke, mediana in stopnja zaupanja. Cena tako ni
 * več skrivnostna številka (Tina, 28. 8. 2026).
 *
 * Kjer raziskava poštenega razpona ne dopušča (kakovost C in D), značke NI —
 * molk je boljši od izmišljene številke, ker vsa vrednost te stvari stoji na
 * tem, da drži.
 */

import { useState } from 'react';
import DokPanel from '@/components/DokPanel';
import { okvirZa, imaRazpon, zapisRazpona, zapisVirov, zaupanje } from '@/lib/trzniOkvir';

export default function TrzniOkvirZnacka({
  storitev, jeEn = false, pojasnilo, zgoscen = false,
}: {
  storitev: string | null | undefined;
  jeEn?: boolean;
  /* Ena vrstica namesto dveh — za ozek stolpec povzetka ponudbe, kjer je
     postavk več in bi vsaka dvovrstična značka seznam razbila. */
  zgoscen?: boolean;
  /* Kako je Flow prišel do svoje cene — pozna ga kalkulator, ne ta komponenta. */
  pojasnilo?: string | null;
}) {
  const [odprt, setOdprt] = useState(false);
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const okvir = okvirZa(storitev);
  if (!okvir || !imaRazpon(okvir)) return null;

  const razpon = zapisRazpona(okvir, jeEn);
  const [l, m, d] = okvir.posodobljeno.split('-');
  const datum = jeEn
    ? new Date(`${okvir.posodobljeno}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : `${Number(d)}. ${Number(m)}. ${l}`;

  return (
    <>
      <button type="button" className={zgoscen ? 'tok tok-ozek' : 'tok'} onClick={() => setOdprt(true)}>
        <span className="tok-vrh">{L('Trg', 'Market')}: <strong>{razpon}</strong></span>
        {!zgoscen && <span className="tok-dno">{zapisVirov(okvir, jeEn)}</span>}
      </button>

      <DokPanel
        odprt={odprt}
        onZapri={() => setOdprt(false)}
        jeEn={jeEn}
        nadnaslov={L('TRŽNI OKVIR', 'MARKET RANGE')}
        naslov={razpon || ''}
        podnaslov={L(`Preverjeno ${datum}. Primerjamo samo delo — tisk, zakup medijev, material in DDV niso vključeni.`,
                     `Verified ${datum}. We compare work only — printing, media buying, materials and VAT are excluded.`)}
      >
        <div className="tok-p">
          {/* Obseg PRVI, pred številkami: brez tega uporabnica primerja svoj velik
              projekt s tujim vstopnim paketom in se ji zdi, da je na sredini trga,
              čeprav je pod njim (Tina, 28. 8. 2026). */}
          {okvir.opomba && (
            <p className="tok-obseg">{jeEn && okvir.opombaEn ? okvir.opombaEn : okvir.opomba}</p>
          )}
          <dl className="tok-dejstva">
            {typeof okvir.mediana === 'number' && (
              <div><dt>{L('Mediana', 'Median')}</dt><dd>{new Intl.NumberFormat(jeEn ? 'en-GB' : 'sl-SI', { maximumFractionDigits: 0, useGrouping: 'always' }).format(okvir.mediana)} {okvir.valuta === 'USD' ? '$' : '€'}</dd></div>
            )}
            <div><dt>{L('Stopnja zaupanja', 'Confidence')}</dt><dd>{zaupanje(okvir, jeEn)}</dd></div>
            <div><dt>{L('Preverjeno', 'Verified')}</dt><dd>{datum}</dd></div>
          </dl>

          {pojasnilo && (
            <section className="tok-sklop">
              <h4>{L('Zakaj je Flow predlagal to ceno', 'Why Flow proposed this price')}</h4>
              <p className="tok-opomba">{pojasnilo}</p>
            </section>
          )}

          <section className="tok-sklop">
            <h4>{L('Na čem razpon stoji', 'What the range rests on')}</h4>
            <p className="tok-opomba">
              {L(`Razpon je sestavljen iz ${okvir.virov} javno objavljenih cenikov slovenskih in mednarodnih ponudnikov, preverjenih ${datum}. Imen ponudnikov ne objavljamo — cena je dejstvo, njihovo ime pa ni naše, da bi ga uporabljali v svojem orodju. Če jih za preverjanje potrebuješ, jih pošljemo na zahtevo.`,
                 `The range is built from ${okvir.virov} publicly published price lists of Slovenian and international providers, verified on ${datum}. We do not publish provider names — a price is a fact, but their name is not ours to use in our product. If you need them for verification, we will send them on request.`)}
            </p>
          </section>

          <p className="tok-drobno">
            {L('Tržni okvir je orientacija, ne priporočena cena. Obseg dela se med ponudniki razlikuje; primerjaj ga, preden številko uporabiš v ponudbi.',
               'The market range is an orientation, not a recommended price. Scope differs between providers; compare it before using the figure in a quote.')}
          </p>
        </div>
      </DokPanel>

      <style jsx>{`
        .tok {
          display: flex; flex-direction: column; align-items: flex-start; gap: .1rem;
          padding: .45rem .7rem; border: 1px solid var(--line, #e6e3e0); border-radius: 12px;
          background: transparent; cursor: pointer; text-align: left; line-height: 1.35;
        }
        .tok:hover { border-color: color-mix(in oklch, var(--ink, #1a1a1a) 25%, transparent); }
        .tok-ozek { padding: .2rem .45rem; border-radius: 9px; }
        .tok-ozek .tok-vrh { font-size: .74rem; }
        .tok-vrh { font-size: .84rem; color: var(--ink, #1a1a1a); }
        .tok-vrh strong { font-weight: 600; }
        .tok-dno { font-size: .72rem; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); }
        .tok-p { display: flex; flex-direction: column; gap: 1.4rem; }
        .tok-dejstva { display: grid; gap: .55rem; margin: 0; }
        .tok-dejstva div { display: flex; justify-content: space-between; gap: 1rem; border-bottom: 1px solid var(--line, #e6e3e0); padding-bottom: .5rem; }
        .tok-dejstva dt { font-size: .78rem; color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); }
        .tok-dejstva dd { margin: 0; font-size: .84rem; font-weight: 500; text-align: right; }
        .tok-sklop h4 { font-size: .78rem; letter-spacing: .1em; text-transform: uppercase; margin: 0 0 .6rem; font-weight: 600; }
        .tok-viri { list-style: none; margin: 0; padding: 0; display: grid; gap: .8rem; }
        .tok-viri li { display: flex; flex-direction: column; gap: .15rem; border-bottom: 1px solid var(--line, #e6e3e0); padding-bottom: .7rem; }
        .tok-vir-vrh { display: flex; justify-content: space-between; gap: .8rem; align-items: baseline; }
        .tok-vir-vrh b { font-weight: 600; white-space: nowrap; }
        .tok-viri small { color: color-mix(in oklch, var(--ink, #1a1a1a) 62%, transparent); font-size: .78rem; }
        .tok-viri :global(a) { font-size: .78rem; margin-top: .2rem; }
        .tok-obseg {
          font-size: .86rem; line-height: 1.55; margin: 0;
          padding: .7rem .85rem; border-radius: 12px;
          background: color-mix(in oklch, var(--ink, #1a1a1a) 4%, transparent);
        }
        .tok-opomba { font-size: .84rem; line-height: 1.55; margin: 0; }
        .tok-drobno { font-size: .74rem; line-height: 1.5; color: color-mix(in oklch, var(--ink, #1a1a1a) 58%, transparent); margin: 0; }
      `}</style>
    </>
  );
}
