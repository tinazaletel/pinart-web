'use client';

/* GUMB »Preglej poslovanje naročnika« v kalkulatorju.
 *
 * Zakaj tu in ne le v Strankah: cena je odvisna od tega, koliko naročnik zmore,
 * teh dveh številk pa večina uporabnikov o svoji stranki ne pozna (Tina,
 * 30. 8. 2026). Doslej jih je stran pošiljala na bizi.si, da jih prepišejo
 * ročno — Flow pa jih zna prinesti sam.
 *
 * Klic je NAMEREN, nikoli samodejen: vsak nov pregled porabi eno enoto AJPES,
 * ki stane približno evro. Zato gumb najprej vpraša, koliko enot še ostane pa
 * piše ob njem, da omejitev ni nevidna.
 *
 * Kaj je zastonj in se tu tudi ne šteje: iskanje podjetja po registru in
 * ponovni ogled podjetja, ki je bilo že enkrat prevzeto — takrat se polji
 * izpolnita takoj, brez vprašanja in brez porabe.
 */

import { useCallback, useEffect, useState } from 'react';

type Povzetek = { cistiPrihodki?: number | null; cistiDobicek?: number | null };
type Kvota = { paket: string; mesecno: number; ostanek: number };

export default function PreveriPoslovanje({
  davcna, jeEn = false, samoOgled = false, base = '', onIzpolni,
}: {
  davcna: string;
  jeEn?: boolean;
  samoOgled?: boolean;
  /** Predpona jezika (''/'/en') za povezavo na paket. */
  base?: string;
  onIzpolni: (promet: number | null, dobicek: number | null) => void;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const cista = (davcna || '').replace(/[^0-9]/g, '');
  const [kvota, setKvota] = useState<Kvota | null>(null);
  const [shranjen, setShranjen] = useState<Povzetek | null>(null);
  const [vRegistru, setVRegistru] = useState<boolean | null>(null);
  const [tece, setTece] = useState(false);
  const [potrjujem, setPotrjujem] = useState(false);
  const [napaka, setNapaka] = useState<string | null>(null);
  const [izpolnjeno, setIzpolnjeno] = useState(false);

  /* Ob vpisani davčni preberi stanje kvote in morebiten že opravljen pregled.
     To je branje evidence, ne klic na AJPES — nič se ne porabi. */
  useEffect(() => {
    let veljavno = true;
    setNapaka(null); setIzpolnjeno(false); setPotrjujem(false);
    if (cista.length < 8) { setShranjen(null); setVRegistru(null); return; }
    fetch(`/api/podjetja/ajpes?davcna=${cista}`)
      .then(r => r.json())
      .then(j => {
        if (!veljavno) return;
        setKvota(j.kvota || null);
        setVRegistru(j.vRegistru !== false);
        setShranjen((j.pregled?.povzetek as Povzetek) || null);
      })
      .catch(() => {});
    return () => { veljavno = false; };
  }, [cista]);

  const uporabi = useCallback((p: Povzetek | null) => {
    const promet = typeof p?.cistiPrihodki === 'number' ? p.cistiPrihodki : null;
    const dobicek = typeof p?.cistiDobicek === 'number' ? p.cistiDobicek : null;
    if (promet === null && dobicek === null) {
      setNapaka(L('AJPES za to podjetje nima objavljenih finančnih podatkov.',
                  'AJPES has no published financial data for this company.'));
      return;
    }
    onIzpolni(promet, dobicek);
    setIzpolnjeno(true);
  }, [onIzpolni, jeEn]);

  const preveri = useCallback(async () => {
    setTece(true); setNapaka(null); setPotrjujem(false);
    try {
      const odgovor = await fetch('/api/podjetja/ajpes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metoda: 'podatki', davcna: cista, nabor: 'OS',
          /* Zadnje oddano letno poročilo: tekoče leto še ni oddano. */
          leto: String(new Date().getFullYear() - 1),
          vrstaLp: 'LP', potrjenoPorabiTocko: true,
        }),
      });
      const j = await odgovor.json().catch(() => null);
      if (!odgovor.ok) {
        setNapaka(j?.error || L('Pregleda ni bilo mogoče opraviti.', 'The check could not be completed.'));
        return;
      }
      if (j?.napaka?.opis) { setNapaka(j.napaka.opis); return; }
      uporabi({ cistiPrihodki: j?.podjetje?.cistiPrihodki, cistiDobicek: j?.podjetje?.cistiDobicek });
      setKvota(k => (k ? { ...k, ostanek: Math.max(0, k.ostanek - 1) } : k));
    } catch {
      setNapaka(L('Ni povezave.', 'No connection.'));
    } finally {
      setTece(false);
    }
  }, [cista, jeEn, uporabi]);

  if (samoOgled || cista.length < 8 || vRegistru === false) return null;

  /* Kdor pregledov nima, ne dobi praznine, ampak ponudbo (Tina, 30. 8. 2026:
     »na brezplačnem paketu bi morali prodajati«). Skrita funkcija ne proda
     ničesar, tu pa je uporabnica ravno na mestu, kjer bi ji koristila — išče
     promet in dobiček, da postavi ceno.

     Ločimo dvoje: neprijavljeni obiskovalec evidence ne sme brati in kvote ne
     dobi (401), zato ga pošljemo na cenik; prijavljeni na brezplačnem paketu
     ima kvoto 0 in gre na svoj paket. Ročni vnos ostane v obeh primerih — to
     je ponudba, ne zapora. */
  if (!kvota || kvota.mesecno <= 0) {
    const kam = kvota ? `${base}/kalkulator/paket` : `${base}/flow#cenik`;
    return (
      <div style={{ display: 'grid', gap: '.35rem', margin: '0 0 1rem' }}>
        <a href={kam} style={{
          display: 'inline-flex', alignItems: 'center', gap: '.45rem', minHeight: '2.6rem',
          width: 'fit-content', padding: '.5rem 1.05rem', border: '1px dashed currentColor',
          borderRadius: 999, color: 'inherit', font: '600 .84rem inherit', textDecoration: 'none', opacity: .75,
        }}>
          {L('Preglej poslovanje naročnika', 'Check the client’s business')}
          <span style={{ fontWeight: 400, opacity: .8 }}>· {L('v Premiumu', 'in Premium')}</span>
        </a>
        <p style={{ fontSize: '.76rem', opacity: .62, margin: 0 }}>
          {L('Flow prebere promet in dobiček iz zadnjega letnega poročila in ju vpiše sam. Brez tega ju poišči spodaj navedenih virih in vpiši ročno.',
             'Flow reads revenue and profit from the latest annual report and fills them in for you. Without it, look them up in the sources below and type them in.')}
        </p>
      </div>
    );
  }

  const zeImamo = typeof shranjen?.cistiPrihodki === 'number' || typeof shranjen?.cistiDobicek === 'number';
  const brezEnot = !!kvota && kvota.ostanek <= 0 && !zeImamo;

  const gumb: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '.45rem', minHeight: '2.6rem',
    padding: '.5rem 1.05rem', border: '1px solid currentColor', borderRadius: 999,
    background: 'transparent', color: 'inherit', font: '600 .84rem inherit',
    cursor: tece || brezEnot ? 'default' : 'pointer', opacity: tece || brezEnot ? .5 : 1,
  };
  const drobno: React.CSSProperties = { fontSize: '.76rem', opacity: .62, margin: 0 };

  return (
    <div style={{ display: 'grid', gap: '.45rem', margin: '0 0 1rem' }}>
      {izpolnjeno ? (
        <p style={{ ...drobno, opacity: .8 }}>
          {L('Izpolnjeno iz letnega poročila.', 'Filled in from the annual report.')}
        </p>
      ) : potrjujem ? (
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" style={gumb} onClick={preveri}>
            {L('Porabi en pregled', 'Use one check')}
          </button>
          <button type="button" style={{ ...gumb, border: 0, opacity: .7 }} onClick={() => setPotrjujem(false)}>
            {L('Prekliči', 'Cancel')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            style={gumb}
            disabled={tece || brezEnot}
            onClick={() => (zeImamo ? uporabi(shranjen) : setPotrjujem(true))}
          >
            {tece
              ? L('Preverjam …', 'Checking …')
              : L('Preglej poslovanje naročnika', 'Check the client’s business')}
          </button>
          {zeImamo
            ? <span style={drobno}>{L('To podjetje si že pregledala — ponovni ogled je brezplačen.',
                                      'You have checked this company before — viewing it again is free.')}</span>
            : kvota && <span style={drobno}>
                {brezEnot
                  ? L('Ta mesec si porabila vse preglede.', 'You have used all your checks this month.')
                  : `${L('ostane ti', 'you have')} ${kvota.ostanek} ${L('od', 'of')} ${kvota.mesecno} ${L('ta mesec', 'this month')}`}
              </span>}
        </div>
      )}

      {napaka && <p style={{ ...drobno, opacity: 1, color: '#a12323' }} role="alert">{napaka}</p>}

      <p style={drobno}>
        {L('Iskanje podjetij in ponovni ogled že pridobljenih podatkov ne porabita pregleda.',
           'Company search and viewing data you already retrieved do not use up a check.')}
      </p>
    </div>
  );
}
