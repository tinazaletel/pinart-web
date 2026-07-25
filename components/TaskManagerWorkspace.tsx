'use client';

/* TASK MANAGER (Kanban) — logika (data model, dodaj/izbriši, drag&drop) po Geminijevi
   specifikaciji (lib/naloge.ts), JSX + videz rekonstruirana v Pinart slogu (kremno,
   Bodoni, ink, akcent). Lasten prefiksiran <style> blok (tm-), da ne trči s .shell. */

import React, { useState, useEffect } from 'react';
import { Naloga, NalogaStolpec, preberiNaloge, shraniNaloge } from '@/lib/naloge';

const STOLPCI: { id: NalogaStolpec; naziv: string }[] = [
  { id: 'todo', naziv: 'Za narediti' },
  { id: 'in_progress', naziv: 'V teku' },
  { id: 'waiting', naziv: 'Čaka' },
  { id: 'done', naziv: 'Končano' },
];

const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleDateString('sl-SI'); };
const jeZapadlo = (rok?: string) => { if (!rok) return false; const d = new Date(rok); return !isNaN(d.getTime()) && d < new Date(new Date().toDateString()); };

export default function TaskManagerWorkspace() {
  const [naloge, setNaloge] = useState<Naloga[]>([]);
  const [novNaslov, setNovNaslov] = useState('');
  const [novOpis, setNovOpis] = useState('');
  const [novRok, setNovRok] = useState('');
  const [novDodeljeno, setNovDodeljeno] = useState('');
  const [aktivniStolpec, setAktivniStolpec] = useState<NalogaStolpec>('todo');
  const [prikaziFormo, setPrikaziFormo] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  useEffect(() => { setNaloge(preberiNaloge()); }, []);

  const posodobiInShrani = (noveNaloge: Naloga[]) => { setNaloge(noveNaloge); shraniNaloge(noveNaloge); };

  const dodajNalogo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novNaslov.trim()) return;
    const nova: Naloga = {
      id: 'task_' + Date.now(),
      naslov: novNaslov.trim(),
      opis: novOpis.trim() || undefined,
      rok: novRok || undefined,
      dodeljenoOseba: novDodeljeno.trim() || undefined,
      stolpec: aktivniStolpec,
      created: new Date().toISOString(),
    };
    posodobiInShrani([...naloge, nova]);
    setNovNaslov(''); setNovOpis(''); setNovRok(''); setNovDodeljeno(''); setPrikaziFormo(false);
  };

  const izbrisiNalogo = (id: string) => { posodobiInShrani(naloge.filter((n) => n.id !== id)); };

  const handleDragStart = (e: React.DragEvent, id: string) => { setDraggedCardId(id); e.dataTransfer.setData('text/plain', id); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, ciljniStolpec: NalogaStolpec) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (!id) return;
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, stolpec: ciljniStolpec } : n)));
    setDraggedCardId(null);
  };

  return (
    <div className="tm">
      <header className="tm-glava">
        <div>
          <p className="tm-eyebrow">TASK MANAGER</p>
          <h1 className="tm-naslov">Naloge.</h1>
          <p className="tm-podnaslov">Organiziraj projekte in opravila na enem mestu — povleci kartico med stolpci.</p>
        </div>
        <button type="button" className="tm-nova" onClick={() => { setAktivniStolpec('todo'); setPrikaziFormo(true); }}>+ Nova naloga</button>
      </header>

      {prikaziFormo && (
        <form className="tm-forma" onSubmit={dodajNalogo}>
          <div className="tm-forma-glava"><h2>Nova naloga</h2><button type="button" className="tm-x" onClick={() => setPrikaziFormo(false)} aria-label="Zapri">×</button></div>
          <label className="tm-polje"><span>Naslov</span><input value={novNaslov} onChange={(e) => setNovNaslov(e.target.value)} placeholder="Npr. Pripravi poročilo za Rokus …" autoFocus /></label>
          <label className="tm-polje"><span>Opis</span><textarea value={novOpis} onChange={(e) => setNovOpis(e.target.value)} placeholder="Podrobnosti naloge …" rows={3} /></label>
          <label className="tm-polje"><span>Dodeljeno</span>
            <div className="tm-dodeljeno-vrsta">
              <input value={novDodeljeno} onChange={(e) => setNovDodeljeno(e.target.value)} placeholder="Kdo dela nalogo …" />
              <button type="button" className="tm-zase" onClick={() => setNovDodeljeno('Jaz')}>+ Zase</button>
            </div>
          </label>
          <div className="tm-forma-vrsta">
            <label className="tm-polje"><span>Stolpec</span><select value={aktivniStolpec} onChange={(e) => setAktivniStolpec(e.target.value as NalogaStolpec)}>{STOLPCI.map((s) => <option key={s.id} value={s.id}>{s.naziv}</option>)}</select></label>
            <label className="tm-polje"><span>Rok izvedbe</span><input type="date" value={novRok} onChange={(e) => setNovRok(e.target.value)} /></label>
          </div>
          <div className="tm-forma-akcije"><button type="button" className="tm-preklici" onClick={() => setPrikaziFormo(false)}>Prekliči</button><button type="submit" className="tm-shrani" disabled={!novNaslov.trim()}>Shrani nalogo</button></div>
        </form>
      )}

      <div className="tm-deska">
        {STOLPCI.map((s) => {
          const nalogeVStolpcu = naloge.filter((n) => n.stolpec === s.id);
          return (
            <section key={s.id} className="tm-stolpec" data-stolpec={s.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, s.id)}>
              <header className="tm-stolpec-glava"><span className="tm-pika" aria-hidden /><h3>{s.naziv}</h3><span className="tm-st">{nalogeVStolpcu.length}</span></header>
              <div className="tm-kartice">
                {nalogeVStolpcu.length === 0 && <p className="tm-prazno">Povleci nalogo sem.</p>}
                {nalogeVStolpcu.map((naloga) => (
                  <article key={naloga.id} className="tm-kartica" draggable onDragStart={(e) => handleDragStart(e, naloga.id)}>
                    <div className="tm-kartica-vrh"><strong>{naloga.naslov}</strong><button type="button" className="tm-kartica-x" onClick={() => izbrisiNalogo(naloga.id)} title="Izbriši nalogo" aria-label="Izbriši nalogo">×</button></div>
                    {naloga.opis && <p className="tm-kartica-opis">{naloga.opis}</p>}
                    {(naloga.rok || naloga.dodeljenoOseba) && (
                      <div className="tm-kartica-noga">
                        {naloga.rok && <span className={`tm-rok${jeZapadlo(naloga.rok) && s.id !== 'done' ? ' tm-rok-zapadlo' : ''}`}>📅 {datStr(naloga.rok)}</span>}
                        {naloga.dodeljenoOseba && <span className="tm-oseba" title={`Dodeljeno: ${naloga.dodeljenoOseba}`}><span className="tm-oseba-krog" aria-hidden>{naloga.dodeljenoOseba.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>{naloga.dodeljenoOseba}</span>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <style>{`
        .tm{padding:1.6rem clamp(1rem,3vw,2.2rem) 4rem;min-width:0}
        .tm-glava{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:1.6rem}
        .tm-eyebrow{margin:0 0 .35rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
        .tm-naslov{margin:0;font:500 clamp(2rem,4vw,2.8rem)/1 var(--font-serif),Georgia,serif;color:var(--ink)}
        .tm-podnaslov{margin:.55rem 0 0;max-width:44ch;color:var(--muted);font-size:.86rem;line-height:1.5}
        .tm-nova{flex:none;padding:.7rem 1.15rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:750 .74rem var(--font-sans),sans-serif;cursor:pointer;transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .18s}
        .tm-nova:hover{transform:translateY(-2px);box-shadow:0 .8rem 2rem oklch(22% .04 300/.22)}

        /* obrazec */
        .tm-forma{margin:0 0 1.6rem;max-width:34rem;padding:1.2rem 1.3rem 1.35rem;border:1px solid var(--line);border-radius:1.1rem;background:oklch(99% .006 87/.9);box-shadow:0 1rem 2.6rem oklch(20% .03 55/.08)}
        .tm-forma-glava{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem}
        .tm-forma-glava h2{margin:0;font:600 1.2rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .tm-x{width:2rem;height:2rem;border:1px solid var(--line);border-radius:50%;background:var(--paper);color:var(--ink);font-size:1rem;line-height:1;cursor:pointer}
        .tm-x:hover{background:var(--ink);color:var(--paper)}
        .tm-polje{display:flex;flex-direction:column;gap:.3rem;margin-bottom:.8rem}
        .tm-polje span{font:700 .64rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
        .tm-polje input,.tm-polje textarea,.tm-polje select{width:100%;padding:.6rem .8rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.75);font:inherit;font-size:.86rem;color:var(--ink)}
        .tm-polje input:focus,.tm-polje textarea:focus,.tm-polje select:focus{outline:none;border-color:var(--ink)}
        .tm-polje textarea{resize:vertical;min-height:3.4rem}
        .tm-forma-vrsta{display:flex;gap:.8rem;flex-wrap:wrap}
        .tm-forma-vrsta .tm-polje{flex:1;min-width:9rem}
        .tm-forma-akcije{display:flex;justify-content:flex-end;gap:.6rem;margin-top:.3rem}
        .tm-preklici{padding:.6rem 1rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);font:700 .72rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-shrani{padding:.6rem 1.15rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:750 .72rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-shrani:disabled{opacity:.45;cursor:not-allowed}

        /* deska (kanban) */
        .tm-deska{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;align-items:start}
        .tm-stolpec{display:flex;flex-direction:column;min-height:14rem;padding:.85rem;border:1px solid var(--line);border-radius:1.1rem;background:oklch(97.5% .008 87/.75);transition:background .15s,border-color .15s}
        .tm-stolpec-glava{display:flex;align-items:center;gap:.5rem;padding:.15rem .3rem .7rem}
        .tm-stolpec-glava h3{margin:0;flex:1;font:800 .68rem var(--font-sans),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}
        .tm-pika{width:.6rem;height:.6rem;border-radius:50%;flex:none}
        .tm-st{min-width:1.5rem;height:1.5rem;padding:0 .45rem;display:grid;place-items:center;border-radius:999px;background:oklch(100% 0 0/.7);color:var(--muted);font:800 .66rem var(--font-sans),sans-serif}
        .tm-stolpec[data-stolpec='todo'] .tm-pika{background:oklch(62% .19 300)}
        .tm-stolpec[data-stolpec='in_progress'] .tm-pika{background:oklch(72% .14 165)}
        .tm-stolpec[data-stolpec='waiting'] .tm-pika{background:oklch(74% .15 70)}
        .tm-stolpec[data-stolpec='done'] .tm-pika{background:oklch(68% .16 150)}
        .tm-kartice{display:flex;flex-direction:column;gap:.6rem;flex:1;min-height:3rem}
        .tm-prazno{margin:.4rem;padding:1.2rem .6rem;border:1px dashed var(--line);border-radius:.8rem;color:var(--muted);font-size:.72rem;text-align:center}

        .tm-kartica{padding:.75rem .8rem;border:1px solid var(--line);border-radius:.8rem;background:oklch(100% 0 0/.92);box-shadow:0 .4rem 1rem oklch(20% .03 55/.06);cursor:grab}
        .tm-kartica:active{cursor:grabbing}
        .tm-kartica:hover{border-color:color-mix(in oklch,var(--ink) 24%,transparent)}
        .tm-kartica-vrh{display:flex;align-items:flex-start;gap:.5rem}
        .tm-kartica-vrh strong{flex:1;font-size:.84rem;font-weight:650;line-height:1.35;color:var(--ink)}
        .tm-kartica-x{flex:none;width:1.5rem;height:1.5rem;padding:0;border:0;border-radius:50%;background:transparent;color:var(--muted);font-size:.95rem;line-height:1;cursor:pointer}
        .tm-kartica-x:hover{background:var(--ink);color:var(--paper)}
        .tm-kartica-opis{margin:.4rem 0 0;color:var(--muted);font-size:.74rem;line-height:1.45}
        .tm-rok{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .5rem;border-radius:999px;background:oklch(95% .01 87);color:var(--muted);font-size:.66rem;font-weight:700}
        .tm-rok-zapadlo{background:oklch(93% .06 30);color:oklch(48% .16 30)}
        .tm-kartica-noga{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin-top:.55rem}
        .tm-oseba{display:inline-flex;align-items:center;gap:.35rem;padding:.15rem .5rem .15rem .15rem;border-radius:999px;background:oklch(94% .03 300);color:oklch(38% .1 300);font-size:.66rem;font-weight:700}
        .tm-oseba-krog{width:1.15rem;height:1.15rem;display:grid;place-items:center;border-radius:50%;background:oklch(62% .19 300);color:#fff;font-size:.54rem;font-weight:800}
        /* polje Dodeljeno + gumb Zase */
        .tm-dodeljeno-vrsta{display:flex;gap:.5rem}
        .tm-dodeljeno-vrsta input{flex:1;min-width:0}
        .tm-zase{flex:none;padding:.55rem .8rem;border:1px solid var(--line);border-radius:.7rem;background:var(--paper);color:var(--ink);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
        .tm-zase:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}

        @media (max-width:860px){
          .tm-deska{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:82vw;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:.6rem}
          .tm-stolpec{scroll-snap-align:start}
        }
      `}</style>
    </div>
  );
}
