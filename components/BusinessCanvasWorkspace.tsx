'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  canvasToPlan, createCanvasDocument, EMPTY_BUSINESS_CANVAS, loadActiveCanvasId,
  loadCloudCanvasDocuments, loadLocalCanvasDocuments, saveActiveCanvasId,
  saveCloudCanvasDocument, saveLocalCanvasDocuments, type BusinessCanvas,
  type BusinessCanvasDocument,
} from '@/lib/pinartCanvas';
import { getActiveOrganizationId, listUserOrganizations, setActiveOrganization, type UserOrganization } from '@/lib/pinartFlowCloud';
import { usePredogled } from '@/lib/predogled';
import styles from './BusinessCanvasWorkspace.module.css';

const BLOCKS: Array<{ key: keyof BusinessCanvas; number: string; title: string; hint: string; example: string }> = [
  { key: 'partners', number: '01', title: 'Ključni partnerji', hint: 'Kdo ti pomaga ustvariti ali dostaviti vrednost?', example: 'zunanji sodelavci, računovodstvo, tiskarne …' },
  { key: 'activities', number: '02', title: 'Ključne aktivnosti', hint: 'Kaj moraš redno delati, da posel deluje?', example: 'oblikovanje, prodaja, vodenje projektov …' },
  { key: 'resources', number: '03', title: 'Ključni viri', hint: 'Kaj potrebuješ za izvedbo?', example: 'znanje, oprema, programska oprema, čas …' },
  { key: 'value', number: '04', title: 'Vrednost za stranko', hint: 'Zakaj bi stranka izbrala prav tebe?', example: 'problem, rezultat in razlika od drugih …' },
  { key: 'relationships', number: '05', title: 'Odnosi s strankami', hint: 'Kako jih pridobiš, vodiš in obdržiš?', example: 'osebno svetovanje, retainer, priporočila …' },
  { key: 'channels', number: '06', title: 'Kanali', hint: 'Kje te stranke odkrijejo in kupijo?', example: 'spletna stran, priporočila, LinkedIn, partnerji …' },
  { key: 'segments', number: '07', title: 'Ciljne stranke', hint: 'Komu ustvarjaš največ vrednosti?', example: 'panoga, velikost podjetja, trg, tip naročnika …' },
  { key: 'costs', number: '08', title: 'Stroški', hint: 'Kateri stroški nastajajo, tudi ko ne prodajaš?', example: 'prispevki, najemnina, naročnine, izvajalci …' },
  { key: 'revenue', number: '09', title: 'Prihodki', hint: 'Kaj in kako zaračunavaš?', example: 'projekti, urne postavke, mesečni paketi …' },
];

const DEMO_BUSINESS_CANVAS: BusinessCanvas = {
  partners: 'Računovodski servis\nFotograf in tekstopiska\nPreverjene tiskarne in razvijalci',
  activities: 'Razvoj vizualnih identitet\nOblikovanje spletnih strani\nProdaja, svetovanje in vodenje projektov',
  resources: 'Oblikovalsko znanje in 12 let izkušenj\nAdobe Creative Cloud in Figma\nMreža zunanjih sodelavcev',
  value: 'Majhnim podjetjem pomagamo zgraditi prepoznavno znamko in jasen prodajni nastop. Združujemo strategijo, oblikovanje in izvedbo brez usklajevanja več izvajalcev.',
  relationships: 'Osebno uvodno svetovanje\nTedenski pregled napredka\nMesečno sodelovanje in podpora po zaključku',
  channels: 'Spletna stran in priporočila\nLinkedIn in Instagram\nPartnerstva z marketinškimi svetovalci',
  segments: 'Mala in rastoča podjetja\nUstvarjalci ter strokovne storitve\nSlovenija in trgi EU',
  costs: 'Prispevki in zavarovanja\nProgramske naročnine\nZunanji sodelavci, produkcija in oglaševanje',
  revenue: 'Celostne identitete od 2.400 €\nSpletne strani od 3.200 €\nMesečni paketi podpore od 650 €',
};
const DEMO_DOCUMENT: BusinessCanvasDocument = {
  id: 'demo',
  name: 'Pupa Glam',
  companyName: 'Pinart d.o.o.',
  brandName: 'Pupa Glam',
  blocks: DEMO_BUSINESS_CANVAS,
  updatedAt: new Date().toISOString(),
};

function CanvasIcon({ type }: { type: keyof BusinessCanvas }) {
  const paths: Record<keyof BusinessCanvas, ReactNode> = {
    partners: <><circle cx="7" cy="8" r="3" /><circle cx="17" cy="7" r="2.5" /><path d="M2.5 20c.6-4 2.1-6 4.5-6s3.9 2 4.5 6M13 19c.4-3 1.7-4.5 4-4.5s3.6 1.5 4 4.5" /></>,
    activities: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /><circle cx="12" cy="12" r="4" /></>,
    resources: <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /><path d="M3 7H1v13h14v-2" /></>,
    value: <><path d="m12 3 2.2 5.2L20 10l-4.4 3.7L17 19l-5-2.8L7 19l1.4-5.3L4 10l5.8-1.8z" /></>,
    relationships: <><path d="M3 12.5 7.5 8l3 2.5 3.5-3.5 7 6" /><path d="m5 14 4 4a2 2 0 0 0 3 0l6-6M2 9l4-4 3 3M22 9l-4-4-3 3" /></>,
    channels: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 12h5" /></>,
    segments: <><circle cx="12" cy="8" r="3" /><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6M4 7a2.5 2.5 0 1 0 0 5M20 7a2.5 2.5 0 1 1 0 5M1 19c.3-2.5 1.5-4 3.5-4M23 19c-.3-2.5-1.5-4-3.5-4" /></>,
    costs: <><ellipse cx="9" cy="7" rx="5" ry="2.5" /><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7M4 11v4c0 1.4 2.2 2.5 5 2.5 1.2 0 2.4-.2 3.2-.6" /><ellipse cx="17" cy="16" rx="4" ry="2" /><path d="M13 16v3c0 1.1 1.8 2 4 2s4-.9 4-2v-3" /></>,
    revenue: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /><path d="m3 8 6-5 6 4 7-5" /></>,
  };
  return <span className={styles.icon} aria-hidden="true"><svg viewBox="0 0 24 24">{paths[type]}</svg></span>;
}

export default function BusinessCanvasWorkspace() {
  const [preview] = usePredogled();
  const [canvas, setCanvas] = useState<BusinessCanvas>(EMPTY_BUSINESS_CANVAS);
  const [documents, setDocuments] = useState<BusinessCanvasDocument[]>([]);
  const [activeId, setActiveId] = useState('');
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState('');
  const [storageScope, setStorageScope] = useState('anonymous');
  const [companyName, setCompanyName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'cloud' | 'local'>('idle');
  const [savedAt, setSavedAt] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      let userOrganizations: UserOrganization[] = [];
      try { userOrganizations = await listUserOrganizations(); } catch { /* neprijavljen uporabnik */ }
      if (!active) return;
      const storedOrganizationId = getActiveOrganizationId();
      const selectedOrganization = userOrganizations.find(item => item.id === storedOrganizationId) || userOrganizations[0];
      const scope = selectedOrganization?.id || 'anonymous';
      if (selectedOrganization && selectedOrganization.id !== storedOrganizationId) setActiveOrganization(selectedOrganization.id);
      setOrganizations(userOrganizations);
      setActiveOrganizationId(selectedOrganization?.id || '');
      setStorageScope(scope);

      const local = loadLocalCanvasDocuments(scope);
      const initial = local;
      const storedId = loadActiveCanvasId(scope);
      let selected = initial.find(document => document.id === storedId) || initial[0];
      setDocuments(initial);
      if (selected) {
        setActiveId(selected.id); setCanvas(selected.blocks);
        setCompanyName(selected.companyName); setBrandName(selected.brandName);
      }

      try {
        const cloud = await loadCloudCanvasDocuments();
        if (!active || !cloud.length) return;
        selected = cloud.find(document => document.id === storedId) || cloud[0];
        setDocuments(cloud); setActiveId(selected.id); setCanvas(selected.blocks);
        setCompanyName(selected.companyName); setBrandName(selected.brandName);
        saveLocalCanvasDocuments(cloud, scope); saveActiveCanvasId(selected.id, scope);
      } catch { /* lokalni Canvas ostane na voljo */ }
    })();
    return () => { active = false; };
  }, []);

  const shownCanvas = preview === 'demo'
    ? DEMO_BUSINESS_CANVAS
    : preview === 'empty'
      ? EMPTY_BUSINESS_CANVAS
      : canvas;
  const shownDocuments = preview === 'demo' ? [DEMO_DOCUMENT] : preview === 'empty' ? [] : documents;
  const shownCompanyName = preview === 'demo' ? DEMO_DOCUMENT.companyName : preview === 'empty' ? '' : companyName;
  const shownBrandName = preview === 'demo' ? DEMO_DOCUMENT.brandName : preview === 'empty' ? '' : brandName;
  const completed = useMemo(() => BLOCKS.filter(block => shownCanvas[block.key].trim()).length, [shownCanvas]);
  const plan = useMemo(() => canvasToPlan(shownCanvas), [shownCanvas]);
  const update = (key: keyof BusinessCanvas, value: string) => {
    if (preview !== 'mine') return;
    setCanvas(current => {
      const next = { ...current, [key]: value };
      setDocuments(items => items.map(document => document.id === activeId ? { ...document, blocks: next } : document));
      return next;
    });
    setSaveState('dirty');
    if (noticeIsError) setNotice('');
  };
  const save = async () => {
    if (!companyName.trim()) {
      setNoticeIsError(true);
      setNotice('Vpiši podjetje ali organizacijo, za katero pripravljaš Canvas.');
      return false;
    }
    if (completed === 0) {
      setNoticeIsError(true);
      setNotice('Najprej vpiši podatke v vsaj eno področje Business Canvasa.');
      setPlanOpen(false);
      return false;
    }
    const current = documents.find(document => document.id === activeId);
    const updated: BusinessCanvasDocument = current
      ? { ...current, name: brandName.trim() || companyName.trim(), companyName: companyName.trim(), brandName: brandName.trim(), blocks: canvas, updatedAt: new Date().toISOString() }
      : { ...createCanvasDocument(companyName.trim(), brandName.trim()), blocks: canvas, updatedAt: new Date().toISOString() };
    const nextDocuments = current
      ? documents.map(document => document.id === activeId ? updated : document)
      : [...documents, updated];
    if (!current) setActiveId(updated.id);
    setDocuments(nextDocuments);
    saveLocalCanvasDocuments(nextDocuments, storageScope);
    saveActiveCanvasId(updated.id, storageScope);
    setSaveState('saving');
    let cloudSaved = false;
    try { cloudSaved = await saveCloudCanvasDocument(updated); } catch { cloudSaved = false; }
    const time = new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
    setSavedAt(time);
    setSaveState(cloudSaved ? 'cloud' : 'local');
    setNoticeIsError(!cloudSaved);
    setNotice(cloudSaved ? `Canvas je shranjen v oblak ob ${time}.` : `Canvas je shranjen samo v tem brskalniku ob ${time}.`);
    return true;
  };
  const preparePlan = async () => {
    if (completed === 0) {
      setNoticeIsError(true);
      setNotice('Najprej vpiši podatke v vsaj eno področje Business Canvasa.');
      setPlanOpen(false);
      return;
    }
    if (preview === 'mine' && !(await save())) return;
    setPlanOpen(true);
  };
  const copyPlan = async () => { await navigator.clipboard.writeText(plan); setNoticeIsError(false); setNotice('Osnovni poslovni načrt je kopiran.'); };
  const openDocument = (document: BusinessCanvasDocument) => {
    if (saveState === 'dirty' && !confirm('Imaš neshranjene spremembe. Jih želiš zavreči in odpreti drug Canvas?')) return false;
    setActiveId(document.id); setCanvas(document.blocks);
    setCompanyName(document.companyName); setBrandName(document.brandName);
    saveActiveCanvasId(document.id, storageScope);
    setSaveState('idle'); setPlanOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };
  const startNewCanvas = () => {
    if (saveState === 'dirty' && !confirm('Imaš neshranjene spremembe. Jih želiš zavreči in začeti nov Canvas?')) return;
    setActiveId(''); setCanvas({ ...EMPTY_BUSINESS_CANVAS });
    setCompanyName(''); setBrandName('');
    setSaveState('idle'); setPlanOpen(false); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const expandDocument = (document: BusinessCanvasDocument) => {
    if (preview !== 'demo' && !openDocument(document)) return;
    setPlanOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => globalThis.document.getElementById('plan-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  };

  return <div className={styles.page}>
    {notice && <div className={`${styles.notice} ${noticeIsError ? styles.noticeError : ''}`} role={noticeIsError ? 'alert' : 'status'}>{notice}<button type="button" onClick={() => setNotice('')} aria-label="Zapri obvestilo">×</button></div>}
    <section className={styles.canvasToolbar} aria-label="Podatki Business Canvasa">
      {organizations.length > 1 && <label><span>Podjetje</span><select value={activeOrganizationId} onChange={event => { setActiveOrganization(event.target.value); window.location.reload(); }}>{organizations.map(organization => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>}
      <label><span>Podjetje ali organizacija</span><input value={shownCompanyName} readOnly={preview !== 'mine'} onChange={event => { setCompanyName(event.target.value); setSaveState('dirty'); }} placeholder="Npr. Rdeča kapica d.o.o." /></label>
      <label><span>Znamka, projekt ali poslovna ideja</span><input value={shownBrandName} readOnly={preview !== 'mine'} onChange={event => { setBrandName(event.target.value); setSaveState('dirty'); }} placeholder="Npr. Ribbon Lips (neobvezno)" /></label>
      <button type="button" className={styles.newCanvasButton} disabled={preview !== 'mine'} onClick={startNewCanvas}>+ Nov Canvas</button>
    </section>
    <section className={styles.intro}>
      <div><p>BUSINESS MODEL CANVAS</p><h2>Najprej razumi, kako tvoj posel ustvarja vrednost.</h2><span>Odgovori s kratkimi alinejami. Canvas ni izpit — je živ zemljevid poslovanja.</span></div>
      <div
        className={styles.progress}
        style={{ background: `conic-gradient(var(--purple) ${(completed / 9) * 100}%, oklch(92% .035 300) 0)` }}
        aria-label={`${completed} od 9 področij izpolnjenih`}
      ><strong>{completed}<small>/ 9</small></strong><span>izpolnjenih področij</span></div>
    </section>

    <section className={styles.canvas} aria-label="Business Model Canvas">
      {BLOCKS.map(block => <article key={block.key} data-block={block.key}>
        <header><span>{block.number}</span><CanvasIcon type={block.key} /><h3>{block.title}</h3></header>
        <p>{block.hint}</p>
        <textarea aria-label={block.title} value={shownCanvas[block.key]} onChange={event => update(block.key, event.target.value)} placeholder={block.example} readOnly={preview !== 'mine'} />
      </article>)}
    </section>

    <section className={styles.actions}>
      <div><p>NASLEDNJI KORAK</p><h2>Iz Canvasa do uporabnega načrta.</h2><span>Pinart pripravi osnovno strukturo. AI asistent bo nato postavljal dodatna vprašanja o trgu, konkurenci, prodaji, tveganjih in financah.</span></div>
      <div className={styles.saveActions}><span className={styles.saveFeedback} data-state={saveState} aria-live="polite">{saveState === 'dirty' ? 'Neshranjene spremembe' : saveState === 'saving' ? 'Shranjujem …' : saveState === 'cloud' ? `✓ Shranjeno v oblak ob ${savedAt}` : saveState === 'local' ? `✓ Shranjeno v brskalnik ob ${savedAt}` : ''}</span><button type="button" className={styles.secondary} onClick={() => void save()} disabled={preview !== 'mine'} title={preview !== 'mine' ? 'Demo je samo za predogled.' : undefined}><span className={styles.saveIcon} data-state={saveState} aria-hidden="true"><svg viewBox="0 0 24 24">{saveState === 'cloud' || saveState === 'local' ? <><path d="M5 12h14M14 7l5 5-5 5" /></> : saveState === 'saving' ? <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></> : <><path d="M5 4h12l2 2v14H5z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></>}</svg></span>{saveState === 'cloud' || saveState === 'local' ? 'Shranjeno' : 'Shrani Canvas'}</button><button type="button" onClick={() => void preparePlan()}>Pripravi osnovni načrt</button></div>
    </section>

    {planOpen && <section className={styles.plan} aria-labelledby="plan-title">
      <header><div><p>OSNUTEK</p><h2 id="plan-title">Osnovni poslovni načrt</h2></div><button type="button" onClick={() => setPlanOpen(false)} aria-label="Zapri osnutek">×</button></header>
      <pre>{plan}</pre>
      <footer><button type="button" className={styles.secondary} onClick={copyPlan}><svg className={styles.buttonIcon} viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>Kopiraj osnutek</button><button type="button" disabled title="Na voljo po povezavi Mistral AI">Nadaljuj z AI asistentom</button></footer>
      <small>AI nadaljevanje se aktivira, ko povežemo Mistral. Canvas in osnovni osnutek že delujeta brez AI-ja.</small>
    </section>}

    <section className={styles.savedCanvases} aria-labelledby="saved-canvases-title">
      <header><div><p>SHRANJENI CANVASI</p><h2 id="saved-canvases-title">Tvoje poslovne ideje na enem mestu.</h2></div><span>{shownDocuments.length}</span></header>
      {shownDocuments.length ? <div className={styles.canvasTableWrap}><table><thead><tr><th>Podjetje</th><th>Znamka ali projekt</th><th>Posodobljeno</th><th>Izpolnjeno</th><th><span className={styles.srOnly}>Dejanja</span></th></tr></thead><tbody>{shownDocuments.map(document => {
        const filled = BLOCKS.filter(block => document.blocks[block.key].trim()).length;
        return <tr key={document.id}><td><strong>{document.companyName || 'Brez podjetja'}</strong></td><td>{document.brandName || '—'}</td><td>{new Date(document.updatedAt).toLocaleDateString('sl-SI')}</td><td>{filled}/9</td><td><div className={styles.rowActions}><button type="button" onClick={() => preview === 'mine' && openDocument(document)} disabled={preview !== 'mine'} aria-label={`Odpri Canvas ${document.name}`} title="Odpri Canvas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg></button><button type="button" onClick={() => { if (preview === 'mine') openDocument(document); }} disabled={preview !== 'mine'} aria-label={`Uredi Canvas ${document.name}`}>Uredi</button><button type="button" onClick={() => expandDocument(document)} aria-label={`Razširi ${document.name} v poslovni načrt`}>Razširi v poslovni načrt</button><button type="button" disabled aria-label={`AI pomočnik za ${document.name} bo na voljo pozneje`} title="AI vodeni poslovni načrt bo na voljo pozneje"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></svg></button></div></td></tr>;
      })}</tbody></table></div> : <div className={styles.emptySaved}><strong>Še nimaš shranjenega Canvasa.</strong><span>Vpiši podjetje, izpolni Canvas in ga shrani. Nato se bo pojavil tukaj.</span></div>}
    </section>
  </div>;
}
