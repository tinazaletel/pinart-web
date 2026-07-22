'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import type { Analitika, Obdobje } from './podatki';
import { CENA_PRO_MESECNO } from './podatki';

/* Inline slogi, ker admin namenoma nima skupnega ogrodja z aplikacijo. */
const K = { background: '#fff', borderRadius: 16, padding: '1.1rem 1.3rem', boxShadow: '0 4px 18px rgba(17,17,17,.05)' } as const;
const TH = { padding: '.8rem .5rem', textAlign: 'left' } as const;
const TD = { padding: '.55rem .5rem' } as const;
const NASLOV = { fontSize: '1rem', margin: '2.4rem 0 .8rem', fontWeight: 700 } as const;

const OBDOBJA: Array<{ v: Obdobje; ime: string }> = [
  { v: 30, ime: '30 dni' }, { v: 90, ime: '3 mesece' },
  { v: 365, ime: '12 mesecev' }, { v: 0, ime: 'Vse' },
];

const evr = (n: number) => `${Math.round(n).toLocaleString('sl-SI')} €`;
const brezSumnikov = (v: string) => v.toLowerCase()
  .replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z');

function Koledar() {
  return <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" style={{ flex: 'none' }}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
  </svg>;
}

export default function AdminPregled({ podatki }: { podatki: Analitika }) {
  const [iskanje, setIskanje] = useState('');
  const [razprta, setRazprta] = useState<string[]>([]);

  const q = brezSumnikov(iskanje.trim());
  const ujema = (...polja: string[]) => !q || polja.some(p => brezSumnikov(p).includes(q));

  /* storitve po podrocjih — brez tega je pri 25 storitvah tabela neberljiva */
  const poPodrocjih = useMemo(() => {
    const m = new Map<string, typeof podatki.storitve>();
    podatki.storitve.filter(s => ujema(s.storitev, s.podrocje))
      .forEach(s => m.set(s.podrocje, [...(m.get(s.podrocje) || []), s]));
    return [...m.entries()]
      .map(([podrocje, s]) => ({
        podrocje, storitve: s,
        stevilo: s.reduce((v, x) => v + x.stevilo, 0),
        mediana: Math.round(s.reduce((v, x) => v + x.mediana * x.stevilo, 0) / (s.reduce((v, x) => v + x.stevilo, 0) || 1)),
      }))
      .sort((a, b) => b.stevilo - a.stevilo);
  }, [podatki.storitve, q]);

  const skupine = podatki.skupine.filter(s => ujema(s.storitve, s.izkusnje, s.trgNarocnika));
  const trgi = podatki.trgi.filter(t => ujema(t.mojTrg));

  const kartice = [
    { oznaka: 'Računov skupaj', vrednost: String(podatki.racunovSkupaj) },
    { oznaka: 'Plačljivih (pro)', vrednost: String(podatki.proRacunov) },
    { oznaka: 'Ocenjeni mesečni prihodek', vrednost: evr(podatki.ocenjenPrihodekMesecno), opomba: `${podatki.proRacunov} × ${CENA_PRO_MESECNO} €` },
    { oznaka: 'Ocenjeni letni prihodek', vrednost: evr(podatki.ocenjenPrihodekMesecno * 12), opomba: 'če se nič ne spremeni' },
  ];

  return <>
    {/* obdobje + iskanje */}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.7rem', alignItems: 'center', margin: '0 0 1.6rem' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', opacity: .6, fontSize: '.78rem' }}>
        <Koledar /> Obdobje
      </span>
      <div style={{ display: 'flex', gap: '.25rem', padding: '.22rem', border: '1px solid rgba(17,17,17,.12)', borderRadius: 999, background: '#fff' }}>
        {OBDOBJA.map(o => {
          const izbran = podatki.obdobje === o.v;
          return <Link key={o.v} href={`?obdobje=${o.v}`} style={{
            padding: '.4rem .85rem', borderRadius: 999, textDecoration: 'none',
            background: izbran ? '#111' : 'transparent', color: izbran ? '#fff' : 'rgba(17,17,17,.6)',
            fontSize: '.75rem', fontWeight: 700, whiteSpace: 'nowrap',
          }}>{o.ime}</Link>;
        })}
      </div>
      <input value={iskanje} onChange={e => setIskanje(e.target.value)} type="search"
        placeholder="Išči storitev, področje ali trg…" aria-label="Išči"
        style={{
          flex: '1 1 15rem', minWidth: 0, padding: '.55rem .95rem', borderRadius: 999,
          border: '1px solid rgba(17,17,17,.12)', background: '#fff',
          font: 'inherit', fontSize: '.82rem',
        }} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(11rem,1fr))', gap: '1rem' }}>
      {kartice.map(k => (
        <div key={k.oznaka} style={K}>
          <div style={{ fontSize: '.76rem', opacity: .6, marginBottom: '.35rem' }}>{k.oznaka}</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{k.vrednost}</div>
          {k.opomba && <div style={{ fontSize: '.7rem', opacity: .5, marginTop: '.25rem' }}>{k.opomba}</div>}
        </div>
      ))}
    </div>
    <p style={{ fontSize: '.74rem', opacity: .55, margin: '.7rem 0 0' }}>
      Prihodek je <b>ocena</b> iz števila aktivnih naročnin krat cena paketa, ne dejansko nakazan denar.
      Ko bo plačila obdeloval ponudnik, bo tu njegov podatek.
    </p>

    {/* ── storitve po podrocjih ─────────────────────────────────────────── */}
    <h2 style={NASLOV}>Katere storitve se največkrat vpisujejo</h2>
    <div style={{ ...K, overflowX: 'auto', padding: '.4rem 1.3rem 1rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 420 }}>
        <thead><tr style={{ borderBottom: '1px solid rgba(17,17,17,.15)' }}>
          <th style={TH}>Področje / storitev</th><th style={TH}>Št. vpisov</th><th style={TH}>Mediana</th>
        </tr></thead>
        <tbody>
          {poPodrocjih.map(p => {
            const odprt = razprta.includes(p.podrocje) || !!q;
            /* kljuc mora biti na NAJBOLJ ZUNANJEM elementu iz map(), torej na fragmentu */
            return <Fragment key={p.podrocje}>
              <tr style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
                <td style={TD}>
                  <button type="button" onClick={() => setRazprta(v => odprt ? v.filter(x => x !== p.podrocje) : [...v, p.podrocje])}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', border: 0, background: 'none', font: 'inherit', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    <span style={{ display: 'inline-block', transition: 'transform .18s', transform: odprt ? 'rotate(90deg)' : 'none', opacity: .5 }}>›</span>
                    {p.podrocje}
                  </button>
                </td>
                <td style={{ ...TD, fontWeight: 700 }}>{p.stevilo}</td>
                <td style={{ ...TD, fontWeight: 700 }}>{evr(p.mediana)}</td>
              </tr>
              {odprt && p.storitve.map(s => (
                <tr key={`${p.podrocje}-${s.storitev}`} style={{ borderBottom: '1px solid rgba(17,17,17,.04)' }}>
                  <td style={{ ...TD, paddingLeft: '2rem', opacity: .8 }}>{s.storitev}</td>
                  <td style={TD}>{s.stevilo}</td>
                  <td style={TD}>{evr(s.mediana)}</td>
                </tr>
              ))}
            </Fragment>;
          })}
          {!poPodrocjih.length && <tr><td colSpan={3} style={{ padding: '1.4rem .5rem', opacity: .6 }}>
            {q ? `Ni zadetkov za »${iskanje}«.` : 'Še ni podatkov.'}
          </td></tr>}
        </tbody>
      </table>
    </div>

    {/* ── od kod so ─────────────────────────────────────────────────────── */}
    <h2 style={NASLOV}>Od kod so uporabniki</h2>
    <p style={{ opacity: .55, fontSize: '.78rem', margin: '-.5rem 0 .8rem' }}>
      Trg, ki ga uporabnik izbere sam. IP naslovov ne zbiramo.
    </p>
    <div style={{ ...K, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 360 }}>
        <thead><tr style={{ borderBottom: '1px solid rgba(17,17,17,.15)' }}>
          <th style={TH}>Trg</th><th style={TH}>Št.</th><th style={TH}>Mediana</th>
        </tr></thead>
        <tbody>
          {trgi.map(t => <tr key={t.mojTrg} style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
            <td style={TD}>{t.mojTrg}</td><td style={TD}>{t.stevilo}</td>
            <td style={{ ...TD, fontWeight: 600 }}>{evr(t.mediana)}</td>
          </tr>)}
          {!trgi.length && <tr><td colSpan={3} style={{ padding: '1.4rem .5rem', opacity: .6 }}>Še ni podatkov.</td></tr>}
        </tbody>
      </table>
    </div>

    {/* ── cene po kombinaciji ───────────────────────────────────────────── */}
    <h2 style={NASLOV}>Cene po storitvi, izkušnjah in trgu</h2>
    <div style={{ ...K, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 560 }}>
        <thead><tr style={{ borderBottom: '1px solid rgba(17,17,17,.15)' }}>
          <th style={TH}>Storitve</th><th style={TH}>Izkušnje</th><th style={TH}>Trg naročnika</th>
          <th style={TH}>Št.</th><th style={TH}>Mediana</th><th style={TH}>Min–maks</th>
        </tr></thead>
        <tbody>
          {skupine.slice(0, 200).map(s => <tr key={s.kljuc} style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
            <td style={TD}>{s.storitve}</td><td style={TD}>{s.izkusnje}</td><td style={TD}>{s.trgNarocnika}</td>
            <td style={TD}>{s.stevilo}</td>
            <td style={{ ...TD, fontWeight: 600 }}>{evr(s.mediana)}</td>
            <td style={{ ...TD, opacity: .6 }}>{evr(s.min)}–{evr(s.maks)}</td>
          </tr>)}
          {!skupine.length && <tr><td colSpan={6} style={{ padding: '1.4rem .5rem', opacity: .6 }}>
            {q ? `Ni zadetkov za »${iskanje}«.` : 'Še ni podatkov.'}
          </td></tr>}
        </tbody>
      </table>
      {skupine.length > 200 && <p style={{ fontSize: '.74rem', opacity: .55, margin: '.8rem 0 0' }}>
        Prikazanih prvih 200 od {skupine.length} kombinacij. Zoži z iskanjem.
      </p>}
    </div>

    {/* ── uporaba po mesecih ────────────────────────────────────────────── */}
    <h2 style={NASLOV}>Uporaba po mesecih</h2>
    <div style={{ ...K, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem', minWidth: 460 }}>
        <thead><tr style={{ borderBottom: '1px solid rgba(17,17,17,.15)' }}>
          <th style={TH}>Mesec</th><th style={TH}>Obiskov</th><th style={TH}>Nevpisanih</th>
          <th style={TH}>Cenovnih točk</th><th style={TH}>Dogodkov</th>
        </tr></thead>
        <tbody>
          {podatki.meseci.map(m => <tr key={m.mesec} style={{ borderBottom: '1px solid rgba(17,17,17,.06)' }}>
            <td style={TD}>{new Date(`${m.mesec}-01T12:00:00`).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' })}</td>
            <td style={{ ...TD, fontWeight: 600 }}>{m.sej}</td><td style={TD}>{m.nevpisanih}</td>
            <td style={TD}>{m.cenovnihTock}</td><td style={{ ...TD, opacity: .6 }}>{m.dogodkov}</td>
          </tr>)}
          {!podatki.meseci.length && <tr><td colSpan={5} style={{ padding: '1.4rem .5rem', opacity: .6 }}>Še ni podatkov.</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
