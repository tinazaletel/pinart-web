'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ArrowUpRight, FolderOpen } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import ArhivFilter from '@/components/ArhivFilter';
import MetricIcon from '@/components/MetricIcon';
import { loadFlowData, saveOfferAmount, type FlowContract, type FlowExpense, type FlowInvoice, type FlowOffer, type FlowOfferStatus } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';

/* datumski filter (samo od–do; prazno ne omejuje) — enako kot arhiv */
const vObdobju = (dateStr: string, od: string, doD: string): boolean => {
  if (!od && !doD) return true;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  if (od && t < new Date(od + 'T00:00:00').getTime()) return false;
  if (doD && t > new Date(doD + 'T23:59:59').getTime()) return false;
  return true;
};

const statusLabel: Record<FlowOfferStatus, string> = { draft: 'Osnutek', sent: 'Čaka', accepted: 'Sprejeta', rejected: 'Zavrnjena' };
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;
const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI'); };

/* status projekta (tabela) — izpeljano iz offer.status po ISTI logiki kot filter
   spodaj (aktivni=accepted, cakajo=sent, zakljuceni=rejected); tone usklajen s
   tem, kako je isti offer.status prikazan v zavihku Ponudbe (statusOdtenek v
   ArhivWorkspace), le "zakljuceni" tu pomeni uspešno zaključen projekt (success),
   ceprav je pod-podatkom "rejected" ponudba (obstoječa, nespremenjena logika). */
type Odtenek = 'success' | 'waiting' | 'danger' | 'neutral';
const projectStatusInfo = (status: FlowOfferStatus): { label: string; tone: Odtenek } => {
  if (status === 'accepted') return { label: 'Aktivni', tone: 'success' };
  if (status === 'sent') return { label: 'Čakajo', tone: 'waiting' };
  if (status === 'rejected') return { label: 'Zaključeni', tone: 'success' };
  return { label: 'Osnutek', tone: 'neutral' };
};

/* Kirurški popravek mobilnega odreza po desni (~390–410px). Deluje samo na tej strani,
   ker cilja zgoščena imena razredov iz CSS modula — CSS modula ne spreminjamo (deljen). */
const overflowFix = `
.${styles.projectsPage}{overflow-x:clip;max-width:100%;}
.${styles.projectsPage} > *{min-width:0;}
.${styles.projectsToolbar} > label{min-width:0;}
.${styles.projectsToolbar} input{width:100%;min-width:0;box-sizing:border-box;}
.${styles.projectStory} h2,
.${styles.projectStory} > header span{overflow-wrap:anywhere;}
@media (max-width:640px){
.${styles.projectsToolbar}{grid-template-columns:1fr;}
.${styles.projectMoney}{grid-template-columns:1fr;}
.${styles.projectNarrative}{grid-template-columns:1fr;}
.${styles.projectNarrative} .${styles.projectAgreement}{grid-column:1;}
}
`;

/* Seznam projektov = tabela v istem slogu kot ostali zavihki Arhiva (glej
   ArhivWorkspace .arh-tabela/.arh-vrstica/.arh-status ipd.) — tu podvojeno s
   predpono pw-, ker gre za drugo komponento/datoteko (SAMO BRANJE arh- razredov,
   videz replicirian). Klik na vrstico odpre detajl kot SAMOSTOJNO stran
   (glej pw-stran/pw-nazaj spodaj + selected/selectedId logika). */
const pwStyles = `
.pw-seznam-glava{display:flex;align-items:center;justify-content:space-between;padding:.1rem .2rem .9rem}
.pw-seznam-glava strong{font:500 1.5rem var(--font-serif),Georgia,serif;color:var(--ink)}
.pw-tabela-ovoj{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:1.4rem}
.pw-tabela{min-width:640px;display:grid;grid-template-columns:minmax(0,2.1fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) 1.6rem;background:oklch(98% .008 87 / .92);border:1px solid var(--line);border-radius:1.4rem;overflow:hidden}
.pw-tabela > header{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;gap:1.1rem;padding:.75rem .9rem;font-size:.66rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)}
.pw-vrstica{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;gap:1.1rem;padding:.85rem .9rem;border:0;border-top:1px solid var(--line);background:transparent;font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:background .14s}
.pw-tabela > button.pw-vrstica:first-of-type{border-top:0}
.pw-vrstica:hover{background:linear-gradient(125deg, oklch(94% .045 295), oklch(93% .04 165))}
.pw-vrstica > span{min-width:0;font-size:.72rem;overflow-wrap:anywhere}
.pw-glavna{display:flex;align-items:center;gap:.6rem;min-width:0}
.pw-glavna strong{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
.pw-ikona{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:oklch(94% .045 295);color:var(--ink);flex:none}
.pw-mut{color:var(--muted)}
.pw-desno{text-align:right;font-weight:700}
.pw-kazalec{color:var(--muted);font-size:1.1rem;text-align:center}
.pw-status{display:inline-flex;align-items:center;gap:.42rem;width:max-content;max-width:100%;padding:.32rem .66rem;border:1px solid oklch(86% .012 87);border-radius:999px;background:oklch(95% .01 87);color:oklch(40% .02 70);font-size:.62rem;font-weight:700;white-space:nowrap}
.pw-status::before{content:'';width:.48rem;height:.48rem;border-radius:50%;background:var(--pika,oklch(62% .02 70));flex:none}
.pw-status[data-tone='waiting']{--pika:oklch(72% .16 75)}
.pw-status[data-tone='success']{--pika:oklch(62% .15 150)}
.pw-status[data-tone='danger']{--pika:oklch(58% .19 25)}
.pw-status[data-tone='neutral']{--pika:oklch(62% .02 70)}
.pw-prazno{padding:2rem;color:var(--muted);font-size:.72rem;text-align:center;border:1px solid var(--line);border-radius:1.4rem;background:oklch(98% .008 87 / .92)}
.pw-stran{padding:1rem}
.pw-nazaj{display:inline-flex;align-items:center;gap:.4rem;margin:0 0 .8rem;padding:.55rem .95rem;border:1px solid var(--line);border-radius:999px;background:oklch(98% .008 87 / .92);font:700 .62rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
.pw-nazaj:hover{background:var(--ink);color:var(--paper)}
@media (max-width:640px){
.pw-tabela{min-width:560px}
}
`;

/* stanje filtra projektov — iste vrednosti kot ArhivWorkspace (statusProjekt),
   da zunanji filterCfg (arh-glava) in notranji fallback delujeta z istimi vrednostmi */
type ProjektStatus = 'vse' | 'aktivni' | 'cakajo' | 'zakljuceni';

type Props = {
  base: string;
  /* zunanjiFilter=true => ProjectsWorkspace NE izriše lastne orodne vrstice
     (ArhivFilter); vrednosti in setterji pridejo od zunaj (ArhivWorkspace),
     ki takrat izrise SVOJ ArhivFilter v .arh-glava (ena vrsta z zavihki). */
  zunanjiFilter?: boolean;
  iskanje?: string;
  onIskanje?: (vrednost: string) => void;
  status?: string;
  onStatus?: (vrednost: string) => void;
  datumOd?: string;
  datumDo?: string;
  onDatumOd?: (vrednost: string) => void;
  onDatumDo?: (vrednost: string) => void;
  /* obvesti starša (ArhivWorkspace), da je detajl projekta odprt kot samostojna
     stran — starš takrat skrije svojo glavo (.arh-glava: zavihki + orodna vrstica),
     da je res videti kot svoja stran. */
  onDetajl?: (odprt: boolean) => void;
};

export default function ProjectsWorkspace({ base, zunanjiFilter, iskanje, onIskanje, status, onStatus, datumOd: datumOdZunaj, datumDo: datumDoZunaj, onDatumOd, onDatumDo, onDetajl }: Props) {
  const [offers, setOffers] = useState<FlowOffer[]>([]); const [invoices, setInvoices] = useState<FlowInvoice[]>([]); const [expenses, setExpenses] = useState<FlowExpense[]>([]); const [contracts, setContracts] = useState<FlowContract[]>([]); const [amounts, setAmounts] = useState<Record<string, number>>({});
  /* Demo/Prazno velja za vse strani — glej lib/predogled.ts */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';
  const [selectedId, setSelectedId] = useState('');
  /* samostojna raba (brez zunanjiFilter): lastno stanje orodne vrstice — fallback,
     ko iskanje/status/datum* niso podani od zunaj */
  const [notranjeIskanje, setNotranjeIskanje] = useState('');
  const [notranjiFilter, setNotranjiFilter] = useState<ProjektStatus>('vse');
  const [notranjiDatumOd, setNotranjiDatumOd] = useState(''); const [notranjiDatumDo, setNotranjiDatumDo] = useState('');
  const search = iskanje ?? notranjeIskanje;
  const setSearch = (v: string) => { if (onIskanje) onIskanje(v); else setNotranjeIskanje(v); };
  const filter = (status as ProjektStatus | undefined) ?? notranjiFilter;
  const setFilter = (v: ProjektStatus) => { if (onStatus) onStatus(v); else setNotranjiFilter(v); };
  const datumOd = datumOdZunaj ?? notranjiDatumOd;
  const setDatumOd = (v: string) => { if (onDatumOd) onDatumOd(v); else setNotranjiDatumOd(v); };
  const datumDo = datumDoZunaj ?? notranjiDatumDo;
  const setDatumDo = (v: string) => { if (onDatumDo) onDatumDo(v); else setNotranjiDatumDo(v); };
  /* ob nalaganju/menjavi predogleda ostane seznam (tabela) privzeti pogled —
     detajl se odpre le na eksplicit klik (selectProject spodaj) */
  useEffect(() => { const data = podatkiZaPredogled(nacin, loadFlowData()); const loaded = [...data.offers].sort((a, b) => b.date.localeCompare(a.date)); setOffers(loaded); setSelectedId(''); setInvoices(data.invoices); setExpenses(data.expenses); setContracts(data.contracts); setAmounts(Object.fromEntries(data.offers.map(offer => [offer.id, offer.agreedAmount]))); }, [nacin]);
  const projects = useMemo(() => offers.map(offer => { const projectInvoices = invoices.filter(item => item.sourceOfferId === offer.id); const projectExpenses = expenses.filter(item => item.sourceOfferId === offer.id); const projectContracts = contracts.filter(item => item.sourceOfferId === offer.id); const billed = projectInvoices.reduce((sum, item) => sum + item.amount, 0); const paid = projectInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0); const costs = projectExpenses.reduce((sum, item) => sum + item.amount, 0); const agreed = amounts[offer.id] || 0; return { offer, invoices: projectInvoices, expenses: projectExpenses, contracts: projectContracts, billed, paid, costs, agreed, unbilled: agreed ? agreed - billed : 0, profit: paid - costs }; }), [offers, invoices, expenses, contracts, amounts]);
  const visible = projects.filter(project => { const text = `${project.offer.title} ${project.offer.client} ${project.offer.number || ''}`.toLocaleLowerCase('sl-SI'); const match = text.includes(search.toLocaleLowerCase('sl-SI')); const state = filter === 'vse' || (filter === 'aktivni' ? project.offer.status === 'accepted' : filter === 'cakajo' ? project.offer.status === 'sent' : ['rejected'].includes(project.offer.status)); return match && state && vObdobju(project.offer.date, datumOd, datumDo); });
  const selected = projects.find(project => project.offer.id === selectedId);
  const saveAmount = (id: string, amount: number) => { const next = { ...amounts, [id]: amount }; setAmounts(next); saveOfferAmount(id, amount); };
  /* Detajl projekta je zdaj SAMOSTOJNA stran (view-swap na vseh širinah, ne le
     mobilno): ko je selectedId nastavljen, tabela+orodna vrstica se skrijeta in
     izriše se samo .projectStory čez celo, z gumbom ← Nazaj na vrhu. onDetajl
     obvesti ArhivWorkspace, naj skrije svojo glavo (zavihki+filter). */
  const storyRef = useRef<HTMLElement>(null);
  const selectProject = (id: string) => { setSelectedId(id); onDetajl?.(true); requestAnimationFrame(() => storyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const goBack = () => { setSelectedId(''); onDetajl?.(false); };
  /* varnostna mreza: ce se komponenta odstrani (npr. menjava zavihka v Arhivu)
     medtem ko je bil detajl odprt, sporoci starsu, naj svojo glavo spet pokaze */
  useEffect(() => () => { onDetajl?.(false); }, [onDetajl]);

  return <div className={styles.projectsPage}><style dangerouslySetInnerHTML={{ __html: overflowFix + pwStyles }} />
    {!selected && !zunanjiFilter && <ArhivFilter
      iskanje={search}
      onIskanje={setSearch}
      placeholder="Poišči projekt, stranko ali številko ponudbe …"
      datumOd={datumOd}
      datumDo={datumDo}
      onDatumOd={setDatumOd}
      onDatumDo={setDatumDo}
      statusOznaka="Stanje projekta"
      statusVrednost={filter}
      onStatus={v => setFilter(v as ProjektStatus)}
      statusOpcije={[{ vrednost: 'vse', oznaka: 'Vsi' }, { vrednost: 'aktivni', oznaka: 'Aktivni' }, { vrednost: 'cakajo', oznaka: 'Čakajo' }, { vrednost: 'zakljuceni', oznaka: 'Zaključeni' }]}
      aktivnihFiltrov={(filter !== 'vse' ? 1 : 0) + (datumOd || datumDo ? 1 : 0)}
      onPocisti={() => { setFilter('vse'); setDatumOd(''); setDatumDo(''); }}
      akcija={<Link className="af-akcija-gumb" href={`${base}/kalkulator/orodje`}>+ Nova ponudba</Link>}
    />}

    {!selected ? (
      projects.length === 0 ? (
        <div className={styles.projectStoryEmpty}><span>↗</span><strong>Najprej ustvari ponudbo.</strong><p>Ta bo postala osnova projekta in povezala vse nadaljnje dokumente.</p></div>
      ) : (
        <div className="pw-seznam">
          <header className="pw-seznam-glava"><p className={styles.eyebrow}>PROJEKTI</p><strong>{visible.length}</strong></header>
          {visible.length ? (
            <div className="pw-tabela-ovoj">
              <div className="pw-tabela">
                <header><span>Projekt</span><span>Stranka</span><span>Datum</span><span>Status</span><span className="pw-desno">Vrednost</span><span /></header>
                {visible.map(project => { const info = projectStatusInfo(project.offer.status); return (
                  <button key={project.offer.id} type="button" className="pw-vrstica" onClick={() => selectProject(project.offer.id)}>
                    <span className="pw-glavna"><span className="pw-ikona" aria-hidden><FolderOpen size={17} /></span><strong>{project.offer.title}</strong></span>
                    <span className="pw-mut">{project.offer.client}</span>
                    <span className="pw-mut">{datStr(project.offer.date)}</span>
                    <span><span className="pw-status" data-tone={info.tone}>{info.label}</span></span>
                    <span className="pw-desno">{project.agreed ? money(project.agreed) : '—'}</span>
                    <span className="pw-kazalec" aria-hidden>›</span>
                  </button>
                ); })}
              </div>
            </div>
          ) : <p className="pw-prazno">Ni projektov v tem pogledu.</p>}
        </div>
      )
    ) : (
      <section ref={storyRef} className={`${styles.projectStory} pw-stran`}>
        <button type="button" className="pw-nazaj" onClick={goBack} aria-label="Nazaj na seznam projektov">← Nazaj</button>
        <header><div><p className={styles.eyebrow}>PROJEKT · {selected.offer.number || 'BREZ ŠTEVILKE'}</p><h2>{selected.offer.title}</h2><span>{selected.offer.client} · {new Date(selected.offer.date).toLocaleDateString('sl-SI')}</span></div><b>{statusLabel[selected.offer.status]}</b></header>
        <div className={styles.projectMoney}><label><small>Dogovorjena vrednost</small><span><input type="number" min="0" step="0.01" value={selected.agreed || ''} onChange={event => saveAmount(selected.offer.id, Number(event.target.value))} /> €</span><b className={styles.subpageMetricIcon}><MetricIcon type="document" /></b></label><span><small>Zaračunano</small><strong>{money(selected.billed)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="paid" /></b></span><span className={selected.unbilled > 0 ? styles.projectNeedsInvoice : ''}><small>Še ni zaračunano</small><strong>{selected.agreed ? money(selected.unbilled) : '—'}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="cost" /></b></span><span><small>Ocenjeni rezultat</small><strong>{money(selected.profit)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></span></div>
        <div className={styles.projectNarrative}><article className={styles.projectAgreement}><p className={styles.eyebrow}>01 · DOGOVORJENO</p><h3>Kaj je bilo v ponudbi?</h3>{selected.offer.scope.length ? <ul>{selected.offer.scope.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>Starejša ponudba nima strukturiranega obsega. Odpri jo v kalkulatorju za celotno besedilo.</p>}</article><article><p className={styles.eyebrow}>02 · POGODBE</p><h3>{selected.contracts.length ? `${selected.contracts.length} povezanih` : 'Brez pogodbe'}</h3>{selected.contracts.map(item => <span key={item.id}><b>{item.title}</b><small>{item.status}</small></span>)}<Link href={`${base}/kalkulator/pogodbe`} aria-label="Dodaj pogodbo za ta projekt"><Plus size={18} weight="bold" /></Link></article><article><p className={styles.eyebrow}>03 · RAČUNI</p><h3>{money(selected.billed)}</h3>{selected.invoices.map(item => <span key={item.id}><b>Račun {item.number || ''} · {money(item.amount)}</b><small>{item.paid ? 'Plačan' : 'Odprt'}</small></span>)}<Link href={`${base}/kalkulator/racuni`} className={styles.projectOpenLink} aria-label="Odpri račune projekta"><ArrowUpRight size={16} weight="bold" /></Link><Link href={`${base}/kalkulator/racuni`} aria-label="Dodaj račun za ta projekt"><Plus size={18} weight="bold" /></Link></article><article><p className={styles.eyebrow}>04 · STROŠKI</p><h3>{money(selected.costs)}</h3>{selected.expenses.map(item => <span key={item.id}><b>{item.title} · {money(item.amount)}</b><small>{item.category || 'Projektni strošek'}</small></span>)}<Link href={`${base}/kalkulator/stroski`} aria-label="Dodaj strošek za ta projekt"><Plus size={18} weight="bold" /></Link></article></div>
      </section>
    )}
  </div>;
}
