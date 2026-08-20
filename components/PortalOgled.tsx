'use client';

/* POGLED ZA STRANKO — kar vidi tisti, ki mu pošlješ povezavo.
 *
 * Namenoma je to čista, tiha stran: brez menija, brez Pupe, brez orodij. Stranka
 * ni uporabnica Flowa in ne sme dobiti občutka, da je zašla v tuj program.
 *
 * Kaj se pokaže, določa zaledje (app/api/portal/[zeton]) — tu ni filtrov, ki bi
 * jih kdo lahko po nesreči odstranil; komponenta izriše natanko to, kar dobi.
 */

import { useEffect, useState } from 'react';

type Podatki = {
  studio: string;
  projekt: { naslov: string; status: string; zacetek: string; rok: string };
  brief: Record<string, string>;
  cilji: string[];
  povezave: { naslov: string; url: string }[];
};

const datum = (s: string) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('sl-SI');
};

const STANJE: Record<string, string> = { aktiven: 'V teku', pavza: 'V pavzi', koncan: 'Zaključen' };

export default function PortalOgled({ zeton }: { zeton: string }) {
  const [podatki, setPodatki] = useState<Podatki | null>(null);
  const [napaka, setNapaka] = useState('');

  useEffect(() => {
    fetch(`/api/portal/${encodeURIComponent(zeton)}`)
      .then(async r => {
        if (!r.ok) { setNapaka('ni'); return; }
        setPodatki(await r.json());
      })
      .catch(() => setNapaka('ni'));
  }, [zeton]);

  if (napaka) {
    return (
      <main className="po po-sredina">
        <div>
          <h1>Povezava ni veljavna</h1>
          <p>Morda je bila preklicana ali pa je potekla. Prosi za novo tistega, ki ti jo je poslal.</p>
        </div>
        <Slog />
      </main>
    );
  }

  if (!podatki) return <main className="po po-sredina"><p className="po-tiho">Nalagam …</p><Slog /></main>;

  const briefVrstice: [string, string][] = [
    ['Kdo je stranka', podatki.brief.opisStranke],
    ['Panoga', podatki.brief.panoga],
    ['Ciljna publika', podatki.brief.ciljnaSkupina],
    ['Dizajn', podatki.brief.dizajnZelje],
    ['Ton', podatki.brief.voice],
    ['Konkurenca', podatki.brief.konkurenca],
  ];
  const brief = briefVrstice.filter(([, v]) => v && v.trim());

  return (
    <main className="po">
      <header className="po-glava">
        {podatki.studio && <p className="po-nad">{podatki.studio}</p>}
        <h1>{podatki.projekt.naslov}</h1>
        <p className="po-meta">
          {STANJE[podatki.projekt.status] || podatki.projekt.status}
          {datum(podatki.projekt.zacetek) && <> · začetek {datum(podatki.projekt.zacetek)}</>}
          {datum(podatki.projekt.rok) && <> · rok {datum(podatki.projekt.rok)}</>}
        </p>
      </header>

      {brief.length > 0 && (
        <section className="po-kartica">
          <h2>Kaj gradimo</h2>
          {brief.map(([k, v]) => <div key={k} className="po-vrstica"><b>{k}</b><p>{v}</p></div>)}
        </section>
      )}

      {podatki.cilji.length > 0 && (
        <section className="po-kartica">
          <h2>Cilji</h2>
          <ul className="po-cilji">{podatki.cilji.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </section>
      )}

      {podatki.povezave.length > 0 && (
        <section className="po-kartica">
          <h2>Datoteke in povezave</h2>
          <div className="po-povezave">
            {podatki.povezave.map(p => (
              <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">{p.naslov} ↗</a>
            ))}
          </div>
        </section>
      )}

      <footer className="po-noga">
        Pripravljeno v Pinart Flow. Povezava je zasebna — ne deli je naprej.
      </footer>
      <Slog />
    </main>
  );
}

function Slog() {
  return (
    <style jsx global>{`
      .po { max-width: 44rem; margin: 0 auto; padding: 3rem 1.3rem 4rem; display: flex; flex-direction: column; gap: 1.1rem;
        font-family: var(--font-sans), -apple-system, system-ui, sans-serif; color: #111; }
      .po-sredina { min-height: 70vh; align-items: center; justify-content: center; text-align: center; }
      .po-sredina h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
      .po-sredina p { color: #6b655d; line-height: 1.6; }
      .po-nad { margin: 0 0 .3rem; font-size: .68rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #8a8177; }
      .po-glava h1 { margin: 0; font-size: 2.1rem; line-height: 1.15; font-family: var(--font-serif-flow, var(--font-serif)), Georgia, serif; }
      .po-meta { margin: .5rem 0 0; font-size: .86rem; color: #6b655d; }
      .po-kartica { padding: 1.2rem 1.3rem; border: 1px solid rgba(17,17,17,.1); border-radius: 1.1rem; background: #fff; }
      .po-kartica h2 { margin: 0 0 .7rem; font-size: .68rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #8a8177; }
      .po-vrstica { display: grid; grid-template-columns: 9.5rem 1fr; gap: .9rem; padding: .55rem 0; }
      .po-vrstica + .po-vrstica { border-top: 1px solid rgba(17,17,17,.07); }
      .po-vrstica b { font-size: .78rem; font-weight: 700; color: #6b655d; }
      .po-vrstica p { margin: 0; font-size: .92rem; line-height: 1.55; }
      .po-cilji { margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: .4rem; font-size: .92rem; line-height: 1.55; }
      .po-povezave { display: flex; flex-wrap: wrap; gap: .5rem; }
      .po-povezave a { padding: .5rem .85rem; border: 1px solid rgba(17,17,17,.14); border-radius: 999px; font-size: .84rem; font-weight: 600; color: #6E4FA6; text-decoration: none; }
      .po-povezave a:hover { border-color: #6E4FA6; }
      .po-noga { margin-top: .6rem; font-size: .76rem; color: #8a8177; }
      .po-tiho { color: #8a8177; }
      @media (max-width: 640px) { .po-vrstica { grid-template-columns: 1fr; gap: .15rem; } .po-glava h1 { font-size: 1.7rem; } }
    `}</style>
  );
}
