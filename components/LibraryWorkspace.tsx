'use client';

/* KNJIŽNICA POSTAVK — ponavljajoči izdelki/storitve za hitro vstavljanje v
   račun (in kasneje ponudbo). Vzorec (seznam + urejevalnik + značke + filter)
   je isti jezik kot ExpenseWorkspace, a lasten modul (lib/knjiznica.ts, NE
   pinartFlowStore) in bespoke CSS (scoped ".kn-" razredi, kot rc- v
   InvoiceWorkspace), ker mora biti cena+enota jasno berljiva (>=0.8rem) —
   obstoječi expenseList "small" je za to prevec droben. */

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PencilSimple, X } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { demoKnjiznica, formatCenaEnota, loadKnjiznica, saveKnjiznica, type KnjiznicaEnota, type KnjiznicaPostavka, type KnjiznicaVrsta } from '@/lib/knjiznica';
import { usePredogled } from '@/lib/predogled';

/* pogoste znacke, ki jih predlagamo ob vsaki postavki — enak vzorec kot pri stroških (ExpenseWorkspace) */
const PREDLAGANE_ZNACKE = ['po uri', 'pavšal', 'avtorske', 'produkcija', 'tisk'];
const ENOTE: KnjiznicaEnota[] = ['kos', 'ura', 'pavsal', 'stran', 'mesec'];
const ENOTA_NASLOV: Record<KnjiznicaEnota, string> = { kos: 'Kos', ura: 'Ura', pavsal: 'Pavšal', stran: 'Stran', mesec: 'Mesec' };

export default function LibraryWorkspace() {
  const [items, setItems] = useState<KnjiznicaPostavka[]>([]);
  const [editing, setEditing] = useState<KnjiznicaPostavka | null>(null);
  const [open, setOpen] = useState(false);
  const [vrstaFilter, setVrstaFilter] = useState<'all' | KnjiznicaVrsta>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  /* znacke v urejevalniku: obrazec je nenadzorovan (defaultValue + FormData),
     znacke pa vodimo loceno v state, ker jih je treba dodajati/odstranjevati pred submitom */
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljene postavke pisal v pravo shrambo. */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';

  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [open, editing]);
  useEffect(() => { setTags(editing?.znacke ? [...editing.znacke] : []); setTagInput(''); }, [editing, open]);
  /* ob preklopu v predogled zapri morebiten odprt urejevalnik — sicer bi ostal
     odprt urejevalnik nad izmisljenimi demo postavkami */
  useEffect(() => { if (samoOgled) { setOpen(false); setEditing(null); } }, [samoOgled]);

  useEffect(() => { setItems(samoOgled ? demoKnjiznica() : loadKnjiznica()); }, [nacin, samoOgled]);

  const persist = (next: KnjiznicaPostavka[]) => { if (samoOgled) return; setItems(next); saveKnjiznica(next); };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (samoOgled) return;
    const data = new FormData(event.currentTarget);
    const naziv = String(data.get('naziv') || '').trim();
    if (!naziv) return;
    const enotaVneseno = String(data.get('enota') || '');
    const item: KnjiznicaPostavka = {
      id: editing?.id || crypto.randomUUID(),
      naziv,
      opis: String(data.get('opis') || '').trim() || undefined,
      cena: Number(data.get('cena')) || 0,
      enota: (ENOTE as string[]).includes(enotaVneseno) ? (enotaVneseno as KnjiznicaEnota) : undefined,
      vrsta: String(data.get('vrsta')) === 'izdelek' ? 'izdelek' : 'storitev',
      znacke: tags.length ? tags : undefined,
    };
    persist(editing ? items.map(existing => existing.id === editing.id ? item : existing) : [item, ...items]);
    setEditing(null); setOpen(false);
  };
  const remove = (id: string) => { if (samoOgled) return; if (window.confirm('Izbrišem to postavko?')) persist(items.filter(item => item.id !== id)); };

  /* unija vseh ze uporabljenih znack (case-insensitive, brez podvojevanja) — za predloge in filter */
  const allTags = useMemo(() => { const seen = new Map<string, string>(); items.forEach(item => (item.znacke || []).forEach(tag => { const key = tag.trim().toLowerCase(); if (key && !seen.has(key)) seen.set(key, tag.trim()); })); return Array.from(seen.values()); }, [items]);
  const suggestedTags = useMemo(() => { const seen = new Map<string, string>(); [...PREDLAGANE_ZNACKE, ...allTags].forEach(tag => { const key = tag.toLowerCase(); if (!seen.has(key)) seen.set(key, tag); }); return Array.from(seen.values()); }, [allTags]);
  const vidniPredlogi = suggestedTags.filter(tag => !tags.some(t => t.toLowerCase() === tag.toLowerCase()));
  const filterTags = useMemo(() => [...allTags].sort((a, b) => a.localeCompare(b, 'sl')), [allTags]);
  const dodajZnacko = (raw: string) => { const value = raw.trim(); if (!value) return; if (tags.some(t => t.toLowerCase() === value.toLowerCase())) return; setTags([...tags, value]); };
  const odstraniZnacko = (tag: string) => setTags(tags.filter(t => t !== tag));
  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key !== 'Enter') return; event.preventDefault(); dodajZnacko(tagInput); setTagInput(''); };

  const shown = items.filter(item => (vrstaFilter === 'all' || item.vrsta === vrstaFilter) && (!tagFilter || (item.znacke || []).some(t => t.toLowerCase() === tagFilter.toLowerCase())));
  const stevIzdelki = items.filter(item => item.vrsta === 'izdelek').length;
  const stevStoritve = items.filter(item => item.vrsta === 'storitev').length;

  return <div className="kn-page">
    <section className="kn-summary">
      <article><small>Skupaj postavk</small><strong>{items.length}</strong><span>v tvoji knjižnici</span></article>
      <article><small>Izdelki</small><strong>{stevIzdelki}</strong><span>fizično ali digitalno</span></article>
      <article><small>Storitve</small><strong>{stevStoritve}</strong><span>tvoje delo</span></article>
      <button onClick={() => { setEditing(null); setOpen(true); }} disabled={samoOgled}><span>+</span><strong>Dodaj postavko</strong><small>Izdelek ali storitev</small></button>
    </section>

    {open && <section ref={editorRef} className="kn-editor">
      <div><p className={styles.eyebrow}>{editing ? 'UREDI POSTAVKO' : 'NOVA POSTAVKA'}</p><h2>Kaj ponavljaš?</h2><p>Shrani ceno enkrat — v računu jo samo izbereš.</p></div>
      <form onSubmit={save}>
        <label className="kn-full">Naziv<input required name="naziv" defaultValue={editing?.naziv} placeholder="npr. Oblikovanje spletne strani" /></label>
        <label className="kn-full">Opis<input name="opis" defaultValue={editing?.opis} placeholder="neobvezno — kaj vključuje, obseg …" /></label>
        <label>Cena<input required name="cena" type="number" min="0" step="0.01" defaultValue={editing?.cena} /></label>
        <label>Enota<select name="enota" defaultValue={editing?.enota || 'kos'}>{ENOTE.map(enota => <option key={enota} value={enota}>{ENOTA_NASLOV[enota]}</option>)}</select></label>
        <label>Vrsta<select name="vrsta" defaultValue={editing?.vrsta || 'storitev'}><option value="storitev">Storitev</option><option value="izdelek">Izdelek</option></select></label>
        <label className="kn-full kn-tags-label">Značke<div className="kn-tagsbox">{tags.map(tag => <span key={tag} className="kn-tagchip">{tag}<button type="button" onClick={() => odstraniZnacko(tag)} aria-label={`Odstrani značko ${tag}`}>×</button></span>)}<input value={tagInput} onChange={event => setTagInput(event.target.value)} onKeyDown={onTagKeyDown} placeholder={tags.length ? '' : 'npr. po uri, pavšal …'} /></div>{vidniPredlogi.length > 0 && <div className="kn-tagsuggest">{vidniPredlogi.map(tag => <button key={tag} type="button" onClick={() => dodajZnacko(tag)}>{tag}</button>)}</div>}</label>
        <div className="kn-editor-actions"><button type="button" onClick={() => { setOpen(false); setEditing(null); }}>Prekliči</button><button>{editing ? 'Shrani spremembe' : 'Shrani postavko'}</button></div>
      </form>
    </section>}

    <section className="kn-archive">
      <header>
        <div><p className={styles.eyebrow}>KNJIŽNICA</p><h2>Postavke po vrsti.</h2></div>
        <div className="kn-filters">{(['all', 'izdelek', 'storitev'] as const).map(value => <button key={value} className={vrstaFilter === value ? 'on' : ''} onClick={() => setVrstaFilter(value)}>{value === 'all' ? 'Vse' : value === 'izdelek' ? 'Izdelki' : 'Storitve'}</button>)}</div>
      </header>
      {filterTags.length > 0 && <div className="kn-filters kn-tagfilter">
        <button className={tagFilter === null ? 'on' : ''} onClick={() => setTagFilter(null)}>Vse značke</button>
        {filterTags.map(tag => <button key={tag} className={tagFilter && tagFilter.toLowerCase() === tag.toLowerCase() ? 'on' : ''} onClick={() => setTagFilter(current => current && current.toLowerCase() === tag.toLowerCase() ? null : tag)}>{tag}</button>)}
      </div>}
      {shown.length ? <div className="kn-list">{shown.map(item => <article key={item.id}>
        <div className="kn-info">
          <div className="kn-naslov"><strong>{item.naziv}</strong><span className="kn-vrsta">{item.vrsta === 'izdelek' ? 'Izdelek' : 'Storitev'}</span></div>
          {item.opis && <p className="kn-opis">{item.opis}</p>}
          {item.znacke && item.znacke.length > 0 && <div className="kn-znacke">{item.znacke.map(tag => <span key={tag} className="kn-znacka">{tag}</span>)}</div>}
        </div>
        <div className="kn-cena">{formatCenaEnota(item.cena, item.enota)}</div>
        <div className="kn-akcije">
          <button className="kn-uredi" disabled={samoOgled} onClick={() => { setEditing(item); setOpen(true); }} aria-label={`Uredi ${item.naziv}`}><PencilSimple size={15} weight="bold" /></button>
          <button className="kn-brisi" disabled={samoOgled} onClick={() => remove(item.id)} aria-label={`Izbriši ${item.naziv}`}><X size={14} weight="bold" /></button>
        </div>
      </article>)}</div> : <p className="kn-prazno">V tem pogledu še ni postavk.</p>}
    </section>

    <style>{`
      /* kn- = knjiznica postavk (lasten, scopan CSS — glej InvoiceWorkspace rc- za isti vzorec).
         Vse besedilo je namenoma >=0.8rem: prejsnja stroskovna 'small' (.54rem) je bila
         za ceno+enoto/opis prevec drobna in neberljiva. */
      .kn-page{display:grid;gap:1rem;min-width:0}
      .kn-page *{box-sizing:border-box;min-width:0}

      .kn-page .kn-summary{display:grid;grid-template-columns:repeat(3,1fr) minmax(11rem,.9fr);gap:.7rem}
      .kn-page .kn-summary>*{display:flex;flex-direction:column;align-items:flex-start;padding:1rem;border:1px solid color-mix(in oklch,var(--ink) 8%,transparent);border-radius:1rem;background:oklch(98% .008 87 / .92)}
      .kn-page .kn-summary article:nth-child(1){background:linear-gradient(140deg,oklch(96% .025 295),oklch(89% .06 295))}
      .kn-page .kn-summary article:nth-child(2){background:linear-gradient(140deg,oklch(96% .04 60),oklch(89% .075 52))}
      .kn-page .kn-summary article:nth-child(3){background:linear-gradient(140deg,oklch(96% .025 165),oklch(88% .065 165))}
      .kn-page .kn-summary small{font-size:.8rem;font-weight:700;color:color-mix(in oklch,var(--ink) 70%,transparent)}
      .kn-page .kn-summary strong{margin-top:auto;font:500 1.8rem var(--font-serif),Georgia,serif;color:var(--ink)}
      .kn-page .kn-summary article span{margin-top:.25rem;color:var(--muted);font-size:.8rem}
      .kn-page .kn-summary>button{border:0;background:var(--ink);color:var(--paper);cursor:pointer;align-items:flex-start}
      .kn-page .kn-summary>button:disabled{opacity:.5;cursor:default}
      .kn-page .kn-summary>button span{display:grid;place-items:center;width:2.35rem;aspect-ratio:1;border:1px solid oklch(100% 0 0 / .3);border-radius:50%;font-size:1.35rem;font-weight:400;line-height:1}
      .kn-page .kn-summary>button strong{margin-top:auto;font:500 1.4rem var(--font-serif),Georgia,serif}
      .kn-page .kn-summary>button small{margin-top:.25rem;color:oklch(100% 0 0 / .75);font-weight:700}

      .kn-page .kn-editor{display:grid;grid-template-columns:minmax(14rem,.35fr) 1fr;gap:1.5rem;padding:1.25rem;border:1px solid color-mix(in oklch,var(--ink) 9%,transparent);border-radius:1.4rem;background:oklch(98% .008 87 / .92)}
      .kn-page .kn-editor h2{margin:0;font:500 clamp(1.6rem,2.4vw,2.4rem)/1 var(--font-serif),Georgia,serif;color:var(--ink)}
      .kn-page .kn-editor>div>p:last-child{color:var(--muted);font-size:.85rem;line-height:1.5}
      .kn-page .kn-editor form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem;align-items:end}
      .kn-page .kn-editor label{display:grid;gap:.35rem;font-size:.8rem;font-weight:800;color:color-mix(in oklch,var(--ink) 78%,transparent)}
      .kn-page .kn-editor input,.kn-page .kn-editor select{min-width:0;height:2.75rem;padding:0 .75rem;border:1px solid var(--line);border-radius:.65rem;background:oklch(100% 0 0 / .85);font:500 .85rem var(--font-sans),sans-serif;color:var(--ink)}
      .kn-page .kn-full{grid-column:1/-1}
      .kn-page .kn-editor-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:.5rem}
      .kn-page .kn-editor-actions button{min-height:2.6rem;padding:0 1rem;border:1px solid var(--line);border-radius:.65rem;background:transparent;font:800 .8rem var(--font-sans),sans-serif;cursor:pointer;color:var(--ink)}
      .kn-page .kn-editor-actions button:last-child{border-color:var(--ink);background:var(--ink);color:var(--paper)}

      /* znacke v urejevalniku — isti jezik kot expenseTagsBox/expenseTagChip v ExpenseWorkspace */
      .kn-page .kn-tagsbox{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;min-height:2.75rem;padding:.35rem .5rem;border:1px solid var(--line);border-radius:.65rem;background:oklch(100% 0 0 / .85)}
      .kn-page .kn-tagsbox input{flex:1 1 8rem;min-width:6rem;height:1.9rem;padding:0 .3rem;border:0;border-radius:0;background:transparent;font:500 .85rem var(--font-sans),sans-serif;color:var(--ink)}
      .kn-page .kn-tagsbox input:focus{outline:none}
      .kn-page .kn-tagchip{display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .65rem;border:1px solid var(--line);border-radius:999px;background:oklch(95% .01 87);color:var(--ink);font-size:.8rem;font-weight:700;white-space:nowrap}
      .kn-page .kn-tagchip button{display:grid;place-items:center;width:1rem;height:1rem;padding:0;border:0;background:none;color:color-mix(in oklch,var(--ink) 55%,transparent);font-size:.7rem;line-height:1;cursor:pointer}
      .kn-page .kn-tagchip button:hover{color:var(--ink)}
      .kn-page .kn-tagsuggest{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.4rem}
      .kn-page .kn-tagsuggest button{padding:.3rem .65rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:color-mix(in oklch,var(--ink) 72%,transparent);font:700 .8rem var(--font-sans),sans-serif;cursor:pointer}
      .kn-page .kn-tagsuggest button:hover{border-style:solid;color:var(--ink);background:oklch(95% .01 87)}

      .kn-page .kn-archive{padding:1.25rem;border:1px solid color-mix(in oklch,var(--ink) 9%,transparent);border-radius:1.4rem;background:oklch(98% .008 87 / .92)}
      .kn-page .kn-archive>header{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1rem;flex-wrap:wrap}
      .kn-page .kn-archive h2{margin:0;font:500 clamp(1.7rem,2.5vw,2.6rem)/1 var(--font-serif),Georgia,serif;color:var(--ink)}
      .kn-page .kn-filters{display:flex;flex-wrap:wrap;gap:.2rem;padding:.2rem;border-radius:999px;background:oklch(94.5% .012 87)}
      .kn-page .kn-filters.kn-tagfilter{background:none;padding:0;row-gap:.3rem;margin-top:.6rem;width:100%}
      .kn-page .kn-filters button{padding:.45rem .8rem;border:0;border-radius:999px;background:none;font:700 .8rem var(--font-sans),sans-serif;cursor:pointer;color:var(--ink)}
      .kn-page .kn-filters button.on{background:var(--ink);color:var(--paper)}
      .kn-page .kn-tagfilter button{border:1px solid var(--line);background:oklch(100% 0 0 / .6)}
      .kn-page .kn-tagfilter button.on{border-color:var(--ink)}

      .kn-page .kn-list article{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem;min-height:4.5rem;padding:.8rem;border-top:1px solid var(--line)}
      .kn-page .kn-info{flex:1 1 14rem;min-width:0;display:grid;gap:.3rem}
      .kn-page .kn-naslov{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}
      .kn-page .kn-naslov strong{font-size:.95rem;font-weight:700;color:var(--ink)}
      .kn-page .kn-vrsta{display:inline-flex;align-items:center;padding:.2rem .6rem;border-radius:999px;background:oklch(96% .008 87);color:color-mix(in oklch,var(--ink) 78%,transparent);font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:.03em}
      .kn-page .kn-opis{margin:0;color:var(--muted);font-size:.82rem;line-height:1.5;overflow-wrap:anywhere}
      .kn-page .kn-znacke{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.1rem}
      .kn-page .kn-znacka{display:inline-flex;align-items:center;padding:.22rem .6rem;border:1px solid var(--line);border-radius:999px;background:oklch(96% .008 87);color:color-mix(in oklch,var(--ink) 78%,transparent);font-size:.8rem;font-weight:700;white-space:nowrap}
      .kn-page .kn-cena{flex:0 0 auto;margin-left:auto;font-size:.95rem;font-weight:700;color:var(--ink);white-space:nowrap}
      .kn-page .kn-akcije{display:inline-flex;align-items:center;gap:.4rem;flex:0 0 auto}
      .kn-page .kn-uredi,.kn-page .kn-brisi{display:inline-flex;align-items:center;justify-content:center;width:1.85rem;height:1.85rem;aspect-ratio:1;padding:0;border-radius:50%;line-height:1;cursor:pointer;border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);background:oklch(98% .008 87 / .9)}
      .kn-page .kn-uredi{color:var(--ink)}
      .kn-page .kn-uredi:hover:not(:disabled){border-color:var(--ink);background:oklch(95% .01 87)}
      .kn-page .kn-brisi{color:oklch(52% .16 25)}
      .kn-page .kn-brisi:hover:not(:disabled){border-color:oklch(52% .16 25);background:oklch(95% .04 25)}
      .kn-page .kn-uredi:disabled,.kn-page .kn-brisi:disabled{opacity:.35;cursor:default}
      .kn-page .kn-prazno{padding:2rem;border:1px dashed var(--line);border-radius:1rem;color:var(--muted);font-size:.85rem;text-align:center}

      @media (max-width:900px){
        .kn-page .kn-editor{grid-template-columns:1fr}
        .kn-page .kn-editor form{grid-template-columns:1fr 1fr}
        .kn-page .kn-summary{grid-template-columns:repeat(2,1fr)}
      }
      @media (max-width:640px){
        .kn-page .kn-summary{grid-template-columns:1fr 1fr}
        .kn-page .kn-editor{padding:1rem;border-radius:1.15rem}
        .kn-page .kn-editor form{grid-template-columns:1fr}
        .kn-page .kn-editor-actions{grid-column:1}
        .kn-page .kn-archive{padding:1rem;border-radius:1.15rem}
        .kn-page .kn-archive>header{align-items:flex-start;flex-direction:column}
        .kn-page .kn-list article{padding:.8rem .1rem}
        .kn-page .kn-cena{margin-left:0;flex-basis:100%}
        .kn-page .kn-akcije{margin-left:auto}
      }
    `}</style>
  </div>;
}
