'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { MagnifyingGlass, PencilSimple, Trash, ArrowCounterClockwise } from '@phosphor-icons/react';
import Paginacija from '@/components/Paginacija';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { PRICING_SERVICES, type PricingService } from '@/lib/pricingCatalog';
import { saveCloudSettings } from '@/lib/pinartFlowCloud';
import { usePredogled } from '@/lib/predogled';
import { demoProdukti, enotaIme, ENOTE_PRODUKT, preberiProdukte, shraniProdukte, type Produkt, type ProduktEnota } from '@/lib/produkti';

/* Ikone poenotene na Phosphor. Inline fill/stroke preglasi stare stroke-based
   CSS pravila (fill:none), da so Phosphor ikone vidne. */
const IKONA_SLOG = { fill: 'currentColor', stroke: 'none' } as const;

type PriceProfile = { osnove: Record<string, number>; mojTrg: string; izkusnje: string; postavke?: unknown[]; mojeStoritve?: PricingService[] };

/* Prikazna imena trgov za majhno oznako pod imenom cenika (isti ID-ji kot
   TRGI v KalkulatorApp.tsx — cenik prevzame mojTrg iz nastavitev kalkulatorja,
   zato mora znati prikazati vse, ne le 'si'). 'eu' je dodaten oznaka za
   demo/tujino, ki je sistem sicer ne uporablja pri racunanju. */
const TRG_OZNAKA: Record<string, string> = {
  si: 'Slovenija / srednja EU', west: 'Zahodna Evropa', us: 'ZDA / UK / Skandinavija',
  east: 'Vzhodna EU / Balkan', mena: 'Zaliv / bogatejši MENA trgi', asia: 'Global South / nižji trgi',
  eu: 'Tujina / EU',
};

const zaokrozi10 = (n: number) => Math.round(n / 10) * 10;
const CENIK_NA_STRAN = 10;

/* Demo primeri (predogled 'demo', glej lib/predogled.ts): trije smiselni
   ceniki, da stran izgleda polno tudi brez shranjenih uporabniskih podatkov.
   Struktura je ista kot pri pravem profilu (osnove izracunane iz
   PRICING_SERVICES), da so tipi in privzete vrednosti pravilne. */
const DEMO_PROFILI: Record<string, PriceProfile> = {
  'Slovenija — lokalne stranke': {
    osnove: Object.fromEntries(PRICING_SERVICES.map(service => [service.id, service.osnova])),
    mojTrg: 'si', izkusnje: 'samostojen', mojeStoritve: [],
  },
  'Tujina / EU': {
    osnove: Object.fromEntries(PRICING_SERVICES.map(service => [service.id, zaokrozi10(service.osnova * 1.5)])),
    mojTrg: 'eu', izkusnje: 'samostojen', mojeStoritve: [],
  },
  'Agencije / premium': {
    osnove: Object.fromEntries(PRICING_SERVICES.map(service => [service.id, zaokrozi10(service.osnova * 2)])),
    mojTrg: 'si', izkusnje: 'samostojen', mojeStoritve: [],
  },
};

export default function PriceListsWorkspace() {
  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljenega cenika poskusil
     pisati v pravo shrambo (localStorage/cloud pravega racuna). */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';
  const jeEn = useLocale() === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  const [profiles, setProfiles] = useState<Record<string, PriceProfile>>({});
  const [selected, setSelected] = useState('');
  const [active, setActive] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  /* Preklop Storitve/Produkti (glej priceViewSwitch v CSS). Produkti so nov,
     preprostejsi ("webshop") pogled ob obstojecem cenovnem urejevalniku
     storitev — ne zamenjujeta se, uporabnica lahko preklaplja med njima. */
  const [pogled, setPogled] = useState<'storitve' | 'produkti'>('storitve');
  const [produkti, setProdukti] = useState<Produkt[]>([]);
  const [urejaProdukt, setUrejaProdukt] = useState('');
  const [stran, setStran] = useState(1);

  useEffect(() => {
    if (nacin === 'empty') {
      /* Nov uporabnik: brez demo cenikov/profilov/produktov — prikaze se prazno stanje. */
      setProfiles({}); setActive(''); setSelected(''); setProdukti([]);
      return;
    }
    if (nacin === 'demo') {
      const prvo = Object.keys(DEMO_PROFILI)[0];
      setProfiles(DEMO_PROFILI); setActive(prvo); setSelected(prvo);
      setProdukti(demoProdukti());
      return;
    }
    const saved = JSON.parse(localStorage.getItem('pinart-kalkulator-profili') || '{}') as Record<string, PriceProfile>;
    const settings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}');
    setProfiles(saved); setActive(settings.aktivniCenik || ''); setSelected(settings.aktivniCenik && saved[settings.aktivniCenik] ? settings.aktivniCenik : Object.keys(saved)[0] || '');
    setProdukti(preberiProdukte());
  }, [nacin]);

  const profile = profiles[selected];
  const services = useMemo(() => profile ? [...PRICING_SERVICES, ...(profile.mojeStoritve || [])].filter((item, index, all) => all.findIndex(service => service.id === item.id) === index).filter(item => item.ime.toLocaleLowerCase('sl-SI').includes(search.toLocaleLowerCase('sl-SI'))) : [], [profile, search]);
  const steviloPostavk = pogled === 'storitve' ? services.length : produkti.length;
  const strani = Math.max(1, Math.ceil(steviloPostavk / CENIK_NA_STRAN));
  const varnaStran = Math.min(stran, strani);
  const zacetekStrani = (varnaStran - 1) * CENIK_NA_STRAN;
  const servicesStran = services.slice(zacetekStrani, zacetekStrani + CENIK_NA_STRAN);
  const produktiStran = produkti.slice(zacetekStrani, zacetekStrani + CENIK_NA_STRAN);
  useEffect(() => { setStran(1); }, [search, selected, pogled]);
  const persist = (next: Record<string, PriceProfile>) => { if (samoOgled) return; setProfiles(next); localStorage.setItem('pinart-kalkulator-profili', JSON.stringify(next)); void saveCloudSettings({ priceProfiles: next }); };
  const updateSettings = (name: string, nextProfile: PriceProfile) => { if (samoOgled) return; const settings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}'); localStorage.setItem('pinart-kalkulator-v2', JSON.stringify({ ...settings, aktivniCenik: name, osnove: nextProfile.osnove, mojTrg: nextProfile.mojTrg, izkusnje: nextProfile.izkusnje, mojeStoritve: nextProfile.mojeStoritve })); void saveCloudSettings({ activePriceProfile: name, priceProfiles: { ...profiles, [name]: nextProfile } }); };
  const create = () => { if (samoOgled) return; const settings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}'); let index = Object.keys(profiles).length + 1; let name = `Moj cenik ${index}`; while (profiles[name]) name = `Moj cenik ${++index}`; const item: PriceProfile = { osnove: settings.osnove || Object.fromEntries(PRICING_SERVICES.map(service => [service.id, service.osnova])), mojTrg: settings.mojTrg || 'si', izkusnje: settings.izkusnje || 'samostojen', mojeStoritve: settings.mojeStoritve || [] }; persist({ ...profiles, [name]: item }); setSelected(name); };
  const rename = (name: string) => { if (samoOgled) return; const nextName = window.prompt(L('Novo ime cenika', 'New price list name'), name)?.trim(); if (!nextName || nextName === name || profiles[nextName]) return; const next: Record<string, PriceProfile> = {}; Object.entries(profiles).forEach(([key, value]) => { next[key === name ? nextName : key] = value; }); persist(next); setSelected(nextName); if (active === name) { setActive(nextName); updateSettings(nextName, next[nextName]); } };
  const remove = (name: string) => { if (samoOgled) return; if (!window.confirm(L(`Izbrišem cenik »${name}«?`, `Delete the price list "${name}"?`))) return; const next = { ...profiles }; delete next[name]; persist(next); const fallback = Object.keys(next)[0] || ''; setSelected(fallback); if (active === name) setActive(''); };
  const setPrice = (id: string, value: number) => { if (samoOgled || !profile) return; const updated = { ...profile, osnove: { ...profile.osnove, [id]: value } }; const next = { ...profiles, [selected]: updated }; persist(next); if (active === selected) updateSettings(selected, updated); };
  const activate = () => { if (samoOgled || !profile) return; setActive(selected); updateSettings(selected, profile); setNotice(L('Ta cenik se zdaj uporablja v kalkulatorju.', 'This price list is now used by the calculator.')); window.setTimeout(() => setNotice(''), 2500); };
  const addService = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (samoOgled || !profile) return; const data = new FormData(event.currentTarget); const name = String(data.get('name')).trim(); const price = Number(data.get('price')); if (!name) return; const id = `custom-${crypto.randomUUID()}`; const updated = { ...profile, mojeStoritve: [...(profile.mojeStoritve || []), { id, ime: name, osnova: price }], osnove: { ...profile.osnove, [id]: price } }; persist({ ...profiles, [selected]: updated }); if (active === selected) updateSettings(selected, updated); event.currentTarget.reset(); };

  /* Produkti — globalna shramba (lib/produkti.ts), locena od cenikov storitev. */
  const persistProdukti = (next: Produkt[]) => { if (samoOgled) return; setProdukti(next); shraniProdukte(next); };
  const addProdukt = () => { if (samoOgled) return; const id = `p-${crypto.randomUUID()}`; const nov: Produkt = { id, naziv: L('Nov produkt', 'New product'), sifra: '', opis: '', cena: 0, enota: 'kos' }; persistProdukti([...produkti, nov]); setUrejaProdukt(id); };
  /* Ponastavi na privzeto: cenik/produkti so prednapolnjeni iz standardnega kataloga — če jih
     spremeniš ali izbrišeš, jih tu vrneš na privzete vrednosti. */
  const resetToDefaults = () => {
    if (samoOgled) return;
    if (pogled === 'storitve') {
      if (!selected || !window.confirm(L('Ponastavim cene tega cenika na privzete (standardni katalog)?', 'Reset this price list to the standard catalogue?'))) return;
      const defaults = Object.fromEntries(PRICING_SERVICES.map(service => [service.id, service.osnova]));
      persist({ ...profiles, [selected]: { ...profiles[selected], osnove: defaults } });
    } else {
      if (!window.confirm(L('Ponastavim produkte na privzete (standardni katalog)?', 'Reset products to the standard catalogue?'))) return;
      persistProdukti(demoProdukti());
    }
  };
  const updateProdukt = (id: string, patch: Partial<Produkt>) => { if (samoOgled) return; persistProdukti(produkti.map(item => item.id === id ? { ...item, ...patch } : item)); };
  const removeProdukt = (id: string) => { if (samoOgled) return; if (!window.confirm(L('Izbrišem ta produkt?', 'Delete this product?'))) return; persistProdukti(produkti.filter(item => item.id !== id)); if (urejaProdukt === id) setUrejaProdukt(''); };

  return <div className={styles.priceListsPage}>
    {notice && <div className={styles.goalSaved} role="status">{notice}</div>}
    <section className={styles.priceListIntro}><div><p className={styles.eyebrow}>{L('PROFILI CEN', 'PRICE PROFILES')}</p><h2>{L('Različne cene za različne načine dela.', 'Different prices for different kinds of work.')}</h2><p>{L('Pripravi cenik za lokalne stranke, tujino ali posamezno vrsto storitev. Aktivni cenik uporablja kalkulator.', 'Build a price list for local clients, abroad, or a single kind of service. The active list is used by the calculator.')}</p></div>{pogled === 'storitve' ? <button onClick={create} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : undefined}>{L('+ Nov cenik', '+ New price list')}</button> : <button onClick={addProdukt} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : undefined}>{L('+ Nov produkt', '+ New product')}</button>}</section>
    <div className={styles.priceViewSwitch} role="tablist">
      <button type="button" role="tab" aria-selected={pogled === 'storitve'} className={pogled === 'storitve' ? styles.priceViewActive : ''} onClick={() => setPogled('storitve')}>{L('Storitve', 'Services')}</button>
      <button type="button" role="tab" aria-selected={pogled === 'produkti'} className={pogled === 'produkti' ? styles.priceViewActive : ''} onClick={() => setPogled('produkti')}>{L('Produkti', 'Products')}</button>
    </div>
    {pogled === 'storitve' ? <div className={styles.priceListsLayout}>
      <div className={styles.priceMobBar}><select className={styles.priceMobSelect} value={selected || ''} onChange={event => setSelected(event.target.value)} aria-label={L('Izberi cenik', 'Select price list')}>{Object.keys(profiles).map(name => <option key={name} value={name}>{name}{active === name ? L(' · Aktiven', ' · Active') : ''}</option>)}</select><button type="button" className={styles.priceMobNew} onClick={create} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : L('Nov cenik', 'New price list')}>{L('+ Nov cenik', '+ New price list')}</button></div>
      <aside className={styles.priceProfileList}><header><p className={styles.eyebrow}>{L('MOJI CENIKI', 'MY PRICE LISTS')}</p><strong>{Object.keys(profiles).length}</strong></header>{Object.keys(profiles).map(name => <button key={name} className={selected === name ? styles.priceProfileActive : ''} onClick={() => setSelected(name)}><span><strong>{name}</strong><small>{TRG_OZNAKA[profiles[name].mojTrg] || profiles[name].mojTrg}</small></span>{active === name && <b>{L('Aktiven', 'Active')}</b>}</button>)}{!Object.keys(profiles).length && <div className={styles.priceProfileEmpty}><strong>{L('Še nimaš shranjenega cenika.', 'No saved price list yet.')}</strong><p>{L('Ustvari prvega iz trenutnih nastavitev kalkulatorja.', 'Create the first one from your current calculator settings.')}</p></div>}</aside>
      <section className={styles.priceEditor}>{profile ? <><header><div><p className={styles.eyebrow}>{active === selected ? L('AKTIVNI CENIK', 'ACTIVE PRICE LIST') : L('CENIK', 'PRICE LIST')}</p><h2>{selected}</h2><span>{services.length} {L('storitev', 'services')}</span></div><div><button className={styles.priceIconBtn} onClick={resetToDefaults} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : L('Ponastavi cene na privzeto', 'Reset prices to default')} aria-label={L('Ponastavi na privzeto', 'Reset to default')}><ArrowCounterClockwise size={16} weight="bold" /></button><button className={styles.priceIconBtn} onClick={() => rename(selected)} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : L('Preimenuj cenik', 'Rename price list')} aria-label={L('Preimenuj cenik', 'Rename price list')}><PencilSimple size={16} weight="bold" /></button><button className={`${styles.priceIconBtn} ${styles.priceIconBtnDel}`} onClick={() => remove(selected)} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : L('Izbriši cenik', 'Delete price list')} aria-label={L('Izbriši cenik', 'Delete price list')}><Trash size={16} weight="bold" /></button>{active !== selected && <button className={styles.activatePriceList} onClick={activate} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : undefined}>{L('Uporabi v kalkulatorju', 'Use in the calculator')}</button>}</div></header><form className={styles.addPriceService} onSubmit={addService}><div><p className={styles.eyebrow}>{L('NOVA STORITEV', 'NEW SERVICE')}</p><strong>{L('Dodaj svojo cenovno postavko', 'Add your own price item')}</strong></div><input required name="name" placeholder={L('Ime storitve', 'Service name')} disabled={samoOgled} /><input required min="0" name="price" step="10" type="number" placeholder={L('Cena', 'Price')} disabled={samoOgled} /><button disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : undefined}>{L('+ Dodaj', '+ Add')}</button></form><label className={styles.priceSearch}><MagnifyingGlass className={styles.searchIcon} size={20} weight="regular" aria-hidden="true" style={IKONA_SLOG} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={L('Poišči storitev …', 'Find a service …')} /></label><div className={styles.priceRows}>{servicesStran.map(service => <label key={service.id}><span><strong>{service.ime}</strong><small>{service.id.startsWith('custom-') ? L('Tvoja storitev', 'Your service') : L('Storitev', 'Service')}</small></span><span><input min="0" step="10" type="number" value={profile.osnove[service.id] ?? service.osnova} onChange={event => setPrice(service.id, Number(event.target.value))} disabled={samoOgled} /><b>€</b></span></label>)}</div><Paginacija stran={varnaStran} strani={strani} naStran={setStran} /></> : <div className={styles.priceEditorEmpty}><span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg></span><strong>{L('Ustvari ali izberi cenik.', 'Create or pick a price list.')}</strong><p>{L('Nato lahko prilagodiš svoje storitve in cene.', 'Then you can adjust your services and prices.')}</p></div>}</section>
    </div> : <section className={styles.produktEditor}>
      <div className={styles.produktGlava}><p className={styles.eyebrow}>{L('PRODUKTI', 'PRODUCTS')}</p><button type="button" className={styles.produktReset} onClick={resetToDefaults} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : L('Ponastavi produkte na privzeto', 'Reset products to default')} aria-label={L('Ponastavi na privzeto', 'Reset to default')}><ArrowCounterClockwise size={15} weight="bold" /> {L('Ponastavi', 'Reset')}</button></div>
      <div className={styles.produktList}>
        {produktiStran.map(item => urejaProdukt === item.id ? (
          <div key={item.id} className={styles.produktForm}>
            <input className={styles.produktFormNaziv} required value={item.naziv} onChange={event => updateProdukt(item.id, { naziv: event.target.value })} placeholder={L('Naziv produkta', 'Product name')} disabled={samoOgled} />
            <input className={styles.produktFormSifra} value={item.sifra || ''} onChange={event => updateProdukt(item.id, { sifra: event.target.value })} placeholder={L('Šifra artikla', 'Item code')} disabled={samoOgled} />
            <input className={styles.produktFormOpis} value={item.opis || ''} onChange={event => updateProdukt(item.id, { opis: event.target.value })} placeholder={L('Opis', 'Description')} disabled={samoOgled} />
            <span className={styles.produktFormCena}><input required min="0" step="0.01" type="number" value={item.cena} onChange={event => updateProdukt(item.id, { cena: Number(event.target.value) })} disabled={samoOgled} /><b>€</b><select value={item.enota || 'kos'} onChange={event => updateProdukt(item.id, { enota: event.target.value as ProduktEnota })} disabled={samoOgled}>{ENOTE_PRODUKT.map(enota => <option key={enota.id} value={enota.id}>{jeEn ? enota.imeEn : enota.ime}</option>)}</select></span>
            <input className={styles.produktFormZaloga} min="0" type="number" value={item.zaloga ?? ''} onChange={event => updateProdukt(item.id, { zaloga: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder={L('Zaloga', 'Stock')} disabled={samoOgled} />
            <button type="button" onClick={() => setUrejaProdukt('')} disabled={samoOgled}>{L('Shrani', 'Save')}</button>
          </div>
        ) : (
          <div key={item.id} className={styles.produktCard}>
            <div className={styles.produktInfo}>
              <strong>{item.naziv}</strong>
              {item.sifra && <small>{L('Šifra', 'Code')}: {item.sifra}</small>}
              {item.opis && <p>{item.opis}</p>}
            </div>
            <div className={styles.produktMeta}>
              <strong>{item.cena.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} € / {enotaIme(item.enota, jeEn)}</strong>
              <span>{item.zaloga != null ? `${L('na zalogi', 'in stock')}: ${item.zaloga}` : '—'}</span>
            </div>
            <div className={styles.produktGumbi}>
              <button className={styles.produktIkon} onClick={() => setUrejaProdukt(item.id)} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : L('Uredi', 'Edit')} aria-label={L('Uredi produkt', 'Edit product')}><PencilSimple size={15} weight="bold" /></button>
              <button className={`${styles.produktIkon} ${styles.produktIkonDel}`} onClick={() => removeProdukt(item.id)} disabled={samoOgled} title={samoOgled ? L('Ni na voljo v predogledu (demo)', 'Not available in preview (demo)') : L('Izbriši', 'Delete')} aria-label={L('Izbriši produkt', 'Delete product')}><Trash size={15} weight="bold" /></button>
            </div>
          </div>
        ))}
        {!produkti.length && <div className={styles.priceProfileEmpty}><strong>{L('Še nimaš dodanega produkta.', 'No products yet.')}</strong><p>{L('Dodaj prvega s klikom na »+ Nov produkt«.', 'Add the first one with »+ New product«.')}</p></div>}
      </div>
      <Paginacija stran={varnaStran} strani={strani} naStran={setStran} />
    </section>}
  </div>;
}
