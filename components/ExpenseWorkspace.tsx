'use client';

import { FormEvent, KeyboardEvent, MouseEvent, UIEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowExpense } from '@/lib/pinartFlowStore';
import MetricIcon from '@/components/MetricIcon';
import { PencilSimple, X, DotsThreeVertical, CaretLeft, Trash, Plus, Receipt } from '@phosphor-icons/react';
import Paginacija from '@/components/Paginacija';
import MobTabs from '@/components/MobTabs';
import IskalnikMob from '@/components/IskalnikMob';
import { saveCloudSettings, uploadBusinessDocument } from '@/lib/pinartFlowCloud';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';

type Offer = { id: string; title: string; client: string };
type Recurring = { ime: string; znesek: string };
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;
/* pogoste znacke, ki jih predlagamo ob vsakem strosku — poenotijo poimenovanje */
const PREDLAGANE_ZNACKE = ['mesečni', 'letni', 'enkratni', 'obratovalni stroški', 'naročnine', 'najem', 'potrebščine', 'oprema'];

export default function ExpenseWorkspace() {
  const [expenses, setExpenses] = useState<FlowExpense[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [editing, setEditing] = useState<FlowExpense | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'project' | 'company'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stranStr, setStranStr] = useState(1);
  const [kebabId, setKebabId] = useState<string | null>(null);
  useEffect(() => { setStranStr(1); }, [filter, tagFilter, search]);
  /* Swipe-left akcije (iOS slog): vrstica je vodoravno drsljiva (scroll-snap), poteg
     LEVO ali tap na ⋯ razkrije Uredi/Izbriši. Ref hrani DOM element vsake vrstice, da
     lahko programsko odpremo/zapremo (tap ⋯, tap za zaprtje, ali samodejno zapremo prejšnjo). */
  const swipeEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const openSwipeRef = useRef<string | null>(null); /* katera vrstica je trenutno odprta (samo ena naenkrat) */
  const swipeMax = (el: HTMLDivElement) => el.scrollWidth - el.clientWidth; /* koliko px do konca = širina akcij */
  const swipeOpen = (el: HTMLDivElement) => swipeMax(el) > 4 && el.scrollLeft > swipeMax(el) * 0.5;
  const closeSwipe = (id: string) => { swipeEls.current.get(id)?.scrollTo({ left: 0, behavior: 'smooth' }); };
  /* ob drsenju: ko se vrstica odpre, samodejno zapri prej odprto; ko se zapre, pozabi jo */
  const onSwipeScroll = (id: string) => (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (swipeOpen(el)) { if (openSwipeRef.current && openSwipeRef.current !== id) closeSwipe(openSwipeRef.current); openSwipeRef.current = id; }
    else if (el.scrollLeft < 4 && openSwipeRef.current === id) openSwipeRef.current = null;
  };
  /* Tap na vrstico = odpri urejanje (glavno dejanje). Izvzeto: checkbox (označi), gumb Izbriši
     (deluje sam), ⋮ pikice (odprejo swipe — imajo stopPropagation). Če je swipe odprt, tap zapre. */
  const onRowClick = (item: FlowExpense) => (event: MouseEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const target = event.target as HTMLElement;
    if (target.closest('[data-swipe-actions]')) return; /* gumb Izbriši naj deluje */
    if (el.scrollLeft > 4) { event.preventDefault(); closeSwipe(item.id); return; } /* odprto -> tap zapre */
    if (target.closest('[data-row-select]')) return; /* checkbox samo označi, ne odpre urejanja */
    setEditing(item); setOpen(true); /* tap na vrstico -> uredi */
  };
  /* tap na ⋯ pikice = odpri/zapri iste swipe akcije (na mobile). Na desktopu (kjer swipe ni aktiven)
     pade skozi na klasičen spustni meni. */
  const onDotsClick = (id: string) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); /* klik na ⋮ nikoli ne sme sprožiti tap-uredi vrstice */
    const el = swipeEls.current.get(id);
    if (el && swipeMax(el) > 4) { /* swipe aktiven (mobile) */
      if (swipeOpen(el)) { el.scrollTo({ left: 0, behavior: 'smooth' }); openSwipeRef.current = null; }
      else { if (openSwipeRef.current && openSwipeRef.current !== id) closeSwipe(openSwipeRef.current); el.scrollTo({ left: swipeMax(el), behavior: 'smooth' }); openSwipeRef.current = id; }
      return;
    }
    setKebabId(prev => prev === id ? null : id); /* desktop: spustni meni */
  };
  /* znacke v urejevalniku: obrazec je sicer nenadzorovan (defaultValue + FormData),
     znacke pa vodimo loceno v state, ker jih je treba dodajati/odstranjevati pred submitom */
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljenega zapisa pisal v pravo bazo. */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';
  /* Urejevalnik se izrise nad seznamom; ko klikneš "Uredi" na strošku nizje
     (ali "Dodaj strošek"), se odpre zunaj vidnega polja in izgleda, kot da se
     nič ne zgodi. Zato ga ob odprtju zdrsnemo v pogled. */
  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [open, editing]);
  /* ob odpiranju urejanja napolni znacke iz obstojecega stroska, ob zapiranju/novem jih pocisti */
  useEffect(() => { setTags(editing?.tags ? [...editing.tags] : []); setTagInput(''); }, [editing, open]);


  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    const settings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}');
    let list = flow.expenses;
    /* Enkratna migracija: obstojece redne mesecne stroske (K_NAST.stroski) preseli v
       enotni seznam stroskov kot mesecne — da se pokazejo v evidenci in jih ni vec
       treba voditi loceno. Nedestruktivno (settings.stroski se ne izbrise). */
    if (nacin === 'mine' && !settings.stroskiMigriran && Array.isArray(settings.stroski) && settings.stroski.length) {
      const danes = new Date().toISOString().slice(0, 10);
      const migrirani: FlowExpense[] = (settings.stroski as Recurring[])
        .filter(s => s && s.ime)
        .map(s => ({ id: crypto.randomUUID(), title: String(s.ime), amount: Number(s.znesek) || 0, date: danes, category: '', obdobje: 'mesecni' as const }));
      list = [...migrirani, ...flow.expenses];
      saveFlowCollection('expenses', list);
      localStorage.setItem('pinart-kalkulator-v2', JSON.stringify({ ...settings, stroskiMigriran: true }));
    }
    setExpenses(list);
    setOffers(flow.offers.map(({ id, title, client }) => ({ id, title, client })));
    const savedCompanies = JSON.parse(localStorage.getItem('pinart-kalkulator-podjetja') || '{}') as Record<string, { ime?: string }>; setCompanies(Object.entries(savedCompanies).map(([id, item]) => item.ime || id));
  }, [nacin]);

  /* mesecni znesek stroska (letni /12) — za osnovo in vsote */
  const mesecniZnesek = (item: FlowExpense) => item.obdobje === 'letni' ? item.amount / 12 : item.amount;
  const persist = (next: FlowExpense[]) => {
    if (samoOgled) return;
    setExpenses(next);
    saveFlowCollection('expenses', next);
    /* Sinhroniziraj poslovno osnovo (redni stroski, obdobje != enkratni) v
       K_NAST.stroski — kalkulator jih bere informativno. Tako je vnos na ENEM mestu. */
    const redni = next
      .filter(item => item.obdobje && item.obdobje !== 'enkratni')
      .map(item => ({ ime: item.title, znesek: String(Math.round(mesecniZnesek(item))) }));
    const settings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}');
    localStorage.setItem('pinart-kalkulator-v2', JSON.stringify({ ...settings, stroski: redni.length ? redni : undefined }));
    void saveCloudSettings({ recurringCosts: redni });
  };

  const save = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const sourceOfferId = String(data.get('sourceOfferId') || ''); const offer = offers.find(item => item.id === sourceOfferId); let item: FlowExpense = { id: editing?.id || crypto.randomUUID(), title: String(data.get('title')), client: offer?.client || String(data.get('client')), amount: Number(data.get('amount')), date: String(data.get('date')), sourceOfferId: sourceOfferId || undefined, company: String(data.get('company') || '') || undefined, category: String(data.get('category') || ''), tags: tags.length ? tags : undefined, obdobje: (String(data.get('obdobje') || 'enkratni') as FlowExpense['obdobje']), fileName: editing?.fileName, filePath: editing?.filePath }; const document = data.get('document'); if (document instanceof File && document.size) { try { const filePath = await uploadBusinessDocument(document, 'expenses', item.id); item = { ...item, fileName: document.name, filePath }; } catch { /* strošek ostane shranjen tudi brez priloge */ } } persist(editing ? expenses.map(expense => expense.id === editing.id ? item : expense) : [item, ...expenses]); setEditing(null); setOpen(false); };
  const remove = (id: string) => { if (!window.confirm('Izbrišem ta strošek?')) return false; persist(expenses.filter(item => item.id !== id)); return true; };
  /* množični izbris izbranih (koš zgoraj desno ob »Označi vse«) */
  const removeIzbrane = () => { if (!izbrani.size) return; if (!window.confirm(`Izbrišem izbrane stroške (${izbrani.size})?`)) return; persist(expenses.filter(item => !izbrani.has(item.id))); setIzbrani(new Set()); };
  /* unija vseh ze uporabljenih znack (case-insensitive, brez podvojevanja) — za predloge in filter */
  const allTags = useMemo(() => { const seen = new Map<string, string>(); expenses.forEach(item => (item.tags || []).forEach(tag => { const key = tag.trim().toLowerCase(); if (key && !seen.has(key)) seen.set(key, tag.trim()); })); return Array.from(seen.values()); }, [expenses]);
  const suggestedTags = useMemo(() => { const seen = new Map<string, string>(); [...PREDLAGANE_ZNACKE, ...allTags].forEach(tag => { const key = tag.toLowerCase(); if (!seen.has(key)) seen.set(key, tag); }); return Array.from(seen.values()); }, [allTags]);
  const vidniPredlogi = suggestedTags.filter(tag => !tags.some(t => t.toLowerCase() === tag.toLowerCase()));
  const filterTags = useMemo(() => [...allTags].sort((a, b) => a.localeCompare(b, 'sl')), [allTags]);
  const dodajZnacko = (raw: string) => { const value = raw.trim(); if (!value) return; if (tags.some(t => t.toLowerCase() === value.toLowerCase())) return; setTags([...tags, value]); };
  const odstraniZnacko = (tag: string) => setTags(tags.filter(t => t !== tag));
  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key !== 'Enter') return; event.preventDefault(); dodajZnacko(tagInput); setTagInput(''); };
  const shown = expenses.filter(item => (filter === 'all' || (filter === 'project' ? item.sourceOfferId : item.company)) && (!tagFilter || (item.tags || []).some(t => t.toLowerCase() === tagFilter.toLowerCase())) && (!search.trim() || `${item.title} ${item.category || ''} ${item.company || ''}`.toLowerCase().includes(search.trim().toLowerCase())));
  const STR_NA_STRAN = 10;
  const straniStr = Math.max(1, Math.ceil(shown.length / STR_NA_STRAN));
  const stranStrVarno = Math.min(stranStr, straniStr);
  const shownStran = shown.slice((stranStrVarno - 1) * STR_NA_STRAN, stranStrVarno * STR_NA_STRAN);
  /* Namig ob prvem obisku: prva vrstica na hitro »pokuka« desno (razkrije rob), da uporabnik vidi,
     da se da slajdat. Samo enkrat (localStorage), samo kjer je swipe aktiven (mobile). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('pinart-stroski-swipe-namig')) return;
    const prva = shownStran[0];
    if (!prva) return;
    const el = swipeEls.current.get(prva.id);
    if (!el || el.scrollWidth - el.clientWidth < 4) return; /* swipe ni aktiven (desktop) -> ne porabi namiga */
    localStorage.setItem('pinart-stroski-swipe-namig', '1');
    el.style.scrollSnapType = 'none';
    el.scrollTo({ left: 44, behavior: 'smooth' });
    const t1 = setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 750);
    const t2 = setTimeout(() => { el.style.scrollSnapType = ''; }, 1250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses.length]);
  const jeReden = (item: FlowExpense) => !!item.obdobje && item.obdobje !== 'enkratni';
  const monthTotal = useMemo(() => { const now = new Date(); return expenses.filter(item => !jeReden(item) && (() => { const date = new Date(`${item.date}T00:00:00`); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); })()).reduce((sum, item) => sum + item.amount, 0); }, [expenses]);
  const recurringTotal = useMemo(() => expenses.filter(jeReden).reduce((sum, item) => sum + mesecniZnesek(item), 0), [expenses]);

  /* Izbira stroškov (checkbox) + izvoz v CSV (UTF-8 BOM + ; za SI Excel; znesek decimalno z vejico). */
  const [izbrani, setIzbrani] = useState<Set<string>>(new Set());
  const preklopiIzbor = (id: string) => setIzbrani(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const vsiIzbrani = shown.length > 0 && shown.every(item => izbrani.has(item.id));
  const preklopiVse = () => setIzbrani(vsiIzbrani ? new Set() : new Set(shown.map(item => item.id)));
  const izvoziCsv = () => {
    const vrstice = shown.filter(item => izbrani.size === 0 || izbrani.has(item.id));
    if (!vrstice.length) return;
    const esc = (value: string) => `"${(value || '').replace(/"/g, '""')}"`;
    const glava = ['Naziv', 'Kategorija', 'Obdobje', 'Datum', 'Značke', 'Znesek (EUR)', 'Namen'];
    const telo = vrstice.map(item => {
      const offer = offers.find(offerItem => offerItem.id === item.sourceOfferId);
      const namen = offer ? `Projekt: ${offer.title}` : item.company ? `Podjetje: ${item.company}` : 'Splošni strošek';
      const obd = item.obdobje === 'letni' ? 'letni' : item.obdobje === 'mesecni' ? 'mesečni' : 'enkratni';
      return [item.title, item.category || '', obd, item.date, (item.tags || []).join(', '), String(item.amount).replace('.', ','), namen].map(esc).join(';');
    });
    const vsebina = '﻿' + [glava.map(esc).join(';'), ...telo].join('\r\n');
    const blob = new Blob([vsebina], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Stroski_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  return <div className={styles.expensePage + (open ? ' expense-editing' : '')}>
    <section className={styles.expenseSummary}><article><small>Ta mesec</small><strong>{money(monthTotal)}</strong><span>{expenses.length} evidentiranih stroškov</span><b className={styles.subpageMetricIcon}><MetricIcon type="cost" /></b></article><article><small>Redni mesečni</small><strong>{money(recurringTotal)}</strong><span>redni stroški (mesečni + letni/12)</span><b className={styles.subpageMetricIcon}><MetricIcon type="recurring" /></b></article><article><small>Skupaj osnova</small><strong>{money(monthTotal + recurringTotal)}</strong><span>poslovni in projektni stroški</span><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></article><button onClick={() => { setEditing(null); setOpen(true); }}><span>+</span><strong>Dodaj strošek</strong><small>Projekt, podjetje ali splošno</small></button></section>
    {open && <section ref={editorRef} className={styles.expenseEditor}><button type="button" className={styles.expenseBack} onClick={() => { setOpen(false); setEditing(null); }} aria-label="Nazaj na stroške"><CaretLeft size={16} weight="bold" /> Stroški</button><div><p className={styles.eyebrow}>{editing ? 'UREDI STROŠEK' : 'NOV STROŠEK'}</p><h2>Kam ga pripišemo?</h2><p>Projektni stroški vplivajo na donosnost stranke. Splošni ostanejo strošek podjetja.</p></div><form onSubmit={save}><label>Opis<input required name="title" defaultValue={editing?.title} /></label><label>Kategorija<select name="category" defaultValue={editing?.category || 'Drugo'}><option>Programska oprema</option><option>Sodelavec / partner</option><option>Produkcija</option><option>Oprema</option><option>Potni stroški</option><option>Drugo</option></select></label><label>Obdobje<select name="obdobje" defaultValue={editing?.obdobje || 'enkratni'}><option value="enkratni">Enkratni</option><option value="mesecni">Mesečni (redni)</option><option value="letni">Letni (redni)</option></select></label><label className={styles.expenseTagsLabel}>Značke<div className={styles.expenseTagsBox}>{tags.map(tag => <span key={tag} className={styles.expenseTagChip}>{tag}<button type="button" onClick={() => odstraniZnacko(tag)} aria-label={`Odstrani značko ${tag}`}>×</button></span>)}<input value={tagInput} onChange={event => setTagInput(event.target.value)} onKeyDown={onTagKeyDown} placeholder={tags.length ? '' : 'npr. mesečni, najem…'} /></div>{vidniPredlogi.length > 0 && <div className={styles.expenseTagSuggestions}>{vidniPredlogi.map(tag => <button key={tag} type="button" onClick={() => dodajZnacko(tag)}>{tag}</button>)}</div>}</label><label>Znesek<input required name="amount" type="number" min="0" step="0.01" defaultValue={editing?.amount} /></label><label>Datum<input required name="date" type="date" defaultValue={editing?.date || new Date().toISOString().slice(0, 10)} /></label><label>Račun ali potrdilo<input name="document" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" />{editing?.fileName && <small>Trenutno: {editing.fileName}</small>}</label><label>Projekt / ponudba<select name="sourceOfferId" defaultValue={editing?.sourceOfferId || ''}><option value="">Ni vezan na projekt</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}</select></label><label>Podjetje<select name="company" defaultValue={editing?.company || ''}><option value="">Moje glavno podjetje</option>{companies.map(company => <option key={company}>{company}</option>)}</select></label><label>Stranka brez ponudbe<input name="client" defaultValue={editing?.client} placeholder="neobvezno" /></label><div className={styles.expenseEditorActions}>{editing && <button type="button" className={styles.expenseEditorDelete} onClick={() => { if (editing && remove(editing.id)) { setOpen(false); setEditing(null); } }} aria-label="Izbriši strošek" title="Izbriši strošek"><Trash size={16} weight="bold" /></button>}<button type="button" onClick={() => { setOpen(false); setEditing(null); }}>Prekliči</button><button>{editing ? 'Shrani spremembe' : 'Shrani strošek'}</button></div></form></section>}
    <section className={styles.expenseArchive}><header><div><p className={styles.eyebrow}>EVIDENCA</p><h2>Stroški po namenu.</h2></div><div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center', width: '100%' }}><MobTabs label="Prikaz" vrednost={filter} naVrednost={id => setFilter((id || 'all') as 'all' | 'project' | 'company')} opcije={[{ id: 'all', label: 'Vsi' }, { id: 'project', label: 'Projektni' }, { id: 'company', label: 'Podjetje' }]} /><div className={`${styles.invoiceFilters} mobtabs-hide`}>{(['all', 'project', 'company'] as const).map(value => <button key={value} className={filter === value ? styles.invoiceFilterActive : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Vsi' : value === 'project' ? 'Projektni' : 'Podjetje'}</button>)}</div>{filterTags.length > 0 && <MobTabs label="Značke" vrednost={tagFilter ?? ''} naVrednost={id => setTagFilter(id || null)} opcije={[{ id: '', label: 'Vse značke' }, ...filterTags.map(tag => ({ id: tag, label: tag }))]} />}<div style={{ marginLeft: 'auto', display: 'flex' }}><IskalnikMob vrednost={search} naVrednost={setSearch} placeholder="Poišči strošek …" label="Poišči strošek" /></div></div></header>
{filterTags.length > 0 && <div className={`${styles.invoiceFilters} ${styles.tagFilterRow} mobtabs-hide`}><button className={tagFilter === null ? styles.invoiceFilterActive : ''} onClick={() => setTagFilter(null)}>Vse značke</button>{filterTags.map(tag => <button key={tag} className={tagFilter && tagFilter.toLowerCase() === tag.toLowerCase() ? styles.invoiceFilterActive : ''} onClick={() => setTagFilter(current => current && current.toLowerCase() === tag.toLowerCase() ? null : tag)}>{tag}</button>)}</div>}{shown.length > 0 && <div className={styles.expenseSelAllRow}><label className={styles.expenseSelAll}><input type="checkbox" className={styles.expenseChk} checked={vsiIzbrani} onChange={preklopiVse} aria-label="Označi vse" /><span>{vsiIzbrani ? 'Odznači vse' : `Označi vse (${shown.length})`}</span></label>{izbrani.size > 0 && <button type="button" className={styles.expenseBulkDelete} onClick={removeIzbrane} aria-label={`Izbriši izbrane (${izbrani.size})`} title="Izbriši izbrane"><Trash size={15} weight="bold" /></button>}</div>}{shown.length ? <><div className={styles.expenseList}>{shownStran.map(item => { const offer = offers.find(offerItem => offerItem.id === item.sourceOfferId); return <div key={item.id} className={styles.expenseSwipe} ref={el => { if (el) swipeEls.current.set(item.id, el); else swipeEls.current.delete(item.id); }} onScroll={onSwipeScroll(item.id)} onClick={onRowClick(item)}><article className={izbrani.has(item.id) ? styles.expenseRowSel : undefined}><input type="checkbox" className={styles.expenseChk} data-row-select checked={izbrani.has(item.id)} onChange={() => preklopiIzbor(item.id)} onClick={event => event.stopPropagation()} aria-label={`Izberi ${item.title}`} /><span className={styles.expenseCoin}>€</span><div><strong>{item.title}</strong><small>{item.category || 'Strošek'}{jeReden(item) ? ` · ${item.obdobje === 'letni' ? 'letno' : 'mesečno'}` : ''} · {new Date(item.date).toLocaleDateString('sl-SI')}</small></div><div><strong>{money(item.amount)}</strong><small>{offer ? `Projekt: ${offer.title}` : item.company ? `Podjetje: ${item.company}` : 'Splošni strošek'}</small></div><div className={styles.expenseActions}><button className={styles.expenseKebab} onClick={onDotsClick(item.id)} aria-label={`Dejanja: ${item.title}`} aria-expanded={kebabId === item.id}><DotsThreeVertical size={18} weight="bold" /></button>{kebabId === item.id && <><div className={styles.expenseKebabBack} onClick={() => setKebabId(null)} aria-hidden /><div className={styles.expenseKebabMenu} role="menu"><button type="button" onClick={() => { setEditing(item); setOpen(true); setKebabId(null); }}><PencilSimple size={14} weight="bold" /> Uredi</button><button type="button" className={styles.expenseKebabBrisi} onClick={() => { remove(item.id); setKebabId(null); }}><X size={13} weight="bold" /> Izbriši</button></div></>}</div>{item.tags && item.tags.length > 0 && <div className={styles.expenseItemTags}>{item.tags.map(tag => <span key={tag} className={styles.expenseItemTag} style={{ '--tag-h': [...tag].reduce((a, c) => a + c.charCodeAt(0), 0) % 360 } as CSSProperties}>{tag}</span>)}</div>}</article><div className={styles.expenseSwipeActions} data-swipe-actions><button type="button" className={styles.expenseSwipeBrisi} onClick={() => remove(item.id)} aria-label={`Izbriši ${item.title}`}><Trash size={17} weight="bold" /><span>Izbriši</span></button></div></div>; })}</div><Paginacija stran={stranStrVarno} strani={straniStr} naStran={setStranStr} /></> : (expenses.length === 0
      ? <div className={styles.expenseEmpty}><span className={styles.expenseEmptyIkona}><Receipt size={24} weight="light" /></span><strong>Še ni stroškov.</strong><p>Dodaj prvega — projektni, podjetja ali splošni.</p><button type="button" onClick={() => { setEditing(null); setOpen(true); }}>Dodaj strošek</button></div>
      : <p className={styles.invoiceEmpty}>Ni zadetkov za ta filter.</p>)}</section>
    {izbrani.size > 0 && <div className={styles.expenseIzborBar}><span>{izbrani.size} izbranih</span><button type="button" onClick={izvoziCsv}>Izvozi CSV</button><button type="button" className={styles.expenseIzborPrekl} onClick={() => setIzbrani(new Set())}>Prekliči</button></div>}
    {!open && izbrani.size === 0 && <button type="button" className={styles.expenseFab} onClick={() => { setEditing(null); setOpen(true); }} aria-label="Dodaj strošek" title="Dodaj strošek"><Plus size={22} weight="bold" /></button>}
  </div>;
}
