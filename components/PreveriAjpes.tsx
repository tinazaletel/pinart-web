'use client';

/* PREVERJANJE STRANKE V AJPES — ali ima blokiran račun ali je v insolvenčnem
 * postopku, preden podpišeš.
 *
 * Oblika je namenoma ista kot pri Kontaktih in Dnevniku (razredi clientLinki),
 * ker je to še ena kartica v profilu stranke, ne nov jezik.
 *
 * Dve odločitvi, ki nista tehnični:
 *
 *  1. Matične ne vpisuje nihče. Poiščemo jo v registru po davčni številki, ki
 *     je pri stranki že vpisana za račun.
 *  2. Prvi pregled sproži klik, ker porabi eno od Pinartovih enot; potem izid
 *     stoji tu z datumom in ga ni treba sprožati znova. Gumb, ki ga je treba
 *     vsakič poiskati, je stvar, ki se spregleda.
 */

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Warning, CheckCircle, XCircle } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

type Povzetek = {
  naziv?: string | null;
  oblika?: string | null;
  blokada?: boolean;
  insolventnost?: boolean;
  odprtRacun?: boolean;
  neporavnane12m?: boolean | null;
  kazalnikTveganja?: string | null;
  leto?: string | null;
  postavke?: { aop?: string; opis?: string; vrednost?: string }[];
  kazalniki?: { aop?: string; opis?: string; vrednost?: string }[];
};

/* Kaj od nekaj deset postavk letnega poročila sploh pokazati.
 *
 * Oblikovalka ne bere bilanc — zanima jo eno vprašanje: koliko denarja se pri
 * tej stranki obrne in koliko ji ostane. Iz tega sledi cena. Zato tri vrstice,
 * ne tabela; iskanje po opisu in ne po šifri AOP, ker se ta med shemami
 * razlikuje, ime postavke pa ostaja isto. */
const ZANIMIVE: { ključ: RegExp; ime: [string, string] }[] = [
  { ključ: /PRIHODK/i, ime: ['Prihodki', 'Revenue'] },
  { ključ: /DOBIČ|DOBIC/i, ime: ['Dobiček', 'Profit'] },
  { ključ: /IZGUB/i, ime: ['Izguba', 'Loss'] },
];

const stevilka = (v: string | undefined, jeEn: boolean): string | null => {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n === 0) return null;
  return new Intl.NumberFormat(jeEn ? 'en-GB' : 'sl-SI', { maximumFractionDigits: 0 }).format(n);
};

type Pregled = { created_at: string; povzetek: Povzetek | null };

export default function PreveriAjpes({ davcna, jeEn = false, samoOgled = false }: { davcna?: string | null; jeEn?: boolean; samoOgled?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [pregled, setPregled] = useState<Pregled | null>(null);
  const [vRegistru, setVRegistru] = useState<boolean | null>(null);
  const [tece, setTece] = useState(false);
  const [potrjujem, setPotrjujem] = useState(false);
  const [vecOdprto, setVecOdprto] = useState(false);
  const [napaka, setNapaka] = useState<string | null>(null);
  const cista = String(davcna || '').replace(/[^0-9]/g, '');

  /* Ob odprtju stranke samo preberemo evidenco — AJPES-a se ne dotaknemo in
     nobena enota se ne porabi. */
  useEffect(() => {
    let veljavno = true;
    setPregled(null); setVRegistru(null); setNapaka(null); setPotrjujem(false);
    if (cista.length < 8) return;
    fetch(`/api/podjetja/ajpes?davcna=${cista}`)
      .then(r => r.json())
      .then(j => { if (veljavno) { setPregled(j.pregled || null); setVRegistru(j.vRegistru !== false); } })
      .catch(() => {});
    return () => { veljavno = false; };
  }, [cista]);

  const preveri = useCallback(async () => {
    setTece(true); setNapaka(null); setPotrjujem(false);
    try {
      const odgovor = await fetch('/api/podjetja/ajpes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metoda: 'podatki',
          davcna: cista,
          nabor: 'OS',
          /* Zadnje oddano letno poročilo: tekoče leto še ni oddano. */
          leto: String(new Date().getFullYear() - 1),
          vrstaLp: 'LP',
          potrjenoPorabiTocko: true,
        }),
      });
      const j = await odgovor.json().catch(() => null);
      if (!odgovor.ok) { setNapaka(j?.error || L('Pregleda ni bilo mogoče opraviti.', 'The check could not be completed.')); return; }
      if (j?.napaka?.opis) { setNapaka(j.napaka.opis); return; }
      const p = j?.podjetje;
      setPregled({
        created_at: new Date().toISOString(),
        povzetek: p ? {
          naziv: p.naziv, oblika: p.oblika, blokada: p.imaBlokado,
          insolventnost: p.imaInsolvencneObjave, odprtRacun: p.imaOdprtRacun,
          neporavnane12m: p.neporavnaneZadnjih12m ?? null,
          kazalnikTveganja: p.kazalnikTveganja || null, leto: p.leto || null,
        } : null,
      });
    } catch {
      setNapaka(L('Ni povezave.', 'No connection.'));
    } finally {
      setTece(false);
    }
  }, [cista, jeEn]);

  const datum = pregled ? new Intl.DateTimeFormat(jeEn ? 'en-GB' : 'sl-SI', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(pregled.created_at)) : '';
  const p = pregled?.povzetek;
  const opozorilo = !!(p && (p.blokada || p.insolventnost || p.neporavnane12m));

  return (
    <div className={styles.clientLinki}>
      <div className={styles.clientLinkGlava}>
        <div>
          <h3>{L('Preverjanje stranke', 'Client lookup')}</h3>
          <small className={styles.clientLinkPodnaslov}>
            {L('Prihodki in dobiček stranke — podlaga za to, koliko ji lahko zaračunaš. Zraven še blokade in insolventnost.',
               'The client’s revenue and profit — the basis for what you can charge. Plus blocked accounts and insolvency.')}
          </small>
        </div>
        {!samoOgled && cista.length >= 8 && vRegistru !== false && (
          <button
            type="button"
            className={styles.clientLinkGumb}
            disabled={tece}
            onClick={() => (pregled ? setPotrjujem(true) : setPotrjujem(true))}
          >
            {tece ? L('Preverjam …', 'Checking …') : pregled ? L('Preveri znova', 'Check again') : L('Preveri', 'Check')}
          </button>
        )}
      </div>

      {cista.length < 8 && (
        <p className={styles.clientLinkPrazno}>
          {L('Za pregled vpiši davčno številko stranke — matično poiščemo sami.',
             'Add the client’s tax number and we’ll find the rest ourselves.')}
        </p>
      )}
      {cista.length >= 8 && vRegistru === false && (
        <p className={styles.clientLinkPrazno}>
          {L('Podjetja s to davčno številko v poslovnem registru ni. Preveri, ali je pravilna.',
             'No company with this tax number in the business register. Check whether it is correct.')}
        </p>
      )}

      {potrjujem && (
        <div className={styles.clientLinkObrazec} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '.6rem' }}>
          <span style={{ fontSize: '.86rem', lineHeight: 1.5 }}>
            {L('Pregled porabi enega od tvojih mesečnih pregledov. Isto podjetje in isto leto je pozneje brezplačno.',
               'This uses one of your monthly checks. The same company and year is free afterwards.')}
          </span>
          <span style={{ display: 'flex', gap: '.5rem' }}>
            <button type="button" className={styles.clientLinkDodaj} onClick={preveri}>{L('Preveri', 'Check')}</button>
            <button type="button" onClick={() => setPotrjujem(false)}>{L('Prekliči', 'Cancel')}</button>
          </span>
        </div>
      )}

      {napaka && <p className={styles.clientLinkPrazno} role="alert" style={{ color: '#b3261e' }}>{napaka}</p>}

      {p && (
        <div className={styles.clientLinkSeznam}>
          <div className={styles.clientLinkVrstica} style={{ gap: '.6rem', alignItems: 'center' }}>
            {opozorilo
              ? <Warning size={17} weight="fill" style={{ color: '#b3261e', flex: '0 0 auto' }} aria-hidden />
              : <ShieldCheck size={17} weight="fill" style={{ color: '#1e7a4b', flex: '0 0 auto' }} aria-hidden />}
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
              <strong>{opozorilo ? L('Znaki tveganja', 'Risk signals') : L('Brez znakov tveganja', 'No risk signals')}</strong>
              <small style={{ fontWeight: 500 }}>
                {L('Preverjeno', 'Checked')} {datum}{p.leto ? ` · ${L('letno poročilo', 'annual report')} ${p.leto}` : ''}
              </small>
            </span>
          </div>
          {(() => {
            /* Denar najprej: prihodki in dobiček sta razlog, zaradi katerega
               uporabnica to sploh odpre — opozorila so dodatek, ne jedro. */
            const vrstice = [...(p.postavke || []), ...(p.kazalniki || [])];
            const najdene = ZANIMIVE.map(z => {
              const zadetek = vrstice.find(v => z.ključ.test(String(v.opis || '')));
              const vrednost = stevilka(zadetek?.vrednost, jeEn);
              return vrednost ? { ime: jeEn ? z.ime[1] : z.ime[0], vrednost, denar: !/ZAPOSLEN/i.test(z.ključ.source) } : null;
            }).filter(Boolean) as { ime: string; vrednost: string; denar: boolean }[];
            const vseVrstice = vrstice.filter(v => String(v.opis || '').trim() && stevilka(v.vrednost, jeEn));
            if (!najdene.length && !vseVrstice.length) return null;
            return (
              <>
                {najdene.length > 0 && (
                  <div className={styles.clientFinance} style={{ marginTop: '.2rem' }}>
                    {najdene.map(v => (
                      <span key={v.ime}><small>{v.ime}</small><strong>{v.vrednost}{v.denar ? ' €' : ''}</strong></span>
                    ))}
                  </div>
                )}
                {vseVrstice.length > najdene.length && (
                  <button
                    type="button"
                    className={styles.clientLinkGumb}
                    onClick={() => setVecOdprto(o => !o)}
                    aria-expanded={vecOdprto}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {vecOdprto ? L('Manj', 'Less') : '…'}
                  </button>
                )}
                {vecOdprto && (
                  <div className={styles.clientLinkSeznam}>
                    {vseVrstice.map((v, i) => (
                      <div key={`${v.aop || ''}-${i}`} className={styles.clientLinkVrstica} style={{ gap: '.5rem' }}>
                        <span style={{ flex: 1, minWidth: 0 }}>{String(v.opis || '').toLowerCase().replace(/^./, c => c.toUpperCase())}</span>
                        <strong style={{ flex: '0 0 auto', fontVariantNumeric: 'tabular-nums' }}>{stevilka(v.vrednost, jeEn)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
          {[
            { ime: L('Blokiran račun', 'Blocked account'), slabo: !!p.blokada },
            { ime: L('Insolvenčni postopek', 'Insolvency proceedings'), slabo: !!p.insolventnost },
            { ime: L('Odprt transakcijski račun', 'Open bank account'), slabo: p.odprtRacun === false },
            ...(p.neporavnane12m == null ? [] : [{ ime: L('Neporavnane obveznosti (12 mesecev)', 'Unpaid obligations (12 months)'), slabo: !!p.neporavnane12m }]),
          ].map(v => (
            <div key={v.ime} className={styles.clientLinkVrstica} style={{ gap: '.5rem', alignItems: 'center' }}>
              {v.slabo
                ? <XCircle size={15} weight="fill" style={{ color: '#b3261e', flex: '0 0 auto' }} aria-hidden />
                : <CheckCircle size={15} weight="fill" style={{ color: '#1e7a4b', flex: '0 0 auto' }} aria-hidden />}
              <span style={{ flex: 1, minWidth: 0 }}>{v.ime}</span>
            </div>
          ))}
        </div>
      )}
      {p && (
        <small className={styles.clientLinkPodnaslov} style={{ display: 'block', marginTop: '.6rem' }}>
          {L('Vir: AJPES — Poslovni register Slovenije in letna poročila (CC BY 4.0).',
             'Source: AJPES — Slovenian Business Register and annual reports (CC BY 4.0).')}
        </small>
      )}
    </div>
  );
}
