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
import { useLocale } from 'next-intl';
import styles from './BusinessCanvasWorkspace.module.css';
import shell from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { preberiProjekti, shraniProjekt, type Projekt } from '@/lib/projekti';
import { natisniElement } from '@/lib/natisni';

const BLOCKS: Array<{ key: keyof BusinessCanvas; number: string; title: string; titleEn: string; hint: string; hintEn: string; example: string; exampleEn: string }> = [
  { key: 'partners', number: '01', title: 'Ključni partnerji', titleEn: 'Key partners', hint: 'Kdo ti pomaga ustvariti ali dostaviti vrednost?', hintEn: 'Who helps you create or deliver value?', example: 'zunanji sodelavci, računovodstvo, tiskarne …', exampleEn: 'external collaborators, accounting, printers …' },
  { key: 'activities', number: '02', title: 'Ključne aktivnosti', titleEn: 'Key activities', hint: 'Kaj moraš redno delati, da posel deluje?', hintEn: 'What do you need to do regularly to keep the business running?', example: 'oblikovanje, prodaja, vodenje projektov …', exampleEn: 'design, sales, project management …' },
  { key: 'resources', number: '03', title: 'Ključni viri', titleEn: 'Key resources', hint: 'Kaj potrebuješ za izvedbo?', hintEn: 'What do you need to deliver the work?', example: 'znanje, oprema, programska oprema, čas …', exampleEn: 'expertise, equipment, software, time …' },
  { key: 'value', number: '04', title: 'Vrednost za stranko', titleEn: 'Customer value', hint: 'Zakaj bi stranka izbrala prav tebe?', hintEn: 'Why should a client choose you?', example: 'problem, rezultat in razlika od drugih …', exampleEn: 'the problem, outcome and what makes you different …' },
  { key: 'relationships', number: '05', title: 'Odnosi s strankami', titleEn: 'Customer relationships', hint: 'Kako jih pridobiš, vodiš in obdržiš?', hintEn: 'How do you win, manage and retain clients?', example: 'osebno svetovanje, retainer, priporočila …', exampleEn: 'personal consulting, retainers, referrals …' },
  { key: 'channels', number: '06', title: 'Kanali', titleEn: 'Channels', hint: 'Kje te stranke odkrijejo in kupijo?', hintEn: 'Where do clients discover and buy from you?', example: 'spletna stran, priporočila, LinkedIn, partnerji …', exampleEn: 'website, referrals, LinkedIn, partners …' },
  { key: 'segments', number: '07', title: 'Ciljne stranke', titleEn: 'Customer segments', hint: 'Komu ustvarjaš največ vrednosti?', hintEn: 'Who receives the most value from your work?', example: 'panoga, velikost podjetja, trg, tip naročnika …', exampleEn: 'industry, company size, market, client type …' },
  { key: 'costs', number: '08', title: 'Stroški', titleEn: 'Costs', hint: 'Kateri stroški nastajajo, tudi ko ne prodajaš?', hintEn: 'Which costs arise even when you are not selling?', example: 'prispevki, najemnina, naročnine, izvajalci …', exampleEn: 'contributions, rent, subscriptions, contractors …' },
  { key: 'revenue', number: '09', title: 'Prihodki', titleEn: 'Revenue', hint: 'Kaj in kako zaračunavaš?', hintEn: 'What do you charge for and how?', example: 'projekti, urne postavke, mesečni paketi …', exampleEn: 'projects, hourly rates, monthly packages …' },
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
  const locale = useLocale();
  const jeEn = locale === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const base = locale === 'en' ? '/en' : '';
  const [preview] = usePredogled();
  const [canvas, setCanvas] = useState<BusinessCanvas>(EMPTY_BUSINESS_CANVAS);
  const [documents, setDocuments] = useState<BusinessCanvasDocument[]>([]);
  const [activeId, setActiveId] = useState('');
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState('');
  const [storageScope, setStorageScope] = useState('anonymous');
  const [companyName, setCompanyName] = useState('');
  const [brandName, setBrandName] = useState('');
  /* VEZ S PROJEKTOM (Tina, 21. 8. 2026): »canvas in katero koli zadevo moraš
     imeti opcijo linkanja s projektom.« Brez tega canvasa s projekta ni bilo
     mogoce najti. Vez je NEOBVEZNA — canvas o podjetju ne sodi pod noben
     projekt in mora smeti ostati sam. */
  const [projektVez, setProjektVez] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'cloud' | 'local'>('idle');
  const [savedAt, setSavedAt] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  /* Dokumentni model: privzeto SEZNAM (kartice shranjenih), klik/»Nov« odpre UREJEVALNIK. */
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [projekti, setProjekti] = useState<Projekt[]>([]);

  useEffect(() => {
    setProjekti(preberiProjekti());
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
        setCompanyName(selected.companyName); setBrandName(selected.brandName); setProjektVez(selected.projektExternalId || '');
      }

      try {
        const cloud = await loadCloudCanvasDocuments();
        if (!active || !cloud.length) return;
        selected = cloud.find(document => document.id === storedId) || cloud[0];
        setDocuments(cloud); setActiveId(selected.id); setCanvas(selected.blocks);
        setCompanyName(selected.companyName); setBrandName(selected.brandName); setProjektVez(selected.projektExternalId || '');
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
      setNotice(L('Vpiši podjetje ali organizacijo, za katero pripravljaš Canvas.', 'Enter the company or organisation you are preparing the Canvas for.'));
      return false;
    }
    if (completed === 0) {
      setNoticeIsError(true);
      setNotice(L('Najprej vpiši podatke v vsaj eno področje Business Canvasa.', 'Enter information in at least one Business Canvas area first.'));
      setPlanOpen(false);
      return false;
    }
    const current = documents.find(document => document.id === activeId);
    const updated: BusinessCanvasDocument = current
      ? { ...current, name: brandName.trim() || companyName.trim(), companyName: companyName.trim(), brandName: brandName.trim(), blocks: canvas, projektExternalId: projektVez || undefined, updatedAt: new Date().toISOString() }
      : { ...createCanvasDocument(companyName.trim(), brandName.trim()), blocks: canvas, projektExternalId: projektVez || undefined, updatedAt: new Date().toISOString() };
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
    const time = new Date().toLocaleTimeString(jeEn ? 'en-GB' : 'sl-SI', { hour: '2-digit', minute: '2-digit' });
    setSavedAt(time);
    setSaveState(cloudSaved ? 'cloud' : 'local');
    setNoticeIsError(!cloudSaved);
    setNotice(cloudSaved ? L(`Canvas je shranjen v oblak ob ${time}.`, `Canvas was saved to the cloud at ${time}.`) : L(`Canvas je shranjen samo v tem brskalniku ob ${time}.`, `Canvas was saved in this browser only at ${time}.`));
    return true;
  };
  const preparePlan = async () => {
    if (completed === 0) {
      setNoticeIsError(true);
      setNotice(L('Najprej vpiši podatke v vsaj eno področje Business Canvasa.', 'Enter information in at least one Business Canvas area first.'));
      setPlanOpen(false);
      return;
    }
    if (preview === 'mine' && !(await save())) return;
    setPlanOpen(true);
  };
  const copyPlan = async () => { await navigator.clipboard.writeText(plan); setNoticeIsError(false); setNotice(L('Osnovni poslovni načrt je kopiran.', 'The basic business plan has been copied.')); };
  const openDocument = (document: BusinessCanvasDocument) => {
    if (saveState === 'dirty' && !confirm(L('Imaš neshranjene spremembe. Jih želiš zavreči in odpreti drug Canvas?', 'You have unsaved changes. Discard them and open another Canvas?'))) return false;
    setActiveId(document.id); setCanvas(document.blocks);
    setCompanyName(document.companyName); setBrandName(document.brandName);
    saveActiveCanvasId(document.id, storageScope);
    setSaveState('idle'); setPlanOpen(false); setView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };
  const startNewCanvas = () => {
    if (saveState === 'dirty' && !confirm(L('Imaš neshranjene spremembe. Jih želiš zavreči in začeti nov Canvas?', 'You have unsaved changes. Discard them and start a new Canvas?'))) return;
    setActiveId(''); setCanvas({ ...EMPTY_BUSINESS_CANVAS });
    setCompanyName(''); setBrandName('');
    setSaveState('idle'); setPlanOpen(false); setNotice(''); setView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const expandDocument = (document: BusinessCanvasDocument) => {
    if (preview !== 'demo' && !openDocument(document)) return;
    setPlanOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => globalThis.document.getElementById('plan-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  };

  return <div className={styles.page}>
    {notice && <div className={`${styles.notice} ${noticeIsError ? styles.noticeError : ''}`} role={noticeIsError ? 'alert' : 'status'}>{notice}<button type="button" onClick={() => setNotice('')} aria-label={L('Zapri obvestilo', 'Close notification')}>×</button></div>}
    {view === 'list' ? <>
      <header className={shell.topbar}><div><p className={shell.eyebrow}>BUSINESS CANVAS</p><h1>{L('Posel na eni strani.', 'Your business on one page.')}</h1></div></header>
      <p className={styles.listSub}>{L('Odpri obstoječ poslovni model ali začni novega. Spodaj so dokumenti, ki jih Pupa napiše zate.', 'Open an existing business model or start a new one. Below are documents Pupa can write for you.')}</p>
      <section className={styles.canvasGrid} aria-label={L('Shranjeni canvasi', 'Saved canvases')}>
        <button type="button" className={styles.newCanvasCard} disabled={preview !== 'mine'} onClick={startNewCanvas} title={preview !== 'mine' ? L('Demo je samo za predogled — prijavi se za svoj Canvas.', 'The demo is for preview only — sign in to create your own Canvas.') : undefined}>
          <span className={styles.newCanvasPlus} aria-hidden="true">+</span>
          <strong>{L('Nov Canvas', 'New Canvas')}</strong>
          <span>{L('Začni nov poslovni model', 'Start a new business model')}</span>
        </button>
        {shownDocuments.map(document => {
          const filled = BLOCKS.filter(block => document.blocks[block.key].trim()).length;
          return <article key={document.id} className={styles.canvasCard} role="button" tabIndex={0}
            onClick={() => openDocument(document)}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDocument(document); } }}
            aria-label={L(`Odpri Canvas ${document.name}`, `Open Canvas ${document.name}`)}>
            <div className={styles.canvasCardTop}>
              <div className={styles.canvasCardName}><strong>{document.companyName || L('Brez podjetja', 'No company')}</strong>{document.brandName && <span>{document.brandName}</span>}</div>
              <span className={styles.canvasCardCount}>{filled}<i>/9</i></span>
            </div>
            <div className={styles.canvasDots} aria-hidden="true">
              {BLOCKS.map(block => <span key={block.key} data-on={document.blocks[block.key].trim() ? 'true' : 'false'} />)}
            </div>
            <div className={styles.canvasCardFoot}>
              <span className={styles.canvasCardDate}>{L('Shranjeno', 'Saved')} {new Date(document.updatedAt).toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI')}{document.projektExternalId ? ` · ${L('Projekt', 'Project')}: ${projekti.find(p => p.id === document.projektExternalId)?.naslov || document.projektExternalId}` : ''}</span>
              <button type="button" className={styles.canvasCardPlan} onClick={event => { event.stopPropagation(); expandDocument(document); }} aria-label={L(`Razširi ${document.name} v poslovni načrt`, `Expand ${document.name} into a business plan`)}>{L('Razširi v načrt →', 'Expand into plan →')}</button>
            </div>
          </article>;
        })}
      </section>
      {!shownDocuments.length && <div className={styles.emptySaved}><strong>{L('Še nimaš shranjenega Canvasa.', 'You do not have a saved Canvas yet.')}</strong><span>{L('Klikni »Nov Canvas«, izpolni ga in shrani. Nato se bo pojavil tukaj.', 'Click “New Canvas”, complete it and save it. It will then appear here.')}</span></div>}
      <section className={styles.comingSoon} aria-label={L('Dokumenti, ki jih pripravi Pupa', 'Documents prepared by Pupa')}>
        <p className={styles.comingSoonHead}>{L('Pupa jih pripravi zate — iz pogovora, ne iz praznega obrazca', 'Pupa prepares them for you — from a conversation, not an empty form')}</p>
        <div className={styles.comingSoonGrid}>
          {[
            /* orodje = obstaja in se odpre; brez njega je kartica se obljuba.
               Kmalu pisemo SAMO tam, kjer res se ni — sicer stran obljublja
               nekaj, cesar izdelek ne zna. */
            { name: 'Brief', desc: L('Kaj delamo, za koga, do kdaj — zapiše se na projekt', 'What we are doing, for whom and by when — saved to the project'), orodje: 'brief' },
            { name: 'Pitch', desc: L('Kratka predstavitev zase — za stranke in partnerje', 'A short introduction — for clients and partners'), orodje: 'pitch' },
            { name: 'Problem', desc: L('Kateri problem rešuješ in za koga', 'Which problem you solve and for whom') },
            { name: L('Persone', 'Personas'), desc: L('Kdo so tvoje idealne stranke', 'Who your ideal clients are') },
            { name: L('Vrednostna ponudba', 'Value proposition'), desc: L('Value Proposition Canvas — kaj rešuješ za koga', 'Value Proposition Canvas — what you solve and for whom') },
            { name: 'Empathy map', desc: L('Kaj stranka misli, čuti, vidi in sliši', 'What the client thinks, feels, sees and hears') },
            { name: 'Journey map', desc: L('Pot stranke skozi izkušnjo', 'The client journey through the experience') },
            { name: 'SWOT', desc: L('Prednosti, slabosti, priložnosti, nevarnosti', 'Strengths, weaknesses, opportunities and threats') },
            { name: 'Brand brief', desc: L('Misija, vrednote in ton znamke', 'Brand mission, values and tone') },
          ].map(document => document.orodje
            ? <a key={document.name} className={`${styles.comingCard} ${styles.comingCardOn}`}
                href={`${base}/kalkulator/dom?orodje=${document.orodje}`}>
                <span className={styles.comingBadgeOn}>{L('Na voljo', 'Available')}</span>
                <strong>{document.name}</strong>
                <span>{document.desc}</span>
              </a>
            : <div key={document.name} className={styles.comingCard} aria-disabled="true">
                <span className={styles.comingBadge}>{L('Kmalu', 'Coming soon')}</span>
                <strong>{document.name}</strong>
                <span>{document.desc}</span>
              </div>)}
        </div>
      </section>
    </> : <>
      {/* Nazaj stoji NAD naslovom, kot povsod v Flowu. Bezastega pasu ni vec:
          napredek in tisk sta tiha spremljevalca naslova, ne svoja letev. */}
      <button type="button" className={styles.editorBack} onClick={() => { if (saveState === 'dirty' && !confirm(L('Imaš neshranjene spremembe. Zapreti brez shranjevanja?', 'You have unsaved changes. Close without saving?'))) return; setPlanOpen(false); setView('list'); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        {L('Vsi dokumenti', 'All documents')}
      </button>
      <header className={shell.topbar}>
        <div>
          <p className={shell.eyebrow}>BUSINESS CANVAS</p>
          <h1>{L('Posel na eni strani.', 'Your business on one page.')}</h1>
        </div>
        <div className={styles.editorMeta}>
          <button type="button" className={styles.editorPrint}
            onClick={() => natisniElement('canvas-tisk', `Business Canvas — ${brandName || companyName || 'Pinart'}`, { lezece: true, robMm: 12 })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z" /></svg>
            {L('Natisni', 'Print')}
          </button>
        </div>
      </header>
      {/* Napredek stoji v vrzeli med naslovom in podatki: pove, kako dalec je
          dokument -- opis stanja, ne dejanje, zato ni v glavi in ni gumb. */}
      <span className={styles.editorNapredek} aria-label={L(`${completed} od 9 področij izpolnjenih`, `${completed} of 9 areas completed`)}>
        <b>{completed}</b><i>/9</i> {L('izpolnjenih področij', 'areas filled')}
      </span>
      <section className={styles.canvasToolbar} aria-label={L('Podatki Business Canvasa', 'Business Canvas details')}>
        {organizations.length > 1 && <label><span>{L('Podjetje', 'Company')}</span><select value={activeOrganizationId} onChange={event => { setActiveOrganization(event.target.value); window.location.reload(); }}>{organizations.map(organization => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>}
        <label><span>{L('Podjetje ali organizacija', 'Company or organisation')}</span><input value={shownCompanyName} readOnly={preview !== 'mine'} onChange={event => { setCompanyName(event.target.value); setSaveState('dirty'); }} placeholder={L('Npr. Rdeča kapica d.o.o.', 'E.g. Little Red Ltd.')} /></label>
        <label><span>{L('Znamka, projekt ali poslovna ideja', 'Brand, project or business idea')}</span><input value={shownBrandName} readOnly={preview !== 'mine'} onChange={event => { setBrandName(event.target.value); setSaveState('dirty'); }} placeholder={L('Npr. Ribbon Lips (neobvezno)', 'E.g. Ribbon Lips (optional)')} /></label>
        <label><span>{L('Vezan na projekt', 'Linked to project')}</span>
          <select value={projektVez} disabled={preview !== 'mine'}
            onChange={event => {
              const v = event.target.value;
              if (v === '__nov') {
                /* Nov projekt dobi ime po canvasu — to je edino, kar o njem ze
                   vemo. Uporabnica ga bo preimenovala, ce bo hotela. */
                const projekt: Projekt = {
                  id: crypto.randomUUID(),
                  naslov: brandName.trim() || companyName.trim() || 'Nov projekt',
                  strankaIme: companyName.trim() || undefined,
                  status: 'aktiven',
                  created: new Date().toISOString(),
                };
                shraniProjekt(projekt);
                setProjekti(preberiProjekti());
                setProjektVez(projekt.id);
              } else {
                setProjektVez(v);
              }
              setSaveState('dirty');
            }}>
            <option value="">{L('Ni vezan (neobvezno)', 'Not linked (optional)')}</option>
            {projekti.map(projekt => <option key={projekt.id} value={projekt.id}>{projekt.naslov}</option>)}
            <option value="__nov">{L('+ Ustvari nov projekt', '+ Create new project')}</option>
          </select>
        </label>
      </section>

      {/* TISKLJIVA RAZLICICA — skrita na zaslonu, natisne se prek lib/natisni.
          Namenoma svoja postavitev: natisnjen vmesnik bi imel gumbe, okvirje
          in drsnike, natisnjen dokument pa mora biti stran, ki jo lahko das
          nekomu v roke na sestanku. */}
      <div id="canvas-tisk" aria-hidden="true" style={{ position: 'absolute', left: '-99999px', top: 0, width: '277mm' }}>
        <p style={{ margin: 0, font: '800 9pt sans-serif', letterSpacing: '.18em', color: '#6E4FA6' }}>BUSINESS MODEL CANVAS</p>
        <h1 style={{ margin: '.2rem 0 .1rem', font: '500 24pt Georgia, serif', color: '#111' }}>{shownBrandName || shownCompanyName || 'Business Canvas'}</h1>
        <p style={{ margin: '0 0 14pt', font: '400 10pt sans-serif', color: '#555' }}>
          {shownCompanyName}{shownCompanyName ? ' · ' : ''}{new Date().toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8pt' }}>
          {BLOCKS.map(block => (
            <div key={block.key} style={{ border: '1px solid #ddd', borderRadius: '6pt', padding: '8pt', breakInside: 'avoid' }}>
              <p style={{ margin: '0 0 4pt', font: '700 8pt sans-serif', letterSpacing: '.08em', color: '#6E4FA6' }}>
                {block.number} · {L(block.title, block.titleEn).toUpperCase()}
              </p>
              <p style={{ margin: 0, font: '400 9.5pt sans-serif', lineHeight: 1.45, color: '#111', whiteSpace: 'pre-wrap' }}>
                {shownCanvas[block.key]?.trim() || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <section className={styles.canvas} aria-label={L('Business Model Canvas', 'Business Model Canvas')}>
        {BLOCKS.map(block => <article key={block.key} data-block={block.key}>
          <header><span>{block.number}</span><CanvasIcon type={block.key} /><h3>{L(block.title, block.titleEn)}</h3></header>
          <p>{L(block.hint, block.hintEn)}</p>
          <textarea aria-label={L(block.title, block.titleEn)} value={shownCanvas[block.key]} onChange={event => update(block.key, event.target.value)} placeholder={L(block.example, block.exampleEn)} readOnly={preview !== 'mine'} />
        </article>)}
      </section>

      <section className={styles.actions}>
        <div><p>{L('NASLEDNJI KORAK', 'NEXT STEP')}</p><h2>{L('Iz Canvasa do uporabnega načrta.', 'Turn your Canvas into a useful plan.')}</h2><span>{L('Pinart pripravi osnovno strukturo. AI asistent bo nato postavljal dodatna vprašanja o trgu, konkurenci, prodaji, tveganjih in financah.', 'Pinart prepares the basic structure. The AI assistant will then ask additional questions about your market, competition, sales, risks and finances.')}</span></div>
        <div className={styles.saveActions}><span className={styles.saveFeedback} data-state={saveState} aria-live="polite">{saveState === 'dirty' ? L('Neshranjene spremembe', 'Unsaved changes') : saveState === 'saving' ? L('Shranjujem …', 'Saving …') : saveState === 'cloud' ? L(`✓ Shranjeno v oblak ob ${savedAt}`, `✓ Saved to cloud at ${savedAt}`) : saveState === 'local' ? L(`✓ Shranjeno v brskalnik ob ${savedAt}`, `✓ Saved in browser at ${savedAt}`) : ''}</span><button type="button" className={styles.secondary} onClick={() => void save()} disabled={preview !== 'mine'} title={preview !== 'mine' ? L('Demo je samo za predogled.', 'The demo is for preview only.') : undefined}><span className={styles.saveIcon} data-state={saveState} aria-hidden="true"><svg viewBox="0 0 24 24">{saveState === 'cloud' || saveState === 'local' ? <><path d="M5 12h14M14 7l5 5-5 5" /></> : saveState === 'saving' ? <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></> : <><path d="M5 4h12l2 2v14H5z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></>}</svg></span>{saveState === 'cloud' || saveState === 'local' ? L('Shranjeno', 'Saved') : L('Shrani Canvas', 'Save Canvas')}</button><button type="button" onClick={() => void preparePlan()}>{L('Pripravi osnovni načrt', 'Prepare basic plan')}</button></div>
      </section>

      {planOpen && <section className={styles.plan} aria-labelledby="plan-title">
        <header><div><p>{L('OSNUTEK', 'DRAFT')}</p><h2 id="plan-title">{L('Osnovni poslovni načrt', 'Basic business plan')}</h2></div><button type="button" onClick={() => setPlanOpen(false)} aria-label={L('Zapri osnutek', 'Close draft')}>×</button></header>
        <pre>{plan}</pre>
        <footer><button type="button" className={styles.secondary} onClick={copyPlan}><svg className={styles.buttonIcon} viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>{L('Kopiraj osnutek', 'Copy draft')}</button></footer>
        <small>{L('Osnutek nastane iz tvojega Canvasa. Ko povežeš svoj AI, ga bo Pupa razširila v celoten načrt in pitch.', 'The draft is created from your Canvas. Once you connect your AI, Pupa will expand it into a complete plan and pitch.')}</small>
      </section>}
    </>}
  </div>;
}
