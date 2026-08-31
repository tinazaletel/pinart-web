'use client';

/* VPRAŠALNIK, KI GA IZPOLNI STRANKA.
 *
 * Ista drža kot portal za stranko: čista, tiha stran brez menija, brez Pupe,
 * brez orodij. Stranka ni uporabnica Flowa; če dobi občutek, da je zašla v tuj
 * program, obrazca ne bo izpolnila.
 *
 * Preverjanje tu je vljudnost (da ne izgubi vnosa), ne varovalka — zavezujoče
 * preverjanje je na strežniku (lib/vprasalnik.ts).
 */

import { useEffect, useState } from 'react';
import type { Vprasanje } from '@/lib/vprasalnik';

type Podatki = { naslov: string; uvod?: string; podjetje?: string | null; logo?: string | null; barva?: string | null; vprasanja: Vprasanje[]; zaprt?: boolean };

export default function VprasalnikOgled({ zeton, jeEn = false }: { zeton: string; jeEn?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [podatki, setPodatki] = useState<Podatki | null>(null);
  const [napaka, setNapaka] = useState('');
  const [vnos, setVnos] = useState<Record<string, string | string[]>>({});
  const [napake, setNapake] = useState<Record<string, string>>({});
  const [poslano, setPoslano] = useState(false);
  const [posiljam, setPosiljam] = useState(false);

  useEffect(() => {
    fetch(`/api/vprasalnik/${encodeURIComponent(zeton)}`)
      .then(async r => {
        if (!r.ok) { setNapaka('ni'); return; }
        setPodatki(await r.json());
      })
      .catch(() => setNapaka('ni'));
  }, [zeton]);

  const nastavi = (id: string, v: string | string[]) => {
    setVnos(s => ({ ...s, [id]: v }));
    setNapake(n => (n[id] ? { ...n, [id]: '' } : n));
  };

  const preklopi = (id: string, moznost: string) => {
    const trenutno = Array.isArray(vnos[id]) ? (vnos[id] as string[]) : [];
    nastavi(id, trenutno.includes(moznost) ? trenutno.filter(x => x !== moznost) : [...trenutno, moznost]);
  };

  async function poslji(e: React.FormEvent) {
    e.preventDefault();
    if (!podatki || posiljam) return;
    setPosiljam(true);
    try {
      const odgovor = await fetch(`/api/vprasalnik/${encodeURIComponent(zeton)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ odgovori: vnos, jeEn }),
      });
      if (odgovor.ok) { setPoslano(true); return; }
      const j = await odgovor.json().catch(() => null);
      if (Array.isArray(j?.napake)) {
        const zemljevid: Record<string, string> = {};
        for (const n of j.napake) zemljevid[String(n.id)] = String(n.sporocilo);
        setNapake(zemljevid);
        /* Skoči na prvo napako: na dolgem obrazcu je sicer ne vidiš. */
        const prva = document.querySelector('[data-napaka="1"]');
        prva?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setNapake({ _: L('Oddaja ni uspela. Poskusi znova.', 'Submission failed. Please try again.') });
      }
    } catch {
      setNapake({ _: L('Ni povezave.', 'No connection.') });
    } finally {
      setPosiljam(false);
    }
  }

  /* Barva znamke poganja gumb in oznake izbir; brez nje ostane crna. */
  const ovoj = (vsebina: React.ReactNode) => (
    <main className="vp" style={podatki?.barva ? ({ ['--znamka' as string]: podatki.barva }) : undefined}>
      {vsebina}
      <style jsx>{stil}</style>
    </main>
  );

  if (napaka) return ovoj(
    <div className="vp-sredina">
      <h1>{L('Povezava ne velja več.', 'This link is no longer valid.')}</h1>
      <p>{L('Prosi za novo povezavo tistega, ki ti jo je poslal.', 'Ask whoever sent it for a new link.')}</p>
    </div>,
  );

  if (!podatki) return ovoj(<div className="vp-sredina"><p>{L('Nalagam …', 'Loading …')}</p></div>);

  if (podatki.zaprt) return ovoj(
    <div className="vp-sredina">
      <h1>{podatki.naslov}</h1>
      <p>{L('Ta vprašalnik je zaprt in ne sprejema več odgovorov.', 'This questionnaire is closed and no longer accepts answers.')}</p>
    </div>,
  );

  if (poslano) return ovoj(
    <div className="vp-sredina">
      <h1>{L('Hvala — prejeto.', 'Thank you — received.')}</h1>
      <p>{L('Odgovori so oddani. Oglasim se v kratkem.', 'Your answers have been submitted. You will hear back shortly.')}</p>
    </div>,
  );

  return ovoj(
    <>
      <header className="vp-glava">
        {podatki.logo
          ? <img className="vp-logo" src={podatki.logo} alt={podatki.podjetje || ''} />
          : podatki.podjetje && <p className="vp-podjetje">{podatki.podjetje}</p>}
        <h1>{podatki.naslov}</h1>
        {podatki.uvod && <p className="vp-uvod">{podatki.uvod}</p>}
      </header>

      <form onSubmit={poslji} noValidate>
        {podatki.vprasanja.map(v => {
          const nap = napake[v.id];
          return (
            <fieldset key={v.id} className="vp-polje" data-napaka={nap ? '1' : undefined}>
              <legend>
                {v.besedilo}
                {v.obvezno && <span className="vp-zvezda" aria-hidden> *</span>}
              </legend>
              {v.namig && <p className="vp-namig">{v.namig}</p>}

              {v.tip === 'dolgo' && (
                <textarea rows={4} value={String(vnos[v.id] || '')}
                  onChange={e => nastavi(v.id, e.target.value)} />
              )}
              {(v.tip === 'kratko' || v.tip === 'stevilka' || v.tip === 'datum') && (
                <input
                  type={v.tip === 'datum' ? 'date' : v.tip === 'stevilka' ? 'number' : 'text'}
                  value={String(vnos[v.id] || '')}
                  onChange={e => nastavi(v.id, e.target.value)} />
              )}
              {v.tip === 'izbira' && (
                <div className="vp-moznosti">
                  {(v.moznosti || []).map(m => (
                    <label key={m} className={'vp-moznost' + (vnos[v.id] === m ? ' on' : '')}>
                      <input type="radio" name={v.id} value={m} checked={vnos[v.id] === m}
                        onChange={() => nastavi(v.id, m)} />
                      {m}
                    </label>
                  ))}
                </div>
              )}
              {v.tip === 'vec' && (
                <div className="vp-moznosti">
                  {(v.moznosti || []).map(m => {
                    const izbrano = Array.isArray(vnos[v.id]) && (vnos[v.id] as string[]).includes(m);
                    return (
                      <label key={m} className={'vp-moznost' + (izbrano ? ' on' : '')}>
                        <input type="checkbox" checked={izbrano} onChange={() => preklopi(v.id, m)} />
                        {m}
                      </label>
                    );
                  })}
                </div>
              )}

              {nap && <p className="vp-napaka" role="alert">{nap}</p>}
            </fieldset>
          );
        })}

        {napake._ && <p className="vp-napaka" role="alert">{napake._}</p>}

        <button type="submit" className="vp-poslji" disabled={posiljam}>
          {posiljam ? L('Pošiljam …', 'Sending …') : L('Pošlji odgovore', 'Send answers')}
        </button>
        <p className="vp-drobno">
          {L('Odgovore prejme le', 'Only')} {podatki.podjetje || L('tisti, ki ti je poslal povezavo', 'the person who sent you this link')}{L('.', ' receives your answers.')}
        </p>
      </form>
    </>,
  );
}

const stil = `
  .vp { max-width: 44rem; margin: 0 auto; padding: 3rem 1.3rem 4rem; color: #111; }
  .vp-sredina { min-height: 60vh; display: flex; flex-direction: column; justify-content: center; gap: .6rem; }
  .vp-sredina h1, .vp-glava h1 {
    margin: 0; font-size: 2.1rem; line-height: 1.15;
    /* Samostojna stran: DM Serif je preslikan samo znotraj .cw/.fl/.shell,
       zato tu var(--font-serif-flow) — sicer pade v Bodoni. */
    font-family: var(--font-serif-flow, var(--font-serif)), Georgia, serif;
  }
  .vp-logo { display: block; max-width: 11rem; max-height: 4.5rem; width: auto; height: auto; margin: 0 0 1.4rem; }
  .vp-podjetje {
    margin: 0 0 .5rem;
    font-size: .75rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase;
    color: rgba(17,17,17,.5);
  }
  .vp-uvod { margin: .8rem 0 0; font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.72); }
  .vp-glava { margin-bottom: 2.2rem; }

  .vp-polje { border: 0; padding: 0; margin: 0 0 1.7rem; }
  .vp-polje legend { padding: 0; font-size: .98rem; font-weight: 650; line-height: 1.35; }
  .vp-zvezda { color: oklch(58% .18 25); }
  .vp-namig { margin: .3rem 0 0; font-size: .84rem; line-height: 1.5; color: rgba(17,17,17,.6); }

  .vp-polje input[type="text"], .vp-polje input[type="date"], .vp-polje input[type="number"], .vp-polje textarea {
    width: 100%; box-sizing: border-box; margin-top: .55rem; padding: .7rem .85rem;
    border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .7rem; background: #fff;
    font: inherit; font-size: .95rem; color: #111;
  }
  .vp-polje textarea { resize: vertical; line-height: 1.55; }
  .vp-polje input:focus, .vp-polje textarea:focus { outline: none; border-color: var(--znamka, var(--purple, #7C3AED)); }

  .vp-moznosti { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .6rem; }
  .vp-moznost {
    display: inline-flex; align-items: center; gap: .45rem; padding: .5rem .85rem;
    border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: 999px; background: #fff;
    font-size: .9rem; cursor: pointer;
  }
  .vp-moznost.on { border-color: var(--znamka, var(--purple, #7C3AED)); color: var(--znamka, var(--purple, #7C3AED)); background: color-mix(in oklch, var(--znamka, #7C3AED) 8%, transparent); }
  .vp-moznost input { accent-color: var(--purple, #7C3AED); }

  .vp-napaka { margin: .45rem 0 0; font-size: .85rem; font-weight: 600; color: oklch(52% .17 25); }

  .vp-poslji {
    margin-top: .6rem; padding: .85rem 1.6rem; border: 0; border-radius: 999px;
    background: var(--znamka, #111); color: #fff; font: inherit; font-weight: 600; cursor: pointer;
  }
  .vp-poslji:disabled { opacity: .6; cursor: default; }
  .vp-drobno { margin: .9rem 0 0; font-size: .8rem; color: rgba(17,17,17,.55); }
`;
