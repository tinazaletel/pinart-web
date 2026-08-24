'use client';

/* NAŠEPETAVALNIK PODJETIJ — vtipkaš »Ino«, ponudi »Inovis« in ob izbiri sam
   izpolni ime, naslov in davčno. Davčne v registru AJPES ni — pride iz FURS-ovih
   seznamov zavezancev (pravne osebe + s.p.), povezanih po matični številki.
   VIRA STA DVA in oba sta na OPSI pod CC BY 4.0 — AJPES (ime, naslov) in FURS
   (davčna); licenca zahteva navedbo obeh, zato sta imenovana v spustnem seznamu,
   kjer se podatek pokaže.

   Namenoma NI samostojno polje: ovije obstoječi <input> za ime stranke, da
   uporabnica lahko ime tudi preprosto natipka, če je stranka iz tujine ali je
   register ne pozna. */

import { useEffect, useRef, useState } from 'react';

export type Podjetje = {
  /* pri zapisih IZ REGISTRA je matična vedno prisotna; pri lastnih strankah je ni */
  maticna?: string;
  ime: string;
  naslov?: string | null;
  posta_st?: string | null;
  posta?: string | null;
  davcna?: string | null;
  ddv?: boolean | null;
  email?: string | null;
  oseba?: string | null;
  /* od kod zadetek: iz uporabnicinega imenika ali iz javnega registra */
  vir?: 'moje' | 'register';
};

export default function IskalnikPodjetij({
  vrednost, naVrednost, naIzbiro, lastne = [], jeEn = false, id, ime = 'ime', obvezno = false, namig,
}: {
  vrednost: string;
  /* Namig naj bo PRIMER, ne ponovitev oznake nad poljem. */
  namig?: string;
  naVrednost: (v: string) => void;
  /* klic ob izbiri iz seznama — starš napolni naslov in davčno */
  naIzbiro: (p: Podjetje) => void;
  /* uporabnicine ŽE OBSTOJEČE stranke — pokažejo se PRED registrom, ker je
     njen lasten zapis (s kontaktom in e-pošto) vreden več kot javni podatek */
  lastne?: Podjetje[];
  jeEn?: boolean;
  id?: string;
  ime?: string;
  obvezno?: boolean;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const poenoti = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const [zadetki, setZadetki] = useState<Podjetje[]>([]);
  const [odprt, setOdprt] = useState(false);
  const [iscem, setIscem] = useState(false);
  const [oznacen, setOznacen] = useState(-1);
  /* Podjetje je izbrano: seznam ostane zaprt, dokler uporabnica znova ne tipka.
     Brez tega se ob vnovicnem fokusu odpre prazen seznam z »Ni zadetka«, ceprav
     je izbira uspela — po izbiri namrec namenoma ne iscemo vec. */
  const [izbrano, setIzbrano] = useState(false);
  const [napaka, setNapaka] = useState('');
  const ovoj = useRef<HTMLDivElement | null>(null);
  /* zadnje vpisano — da počasen odgovor ne prepiše novejšega iskanja */
  const zadnji = useRef('');
  /* Po izbiri iz seznama NE iščemo znova: vrednost je takrat polno ime iz
     registra, ki bi ga iskali samega sebe — nepotreben klic, ki je ob dolgih
     imenih vračal prazno in pod poljem izpisal »Ni zadetka«. */
  const pravkarIzbrano = useRef(false);

  useEffect(() => {
    const q = vrednost.trim();
    zadnji.current = q;
    if (pravkarIzbrano.current) { pravkarIzbrano.current = false; setZadetki([]); setIscem(false); return; }
    if (q.length < 3) { setZadetki([]); setIscem(false); return; }
    setIscem(true);
    const cakalec = setTimeout(async () => {
      try {
        const res = await fetch(`/api/podjetja?q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => null);
        if (zadnji.current !== q) return;
        setNapaka(res.ok ? '' : L('Iskanje po registru trenutno ne dela.', 'The register search is currently unavailable.'));
        setZadetki(Array.isArray(data?.zadetki) ? data.zadetki : []);
        setOznacen(-1);
      } catch {
        if (zadnji.current !== q) return;
        setZadetki([]);
        setNapaka(L('Iskanje po registru trenutno ne dela.', 'The register search is currently unavailable.'));
      } finally {
        if (zadnji.current === q) setIscem(false);
      }
    }, 250);
    return () => clearTimeout(cakalec);
  }, [vrednost]);

  useEffect(() => {
    const zunaj = (e: MouseEvent) => {
      if (ovoj.current && !ovoj.current.contains(e.target as Node)) setOdprt(false);
    };
    document.addEventListener('mousedown', zunaj);
    return () => document.removeEventListener('mousedown', zunaj);
  }, []);

  const izberi = (p: Podjetje) => {
    pravkarIzbrano.current = true;
    setIzbrano(true);
    naVrednost(p.ime);
    naIzbiro(p);
    setOdprt(false);
    setZadetki([]);
  };

  const naTipko = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!odprt || !registerZadetki.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOznacen(i => Math.min(i + 1, registerZadetki.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setOznacen(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && oznacen >= 0) { e.preventDefault(); izberi({ ...registerZadetki[oznacen], vir: 'register' }); }
    else if (e.key === 'Escape') setOdprt(false);
  };

  /* Lastne stranke iščemo LOKALNO in že od drugega znaka — jih je malo,
     zato ni razloga za čakanje na strežnik. */
  const q = poenoti(vrednost.trim());
  const mojiZadetki = q.length >= 2
    ? lastne.filter(s => s.ime && poenoti(s.ime).includes(q)).slice(0, 5)
    : [];
  const mojaImena = new Set(mojiZadetki.map(s => poenoti(s.ime)));
  /* isto podjetje ne sme biti dvakrat: če je že med njenimi, ga iz registra izpustimo */
  const registerZadetki = zadetki.filter(z => !mojaImena.has(poenoti(z.ime)));
  const pokazi = odprt && !izbrano && (vrednost.trim().length >= 2);
  const karKoli = mojiZadetki.length > 0 || registerZadetki.length > 0;

  return (
    <div className="ip" ref={ovoj}>
      <input
        id={id}
        name={ime}
        required={obvezno}
        autoComplete="off"
        value={vrednost}
        onChange={e => { setIzbrano(false); naVrednost(e.target.value); setOdprt(true); }}
        onFocus={() => setOdprt(true)}
        onKeyDown={naTipko}
        placeholder={namig || L('Začni tipkati ime …', 'Start typing a name …')}
      />
      {pokazi && (karKoli || iscem) && (
        <div className="ip-seznam" role="listbox">
          {mojiZadetki.length > 0 && (
            <>
              <p className="ip-skupina">{L('Moje stranke', 'My clients')}</p>
              {mojiZadetki.map(s => (
                <button key={'moje-' + s.ime} type="button" role="option" aria-selected={false}
                  className="ip-zadetek ip-moja" onClick={() => izberi({ ...s, vir: 'moje' })}>
                  <strong>{s.ime}</strong>
                  {(s.naslov || s.davcna) && <small>{[s.naslov, s.davcna ? 'DŠ ' + s.davcna : ''].filter(Boolean).join(' · ')}</small>}
                </button>
              ))}
            </>
          )}
          {iscem && !registerZadetki.length && <p className="ip-tiho">{L('Iščem po registru …', 'Searching the register …')}</p>}
          {registerZadetki.length > 0 && (
            <>
              <p className="ip-skupina">{L('Iz registra', 'From the register')}</p>
              {registerZadetki.map((pod, i) => (
                <button key={pod.maticna || pod.ime} type="button" role="option" aria-selected={i === oznacen}
                  className={'ip-zadetek' + (i === oznacen ? ' on' : '')}
                  onMouseEnter={() => setOznacen(i)}
                  onClick={() => izberi({ ...pod, vir: 'register' })}>
                  <strong>{pod.ime}</strong>
                  <small>{[pod.naslov, [pod.posta_st, pod.posta].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</small>
                </button>
              ))}
              <small className="ip-vir">{L('Vira: Poslovni register Slovenije (AJPES) in seznami davčnih zavezancev (FURS) — OPSI, CC BY 4.0', 'Sources: Slovenian Business Register (AJPES) and tax-payer registers (FURS) — OPSI, CC BY 4.0')}</small>
            </>
          )}
        </div>
      )}
      {napaka && <p className="ip-sporocilo ip-napaka" role="alert">{napaka}</p>}
      {pokazi && !iscem && !napaka && !karKoli && vrednost.trim().length >= 3 && (
        <p className="ip-sporocilo">{L('Ni zadetka — ime kar vpiši sama.', 'No match — just type the name.')}</p>
      )}

      <style jsx>{`
        /* NIC pod poljem: vsa pojasnila so v spustnem seznamu, ki plava nad
           vsebino. Tako je celica enako visoka kot ostala polja in vrstica
           obrazca ostane poravnana. */
        .ip { position: relative; display: block; }
        .ip :global(input) { width: 100%; }
        .ip-seznam { position: absolute; top: 100%; left: 0; right: 0; z-index: 40; margin-top: .25rem; max-height: 17rem; overflow-y: auto; background: #fff; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: 12px; box-shadow: 0 12px 30px rgba(17,17,17,.12); }
        .ip-zadetek { display: flex; flex-direction: column; gap: .1rem; width: 100%; padding: .55rem .8rem; border: 0; background: transparent; text-align: left; font: inherit; cursor: pointer; }
        .ip-zadetek + .ip-zadetek { border-top: 1px solid var(--line, rgba(17,17,17,.08)); }
        .ip-zadetek.on { background: #F5F2EA; }
        .ip-zadetek strong { font-size: .86rem; font-weight: 600; color: var(--ink, #111); line-height: 1.3; }
        .ip-zadetek small { font-size: .76rem; color: #6b655d; }
        .ip-skupina { margin: 0; padding: .45rem .8rem .2rem; font-size: .62rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #6b655d; }
        .ip-moja strong { color: #6E4FA6; }
        .ip-tiho { margin: 0; padding: .55rem .8rem; font-size: .8rem; color: #6b655d; }
        .ip-sporocilo { margin: .35rem 0 0; font-size: .74rem; line-height: 1.35; color: #6b655d; }
        .ip-napaka { color: #a4342a; font-weight: 600; }
        .ip-vir { display: block; padding: .4rem .8rem .5rem; border-top: 1px solid var(--line, rgba(17,17,17,.08)); font-size: .66rem; color: #6b655d; }
      `}</style>
    </div>
  );
}
