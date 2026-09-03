'use client';

import { useEffect, useState } from 'react';
import { PANOGE, panogaZa } from '@/lib/vprasalnikPanoge';

/**
 * IZPOLNJENI VPRAŠALNIKI O CENAH (tabela vprasalnik_odgovori).
 *
 * Prej so hodili kot Excel priponke in se izgubljali v pošti. Tu so vsi na
 * enem mestu, odprti po vrsticah, z vprašanjem ob odgovoru — brez tega je
 * jsonb z dvesto ključi neberljiv.
 *
 * Vsebina so tuje cene, dane ob obljubi, da jih ne objavimo in ne delimo
 * naprej. Ta zaslon je edino mesto, kjer se vidijo posamično.
 */

type Zapis = {
  id: string;
  panoga: string;
  odgovori: Record<string, string>;
  ime: string | null;
  email: string | null;
  izpolnjenih: number;
  skupaj: number;
  created_at: string;
};

const datum = (s: string) =>
  new Date(s).toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminVprasalniki() {
  const [zapisi, setZapisi] = useState<Zapis[] | null>(null);
  const [odprt, setOdprt] = useState<string | null>(null);
  const [napaka, setNapaka] = useState('');

  useEffect(() => {
    let ziv = true;
    fetch('/api/kalkulator-admin/vprasalnik', { cache: 'no-store' })
      .then(async r => {
        const t = await r.json().catch(() => ({})) as { vprasalniki?: Zapis[]; error?: string };
        if (!ziv) return;
        if (!r.ok) throw new Error(t.error || 'Branje ni uspelo');
        setZapisi(t.vprasalniki || []);
      })
      .catch(e => { if (ziv) { setNapaka(e instanceof Error ? e.message : 'Branje ni uspelo'); setZapisi([]); } });
    return () => { ziv = false; };
  }, []);

  if (zapisi === null) return <section className="av"><h2>Vprašalniki o cenah</h2><p>Nalagam …</p></section>;

  const poPanogi = PANOGE.map(p => ({ p, n: zapisi.filter(z => z.panoga === p.id).length }));

  return <section className="av">
    <h2>Vprašalniki o cenah</h2>
    {napaka && <p className="av-napaka">{napaka}</p>}

    <p className="av-stevec">
      {zapisi.length === 0 ? 'Še nihče ni izpolnil.' : `${zapisi.length} izpolnjenih`}
      {zapisi.length > 0 && ' · '}
      {zapisi.length > 0 && poPanogi.filter(x => x.n > 0).map(x => `${x.p.ime}: ${x.n}`).join(' · ')}
    </p>

    <p className="av-povezave">
      Povezave za pošiljanje:{' '}
      {PANOGE.map((p, i) => (
        <span key={p.id}>
          {i > 0 && ' · '}
          <a href={`/vprasalnik/${p.id}`} target="_blank" rel="noopener noreferrer">{p.ime}</a>
        </span>
      ))}
    </p>

    {zapisi.map(z => {
      const panoga = panogaZa(z.panoga);
      const jeOdprt = odprt === z.id;
      return (
        <article key={z.id} className="av-zapis">
          <button type="button" onClick={() => setOdprt(jeOdprt ? null : z.id)}>
            <b>{z.ime || 'brez imena'}</b>
            <span>{panoga?.ime || z.panoga} · {z.izpolnjenih}/{z.skupaj} · {datum(z.created_at)}</span>
          </button>
          {jeOdprt && (
            <div className="av-vsebina">
              {z.email && <p className="av-kontakt"><a href={`mailto:${z.email}`}>{z.email}</a></p>}
              {panoga ? panoga.sklopi.map(s => {
                const vrstice = s.vprasanja
                  .map(v => ({ v, odg: z.odgovori[v.id], dop: z.odgovori[`${v.id}::dop`] }))
                  .filter(x => x.odg);
                if (!vrstice.length) return null;
                return (
                  <div key={s.sklop} className="av-sklop">
                    <h3>{s.sklop}</h3>
                    {vrstice.map(({ v, odg, dop }) => (
                      <div key={v.id} className="av-vrsta">
                        <span>{v.q}</span>
                        <b>{odg}{dop ? ` — ${dop}` : ''}</b>
                      </div>
                    ))}
                  </div>
                );
              }) : <pre>{JSON.stringify(z.odgovori, null, 2)}</pre>}
            </div>
          )}
        </article>
      );
    })}

    <style jsx>{`
      .av { margin: 2.5rem 0; }
      .av h2 { margin: 0 0 .6rem; font-size: 1.2rem; }
      .av-stevec, .av-povezave { margin: 0 0 .6rem; font-size: .84rem;
                                 color: color-mix(in oklch, var(--ink, #1c1518) 62%, transparent); }
      .av-povezave a { color: var(--purple, #7C3AED); }
      .av-napaka { color: var(--red, #B3261E); font-size: .85rem; }
      .av-zapis { border: 1px solid color-mix(in oklch, var(--ink, #1c1518) 10%, transparent);
                  border-radius: .8rem; margin-bottom: .5rem; overflow: hidden; background: #fff; }
      .av-zapis > button { display: flex; align-items: baseline; justify-content: space-between;
                           gap: 1rem; width: 100%; padding: .8rem 1rem; border: 0; background: none;
                           text-align: left; cursor: pointer; font: inherit; color: inherit; }
      .av-zapis > button:hover { background: color-mix(in oklch, var(--ink, #1c1518) 3%, transparent); }
      .av-zapis > button span { flex: none; font-size: .78rem;
                                color: color-mix(in oklch, var(--ink, #1c1518) 58%, transparent); }
      .av-vsebina { padding: 0 1rem 1rem; }
      .av-kontakt { margin: 0 0 .8rem; font-size: .84rem; }
      .av-sklop h3 { margin: 1rem 0 .4rem; font-size: .72rem; font-weight: 700; letter-spacing: .12em;
                     text-transform: uppercase; color: color-mix(in oklch, var(--ink, #1c1518) 55%, transparent); }
      .av-vrsta { display: flex; align-items: baseline; justify-content: space-between; gap: 1.2rem;
                  padding: .32rem 0; font-size: .86rem; line-height: 1.45;
                  border-top: 1px solid color-mix(in oklch, var(--ink, #1c1518) 6%, transparent); }
      .av-vrsta span { color: color-mix(in oklch, var(--ink, #1c1518) 70%, transparent); }
      .av-vrsta b { flex: none; font-variant-numeric: tabular-nums; }
      .av-vsebina pre { font-size: .74rem; overflow-x: auto; }
    `}</style>
  </section>;
}
