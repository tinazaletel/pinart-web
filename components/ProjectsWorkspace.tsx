'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ArrowUpRight, FolderOpen } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import ArhivFilter from '@/components/ArhivFilter';
import MetricIcon from '@/components/MetricIcon';
import { loadFlowData, loadProjectLinks, saveOfferAmount, saveProjectLinks, type FlowContract, type FlowExpense, type FlowInvoice, type FlowOffer, type FlowOfferStatus, type FlowProjectLink } from '@/lib/pinartFlowStore';
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
.pw-tabela-naslov{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.95rem 1rem .85rem;background:oklch(95% .035 300);border-bottom:1px solid rgba(17,17,17,.08)}
.pw-tabela-naslov .${styles.eyebrow}{color:oklch(45% .12 300)}
.pw-tabela-naslov strong{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:1.6rem;line-height:1;color:var(--ink)}
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
/* metrike nad tabelo projektov — kopija arh-metrike/arh-metrika (ArhivWorkspace),
   podvojeno s predpono pw-, ker gre za drugo komponento (SAMO BRANJE videza arh-,
   ne uvoz iz druge datoteke). Isti veliki stevec (Bodoni serif) kot povsod drugod. */
.pw-metrike{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:0 0 1rem}
.pw-metrika{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;min-height:7.4rem;padding:1rem 1.1rem;border:1px solid var(--line);border-radius:14px}
.pw-metrika small{position:relative;z-index:1;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.pw-metrika strong{position:relative;z-index:1;margin-top:auto;font:500 1.7rem var(--font-serif),Georgia,serif;color:var(--ink);-webkit-text-stroke:.35px var(--ink);text-shadow:0 1px 2px oklch(100% 0 0 / .35)}
.pw-metrika span{position:relative;z-index:1;margin-top:.2rem;color:var(--muted);font-size:.78rem}
.pw-metrika-vrednost{background:linear-gradient(140deg,oklch(95% .035 295),oklch(90% .065 297))}
.pw-metrika-zaracunano{background:linear-gradient(140deg,oklch(96% .035 160),oklch(87% .08 163))}
.pw-metrika-odprto{background:linear-gradient(140deg,oklch(97% .03 65),oklch(90% .07 60))}
.pw-metrika-ikona{position:absolute;right:-1rem;bottom:-1.6rem;display:grid;place-items:center;width:6.6rem;aspect-ratio:1;border-radius:1.6rem;background:oklch(100% 0 0/.24);color:color-mix(in oklch,currentColor 54%,transparent);transform:rotate(-9deg)}
@media (max-width:760px){.pw-metrike{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.pw-metrike{grid-template-columns:1fr}}
.pw-stran{padding:1rem}
.pw-nazaj{display:inline-flex;align-items:center;gap:.4rem;margin:0 0 .8rem;padding:.55rem .95rem;border:1px solid var(--line);border-radius:999px;background:oklch(98% .008 87 / .92);font:700 .62rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
.pw-nazaj:hover{background:var(--ink);color:var(--paper)}
@media (max-width:640px){
.pw-tabela{min-width:560px}
}
/* razdelki ZA 04 Stroški na detajlu projekta (05 Dokumentacija + placeholderji
   06 Komunikacije/07 Zapiski) — svoj pw- razdelek v duhu .projectNarrative
   kartic (isti border/radius/ozadje odtenek), da se lepo vklopi. */
.pw-dodatno{display:flex;flex-direction:column;gap:.55rem;margin-top:.55rem}
.pw-karta{position:relative;overflow:hidden;padding:1rem;border:1px solid color-mix(in oklch,var(--ink) 8%,transparent);border-radius:1rem;background:oklch(99% .006 87 / .85)}
.pw-dokumentacija{background:linear-gradient(135deg,oklch(97% .022 250),oklch(97% .022 200))}
.pw-dokumentacija h3{margin:0;font:600 1.15rem var(--font-serif),Georgia,serif}
.pw-linki{display:flex;flex-direction:column;gap:.4rem;margin:.7rem 0 0}
.pw-link-vrstica{display:flex;align-items:center;gap:.5rem;padding:.5rem .65rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0 / .55)}
.pw-link-vrstica a{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-weight:700;font-size:.72rem;text-decoration:none}
.pw-link-vrstica a:hover{text-decoration:underline}
.pw-link-brisi{flex:none;display:grid;place-items:center;width:1.5rem;height:1.5rem;padding:0;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--muted);font-size:.85rem;line-height:1;cursor:pointer}
.pw-link-brisi:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.pw-link-prazno{margin:.7rem 0 0;color:var(--muted);font-size:.68rem}
.pw-link-obrazec{display:grid;grid-template-columns:1fr;gap:.45rem;margin-top:.7rem}
.pw-link-obrazec input{padding:.5rem .65rem;border:1px solid var(--line);border-radius:.6rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.72rem;color:var(--ink);min-width:0}
.pw-link-dodaj{flex:none;padding:.5rem .8rem;border:1px solid var(--ink);border-radius:.6rem;background:var(--ink);color:var(--paper);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
.pw-link-dodaj:disabled{opacity:.5;cursor:not-allowed}
.pw-namig-demo{margin-top:.5rem;color:var(--muted);font-size:.62rem;font-style:italic}
/* sivi kotni gumb + odpre polja za dodajanje povezave; !important na polozaju, ker
   splosno pravilo ".projectNarrative article:not(.projectAgreement) > *" sicer vsili position:relative */
.pw-dok-dodaj{position:absolute !important;z-index:2;top:.85rem;right:.85rem;display:grid;place-items:center;width:2.2rem;height:2.2rem;padding:0;border:1px solid color-mix(in oklch,var(--ink) 14%,transparent);border-radius:50%;background:oklch(91% .003 250);color:var(--ink);cursor:pointer}
.pw-dok-dodaj:hover{background:oklch(86% .004 250);border-color:color-mix(in oklch,var(--ink) 26%,transparent)}
.pw-opozorilo{margin-top:.6rem;padding:.45rem .6rem;border:1px solid oklch(85% .07 65);border-radius:.5rem;background:oklch(96% .04 70);color:oklch(48% .12 55);font-size:.62rem;line-height:1.4}
/* vrstica racuna: ime + kaj je (levo) — status + znesek desno poravnano, da so cifre vidne in poravnane */
.pw-racun-v{grid-template-columns:1fr auto;align-items:center}
.pw-racun-l{display:grid;gap:.12rem;min-width:0}
.pw-racun-l small{color:var(--muted);font-size:.5rem}
.pw-racun-d{display:flex;align-items:center;gap:.5rem;justify-self:end;text-align:right}
.pw-racun-d .pw-status{padding:0;border:0;background:none;font-size:.54rem;color:var(--muted)}
.pw-racun-d strong{font-size:.72rem;font-variant-numeric:tabular-nums;white-space:nowrap}
/* gumb "Prikaži več (N)" pod skrajšanim seznamom v karticah detajla */
.pw-vec{margin:.2rem 0 0;padding:.15rem 0;border:0;background:none;color:var(--muted);font:700 .58rem var(--font-sans),sans-serif;text-align:left;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.pw-vec:hover{color:var(--ink)}
.pw-kmalu-red{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}
.pw-kmalu{opacity:.85}
.pw-kmalu h3{margin:0;font:600 1.05rem var(--font-serif),Georgia,serif}
.pw-kmalu p{margin:.5rem 0 0;color:var(--muted);font-size:.72rem;line-height:1.4}
.pw-znacka{display:inline-flex;align-items:center;width:max-content;margin-top:.7rem;padding:.3rem .6rem;border-radius:999px;background:oklch(90% .02 87);color:var(--muted);font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
@media (max-width:640px){
.pw-link-obrazec{grid-template-columns:1fr}
.pw-kmalu-red{grid-template-columns:1fr}
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
  /* povzetek nad tabelo (glej pw-metrike zgoraj) — iz trenutno vidnih projektov
     (upostevajo iskanje/filter/datum), da povzetek sledi temu, kar je v tabeli */
  const pwMetrike = useMemo(() => ({
    vrednost: visible.reduce((sum, project) => sum + project.agreed, 0),
    zaracunano: visible.reduce((sum, project) => sum + project.billed, 0),
    odprto: visible.reduce((sum, project) => sum + Math.max(0, project.agreed - project.billed), 0),
  }), [visible]);
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

  /* 05 · DOKUMENTACIJA — povezave do zunanjih datotek za TA projekt (localStorage,
     glej lib/pinartFlowStore). V predogledu (demo/prazno/začetek) samo prikaz —
     dodajanje/brisanje onemogočeno, da se ne piše v pravo shrambo. */
  const [links, setLinks] = useState<FlowProjectLink[]>([]);
  const [linkOznaka, setLinkOznaka] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [dodajOdprt, setDodajOdprt] = useState(false);
  /* dolgi seznami (pogodbe/računi/stroški) na detajlu: pokaži nekaj, ostalo pod "Prikaži več" */
  const [odprtiSeznami, setOdprtiSeznami] = useState<Record<string, boolean>>({});
  /* V predogledu (demo) pokažemo primere povezav, da se vidi poln videz razdelka;
     v pravem računu beremo dejansko shranjene povezave. */
  useEffect(() => {
    const demo: FlowProjectLink[] = [
      { oznaka: 'Figma · Dizajn', url: 'https://figma.com' },
      { oznaka: 'Miro · Moodboard', url: 'https://miro.com' },
      { oznaka: 'Drive · Gradiva', url: 'https://drive.google.com' },
    ];
    setLinks(samoOgled ? demo : (selectedId ? loadProjectLinks(selectedId) : []));
    setLinkOznaka(''); setLinkUrl(''); setOdprtiSeznami({}); setDodajOdprt(false);
  }, [selectedId, samoOgled]);

  /* pokaži prvih N vrstic, ostalo pod gumbom — 5-letni projekt ima lahko 60 računov */
  const LIMIT_VRSTIC = 3;
  const statusTon = (s: string): 'success' | 'waiting' | 'danger' | 'neutral' => {
    const t = (s || '').toLowerCase();
    if (/(podpis|aktiv|plačan|placan|sprejet|zaključ|zakljuc)/.test(t)) return 'success';
    if (/(zavrn|preklic)/.test(t)) return 'danger';
    if (/(posla|prejet|pregled|odprt|čaka|caka|osnut)/.test(t)) return 'waiting';
    return 'neutral';
  };
  const zVec = (kljuc: string, vrstice: JSX.Element[]) => {
    const odprto = odprtiSeznami[kljuc];
    const skrito = vrstice.length - LIMIT_VRSTIC;
    const vidne = odprto ? vrstice : vrstice.slice(0, LIMIT_VRSTIC);
    return <>{vidne}{skrito > 0 && <button type="button" className="pw-vec" onClick={() => setOdprtiSeznami(prej => ({ ...prej, [kljuc]: !odprto }))}>{odprto ? 'Prikaži manj' : `Prikaži več (${skrito})`}</button>}</>;
  };
  const addLink = () => {
    if (samoOgled || !selectedId) return;
    const oznaka = linkOznaka.trim(); const url = linkUrl.trim();
    if (!oznaka || !url) return;
    const next = [...links, { oznaka, url }];
    setLinks(next); saveProjectLinks(selectedId, next);
    setLinkOznaka(''); setLinkUrl('');
  };
  const removeLink = (index: number) => {
    if (samoOgled || !selectedId) return;
    const next = links.filter((_, i) => i !== index);
    setLinks(next); saveProjectLinks(selectedId, next);
  };

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
          <div className="pw-metrike">
            <article className="pw-metrika pw-metrika-vrednost">
              <small>Vrednost</small><strong>{money(pwMetrike.vrednost)}</strong><span>dogovorjeno skupaj</span>
              <b className="pw-metrika-ikona"><MetricIcon type="document" /></b>
            </article>
            <article className="pw-metrika pw-metrika-zaracunano">
              <small>Zaračunano</small><strong>{money(pwMetrike.zaracunano)}</strong><span>izdani računi</span>
              <b className="pw-metrika-ikona"><MetricIcon type="paid" /></b>
            </article>
            <article className="pw-metrika pw-metrika-odprto">
              <small>Odprto</small><strong>{money(pwMetrike.odprto)}</strong><span>še ni zaračunano</span>
              <b className="pw-metrika-ikona"><MetricIcon type="profit" /></b>
            </article>
          </div>

          {visible.length ? (
            <div className="pw-tabela-ovoj">
              <div className="pw-tabela">
                {/* naslov + stevec sta DEL tabele (znotraj okvirja), ne lebdita nad njo */}
                <div className="pw-tabela-naslov"><p className={styles.eyebrow}>PROJEKTI</p><strong>{visible.length}</strong></div>
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
        <div className={styles.projectNarrative}><article className={styles.projectAgreement}><p className={styles.eyebrow}>01 · DOGOVORJENO</p><h3>Kaj je bilo v ponudbi?</h3>{selected.offer.scope.length ? <ul>{selected.offer.scope.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>Starejša ponudba nima strukturiranega obsega. Odpri jo v kalkulatorju za celotno besedilo.</p>}</article><article><p className={styles.eyebrow}>02 · POGODBE</p><h3>{selected.contracts.length ? `${selected.contracts.length} povezanih` : 'Brez pogodbe'}</h3>{zVec('pogodbe', selected.contracts.map(item => <span key={item.id}><b>{item.title}</b><i className="pw-status" data-tone={statusTon(item.status)}>{item.status}</i></span>))}<Link href={`${base}/kalkulator/pogodbe`} aria-label="Dodaj pogodbo za ta projekt"><Plus size={18} weight="bold" /></Link></article><article><p className={styles.eyebrow}>03 · RAČUNI</p><h3>{money(selected.billed)}</h3>{zVec('racuni', [...selected.invoices].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(item => { const kaj = item.title || item.items?.[0]?.opis || selected.offer.title; return <span key={item.id} className="pw-racun-v"><span className="pw-racun-l"><b>Račun {item.number || ''}</b>{kaj && <small>{kaj}</small>}</span><span className="pw-racun-d"><i className="pw-status" data-tone={item.paid ? 'success' : 'waiting'}>{item.paid ? 'Plačan' : 'Odprt'}</i><strong>{money(item.amount)}</strong></span></span>; }))}<Link href={`${base}/kalkulator/racuni`} className={styles.projectOpenLink} aria-label="Odpri račune projekta"><ArrowUpRight size={16} weight="bold" /></Link><Link href={`${base}/kalkulator/racuni`} aria-label="Dodaj račun za ta projekt"><Plus size={18} weight="bold" /></Link></article><article><p className={styles.eyebrow}>04 · STROŠKI</p><h3>{money(selected.costs)}</h3>{zVec('stroski', [...selected.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(item => <span key={item.id} className="pw-racun-v"><span className="pw-racun-l"><b>{item.title}</b><small>{item.category || 'Projektni strošek'}</small></span><span className="pw-racun-d"><strong>{money(item.amount)}</strong></span></span>))}<Link href={`${base}/kalkulator/stroski`} aria-label="Dodaj strošek za ta projekt"><Plus size={18} weight="bold" /></Link></article><article className="pw-karta pw-dokumentacija"><p className={styles.eyebrow}>05 · DOKUMENTACIJA</p><h3>Povezave do zunanjih datotek</h3>{links.length ? (<div className="pw-linki">{links.map((link, index) => (<div key={`${link.url}-${index}`} className="pw-link-vrstica"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.oznaka}</a>{!samoOgled && <button type="button" className="pw-link-brisi" onClick={() => removeLink(index)} aria-label={`Izbriši povezavo ${link.oznaka}`}>×</button>}</div>))}</div>) : <p className="pw-link-prazno">Še ni dodanih povezav.</p>}{!samoOgled && dodajOdprt && (<div className="pw-link-obrazec"><input type="text" value={linkOznaka} onChange={event => setLinkOznaka(event.target.value)} placeholder="npr. Figma" aria-label="Oznaka povezave" /><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" aria-label="Naslov povezave (Figma, Miro, IDD, mapa Drive …)" /><button type="button" className="pw-link-dodaj" onClick={addLink} disabled={!linkOznaka.trim() || !linkUrl.trim()}>+ Dodaj povezavo</button></div>)}{samoOgled && dodajOdprt && <p className="pw-opozorilo">Dodajanje povezav ni na voljo v predogledu (demo). Prijavi se v svoj račun.</p>}<button type="button" className="pw-dok-dodaj" onClick={() => setDodajOdprt(open => !open)} aria-label={dodajOdprt ? 'Zapri dodajanje povezave' : 'Dodaj povezavo'}><Plus size={16} weight="bold" /></button></article></div>

        <div className="pw-dodatno">
          <div className="pw-kmalu-red">
            <article className="pw-karta pw-kmalu">
              <p className={styles.eyebrow}>06 · KOMUNIKACIJE</p>
              <h3>Vse na enem mestu</h3>
              <p>E-pošta in dogovori tega projekta na enem mestu.</p>
              <b className="pw-znacka">Kmalu</b>
            </article>
            <article className="pw-karta pw-kmalu">
              <p className={styles.eyebrow}>07 · ZAPISKI</p>
              <h3>CRM dnevnik</h3>
              <p>Opombe, klici in dogovori s stranko.</p>
              <b className="pw-znacka">Kmalu</b>
            </article>
          </div>
        </div>
      </section>
    )}
  </div>;
}
