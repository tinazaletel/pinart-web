'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, UploadSimple, Copy, Check, Trash, DownloadSimple, MagnifyingGlass, LockKey, ArrowSquareOut, Fingerprint, FloppyDisk, CloudArrowUp } from '@phosphor-icons/react';
import { usePredogled } from '@/lib/predogled';

/* SEF AVTORSTVA (MVP) — nespremenljiv zapis DOKAZA o avtorstvu/datumu nastanka.
   Ne shranjujemo težkih datotek: shranimo kriptografski "prstni odtis" (SHA-256 hash)
   + čas + orodje + opombe. Original obdržiš ti; pozneje delo PREVERIŠ (re-hash) in
   sef potrdi, da je to točno tvoja datoteka iz tega datuma.
   NASLEDNJI KORAK (post-MVP): OVERJEN časovni žig (eIDAS / OpenTimestamps) + oblak. */

type Zapis = {
  id: string;
  naslov: string;
  datoteka: string;
  velikost: number;
  tip: string;
  hash: string;
  orodje: string;
  kategorija?: string;
  posnetekIme?: string;
  posnetekHash?: string;
  opombe?: string;
  ustvarjeno: string; // ISO — zabeleženo ob zaščiti (ne "zadnji shranjeni datum")
};

const KEY = 'pinart-sef-avtorstva';
const ORODJA_SL = ['Adobe Illustrator', 'Adobe Photoshop', 'Adobe InDesign', 'Figma', 'Procreate', 'Affinity Designer', 'Blender', 'Canva', 'Ročno / skica', 'Besedilo / dokument', 'Drugo'];
const ORODJA_EN = ['Adobe Illustrator', 'Adobe Photoshop', 'Adobe InDesign', 'Figma', 'Procreate', 'Affinity Designer', 'Blender', 'Canva', 'By hand / sketch', 'Text / document', 'Other'];
const KATEGORIJE_SL = ['Ilustracija', 'Logotip', 'Celostna grafična podoba', 'Embalaža', 'Splet / UI', 'Fotografija', 'Besedilo', 'Glasba', 'Video', 'Drugo'];
const KATEGORIJE_EN = ['Illustration', 'Logo', 'Brand identity', 'Packaging', 'Web / UI', 'Photography', 'Text', 'Music', 'Video', 'Other'];

/* Demo »polno poslovanje« — prikaže se v predogledu 'demo' (fiksni podatki, ne pravi zapisi). */
const DEMO_ZAPISI: Zapis[] = [
  { id: 'd1', naslov: 'Ilustracija Pupa', datoteka: 'pupa.ai', velikost: 2417000, tip: 'application/illustrator', hash: 'da96f4ef91d7495ca8a1e11473b0a9c2f8e1d6b4a2c9e0f3d7b1a5c8e2f4d6a90', orodje: 'Adobe Illustrator', kategorija: 'Ilustracija', posnetekIme: 'proces-pupa.png', posnetekHash: '4b2c…', opombe: 'Izvirni lik, ustvarjen pred AI izpeljankami.', ustvarjeno: '2026-03-12T09:24:00.000Z' },
  { id: 'd2', naslov: 'Logotip — Kavarna Zrno', datoteka: 'zrno-logo.svg', velikost: 84000, tip: 'image/svg+xml', hash: '1f7a9c3e5b2d8f0a4c6e1b9d7f3a2c5e8b0d4f6a1c3e5b7d9f2a4c6e8b0d1f3a5', orodje: 'Adobe Illustrator', kategorija: 'Logotip', opombe: undefined, ustvarjeno: '2026-04-02T14:10:00.000Z' },
  { id: 'd3', naslov: 'Embalaža čaja — serija', datoteka: 'caj-embalaza.psd', velikost: 15820000, tip: 'image/vnd.adobe.photoshop', hash: '9c0e2b4d6f8a1c3e5b7d9f0a2c4e6b8d0f1a3c5e7b9d1f2a4c6e8b0d2f4a6c8e0', orodje: 'Adobe Photoshop', kategorija: 'Embalaža', opombe: 'Za naročnika, licenca 2 leti EU.', ustvarjeno: '2026-05-19T11:47:00.000Z' },
  { id: 'd4', naslov: 'Spletni hero — Studio', datoteka: 'hero.fig', velikost: 640000, tip: 'application/figma', hash: '3e5b7d9f1a2c4e6b8d0f2a4c6e8b0d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5', orodje: 'Figma', kategorija: 'Splet / UI', opombe: undefined, ustvarjeno: '2026-06-30T16:05:00.000Z' },
];

async function sha256(file: File | Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function preberi(): Zapis[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function shrani(z: Zapis[]) { try { localStorage.setItem(KEY, JSON.stringify(z)); } catch {} }

export default function SefAvtorstvaWorkspace({ base = '' }: { base?: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const ORODJA = jeEn ? ORODJA_EN : ORODJA_SL;
  const KATEGORIJE = jeEn ? KATEGORIJE_EN : KATEGORIJE_SL;

  const [zapisi, setZapisi] = useState<Zapis[]>([]);
  const [datoteka, setDatoteka] = useState<File | null>(null);
  const [naslov, setNaslov] = useState('');
  const [orodje, setOrodje] = useState('');
  const [kategorija, setKategorija] = useState('');
  const [posnetek, setPosnetek] = useState<File | null>(null);
  const [opombe, setOpombe] = useState('');
  const [dela, setDela] = useState(false);
  const [kopiran, setKopiran] = useState<string | null>(null);
  const [preverjeno, setPreverjeno] = useState<null | { najden: Zapis | null; ime: string }>(null);
  const [iskanje, setIskanje] = useState('');
  const [filterKat, setFilterKat] = useState('');
  const [stran, setStran] = useState(1);
  const [nacin] = usePredogled();
  const preverjRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setZapisi(preberi()); }, []);
  useEffect(() => { setStran(1); }, [iskanje, filterKat, nacin]);

  const izberiDatoteko = (f: File | null) => {
    setDatoteka(f);
    if (f && !naslov) setNaslov(f.name.replace(/\.[^.]+$/, ''));
  };

  const zasciti = async () => {
    if (!datoteka || dela) return;
    setDela(true);
    try {
      const hash = await sha256(datoteka);
      const posnetekHash = posnetek ? await sha256(posnetek) : undefined;
      const zapis: Zapis = {
        id: `${Date.now()}-${Math.round(performance.now())}`,
        naslov: naslov.trim() || datoteka.name,
        datoteka: datoteka.name,
        velikost: datoteka.size,
        tip: datoteka.type || '—',
        hash,
        orodje: orodje.trim(),
        kategorija: kategorija.trim() || undefined,
        posnetekIme: posnetek?.name,
        posnetekHash,
        opombe: opombe.trim() || undefined,
        ustvarjeno: new Date().toISOString(),
      };
      const novi = [zapis, ...zapisi];
      setZapisi(novi); shrani(novi);
      setDatoteka(null); setNaslov(''); setOrodje(''); setKategorija(''); setPosnetek(null); setOpombe('');
    } finally { setDela(false); }
  };

  const izbrisi = (id: string) => {
    if (!confirm(L('Izbrišem ta zapis iz sefa? Dokaza po izbrisu ni več.', 'Delete this vault record? The proof will be gone.'))) return;
    const novi = zapisi.filter(z => z.id !== id);
    setZapisi(novi); shrani(novi);
  };

  const kopiraj = (hash: string) => {
    navigator.clipboard?.writeText(hash).then(() => { setKopiran(hash); setTimeout(() => setKopiran(null), 1400); }).catch(() => {});
  };

  const potrdilo = (z: Zapis) => {
    const cert = {
      _: 'Pinart Flow — Potrdilo o zaščiti avtorstva (MVP)',
      naslov: z.naslov,
      datoteka: z.datoteka,
      tip: z.tip,
      velikost_bajtov: z.velikost,
      sha256: z.hash,
      orodje: z.orodje || null,
      posnetek: z.posnetekIme ? { ime: z.posnetekIme, sha256: z.posnetekHash } : null,
      opombe: z.opombe || null,
      zabelezeno: z.ustvarjeno,
      opozorilo: 'MVP: lokalni zapis prstnega odtisa. Dokončni pravni dokaz = overjen časovni žig (eIDAS/OpenTimestamps) — v pripravi.',
    };
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `potrdilo-${z.naslov.replace(/[^\w-]+/g, '_').slice(0, 40)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  const preveri = async (f: File | null) => {
    if (!f) return;
    const hash = await sha256(f);
    const najden = zapisi.find(z => z.hash === hash) || null;
    setPreverjeno({ najden, ime: f.name });
    if (preverjRef.current) preverjRef.current.value = '';
  };

  const datum = (iso: string) => new Date(iso).toLocaleString(jeEn ? 'en-GB' : 'sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  /* Predogled: 'empty' = brez vnosov, 'demo' = demo »polno poslovanje«, sicer pravi (localStorage). */
  const osnovni = nacin === 'demo' ? DEMO_ZAPISI : nacin === 'empty' ? [] : zapisi;
  const kategorijeVal = Array.from(new Set(osnovni.map(z => z.kategorija).filter(Boolean))) as string[];
  const q = iskanje.trim().toLowerCase();
  const vidni = osnovni.filter(z =>
    (!filterKat || z.kategorija === filterKat) &&
    (!q || [z.naslov, z.datoteka, z.orodje, z.kategorija, z.opombe].some(s => (s || '').toLowerCase().includes(q)))
  );
  /* Paginacija: 10 na stran; pager se pokaže šele, ko je zapisov več. */
  const NA_STRAN = 10;
  const strani = Math.max(1, Math.ceil(vidni.length / NA_STRAN));
  const stranVar = Math.min(stran, strani);
  const straniVidni = vidni.slice((stranVar - 1) * NA_STRAN, stranVar * NA_STRAN);

  return (
    <div className="sef">
      <p className="sef-uvod">
        {L('Zabeleži ', 'Record ')}<b>{L('kdaj in s čim', 'when and with what')}</b>{L(' si nekaj ustvaril. Sef izračuna kriptografski prstni odtis (SHA-256) tvoje datoteke in trajno shrani datum — tako imaš dokaz o obstoju dela na določen dan (npr. ', ' you created something. The vault computes a cryptographic fingerprint (SHA-256) of your file and stores the date — so you have proof the work existed on a given day (e.g. ')}<em>{L('preden ga je AI prerisal', 'before an AI redrew it')}</em>{L(').', ').')}
      </p>

      {/* Kako deluje — 3 ključne razlage (kaj je odtis, obdrži original, oblak) */}
      <div className="sef-kako">
        <p className="sef-kako-glava">{L('Kako deluje', 'How it works')}</p>
        <div className="sef-kako-mreza">
          <div className="sef-kako-kartica">
            <span className="sef-kako-ikona"><Fingerprint size={20} weight="regular" /></span>
            <h3>{L('Prstni odtis', 'Fingerprint')}</h3>
            <p>{L('SHA-256 je »digitalna DNK« datoteke — koda, ki se ob najmanjši spremembi popolnoma spremeni. Vsebine iz nje ni mogoče razbrati, ujemanje pa dokažeš.', 'SHA-256 is the file’s “digital DNA” — a code that changes completely on the smallest edit. The content can’t be read from it, but you can prove a match.')}</p>
          </div>
          <div className="sef-kako-kartica">
            <span className="sef-kako-ikona"><FloppyDisk size={20} weight="regular" /></span>
            <h3>{L('Original obdrži', 'Keep the original')}</h3>
            <p>{L('Sef hrani dokaz (odtis + datum), ne nadomešča tvoje kopije. Izvirnik vedno ohrani na svojem računalniku.', 'The vault stores the proof (fingerprint + date); it doesn’t replace your copy. Always keep the original on your own computer.')}</p>
          </div>
          <div className="sef-kako-kartica">
            <span className="sef-kako-ikona"><CloudArrowUp size={20} weight="regular" /></span>
            <h3>{L('Oblačni trezor', 'Cloud vault')}</h3>
            <p>{L('Kmalu: datoteko shrani pri nas — varneje, če izgubiš kopijo. A noben sistem ni brez napak, zato obdrži tudi svojo varnostno kopijo.', 'Soon: stores your file with us — safer if you lose your copy. No system is flawless, so keep your own backup too.')}</p>
          </div>
        </div>
      </div>

      <div className="sef-mreza">
      {/* NALOŽI / ZAŠČITI (levi stolpec) */}
      <section className="sef-kartica">
        <h2><ShieldCheck size={20} weight="fill" /> {L('Zaščiti delo', 'Protect a work')}</h2>
        <label className={`sef-drop${datoteka ? ' ima' : ''}`}>
          <input type="file" onChange={e => izberiDatoteko(e.target.files?.[0] || null)} />
          <UploadSimple size={22} weight="regular" />
          <span>{datoteka ? datoteka.name : L('Izberi datoteko (grafika, PDF, besedilo, karkoli)', 'Choose a file (graphic, PDF, text, anything)')}</span>
          {datoteka && <small>{(datoteka.size / 1024).toFixed(0)} kB · {datoteka.type || '—'}</small>}
        </label>

        <div className="sef-polja">
          <label className="sef-polje"><span>{L('Naslov dela', 'Work title')}</span>
            <input value={naslov} onChange={e => setNaslov(e.target.value)} placeholder={L('npr. Ilustracija Pupa', 'e.g. Pupa illustration')} />
          </label>
          <label className="sef-polje"><span>{L('S katerim orodjem', 'Created with')}</span>
            <input list="sef-orodja" value={orodje} onChange={e => setOrodje(e.target.value)} placeholder={L('npr. Adobe Illustrator', 'e.g. Adobe Illustrator')} />
            <datalist id="sef-orodja">{ORODJA.map(o => <option key={o} value={o} />)}</datalist>
          </label>
          <label className="sef-polje"><span>{L('Kategorija', 'Category')}</span>
            <input list="sef-kategorije" value={kategorija} onChange={e => setKategorija(e.target.value)} placeholder={L('npr. Ilustracija', 'e.g. Illustration')} />
            <datalist id="sef-kategorije">{KATEGORIJE.map(k => <option key={k} value={k} />)}</datalist>
          </label>
        </div>

        <div className="sef-polje"><span>{L('Screenshot procesa (neobvezno — tudi ta se požigosa)', 'Process screenshot (optional — also fingerprinted)')}</span>
          <label className={`sef-drop mini${posnetek ? ' ima' : ''}`}>
            <input type="file" accept="image/*" onChange={e => setPosnetek(e.target.files?.[0] || null)} />
            <UploadSimple size={17} /> <span>{posnetek ? posnetek.name : L('Naloži screenshot', 'Upload screenshot')}</span>
          </label>
        </div>
        <label className="sef-polje"><span>{L('Opombe', 'Notes')}</span>
          <textarea value={opombe} onChange={e => setOpombe(e.target.value)} rows={2} placeholder={L('kontekst, naročnik, delovne datoteke (.ai/.psd) …', 'context, client, source files (.ai/.psd) …')} />
        </label>

        <button type="button" className="sef-gumb" disabled={!datoteka || dela} onClick={zasciti}>
          {dela ? L('Računam prstni odtis …', 'Computing fingerprint …') : <><ShieldCheck size={17} weight="fill" /> {L('Zaščiti in zabeleži datum', 'Protect & record date')}</>}
        </button>
        <p className="sef-mini"><LockKey size={13} weight="fill" /> {L('Datoteke ne pošiljamo nikamor — izračun teče v tvojem brskalniku. Shrani se le odtis + datum.', 'The file is never uploaded — hashing runs in your browser. Only the fingerprint + date are stored.')}</p>
      </section>

      <div className="sef-stolpec">
      {/* PREVERI */}
      <section className="sef-kartica sef-preveri">
        <h2><MagnifyingGlass size={20} weight="regular" /> {L('Preveri delo', 'Verify a work')}</h2>
        <p className="sef-mini2">{L('Naloži datoteko in preveri, ali se ujema z zaščitenim zapisom (dokaže, da je to točno tvoja datoteka).', 'Upload a file to check if it matches a protected record (proves it is exactly your file).')}</p>
        <label className="sef-drop mini">
          <input ref={preverjRef} type="file" onChange={e => preveri(e.target.files?.[0] || null)} />
          <MagnifyingGlass size={18} /> <span>{L('Izberi datoteko za preverjanje', 'Choose a file to verify')}</span>
        </label>
        {preverjeno && (
          preverjeno.najden
            ? <p className="sef-najdba ok"><Check size={16} weight="bold" /> {L('Ujema se z zapisom:', 'Matches record:')} {preverjeno.najden.naslov} — {datum(preverjeno.najden.ustvarjeno)}</p>
            : <p className="sef-najdba ne">{L('Za to datoteko ni zapisa v sefu (ni zaščiteno ali je bila spremenjena).', 'No vault record for this file (not protected, or it was changed).')}</p>
        )}
      </section>

      {/* REGISTRACIJA (desni stolpec, pod Preveri) */}
      <section className="sef-kartica sef-registracija">
        <h2>{L('Za dokončno registracijo', 'For formal registration')}</h2>
        <p className="sef-mini2">{L('Sef je tvoj vsakodnevni dokaz. Za formalno zaščito (znamka, model, avtorska pravica) uporabi uradne registre:', 'The vault is your everyday proof. For formal protection (trademark, design, copyright) use the official registries:')}</p>
        <div className="sef-linki">
          <a href="https://www.uil-sipo.si/" target="_blank" rel="noopener noreferrer">UIL (SI) <ArrowSquareOut size={13} /></a>
          <a href="https://euipo.europa.eu/" target="_blank" rel="noopener noreferrer">EUIPO (EU) <ArrowSquareOut size={13} /></a>
          <a href="https://www.wipo.int/" target="_blank" rel="noopener noreferrer">WIPO <ArrowSquareOut size={13} /></a>
          <a href="https://www.copyright.gov/" target="_blank" rel="noopener noreferrer">US Copyright <ArrowSquareOut size={13} /></a>
        </div>
        <p className="sef-opozorilo">{L('Pošteno: sef dokaže OBSTOJ in PRIORITETO dela na določen dan, ne absolutnega avtorstva. Najmočnejši dokaz so izvorne/delovne datoteke (.ai, .psd, sloji) + ta odtis. Overjen časovni žig (pravno veljaven) je naslednji korak.', 'Honest note: the vault proves the EXISTENCE and PRIORITY of a work on a date, not absolute authorship. Your strongest evidence is the source/working files (.ai, .psd, layers) + this fingerprint. A certified timestamp (legally valid) is the next step.')}</p>
      </section>
      </div>{/* /sef-stolpec */}
      </div>{/* /sef-mreza */}

      {/* SEZNAM — tabela z iskanjem in filtrom po kategorijah */}
      <section className="sef-seznam">
        <div className="sef-seznam-glava">
          <h2>{L('Zaščitena dela', 'Protected works')} <span className="sef-st">{osnovni.length}</span></h2>
          {osnovni.length > 0 && (
            <label className="sef-iskalo">
              <MagnifyingGlass size={16} />
              <input value={iskanje} onChange={e => setIskanje(e.target.value)} placeholder={L('Išči po naslovu, orodju, opombi …', 'Search title, tool, notes …')} />
            </label>
          )}
        </div>
        {kategorijeVal.length > 0 && (
          <div className="sef-filtri">
            <button type="button" className={filterKat === '' ? 'on' : ''} onClick={() => setFilterKat('')}>{L('Vse', 'All')}</button>
            {kategorijeVal.map(k => <button type="button" key={k} className={filterKat === k ? 'on' : ''} onClick={() => setFilterKat(k)}>{k}</button>)}
          </div>
        )}
        {osnovni.length === 0
          ? <p className="sef-prazno">{L('Še nič zaščitenega. Naloži prvo delo zgoraj.', 'Nothing protected yet. Add your first work above.')}</p>
          : vidni.length === 0
            ? <p className="sef-prazno">{L('Ni zadetkov.', 'No matches.')}</p>
            : <div className="sef-tabela-ovoj">
                <table className="sef-tabela">
                  <thead><tr>
                    <th>{L('Delo', 'Work')}</th>
                    <th>{L('Kategorija', 'Category')}</th>
                    <th>{L('Orodje', 'Tool')}</th>
                    <th>{L('Datum', 'Date')}</th>
                    <th>{L('Odtis', 'Fingerprint')}</th>
                    <th aria-hidden />
                  </tr></thead>
                  <tbody>
                    {straniVidni.map(z => (
                      <tr key={z.id}>
                        <td className="sef-td-delo"><strong>{z.naslov}</strong><small>{z.datoteka}{z.posnetekIme ? ' · +screenshot' : ''}</small></td>
                        <td>{z.kategorija ? <span className="sef-znacka">{z.kategorija}</span> : <span className="sef-crtica">—</span>}</td>
                        <td className="sef-td-orodje">{z.orodje || '—'}</td>
                        <td className="sef-td-datum">{datum(z.ustvarjeno)}</td>
                        <td>
                          <button type="button" className="sef-hash-btn" onClick={() => kopiraj(z.hash)} title={z.hash}>
                            {kopiran === z.hash ? <><Check size={13} weight="bold" /> {L('kopirano', 'copied')}</> : <><code>{z.hash.slice(0, 10)}…</code><Copy size={12} /></>}
                          </button>
                        </td>
                        <td className="sef-td-akcije">
                          <button type="button" onClick={() => potrdilo(z)} title={L('Potrdilo', 'Certificate')}><DownloadSimple size={15} /></button>
                          <button type="button" className="sef-brisi" onClick={() => izbrisi(z.id)} title={L('Izbriši', 'Delete')}><Trash size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
        {strani > 1 && (
          <div className="sef-pager">
            <button type="button" disabled={stranVar <= 1} onClick={() => setStran(stranVar - 1)}>{L('‹ Prejšnja', '‹ Prev')}</button>
            <div className="sef-pager-st">
              {Array.from({ length: strani }, (_, i) => i + 1).map(n => (
                <button type="button" key={n} className={n === stranVar ? 'on' : ''} onClick={() => setStran(n)}>{n}</button>
              ))}
            </div>
            <button type="button" disabled={stranVar >= strani} onClick={() => setStran(stranVar + 1)}>{L('Naslednja ›', 'Next ›')}</button>
          </div>
        )}
      </section>

      <style jsx>{`
        .sef { --line: rgba(17,17,17,.1); max-width: 46rem; margin: 0 auto; padding: .5rem 0 4rem; font-family: var(--font-sans), system-ui, sans-serif; color: var(--ink); }
        .sef-uvod { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.8); margin: 0 0 1.6rem; }
        .sef-uvod b { font-weight: 650; } .sef-uvod em { font-style: italic; color: var(--accent); font-weight: 600; }
        .sef-kako { margin: 0 0 2.2rem; }
        .sef-kako-glava { font-size: .7rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); margin: 0 0 .9rem; }
        .sef-kako-mreza { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 700px) { .sef-kako-mreza { grid-template-columns: 1fr; gap: .7rem; } }
        .sef-kako-kartica { border: 1px solid var(--line); border-radius: 16px; padding: 1.15rem 1.2rem; background: rgba(255,255,255,.55); }
        .sef-kako-ikona { display: inline-grid; place-items: center; width: 2.2rem; height: 2.2rem; border-radius: 11px; background: oklch(95% .04 297); margin-bottom: .7rem; }
        .sef-kako-ikona :global(svg) { color: var(--accent); }
        .sef-kako-kartica h3 { font-size: .92rem; font-weight: 650; margin: 0 0 .3rem; color: var(--ink); }
        .sef-kako-kartica p { font-size: .82rem; line-height: 1.5; color: rgba(17,17,17,.66); margin: 0; }
        .sef-kartica { border: 1px solid var(--line); border-radius: 18px; padding: 1.7rem; margin-bottom: 2rem; background: rgba(255,255,255,.55); }
        /* Desktop: 2 stolpca — levo »Zaščiti delo«, desno »Preveri« + »Za dokončno registracijo«. Tabela je spodaj (polna širina). */
        .sef-mreza { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.3rem; align-items: start; margin-bottom: 2rem; }
        .sef-mreza > .sef-kartica, .sef-stolpec > .sef-kartica { margin-bottom: 0; }
        .sef-stolpec { display: grid; gap: 1.3rem; align-content: start; }
        @media (max-width: 860px) { .sef-mreza { grid-template-columns: 1fr; } }
        .sef h2 { display: flex; align-items: center; gap: .5rem; font-size: 1.08rem; font-weight: 650; margin: 0 0 1.1rem; }
        .sef h2 :global(svg) { color: var(--accent); }
        .sef-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .4rem; text-align: center; border: 1.5px dashed rgba(17,17,17,.22); border-radius: 14px; padding: 1.4rem 1rem; cursor: pointer; transition: border-color .15s, background .15s; color: rgba(17,17,17,.72); }
        .sef-drop:hover { border-color: var(--accent); background: oklch(97% .02 297 / .5); }
        .sef-drop.ima { border-style: solid; border-color: var(--accent); color: var(--ink); }
        .sef-drop.mini { flex-direction: row; padding: .85rem 1rem; font-size: .9rem; }
        .sef-drop input { display: none; }
        .sef-drop :global(svg) { color: var(--accent); }
        .sef-drop small { font-size: .74rem; color: rgba(17,17,17,.55); }
        .sef-polja { display: grid; grid-template-columns: 1fr 1fr; gap: .9rem; margin-top: 1rem; }
        @media (max-width: 560px) { .sef-polja { grid-template-columns: 1fr; } }
        .sef-polje { display: flex; flex-direction: column; gap: .35rem; margin-top: 1rem; }
        .sef-polja .sef-polje { margin-top: 0; }
        .sef-polje span { font-size: .8rem; font-weight: 600; color: rgba(17,17,17,.68); }
        .sef-polje input, .sef-polje textarea { font-family: inherit; font-size: .92rem; color: var(--ink); background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: .6rem .7rem; }
        .sef-polje input:focus, .sef-polje textarea:focus { outline: none; border-color: var(--accent); }
        .sef-gumb { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; margin-top: 1.2rem; width: auto; align-self: flex-start; font-family: inherit; font-size: .9rem; font-weight: 650; letter-spacing: .02em; color: var(--paper); background: var(--ink); border: none; border-radius: 999px; padding: .85rem 1.6rem; cursor: pointer; transition: transform .15s, opacity .15s; }
        .sef-gumb:hover:not(:disabled) { transform: translateY(-1px); }
        .sef-gumb:disabled { opacity: .45; cursor: not-allowed; }
        .sef-mini { display: flex; align-items: center; gap: .4rem; font-size: .76rem; color: rgba(17,17,17,.55); margin: .8rem 0 0; }
        .sef-mini :global(svg) { color: oklch(55% .13 155); flex: none; }
        .sef-mini2 { font-size: .84rem; line-height: 1.5; color: rgba(17,17,17,.7); margin: 0 0 .9rem; }
        .sef-najdba { display: flex; align-items: center; gap: .45rem; font-size: .88rem; font-weight: 600; margin: .9rem 0 0; padding: .7rem .9rem; border-radius: 10px; }
        .sef-najdba.ok { color: oklch(45% .13 155); background: oklch(95% .05 155); }
        .sef-najdba.ne { color: oklch(48% .12 40); background: oklch(96% .04 60); font-weight: 500; }
        .sef-seznam { margin-top: 2.8rem; }
        .sef-seznam-glava { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.2rem; }
        .sef-seznam h2 { font-size: 1.12rem; margin: 0; }
        .sef-st { display: inline-grid; place-items: center; min-width: 1.4rem; height: 1.4rem; padding: 0 .4rem; border-radius: 999px; background: oklch(93% .05 297); color: var(--accent); font-size: .78rem; font-weight: 700; margin-left: .3rem; }
        .sef-iskalo { display: inline-flex; align-items: center; gap: .5rem; background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: .48rem .95rem; color: rgba(17,17,17,.45); min-width: 15rem; }
        .sef-iskalo:focus-within { border-color: var(--accent); }
        .sef-iskalo input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: .88rem; color: var(--ink); }
        .sef-filtri { display: flex; flex-wrap: wrap; gap: .45rem; margin-bottom: 1.2rem; }
        .sef-filtri button { font-family: inherit; font-size: .8rem; font-weight: 600; color: rgba(17,17,17,.66); background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: .38rem .85rem; cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        .sef-filtri button:hover { border-color: rgba(17,17,17,.3); }
        .sef-filtri button.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .sef-prazno { font-size: .9rem; color: rgba(17,17,17,.55); padding: 1.8rem; text-align: center; border: 1px dashed var(--line); border-radius: 14px; }
        .sef-znacka { display: inline-block; font-size: .68rem; font-weight: 650; letter-spacing: .02em; color: var(--accent); background: oklch(95% .04 297); border-radius: 999px; padding: .12rem .55rem; white-space: nowrap; }
        .sef-crtica { color: rgba(17,17,17,.35); }
        .sef-tabela-ovoj { border: 1px solid var(--line); border-radius: 16px; overflow: hidden; overflow-x: auto; background: rgba(255,255,255,.55); }
        .sef-tabela { width: 100%; border-collapse: collapse; font-size: .86rem; }
        .sef-tabela th { text-align: left; font-size: .66rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(17,17,17,.5); padding: .85rem 1.1rem; border-bottom: 1px solid var(--line); white-space: nowrap; }
        .sef-tabela td { padding: 1rem 1.1rem; border-bottom: 1px solid var(--line); vertical-align: middle; }
        .sef-tabela tr:last-child td { border-bottom: none; }
        .sef-tabela tbody tr:hover td { background: oklch(98% .012 297 / .6); }
        .sef-td-delo strong { display: block; font-weight: 650; font-size: .92rem; }
        .sef-td-delo small { display: block; font-size: .74rem; color: rgba(17,17,17,.5); margin-top: .14rem; }
        .sef-td-orodje { color: rgba(17,17,17,.72); white-space: nowrap; }
        .sef-td-datum { color: rgba(17,17,17,.6); white-space: nowrap; font-variant-numeric: tabular-nums; }
        .sef-hash-btn { display: inline-flex; align-items: center; gap: .35rem; font-family: inherit; font-size: .74rem; color: rgba(17,17,17,.6); background: oklch(96% .006 285); border: 1px solid var(--line); border-radius: 7px; padding: .32rem .58rem; cursor: pointer; white-space: nowrap; }
        .sef-hash-btn code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .sef-hash-btn:hover { color: var(--accent); border-color: var(--accent); }
        .sef-td-akcije { white-space: nowrap; text-align: right; }
        .sef-td-akcije button { display: inline-grid; place-items: center; width: 2rem; height: 2rem; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: rgba(17,17,17,.6); cursor: pointer; margin-left: .35rem; transition: background .15s, border-color .15s, color .15s; }
        .sef-td-akcije button:hover { color: var(--accent); border-color: var(--accent); }
        .sef-td-akcije .sef-brisi:hover { color: oklch(50% .16 25); border-color: oklch(70% .15 25); background: oklch(97% .03 25); }
        .sef-pager { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: .5rem; margin-top: 1.4rem; }
        .sef-pager-st { display: flex; gap: .3rem; }
        .sef-pager button { font-family: inherit; font-size: .82rem; font-weight: 600; color: rgba(17,17,17,.66); background: #fff; border: 1px solid var(--line); border-radius: 9px; min-width: 2rem; height: 2rem; padding: 0 .6rem; cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        .sef-pager button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .sef-pager button.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .sef-pager button:disabled { opacity: .4; cursor: not-allowed; }
        .sef-registracija { background: oklch(97% .02 297 / .5); }
        .sef-linki { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0 0 1rem; }
        .sef-linki a { display: inline-flex; align-items: center; gap: .3rem; font-size: .82rem; font-weight: 600; color: var(--ink); text-decoration: none; border: 1px solid var(--line); border-radius: 999px; padding: .42rem .8rem; transition: border-color .15s, background .15s; }
        .sef-linki a:hover { border-color: var(--accent); background: #fff; }
        .sef-opozorilo { font-size: .78rem; line-height: 1.55; color: rgba(17,17,17,.6); margin: 0; padding: .8rem .9rem; border-left: 2px solid var(--accent); background: rgba(255,255,255,.5); border-radius: 0 8px 8px 0; }
      `}</style>
    </div>
  );
}
