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
  davcna, trg = 'si', jeEn = false, samoOgled = false, base = '', vLupini = false, onIzpolni,
}: {
  davcna: string;
  /** Trg narocnika: AJPES pokriva samo Slovenijo, drugod pregleda ni. */
  trg?: string;
  jeEn?: boolean;
  samoOgled?: boolean;
  /** Predpona jezika (''/'/en') za povezavo na paket. */
  base?: string;
  /** V Flowu (ponudba) ali v brezplacnem kalkulatorju. */
  vLupini?: boolean;
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
  /* Dokler stanje paketa ni znano, ne kazemo nicesar: sicer bi placnik za hip
     videl ponudbo za nadgradnjo, ki je ne potrebuje. */
  const [znano, setZnano] = useState(false);

  /* Ob vpisani davčni preberi stanje kvote in morebiten že opravljen pregled.
     To je branje evidence, ne klic na AJPES — nič se ne porabi. */
  useEffect(() => {
    let veljavno = true;
    setNapaka(null); setIzpolnjeno(false); setPotrjujem(false);
    /* Poizvedba tece tudi brez davcne: takrat ne vrne pregleda, pove pa paket —
       in prav brez davcne je uporabnica na brezplacnem kalkulatorju, ki mora
       izvedeti, da zna Flow ti dve stevilki prinesti sam (Tina, 30. 8. 2026). */
    const imaDavcno = cista.length >= 8;
    if (!imaDavcno) { setShranjen(null); setVRegistru(null); }
    fetch(`/api/podjetja/ajpes?davcna=${imaDavcno ? cista : ''}`)
      .then(r => r.json())
      .then(j => {
        if (!veljavno) return;
        setKvota(j.kvota || null);
        setZnano(true);
        if (!imaDavcno) return;
        setVRegistru(j.vRegistru !== false);
        setShranjen((j.pregled?.povzetek as Povzetek) || null);
      })
      .catch(() => { if (veljavno) setZnano(true); });
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

  /* AJPES pokriva slovenski register. Za tuje narocnike pregleda ni — takrat
     gumba ne kazemo, uporabnica pa pod polji dobi seznam registrov za tisti trg
     (Tina, 30. 8. 2026). */
  if (samoOgled || trg !== 'si' || vRegistru === false) return null;

  if (!znano) return null;

  const zeImamo = typeof shranjen?.cistiPrihodki === 'number' || typeof shranjen?.cistiDobicek === 'number';
  const brezEnot = !!kvota && kvota.ostanek <= 0 && !zeImamo;

  /* Videz po zgledu ostalih gumbov v kalkulatorju (bela pilula, mehka obroba,
     rahla senca), ne rocno sestavljen obris — prej je bil tanek in tuj
     (Tina, 30. 8. 2026). */
  const gumb: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '.5rem', minHeight: '2.75rem',
    padding: '.55rem 1.2rem', border: '1px solid rgba(17,17,17,.16)', borderRadius: 999,
    background: '#fff', color: 'inherit', font: '600 .86rem inherit',
    boxShadow: '0 1px 2px rgba(17,17,17,.05)',
    cursor: tece || brezEnot ? 'default' : 'pointer', opacity: tece || brezEnot ? .45 : 1,
  };
  const drobno: React.CSSProperties = { fontSize: '.76rem', opacity: .58, margin: 0, lineHeight: 1.5 };
  const ikonaPrenos = (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v10" /><path d="m8 11 4 4 4-4" /><path d="M5 19h14" />
    </svg>
  );

  /* BREZ PAKETA: gumb je siv in pelje na nadgradnjo, ne izgine. Skrita funkcija
     ne proda nicesar, tu pa je uporabnica ravno na mestu, kjer bi ji koristila —
     isce promet in dobicek, da postavi ceno (Tina, 30. 8. 2026).
     Neprijavljen obiskovalec kvote sploh ne dobi (401) in gre na cenik. */
  const imaPaket = !!kvota && kvota.mesecno > 0;

  /* BREZPLACNI KALKULATOR: gumb se vidi, a NE dela — tudi ce je uporabnica
     prijavljena in ima paket. Kalkulator je javno, brezplacno orodje; placljiv
     klic AJPES sodi v Flow. Kdor paket ima, ga tu ne porabi, ampak gre v Flow;
     kdor ga nima, vidi, kaj dobi (Tina, 30. 8. 2026).
     V Flowu pa brez davcne ni ne gumba ne ponudbe za nadgradnjo. */
  if (!vLupini || !imaPaket) {
    if (vLupini && cista.length < 8) return null;
    const kam = kvota ? `${base}/kalkulator/paket` : `${base}/flow#cenik`;
    /* Ne prosojen duh: zaklenjeno je videti kot cela, mirna pilula s kljucavnico,
       poziv pa je vijolicen, da se vidi, da je klikljiv (Tina, 30. 8. 2026). */
    return (
      <div style={{ display: 'grid', gap: '.4rem', margin: '.9rem 0 1rem', justifyItems: 'start' }}>
        <a href={kam} style={{
          ...gumb, opacity: 1, width: 'fit-content', textDecoration: 'none',
          background: 'rgba(255,255,255,.55)', color: 'rgba(17,17,17,.62)',
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
          </svg>
          {L('Pridobi podatke', 'Fetch the data')}
          <span style={{ color: 'var(--purple, #7C3AED)' }}>{L('povečaj paket', 'upgrade')}</span>
        </a>
        <p style={drobno}>
          {L('Promet in dobiček prinese Flow iz zadnjega letnega poročila.',
             'Flow fetches revenue and profit from the latest annual report.')}
        </p>
      </div>
    );
  }

  /* Placnik brez davcne stevilke: gumb nima cesa poklicati, davcna pa se
     izpolni sama iz registra ob izbiri stranke. */
  if (cista.length < 8) return null;

  return (
    <div style={{ display: 'grid', gap: '.45rem', margin: '1rem 0 1.1rem' }}>
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
        <div style={{ display: 'grid', gap: '.7rem', justifyItems: 'start' }}>
          <button
            type="button"
            style={gumb}
            disabled={tece || brezEnot}
            onClick={() => (zeImamo ? uporabi(shranjen) : setPotrjujem(true))}
          >
            {ikonaPrenos}
            {tece
              ? L('Pridobivam …', 'Fetching …')
              : L('Pridobi podatke', 'Fetch the data')}
          </button>
          <span style={drobno}>
            {zeImamo
              ? L('To podjetje si že pregledala — ponovni ogled je brezplačen.',
                  'You have checked this company before — viewing it again is free.')
              : brezEnot
                ? L('Ta mesec si porabila vse preglede.', 'You have used all your checks this month.')
                : kvota
                  ? L(`Ostane ti ${kvota.ostanek} od ${kvota.mesecno} pregledov ta mesec; iskanje in ponovni ogled se ne štejeta.`,
                      `${kvota.ostanek} of ${kvota.mesecno} checks left this month; search and repeat views do not count.`)
                  : ''}
          </span>
        </div>
      )}

      {napaka && <p style={{ ...drobno, opacity: 1, color: '#a12323' }} role="alert">{napaka}</p>}
    </div>
  );
}
