'use client';

/* ARHIV — eno mesto, kjer najdes vse shranjeno (projekti, ponudbe, pogodbe, racuni).
   Videz je KOPIJA kalkulatorja/retainerja (papir + mreza + mehki blobi + Bodoni
   serif naslovi + pilule), NE dashboard kartice. Vsi razredi imajo predpono arh-,
   da ne trcijo s splosnimi pravili (pregled.module.css ima agresivna pravila za
   input/select/button znotraj .shell). Podatke bere iz skupne Flow shrambe prek
   podatkiZaPredogled — orodij se NE dotika, samo prikazuje njihove zapise.

   Vizualni okvir (.arh-ozadje, .arh-vsebina, .arh-kicker, .arh-h1, .arh-segpills)
   je prenesen iz RetainerWorkspace (rw-). Detajl panel z desne + lepljivi X so
   vzorec iz ContractWorkspace (styles.detailBackdrop/detailPanel + .pg-det-x). */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal, flushSync } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CaretDown, CaretUp, FileArrowDown, FileText, Receipt, Scroll, Warning, ListBullets, Kanban } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, saveOfferStatus, type FlowContract, type FlowContractStatus, type FlowInvoice, type FlowOffer, type FlowOfferStatus } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import ProjectsWorkspace from './ProjectsWorkspace';
import ArhivFilter from './ArhivFilter';
import MobTabs from '@/components/MobTabs';
import AmbientBubbles from '@/components/AmbientBubbles';
import SwapText from '@/components/SwapText';
import { posljiMail } from '@/lib/posta';
import Toast from '@/components/Toast';

type Zavihek = 'projekti' | 'ponudbe' | 'pogodbe' | 'racuni';

const eur = (n: number) => Math.round(n).toLocaleString('sl-SI') + ' €';
const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI'); };
const dokZnesek = (n?: number) => (typeof n === 'number' && n > 0 ? eur(n) : '—');

/* status oznake — enake kot v posameznih orodjih, da je jezik poenoten */
const offerLabels: Record<FlowOfferStatus, string> = { draft: 'Osnutek', sent: 'Poslana', accepted: 'Sprejeta', rejected: 'Zavrnjena' };
const contractLabels: Record<FlowContractStatus, string> = { draft: 'Osnutek', received: 'Prejeta', review: 'V pregledu', active: 'Aktivna', signed: 'Podpisana' };

/* stara telesa pogodb so golo besedilo; nova so HTML iz urejevalnika — ista
   heuristika kot v ContractWorkspace, da detajl izbere pravi nacin izrisa */
const jeHtmlTelo = (b?: string) => !!b && (b.includes('<h1') || b.includes('<div'));
/* opomba s predpono "ALERT:" = opozorilo (rdece); predpona se na zaslonu ne kaze */
const opombaInfo = (notes?: string) => {
  const n = notes?.trim();
  if (!n) return null;
  const alert = /^ALERT:/i.test(n);
  return { alert, besedilo: alert ? n.replace(/^ALERT:\s*/i, '') : n };
};

/* NALOGA #44: detajl ponudbe naj izgleda kot PRAVI DOKUMENT, ne le povzetek+link.
   Shramba kalkulatorja ("pinart-kalkulator-arhiv") je LOCENA od Flow arhiva, ki ga
   ArhivWorkspace sicer bere (podatkiZaPredogled/loadFlowData); ce je uporabnica to
   ponudbo shranila v kalkulatorju, ima zapis besediloHtml (ali morebitni prihodnji
   "body") = pravi HTML dokument. Ce zapisa ni ali je telo prazno, detajl pade na
   predogled sestavljen iz polj FlowOffer (obseg + znesek) — to je pricakovano tudi
   v DEMO nacinu, kjer kalkulatorjeve shrambe sploh ni. */
type ArhivKalkulatorZapis = {
  nazivPonudbe?: string;
  stevilkaPonudbe?: string;
  veljavnostDni?: string;
  besediloHtml?: string;
  body?: string;
};
const K_KALKULATOR_ARHIV = 'pinart-kalkulator-arhiv';

/* poisce zapis v arhivu kalkulatorja, ki ustreza tej ponudbi (najprej po stevilki,
   sicer po nazivu) in vrne njeno HTML telo + veljavnost, ce obstajata */
function najdiTeloPonudbe(offer: FlowOffer): { telo: string; veljavnostDni?: string } {
  if (typeof window === 'undefined') return { telo: '' };
  try {
    const arhiv = JSON.parse(localStorage.getItem(K_KALKULATOR_ARHIV) || '{}') as Record<string, ArhivKalkulatorZapis>;
    const naslovOffer = offer.title.trim().toLocaleLowerCase('sl-SI');
    const zapis = Object.values(arhiv).find(z =>
      (offer.number && z.stevilkaPonudbe && z.stevilkaPonudbe === offer.number)
      || (z.nazivPonudbe && z.nazivPonudbe.trim().toLocaleLowerCase('sl-SI') === naslovOffer)
    );
    const telo = zapis?.body || zapis?.besediloHtml || '';
    return { telo: telo.trim() ? telo : '', veljavnostDni: zapis?.veljavnostDni };
  } catch { return { telo: '' }; }
}

/* poisce KLJUC (naziv zapisa) v arhivu kalkulatorja za to ponudbo — da jo lahko
   »Odpri ponudbo« naloži nazaj v urejevalnik (kalkulator prebere ?odpri=<kljuc>).
   Isto ujemanje kot najdiTeloPonudbe: najprej po stevilki, sicer po nazivu. */
function najdiKljucPonudbe(offer: FlowOffer): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const arhiv = JSON.parse(localStorage.getItem(K_KALKULATOR_ARHIV) || '{}') as Record<string, ArhivKalkulatorZapis>;
    const naslovOffer = offer.title.trim().toLocaleLowerCase('sl-SI');
    const najden = Object.entries(arhiv).find(([, z]) =>
      (offer.number && z.stevilkaPonudbe && z.stevilkaPonudbe === offer.number)
      || (z.nazivPonudbe && z.nazivPonudbe.trim().toLocaleLowerCase('sl-SI') === naslovOffer)
    );
    return najden ? najden[0] : null;
  } catch { return null; }
}

/* status pikica — ISTE barve/logika kot nadzorna plošča (statusTone/status_*):
   success=zelena, waiting=jantar, danger=rdeča, neutral=siva */
type Odtenek = 'success' | 'waiting' | 'danger' | 'neutral';
const statusOdtenek = (label: string): Odtenek =>
  ['Sprejeta', 'Podpisana', 'Plačano', 'Aktivna'].includes(label) ? 'success'
    : label === 'Zavrnjena' ? 'danger'
      : ['Poslana', 'Prejeta', 'V pregledu', 'Odprto'].includes(label) ? 'waiting'
        : 'neutral';
/* enoten prikaz statusa (pilula + pika) — povsod isti dizajn */
const StatusPika = ({ label }: { label: string }) => <span className="arh-status" data-tone={statusOdtenek(label)}>{label}</span>;

/* datumski filter — skupni za vse zavihke: samo od–do (native koledar).
   Prazno od/do ne omejuje; zapis brez veljavnega datuma se skrije le, ce je
   filter aktiven. */
function vObdobju(dateStr: string, od: string, doD: string): boolean {
  if (!od && !doD) return true;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  if (od && t < new Date(od + 'T00:00:00').getTime()) return false;
  if (doD && t > new Date(doD + 'T23:59:59').getTime()) return false;
  return true;
}

/* izbrani zapis za detajl panel — locimo po vrsti, da vemo, kaj izrisati */
type Detajl =
  | { vrsta: 'ponudba'; zapis: FlowOffer }
  | { vrsta: 'pogodba'; zapis: FlowContract }
  | { vrsta: 'racun'; zapis: FlowInvoice };

export default function ArhivWorkspace({ base }: { base: string }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [nacin] = usePredogled();
  /* podatki iz skupne shrambe (upostevajo predogled: prazno/zacetek/moji/demo) */
  const flow = useMemo(() => podatkiZaPredogled(nacin, loadFlowData()), [nacin]);
  const { offers, contracts, invoices } = flow;

  /* Urejanje statusa (klik na pilulo -> spustni seznam). Samo v nacinu »Moji podatki«.
     Override daje takojsen UI odziv; sprememba se shrani v pravo shrambo. */
  const mineMode = nacin === 'mine';
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  const naStatus = (tip: 'offer' | 'contract' | 'invoice', id: string, v: string) => {
    setStatusOverride(prev => ({ ...prev, [`${tip}:${id}`]: v }));   /* takojsen UI (velja tudi v demu) */
    if (!mineMode) return;   /* v demu ne pisemo v pravo bazo */
    const data = loadFlowData();
    if (tip === 'offer') saveOfferStatus(id, v as FlowOfferStatus);
    else if (tip === 'contract') saveFlowCollection('contracts', data.contracts.map(c => c.id === id ? { ...c, status: v as FlowContractStatus } : c));
    else saveFlowCollection('invoices', data.invoices.map(r => r.id === id ? { ...r, paid: v === 'true' } : r));
  };
  const statusVred = (tip: string, id: string, fallback: string) => statusOverride[`${tip}:${id}`] ?? fallback;
  /* ton vodilne status-pike v vrstici (nadomesti ponavljajočo ikono) — iz surove
     vrednosti prek labela do odtenka, isti vir kot pilula desno */
  const tonZa = (opcije: Array<{ v: string; label: string }>, vrednost: string) => statusOdtenek(opcije.find(o => o.v === vrednost)?.label || vrednost);
  const offerOpcije = (Object.entries(offerLabels) as Array<[FlowOfferStatus, string]>).map(([v, label]) => ({ v, label }));
  const contractOpcije = (Object.entries(contractLabels) as Array<[FlowContractStatus, string]>).map(([v, label]) => ({ v, label }));
  const invoiceOpcije = [{ v: 'false', label: 'Odprto' }, { v: 'true', label: 'Plačano' }];
  const StatusUredi = ({ tip, id, vrednost, opcije }: { tip: 'offer' | 'contract' | 'invoice'; id: string; vrednost: string; opcije: Array<{ v: string; label: string }> }) => {
    const oznaka = opcije.find(o => o.v === vrednost)?.label || vrednost;
    return <span className="arh-status-ured" data-editable="">
      <StatusPika label={oznaka} />
      <select className="arh-status-select" aria-label={L('Spremeni status', 'Change status')} value={vrednost} title={L('Spremeni status', 'Change status')} onClick={e => e.stopPropagation()} onChange={e => naStatus(tip, id, e.target.value)}>
        {opcije.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </span>;
  };

  /* IZVOZ: odpre novo okno s kopijo VSEH app stilov + natisne dokument (#arh-izvoz).
     Uporabnik v tiskalniku izbere »Shrani kot PDF«. Deluje za ponudbo/pogodbo/racun,
     ker kopiramo dejanske stile (arh-doktelo, arh-racun-tabela, letterhead ...). */
  const izvoziDokument = (naslov: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('arh-izvoz');
    if (!el) return;
    const stili = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('\n');
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) { alert(L('Za izvoz omogoči pojavna okna (pop-up).', 'Enable pop-ups to export.')); return; }
    w.document.write(`<!doctype html><html lang="sl"><head><meta charset="utf-8"><title>${naslov}</title>${stili}<style>@page{margin:14mm}html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}#arh-izvoz{box-shadow:none!important;border:none!important;margin:0!important;max-width:none!important;width:100%!important}</style></head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 500);
  };

  /* EXCEL izvoz = CSV z ; ločilom + UTF-8 BOM (Excel SI pravilno prebere šumnike). */
  const izvoziCsv = (ime: string, vrstice: Array<Array<string | number>>) => {
    if (typeof document === 'undefined') return;
    const vsebina = '﻿' + vrstice.map(v => v.map(c => {
      const s = String(c ?? '');
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(';')).join('\r\n');
    const blob = new Blob([vsebina], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = ime.replace(/[^\w\-]+/g, '_') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* Kompakten header detajla (kot referenca »Bill #… Paid … Export«): majhna ikona +
     srednji naslov (TIP + št., BREZ podvojenega imena) + status pilula v vrsti +
     podnaslov (stranka · datum) + gumb Izvozi desno. Velik H2 je odstranjen. */
  const izvozGumb = { display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.5rem .8rem', border: '1px solid var(--line)', borderRadius: '999px', background: 'oklch(98% .008 87 / .92)', color: 'var(--ink)', font: '600 .78rem var(--font-sans), sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' } as const;
  const DetajlGlava = ({ ikona, naslov, podnaslov, status, izvozNaslov, onExcel }: { ikona: ReactNode; naslov: string; podnaslov?: string; status: ReactNode; izvozNaslov: string; onExcel: () => void }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', margin: '0 0 1.4rem', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: '2rem', height: '2rem', borderRadius: '.55rem', background: 'oklch(95% .012 300)', color: 'var(--ink)', flex: 'none' }} aria-hidden>{ikona}</span>
          <span id="arh-detajl-naslov" style={{ font: '600 1.15rem var(--font-sans), system-ui, sans-serif', color: 'var(--ink)' }}>{naslov}</span>
          {status}
        </div>
        {podnaslov && <p style={{ margin: '.4rem 0 0', fontSize: '.82rem', color: 'var(--muted)' }}>{podnaslov}</p>}
      </div>
      <div style={{ flex: 'none', display: 'inline-flex', gap: '.5rem' }}>
        <button type="button" onClick={() => izvoziDokument(izvozNaslov)} title={L('Natisni / shrani kot PDF', 'Print / save as PDF')} style={izvozGumb}><FileArrowDown size={15} weight="bold" /> PDF</button>
        <button type="button" onClick={onExcel} title={L('Izvozi kot Excel (CSV)', 'Export as Excel (CSV)')} style={izvozGumb}><FileArrowDown size={15} weight="bold" /> Excel</button>
      </div>
    </div>
  );

  /* NAKNADNO pošiljanje ob pregledu (arhiv): mailto s prednapolnjeno zadevo/besedilom;
     prejemnik iz imenika strank po imenu (če ima e-pošto). Do postavitve Resend (mail
     zaledje) mailto NE pripne PDF-ja — uporabnica ga pripne ročno; z Resend bo priponka
     samodejna. */
  const strankaEmail = (ime: string) => {
    const c = ime.trim().toLocaleLowerCase('sl-SI');
    return (flow.clients || []).find(x => (x.name || '').trim().toLocaleLowerCase('sl-SI') === c)?.email || '';
  };
  const [postaObvestilo, setPostaObvestilo] = useState<{ t: string; ok: boolean } | null>(null);
  /* Pošlji stranki: če ima stranka e-naslov, gre PREK Flowa (Resend) — reply-to =
     token@pinartflow.com (strežnik iz projektId), zapis v project_mail(out). Če
     e-naslova ni, degradira na mailto (odpre lokalni mail za ročni vnos). */
  const posljiStranki = async (projektId: string | undefined, ime: string, zadeva: string, telo: string) => {
    if (typeof window === 'undefined') return;
    const za = strankaEmail(ime).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(za)) {
      window.location.href = `mailto:${encodeURIComponent(za)}?subject=${encodeURIComponent(zadeva)}&body=${encodeURIComponent(telo)}`;
      return;
    }
    const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">${telo.replace(/\n/g, '<br>')}</div>`;
    setPostaObvestilo({ t: L('Pošiljam …', 'Sending …'), ok: true });
    const rez = await posljiMail({ to: [za], subject: zadeva, html, projectExternalId: projektId });
    setPostaObvestilo(rez.ok
      ? { t: L('Poslano stranki — v Komunikacijah.', 'Sent to client — in Communications.'), ok: true }
      : { t: L('Napaka: ', 'Error: ') + (rez.napaka || L('pošiljanje ni uspelo.', 'sending failed.')), ok: false });
  };

  const [zavihek, setZavihek] = useState<Zavihek>('projekti');
  /* ko ProjectsWorkspace odpre detajl projekta kot samostojno stran (klik na
     vrstico v tabeli), skrijemo .arh-glava (zavihki + orodna vrstica) — glej
     onDetajl prop spodaj. Detajl ni vezan na zavihek, zato se ob morebitni
     menjavi zavihka počisti prek onDetajl(false) v ProjectsWorkspace samem. */
  const [projektDetajlOdprt, setProjektDetajlOdprt] = useState(false);
  /* PIPELINE POSLOV — preklop pogleda na zavihku Projekti (Seznam | Pipeline).
     Stanje zivi tu, gumb je pilula na .arh-glava (ob zavihkih), ProjectsWorkspace
     dobi vrednost/setter prek props in izrise ali obstojeco tabelo, ali nov kanban pw-pipeline. */
  const [pogledProjekti, setPogledProjekti] = useState<'seznam' | 'pipeline'>('seznam');

  /* iskanje + filtri (skupno stanje; ob menjavi zavihka jih pocistimo, ker so
     razlicni za vsak tip) */
  const [iskanje, setIskanje] = useState('');
  const [obdobjeOd, setObdobjeOd] = useState('');
  const [obdobjeDo, setObdobjeDo] = useState('');
  const [statusPonudba, setStatusPonudba] = useState<'vse' | FlowOfferStatus>('vse');
  const [statusPogodba, setStatusPogodba] = useState<'vse' | FlowContractStatus>('vse');
  const [placano, setPlacano] = useState<'vse' | 'placano' | 'odprto'>('vse');
  /* status projekta — iste vrednosti kot ProjectsWorkspace (vse/aktivni/cakajo/zakljuceni),
     da krmiljeni prop status= deluje brez pretvorbe */
  const [statusProjekt, setStatusProjekt] = useState('vse');

  const [detajl, setDetajl] = useState<Detajl | null>(null);
  const [detObsegOdprt, setDetObsegOdprt] = useState(false);

  /* izbor vrstic za izvoz — kljuc: `${vrsta}:${id}` (razlicni tipi imajo lahko enak id) */
  const [izbrani, setIzbrani] = useState<Set<string>>(() => new Set());
  const [portalPripravljen, setPortalPripravljen] = useState(false);
  useEffect(() => { setPortalPripravljen(true); }, []);
  /* Globinski link (npr. iz profila stranke »Povezano s stranko«): ?tip=ponudbe|pogodbe|racuni&odpri=<id>
     odpre pravi zavihek + detajl točno tega dokumenta (specifikacija), NE projekta. Enkrat. */
  const searchParams = useSearchParams();
  const odprtoIzUrlRef = useRef(false);
  useEffect(() => {
    if (odprtoIzUrlRef.current) return;
    const odpri = searchParams.get('odpri'); const tip = searchParams.get('tip');
    if (!odpri || !tip) return;
    if (tip === 'ponudbe') { const z = offers.find(o => o.id === odpri); if (z) { setZavihek('ponudbe'); setDetajl({ vrsta: 'ponudba', zapis: z } as Detajl); odprtoIzUrlRef.current = true; } }
    else if (tip === 'pogodbe') { const z = contracts.find(c => c.id === odpri); if (z) { setZavihek('pogodbe'); setDetajl({ vrsta: 'pogodba', zapis: z } as Detajl); odprtoIzUrlRef.current = true; } }
    else if (tip === 'racuni') { const z = invoices.find(r => r.id === odpri); if (z) { setZavihek('racuni'); setDetajl({ vrsta: 'racun', zapis: z } as Detajl); odprtoIzUrlRef.current = true; } }
  }, [searchParams, offers, contracts, invoices]);
  const [izvazamPdf, setIzvazamPdf] = useState(false);
  const izKljuc = (vrsta: string, id: string) => `${vrsta}:${id}`;
  const preklopiIzbor = (k: string) => setIzbrani(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  /* PRAVI dokument ponudbe, ce obstaja shranjen HTML v arhivu kalkulatorja
     (glej najdiTeloPonudbe zgoraj) — prazno telo pomeni: izrisi predogled iz
     polj ponudbe namesto injeciranega HTML-ja */
  const ponudbaDok = useMemo(
    () => (detajl?.vrsta === 'ponudba' ? najdiTeloPonudbe(detajl.zapis) : { telo: '' }),
    [detajl]
  );
  /* kljuc arhivske ponudbe (za »Odpri ponudbo« -> kalkulator jo naloži nazaj) */
  const odpriKljuc = useMemo(
    () => (detajl?.vrsta === 'ponudba' ? najdiKljucPonudbe(detajl.zapis) : null),
    [detajl]
  );

  /* menjava zavihka: pocisti vsa iskanja/filtre, da se ne prenesejo napacno */
  const menjajZavihek = (z: Zavihek) => {
    setZavihek(z);
    setIskanje(''); setObdobjeOd(''); setObdobjeDo('');
    setStatusPonudba('vse'); setStatusPogodba('vse'); setPlacano('vse'); setStatusProjekt('vse');
    setDetajl(null); setDetObsegOdprt(false); setProjektDetajlOdprt(false); setPogledProjekti('seznam');
    setIzbrani(new Set());
  };

  const isk = iskanje.trim().toLocaleLowerCase('sl-SI');

  /* ── filtrirani seznami ── */
  const ponudbePrikaz = useMemo(() => offers.filter(o => {
    if (isk && !`${o.title} ${o.client} ${o.number || ''}`.toLocaleLowerCase('sl-SI').includes(isk)) return false;
    if (statusPonudba !== 'vse' && o.status !== statusPonudba) return false;
    return vObdobju(o.date, obdobjeOd, obdobjeDo);
  }), [offers, isk, statusPonudba, obdobjeOd, obdobjeDo]);

  const pogodbePrikaz = useMemo(() => contracts.filter(c => {
    if (isk && !`${c.title} ${c.client}`.toLocaleLowerCase('sl-SI').includes(isk)) return false;
    if (statusPogodba !== 'vse' && c.status !== statusPogodba) return false;
    return vObdobju(c.date, obdobjeOd, obdobjeDo);
  }), [contracts, isk, statusPogodba, obdobjeOd, obdobjeDo]);

  const racuniPrikaz = useMemo(() => invoices.filter(r => {
    if (isk && !`${r.title || ''} ${r.number || ''} ${r.client}`.toLocaleLowerCase('sl-SI').includes(isk)) return false;
    if (placano === 'placano' && !r.paid) return false;
    if (placano === 'odprto' && r.paid) return false;
    return vObdobju(r.date, obdobjeOd, obdobjeDo);
  }), [invoices, isk, placano, obdobjeOd, obdobjeDo]);

  /* stevilo aktivnih filtrov (za stevec na gumbu Filtri v ArhivFilter) */
  const datumAktiven = obdobjeOd !== '' || obdobjeDo !== '';
  const stFiltrov = (datumAktiven ? 1 : 0)
    + (zavihek === 'projekti' && statusProjekt !== 'vse' ? 1 : 0)
    + (zavihek === 'ponudbe' && statusPonudba !== 'vse' ? 1 : 0)
    + (zavihek === 'pogodbe' && statusPogodba !== 'vse' ? 1 : 0)
    + (zavihek === 'racuni' && placano !== 'vse' ? 1 : 0);
  const pocistiFiltre = () => { setObdobjeOd(''); setObdobjeDo(''); setStatusPonudba('vse'); setStatusPogodba('vse'); setPlacano('vse'); setStatusProjekt('vse'); };

  const zapriDetajl = () => { setDetajl(null); setDetObsegOdprt(false); };

  /* orodna vrstica (ArhivFilter) — ENA instanca ob zavihkih, izbrana glede na
     aktivni zavihek (vsi stirje, tudi projekti, da je vrstica z zavihki v
     ENI vrsti). Za projekti ProjectsWorkspace dobi zunanjiFilter=true in NE
     izrise svoje lastne — uporabi te iste vrednosti/settere. */
  type FilterCfg = {
    placeholder: string;
    statusOznaka: string;
    statusVrednost: string;
    onStatus: (vrednost: string) => void;
    statusOpcije: { vrednost: string; oznaka: string }[];
    akcija: React.ReactNode;
  };
  const filterCfg: FilterCfg | null =
    zavihek === 'projekti' ? {
      placeholder: L('Poišči projekt, stranko ali številko …', 'Search projects, clients or numbers …'),
      statusOznaka: L('Stanje projekta', 'Project status'),
      statusVrednost: statusProjekt,
      onStatus: setStatusProjekt,
      statusOpcije: [{ vrednost: 'vse', oznaka: L('Vsi', 'All') }, { vrednost: 'aktivni', oznaka: L('Aktivni', 'Active') }, { vrednost: 'cakajo', oznaka: L('Čakajo', 'Pending') }, { vrednost: 'zakljuceni', oznaka: L('Zaključeni', 'Completed') }],
      akcija: <Link className="af-akcija-gumb af-akcija-dodaj" href={`${base}/kalkulator/nov-projekt`} aria-label={L('Nov projekt', 'New project')} title={L('Nov projekt', 'New project')}>{L('+ Nov projekt', '+ New project')}</Link>,
    } : zavihek === 'ponudbe' ? {
      placeholder: L('Poišči ponudbo, stranko ali številko …', 'Search offers, clients or numbers …'),
      statusOznaka: L('Status ponudbe', 'Offer status'),
      statusVrednost: statusPonudba,
      onStatus: v => setStatusPonudba(v as 'vse' | FlowOfferStatus),
      statusOpcije: [{ vrednost: 'vse', oznaka: L('Vse', 'All') }, ...(Object.entries(offerLabels) as Array<[FlowOfferStatus, string]>).map(([v, n]) => ({ vrednost: v, oznaka: n }))],
      akcija: <Link className="af-akcija-gumb af-akcija-dodaj" href={`${base}/kalkulator/orodje`} aria-label={L('Nova ponudba', 'New offer')} title={L('Nova ponudba', 'New offer')}>{L('+ Nova ponudba', '+ New offer')}</Link>,
    } : zavihek === 'pogodbe' ? {
      placeholder: L('Poišči pogodbo ali stranko …', 'Search contracts or clients …'),
      statusOznaka: L('Status pogodbe', 'Contract status'),
      statusVrednost: statusPogodba,
      onStatus: v => setStatusPogodba(v as 'vse' | FlowContractStatus),
      statusOpcije: [{ vrednost: 'vse', oznaka: L('Vse', 'All') }, ...(Object.entries(contractLabels) as Array<[FlowContractStatus, string]>).map(([v, n]) => ({ vrednost: v, oznaka: n }))],
      akcija: <Link className="af-akcija-gumb af-akcija-dodaj" href={`${base}/kalkulator/pogodbe`} aria-label={L('Nova pogodba', 'New contract')} title={L('Nova pogodba', 'New contract')}>{L('+ Nova pogodba', '+ New contract')}</Link>,
    } : zavihek === 'racuni' ? {
      placeholder: L('Poišči račun, stranko ali številko …', 'Search invoices, clients or numbers …'),
      statusOznaka: L('Plačilo', 'Payment'),
      statusVrednost: placano,
      onStatus: v => setPlacano(v as 'vse' | 'placano' | 'odprto'),
      statusOpcije: [{ vrednost: 'vse', oznaka: L('Vsi', 'All') }, { vrednost: 'placano', oznaka: L('Plačani', 'Paid') }, { vrednost: 'odprto', oznaka: L('Odprti', 'Open') }],
      akcija: <>
        <Link className="af-akcija-gumb af-akcija-izvoz" href={`${base}/kalkulator/racunovodstvo`} aria-label={L('Izvoz za računovodstvo', 'Export for accounting')} title={L('Izvoz za računovodstvo', 'Export for accounting')}><FileArrowDown size={18} weight="bold" /><span className="af-akcija-tekst">{L('Izvoz za računovodstvo', 'Export for accounting')}</span></Link>
        <Link className="af-akcija-gumb af-akcija-dodaj" href={`${base}/kalkulator/racuni`} aria-label={L('Nov račun', 'New invoice')} title={L('Nov račun', 'New invoice')}>{L('+ Nov račun', '+ New invoice')}</Link>
      </>,
    } : null;

  /* označi vse (za trenutni zavihek) + CSV izvoz izbranih */
  const trenutneVrstice: string[] =
    zavihek === 'ponudbe' ? ponudbePrikaz.map(o => izKljuc('ponudba', o.id))
    : zavihek === 'pogodbe' ? pogodbePrikaz.map(c => izKljuc('pogodba', c.id))
    : zavihek === 'racuni' ? racuniPrikaz.map(r => izKljuc('racun', r.id))
    : [];
  const vsiIzbrani = trenutneVrstice.length > 0 && trenutneVrstice.every(k => izbrani.has(k));
  const preklopiVse = () => setIzbrani(prev => {
    const n = new Set(prev);
    if (vsiIzbrani) trenutneVrstice.forEach(k => n.delete(k));
    else trenutneVrstice.forEach(k => n.add(k));
    return n;
  });
  const izvoziIzbrane = () => {
    const vrst: (string | number)[][] = [['Tip', 'Naziv', 'Stranka', 'Datum', 'Status', 'Znesek']];
    offers.forEach(o => { if (izbrani.has(izKljuc('ponudba', o.id))) vrst.push(['Ponudba', o.title || '', o.client || '', datStr(o.date), offerLabels[o.status] || o.status, typeof o.agreedAmount === 'number' ? o.agreedAmount : '']); });
    contracts.forEach(c => { if (izbrani.has(izKljuc('pogodba', c.id))) vrst.push(['Pogodba', c.title || '', c.client || '', datStr(c.date), contractLabels[c.status] || c.status, '']); });
    invoices.forEach(r => { if (izbrani.has(izKljuc('racun', r.id))) vrst.push(['Račun', r.title || r.number || '', r.client || '', datStr(r.date), r.paid ? 'Plačan' : 'Odprt', typeof r.amount === 'number' ? r.amount : '']); });
    izvoziCsv('Arhiv izvoz', vrst);
  };
  /* ločeni PDF-ji izbranih dokumentov v ZIP — vsak dokument zaporedno odpremo v
     detajlu, zajamemo #arh-izvoz (html2canvas-pro zaradi oklch) -> jsPDF -> JSZip */
  const varnoIme = (s: string) => (s.replace(/[^\w\- À-ɏ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'dokument');
  const csvIzVrstic = (vrstice: (string | number)[][]) => '﻿' + vrstice.map(v => v.map(c => { const s = String(c ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
  const prenesiBlob = (blob: Blob, ime: string) => {
    if (typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = ime;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  /* zajem enega dokumenta v PDF blob: odpre detajl (offscreen med izvozom) in ga izriše */
  const pdfIzDokumenta = async (
    html2canvas: (typeof import('html2canvas-pro'))['default'],
    JsPDF: (typeof import('jspdf'))['jsPDF'],
    vrsta: 'ponudba' | 'pogodba' | 'racun',
    zapis: FlowOffer | FlowContract | FlowInvoice,
  ): Promise<Blob | null> => {
    flushSync(() => { setDetObsegOdprt(false); setDetajl({ vrsta, zapis } as Detajl); });
    await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())));
    try { await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready; } catch { /* ignore */ }
    const el = document.getElementById('arh-izvoz');
    if (!el) return null;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const img = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new JsPDF({ unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const imgH = canvas.height * pw / canvas.width;
    pdf.addImage(img, 'JPEG', 0, 0, pw, imgH);
    let ostane = imgH - ph; let odmik = 0;
    while (ostane > 0) { odmik += ph; pdf.addPage(); pdf.addImage(img, 'JPEG', 0, -odmik, pw, imgH); ostane -= ph; }
    return pdf.output('blob');
  };
  const izvoziPdfZip = async () => {
    if (izvazamPdf) return;
    const seznam: { vrsta: 'ponudba' | 'pogodba' | 'racun'; zapis: FlowOffer | FlowContract | FlowInvoice; ime: string }[] = [
      ...offers.filter(o => izbrani.has(izKljuc('ponudba', o.id))).map(o => ({ vrsta: 'ponudba' as const, zapis: o, ime: `Ponudba ${o.number || o.title || ''}` })),
      ...contracts.filter(c => izbrani.has(izKljuc('pogodba', c.id))).map(c => ({ vrsta: 'pogodba' as const, zapis: c, ime: `Pogodba ${c.title || ''}` })),
      ...invoices.filter(r => izbrani.has(izKljuc('racun', r.id))).map(r => ({ vrsta: 'racun' as const, zapis: r, ime: `${r.predracun ? 'Predracun' : 'Racun'} ${r.number || r.title || ''}` })),
    ];
    if (!seznam.length) return;
    setIzvazamPdf(true);
    const prejsnji = detajl;
    try {
      const [{ default: JSZip }, { jsPDF }, { default: html2canvas }] = await Promise.all([import('jszip'), import('jspdf'), import('html2canvas-pro')]);
      const zip = new JSZip();
      for (const it of seznam) {
        const blob = await pdfIzDokumenta(html2canvas, jsPDF, it.vrsta, it.zapis);
        if (blob) zip.file(varnoIme(it.ime) + '.pdf', blob);
      }
      prenesiBlob(await zip.generateAsync({ type: 'blob' }), 'Arhiv_izvoz.zip');
    } catch (e) {
      console.error('PDF izvoz spodletel', e);
      if (typeof window !== 'undefined') window.alert('Izvoz PDF ni uspel:\n' + (e instanceof Error ? e.message : String(e)));
    } finally {
      flushSync(() => setDetajl(prejsnji));
      setIzvazamPdf(false);
    }
  };
  /* PROJEKTNI »Package« ZIP: za vsak projekt mapa z dokumenti (PDF) + povzetek.csv,
     na vrhu projekti.csv. Kliče ga ProjectsWorkspace prek prop-a onPaket. */
  const izvoziPaketProjektov = async (projekti: { ime: string; offer: FlowOffer; contracts: FlowContract[]; invoices: FlowInvoice[] }[]) => {
    if (izvazamPdf || !projekti.length) return;
    setIzvazamPdf(true);
    const prejsnji = detajl;
    try {
      const [{ default: JSZip }, { jsPDF }, { default: html2canvas }] = await Promise.all([import('jszip'), import('jspdf'), import('html2canvas-pro')]);
      const zip = new JSZip();
      const vrh: (string | number)[][] = [['Projekt', 'Stranka', 'Datum', 'Znesek']];
      for (const p of projekti) {
        const mapa = varnoIme(p.ime);
        const oBlob = await pdfIzDokumenta(html2canvas, jsPDF, 'ponudba', p.offer);
        if (oBlob) zip.file(`${mapa}/Ponudba_${varnoIme(p.offer.number || p.offer.title || '')}.pdf`, oBlob);
        for (const c of p.contracts) { const b = await pdfIzDokumenta(html2canvas, jsPDF, 'pogodba', c); if (b) zip.file(`${mapa}/Pogodba_${varnoIme(c.title || c.id)}.pdf`, b); }
        for (const r of p.invoices) { const b = await pdfIzDokumenta(html2canvas, jsPDF, 'racun', r); if (b) zip.file(`${mapa}/Racun_${varnoIme(r.number || r.id)}.pdf`, b); }
        const povz: (string | number)[][] = [
          ['Tip', 'Naziv', 'Datum', 'Status', 'Znesek'],
          ['Ponudba', p.offer.title || '', datStr(p.offer.date), offerLabels[p.offer.status] || p.offer.status, typeof p.offer.agreedAmount === 'number' ? p.offer.agreedAmount : ''],
          ...p.contracts.map(c => ['Pogodba', c.title || '', datStr(c.date), contractLabels[c.status] || c.status, ''] as (string | number)[]),
          ...p.invoices.map(r => ['Račun', r.title || r.number || '', datStr(r.date), r.paid ? 'Plačan' : 'Odprt', typeof r.amount === 'number' ? r.amount : ''] as (string | number)[]),
        ];
        zip.file(`${mapa}/povzetek.csv`, csvIzVrstic(povz));
        vrh.push([p.offer.title || p.ime, p.offer.client || '', datStr(p.offer.date), typeof p.offer.agreedAmount === 'number' ? p.offer.agreedAmount : '']);
      }
      zip.file('projekti.csv', csvIzVrstic(vrh));
      prenesiBlob(await zip.generateAsync({ type: 'blob' }), 'Projekti_paket.zip');
    } catch (e) {
      console.error('Package izvoz spodletel', e);
      if (typeof window !== 'undefined') window.alert('Izvoz projektov ni uspel:\n' + (e instanceof Error ? e.message : String(e)));
    } finally {
      flushSync(() => setDetajl(prejsnji));
      setIzvazamPdf(false);
    }
  };
  const kljuk = (k: string | null) => {
    const vse = k === null;
    const on = vse ? vsiIzbrani : izbrani.has(k);
    const dej = (e: React.SyntheticEvent) => { e.stopPropagation(); if (vse) preklopiVse(); else preklopiIzbor(k); };
    return <span className="arh-chk-cel"><span role="checkbox" aria-checked={on} tabIndex={0}
      className={'arh-chk' + (on ? ' on' : '')} onClick={dej}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); dej(e); } }}
      aria-label={vse ? L('Označi vse', 'Select all') : L('Izberi vrstico', 'Select row')} /></span>;
  };

  return (
    <div className="arh">
      {portalPripravljen && izbrani.size > 0 && zavihek !== 'projekti' && createPortal(
        <div className="arh-izbor-letev" role="region" aria-label={L('Izbrane vrstice', 'Selected rows')}>
          <span className="arh-izbor-st">{izbrani.size} {L('izbranih', 'selected')}</span>
          <button type="button" className="arh-izbor-gumb" onClick={izvoziPdfZip} disabled={izvazamPdf}><SwapText text={izvazamPdf ? L('Pripravljam…', 'Preparing…') : 'PDF (ZIP)'} /></button>
          <button type="button" className="arh-izbor-gumb arh-izbor-gumb2" onClick={izvoziIzbrane} disabled={izvazamPdf}>CSV</button>
          <button type="button" className="arh-izbor-prekl" onClick={() => setIzbrani(new Set())} disabled={izvazamPdf}>{L('Prekliči', 'Cancel')}</button>
        </div>,
        document.body,
      )}
      <div className="arh-ozadje" aria-hidden>
        <span className="arh-blob arh-blob-roza" />
        <span className="arh-blob arh-blob-modra" />
        <AmbientBubbles />
      </div>

      <div className="arh-vsebina">
        {/* ko je detajl projekta odprt kot samostojna stran, skrijemo naslov +
            glavo (zavihki/orodna vrstica) — glej onDetajl na ProjectsWorkspace */}
        {!projektDetajlOdprt && <>
          <p className="arh-kicker">{L('Arhiv', 'Archive')}</p>
          <h1 className="arh-h1">{L('Vse na enem mestu.', 'Everything in one place.')}</h1>
          <p className="arh-uvod">{L('Shranjeni projekti, ponudbe, pogodbe in računi — poišči in odpri, kar potrebuješ.', 'Saved projects, offers, contracts and invoices — find and open whatever you need.')}</p>

          {/* glava: zavihki (levo) + orodna vrstica aktivnega zavihka (desno) v ENI
              vrsti na namizju; flex-wrap ju na mobilnem prelomi v dve vrsti (locene) */}
          <div className="arh-glava">
            {/* Preklopnik arhiva kot PRVI element orodne vrstice (mobilno slide-up); vse v ENI vrsti. */}
            <MobTabs label={L('Arhiv', 'Archive')} vrednost={zavihek} naVrednost={id => menjajZavihek(id as Zavihek)} opcije={[{ id: 'projekti', label: L('Projekti', 'Projects') }, { id: 'ponudbe', label: L('Ponudbe', 'Offers') }, { id: 'pogodbe', label: L('Pogodbe', 'Contracts') }, { id: 'racuni', label: L('Računi', 'Invoices') }]} />
            <div className="arh-segpills arh-zavihki mobtabs-hide" role="tablist" aria-label="Arhiv">
              {(([['projekti', L('Projekti', 'Projects')], ['ponudbe', L('Ponudbe', 'Offers')], ['pogodbe', L('Pogodbe', 'Contracts')], ['racuni', L('Računi', 'Invoices')]]) as Array<[Zavihek, string]>).map(([v, n]) => (
                <button key={v} type="button" role="tab" aria-selected={zavihek === v} className={zavihek === v ? 'on' : ''} onClick={() => menjajZavihek(v)}>{n}</button>
              ))}
            </div>

            {/* PIPELINE POSLOV — preklop pogleda, samo na zavihku Projekti (glej pogledProjekti zgoraj) */}
            {zavihek === 'projekti' && (
              <div className="arh-segpills arh-pogled-preklop" role="tablist" aria-label={L('Pogled projektov', 'Projects view')}>
                <button type="button" role="tab" aria-selected={pogledProjekti === 'seznam'} className={pogledProjekti === 'seznam' ? 'on' : ''} onClick={() => setPogledProjekti('seznam')} title={L('Seznam', 'List')} aria-label={L('Seznam', 'List')}><ListBullets size={16} weight="bold" className="arh-pp-ik" /><span className="arh-pp-txt">{L('Seznam', 'List')}</span></button>
                <button type="button" role="tab" aria-selected={pogledProjekti === 'pipeline'} className={pogledProjekti === 'pipeline' ? 'on' : ''} onClick={() => setPogledProjekti('pipeline')} title="Pipeline" aria-label="Pipeline"><Kanban size={16} weight="bold" className="arh-pp-ik" /><span className="arh-pp-txt">Pipeline</span></button>
              </div>
            )}

            {filterCfg && (
              <div className="arh-glava-filter">
                <ArhivFilter
                  iskanje={iskanje}
                  onIskanje={setIskanje}
                  placeholder={filterCfg.placeholder}
                  datumOd={obdobjeOd}
                  datumDo={obdobjeDo}
                  onDatumOd={setObdobjeOd}
                  onDatumDo={setObdobjeDo}
                  statusOznaka={filterCfg.statusOznaka}
                  statusVrednost={filterCfg.statusVrednost}
                  onStatus={filterCfg.onStatus}
                  statusOpcije={filterCfg.statusOpcije}
                  aktivnihFiltrov={stFiltrov}
                  onPocisti={pocistiFiltre}
                  akcija={filterCfg.akcija}
                />
              </div>
            )}
            {/* Mobilno: akcija (+) kot samostojen ZADNJI element vrstice (za pogledom), da je vrstni red
                Projekti · iskalnik · filter · pogled · +. Na namizju je skrit (akcija ostane v ArhivFilter). */}
            {filterCfg && <div className="arh-akcija-mob">{filterCfg.akcija}</div>}
          </div>
        </>}

        {/* ── PROJEKTI: obstojeci ProjectsWorkspace (logike ne prepisujemo), zunanjiFilter=true
            => orodno vrstico izrise ArhivFilter zgoraj v .arh-glava (ena vrsta z zavihki).
            onDetajl: ko ProjectsWorkspace odpre detajl kot samostojno stran, skrije zgornjo glavo. ── */}
        {zavihek === 'projekti' && (
          <section className="arh-panel arh-projekti">
            <ProjectsWorkspace
              base={base}
              zunanjiFilter
              iskanje={iskanje}
              onIskanje={setIskanje}
              status={statusProjekt}
              onStatus={setStatusProjekt}
              datumOd={obdobjeOd}
              datumDo={obdobjeDo}
              onDatumOd={setObdobjeOd}
              onDatumDo={setObdobjeDo}
              onDetajl={setProjektDetajlOdprt}
              onPaket={izvoziPaketProjektov}
              pogled={pogledProjekti}
              onPogled={setPogledProjekti}
            />
          </section>
        )}

        {/* ── PONUDBE ── */}
        {zavihek === 'ponudbe' && (
          <section className="arh-panel">
            {!offers.length ? (
              <p className="arh-prazno">{L('Prva shranjena ponudba se bo prikazala tukaj.', 'Your first saved offer will appear here.')}</p>
            ) : !ponudbePrikaz.length ? (
              <p className="arh-prazno">{L('Ni ponudb za to iskanje ali filter.', 'No offers for this search or filter.')}</p>
            ) : (
              <div className="arh-tabela-ovoj">
                <div className="arh-tabela arh-tabela-ponudbe">
                  <header>{kljuk(null)}<span>{L('Ponudba', 'Offer')}: {ponudbePrikaz.length}</span><span>{L('Stranka', 'Client')}</span><span>{L('Datum', 'Date')}</span><span>{L('Status', 'Status')}</span><span>{L('Št.', 'No.')}</span><span className="arh-desno">{L('Znesek', 'Amount')}</span><span /></header>
                  {ponudbePrikaz.map(o => (
                    <button key={o.id} type="button" className="arh-vrstica" onClick={() => { setDetObsegOdprt(false); setDetajl({ vrsta: 'ponudba', zapis: o }); }}>
                      {kljuk(izKljuc('ponudba', o.id))}
                      <span className="arh-glavna"><i className="arh-rowdot" data-tone={tonZa(offerOpcije, statusVred('offer', o.id, o.status))} aria-hidden /><strong>{o.title}</strong></span>
                      <span className="arh-mut">{o.client}</span>
                      <span className="arh-mut">{datStr(o.date)}</span>
                      <span><StatusUredi tip="offer" id={o.id} vrednost={statusVred('offer', o.id, o.status)} opcije={offerOpcije} /></span>
                      <span className="arh-mut">{o.number || '—'}</span>
                      <span className="arh-desno">{dokZnesek(o.agreedAmount)}</span>
                      <span className="arh-kazalec" aria-hidden>›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── POGODBE ── */}
        {zavihek === 'pogodbe' && (
          <section className="arh-panel">
            {/* štetje statusov odstranjeno — status je že v dropdown filtru (zdaj v arh-glava) */}
            {!contracts.length ? (
              <p className="arh-prazno">{L('Prva shranjena pogodba se bo prikazala tukaj.', 'Your first saved contract will appear here.')}</p>
            ) : !pogodbePrikaz.length ? (
              <p className="arh-prazno">{L('Ni pogodb za to iskanje ali filter.', 'No contracts for this search or filter.')}</p>
            ) : (
              <div className="arh-tabela-ovoj">
                <div className="arh-tabela arh-tabela-pogodbe">
                  <header>{kljuk(null)}<span>{L('Pogodba', 'Contract')}: {pogodbePrikaz.length}</span><span>{L('Stranka', 'Client')}</span><span>{L('Datum', 'Date')}</span><span>{L('Status', 'Status')}</span><span>{L('Opomba', 'Note')}</span><span /></header>
                  {pogodbePrikaz.map(c => {
                    const op = opombaInfo(c.notes);
                    return (
                      <button key={c.id} type="button" className="arh-vrstica" onClick={() => { setDetObsegOdprt(false); setDetajl({ vrsta: 'pogodba', zapis: c }); }}>
                        {kljuk(izKljuc('pogodba', c.id))}
                        <span className="arh-glavna"><i className="arh-rowdot" data-tone={tonZa(contractOpcije, statusVred('contract', c.id, c.status))} aria-hidden /><strong>{c.title}</strong></span>
                        <span className="arh-mut">{c.client}</span>
                        <span className="arh-mut">{datStr(c.date)}</span>
                        <span><StatusUredi tip="contract" id={c.id} vrednost={statusVred('contract', c.id, c.status)} opcije={contractOpcije} /></span>
                        <span className="arh-op-cel">{op ? <small className={'arh-opomba' + (op.alert ? ' arh-opomba-alert' : '')}>{op.alert && <span className="arh-opomba-pika" aria-hidden />}{op.besedilo}</small> : '—'}</span>
                        <span className="arh-kazalec" aria-hidden>›</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── RACUNI ── */}
        {zavihek === 'racuni' && (
          <section className="arh-panel">
            {!invoices.length ? (
              <p className="arh-prazno">{L('Prvi shranjeni račun se bo prikazal tukaj.', 'Your first saved invoice will appear here.')}</p>
            ) : !racuniPrikaz.length ? (
              <p className="arh-prazno">{L('Ni računov za to iskanje ali filter.', 'No invoices for this search or filter.')}</p>
            ) : (
              <div className="arh-tabela-ovoj">
                <div className="arh-tabela arh-tabela-racuni">
                  <header>{kljuk(null)}<span>{L('Račun', 'Invoice')}: {racuniPrikaz.length}</span><span>{L('Št.', 'No.')}</span><span>{L('Stranka', 'Client')}</span><span>{L('Datum', 'Date')}</span><span>{L('Status', 'Status')}</span><span className="arh-desno">{L('Znesek', 'Amount')}</span><span /></header>
                  {racuniPrikaz.map(r => (
                    <button key={r.id} type="button" className="arh-vrstica" onClick={() => setDetajl({ vrsta: 'racun', zapis: r })}>
                      {kljuk(izKljuc('racun', r.id))}
                      <span className="arh-glavna"><i className="arh-rowdot" data-tone={tonZa(invoiceOpcije, statusVred('invoice', r.id, String(r.paid)))} aria-hidden /><strong>{r.title || `${r.predracun ? L('Predračun', 'Proforma') : L('Račun', 'Invoice')} ${r.number || ''}`}</strong>{r.predracun && <span className="arh-znacka arh-znacka-predracun">{L('Predračun', 'Proforma')}</span>}</span>
                      <span className="arh-mut">{r.number || '—'}</span>
                      <span className="arh-mut">{r.client}</span>
                      <span className="arh-mut">{datStr(r.date)}</span>
                      <span><StatusUredi tip="invoice" id={r.id} vrednost={statusVred('invoice', r.id, String(r.paid))} opcije={invoiceOpcije} /></span>
                      <span className="arh-desno">{eur(r.amount)}</span>
                      <span className="arh-kazalec" aria-hidden>›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <Toast sporocilo={postaObvestilo?.t || ''} ton={postaObvestilo?.ok ? 'uspeh' : 'napaka'} onClose={() => setPostaObvestilo(null)} />

      {/* ── DETAJL PANEL Z DESNE (vzorec ContractWorkspace: detailBackdrop + detailPanel + lepljivi X) ── */}
      {detajl && (
        <div className={styles.detailBackdrop + (izvazamPdf ? ' arh-zajem' : '')} role="presentation" onMouseDown={zapriDetajl}>
          <aside className={`${styles.detailPanel} arh-detajl`} role="dialog" aria-modal="true" aria-labelledby="arh-detajl-naslov" onMouseDown={e => e.stopPropagation()}>
            {/* lepljivi X ostane v kotu tudi med drsenjem (vzorec .pg-det-x) */}
            <button className="arh-det-x" onClick={zapriDetajl} aria-label={L('Zapri', 'Close')}>✕</button>

            {detajl.vrsta === 'ponudba' && (() => {
              const o = detajl.zapis;
              return <>
                <DetajlGlava
                  ikona={<FileText size={17} weight="regular" />}
                  naslov={`${L('Ponudba', 'Offer')}${o.number ? ' ' + o.number : ''}`}
                  podnaslov={`${o.client}${o.date ? ' · ' + datStr(o.date) : ''}`}
                  status={<StatusUredi tip="offer" id={o.id} vrednost={statusVred('offer', o.id, o.status)} opcije={offerOpcije} />}
                  izvozNaslov={`Ponudba ${o.number || o.title}`}
                  onExcel={() => izvoziCsv(`Ponudba ${o.number || o.title}`, [
                    ['Ponudba', o.number || ''], ['Naziv', o.title], ['Stranka', o.client], ['Datum', datStr(o.date)], [],
                    ['Obseg'], ...o.scope.map(s => [s]), [],
                    ['Dogovorjena vrednost', o.agreedAmount || ''],
                  ])}
                />

                {/* ponudba kot DOKUMENT (mini letterhead: kremni list, senca, Bodoni
                    naslov) — ce imamo shranjen pravi HTML iz kalkulatorja (ponudbaDok.telo),
                    ga izrisemo; sicer predogled sestavimo iz polj ponudbe (obseg + znesek) */}
                <div id="arh-izvoz" className="arh-ponudba-dok">
                  <div className="arh-ponudba-dok-glava">
                    <p className="arh-ponudba-dok-kick">{L('PONUDBA', 'OFFER')}{o.number ? ` · ${o.number}` : ''}</p>
                    <h3 className="arh-ponudba-dok-naslov">{o.title}</h3>
                    <div className="arh-ponudba-dok-meta">
                      <span><small>{L('Stranka', 'Client')}</small><strong>{o.client}</strong></span>
                      <span><small>{L('Datum', 'Date')}</small><strong>{datStr(o.date)}</strong></span>
                      {ponudbaDok.veljavnostDni && <span><small>{L('Veljavnost', 'Validity')}</small><strong>{ponudbaDok.veljavnostDni} {L('dni', 'days')}</strong></span>}
                    </div>
                  </div>

                  {ponudbaDok.telo ? (
                    <div className="arh-doktelo" dangerouslySetInnerHTML={{ __html: ponudbaDok.telo }} />
                  ) : (
                    <div className="arh-ponudba-dok-telo">
                      <div className="arh-ponudba-dok-obseg">
                        <span className="arh-filter-oznaka">{L('Obseg', 'Scope')}</span>
                        {o.scope.length
                          ? <ul>{o.scope.map((s, i) => <li key={`${s}-${i}`}>{s}</li>)}</ul>
                          : <p className="arh-mini">{L('Ponudba nima vpisanega obsega.', 'This offer has no scope entered.')}</p>}
                      </div>
                      <div className="arh-ponudba-dok-znesek">
                        <span>{L('Dogovorjena vrednost', 'Agreed value')}</span>
                        <strong>{dokZnesek(o.agreedAmount)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                <a className="arh-povezava arh-povezava-sekundarna" href={odpriKljuc ? `${base}/kalkulator/orodje?odpri=${encodeURIComponent(odpriKljuc)}` : `${base}/kalkulator/orodje`}>{odpriKljuc ? L('Odpri ponudbo', 'Open offer') : L('Odpri v kalkulatorju', 'Open in calculator')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></a>
              </>;
            })()}

            {detajl.vrsta === 'pogodba' && (() => {
              const c = detajl.zapis;
              const op = opombaInfo(c.notes);
              return <>
                <DetajlGlava
                  ikona={<Scroll size={17} weight="regular" />}
                  naslov={L('Pogodba', 'Contract')}
                  podnaslov={`${c.client}${c.date ? ' · ' + datStr(c.date) : ''}`}
                  status={<StatusUredi tip="contract" id={c.id} vrednost={statusVred('contract', c.id, c.status)} opcije={contractOpcije} />}
                  izvozNaslov={`Pogodba — ${c.title}`}
                  onExcel={() => izvoziCsv(`Pogodba ${c.title}`, [
                    ['Pogodba', c.title], ['Stranka', c.client], ['Datum', datStr(c.date)], ['Status', c.status], [],
                    ['Besedilo'], [(c.body || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()],
                  ])}
                />
                {/* povezana ponudba (ce obstaja) — klik razpre povzetek obsega */}
                {(() => {
                  const offer = offers.find(x => x.id === c.sourceOfferId);
                  if (!offer) return null;
                  return <div className="arh-det-ponudba">
                    <button type="button" className="arh-det-ponudba-vrstica" aria-expanded={detObsegOdprt} onClick={() => setDetObsegOdprt(v => !v)}>
                      <span className="arh-det-ponudba-ime">{L('Ponudba', 'Offer')} {offer.number || offer.title}</span>
                      <span className="arh-det-ponudba-kazalec" aria-hidden>{detObsegOdprt ? <CaretUp size={13} weight="bold" /> : <CaretDown size={13} weight="bold" />}</span>
                    </button>
                    {detObsegOdprt && <div className="arh-det-ponudba-vec">
                      <p className="arh-det-ponudba-naslov"><b>{offer.title}</b>{offer.agreedAmount > 0 ? ' · ' + eur(offer.agreedAmount) : ''}</p>
                      {offer.scope.length ? <ul>{offer.scope.map((s, i) => <li key={`${s}-${i}`}>{s}</li>)}</ul> : <p className="arh-mini">{L('Ponudba nima vpisanega obsega.', 'This offer has no scope entered.')}</p>}
                    </div>}
                  </div>;
                })()}
                {/* telo pogodbe: novi HTML zapisi -> izris kot dokument; stari golo besedilo -> pre-wrap */}
                {c.body && (jeHtmlTelo(c.body)
                  ? <div id="arh-izvoz" className="arh-doktelo" dangerouslySetInnerHTML={{ __html: c.body }} />
                  : <pre id="arh-izvoz" className="arh-doktelo-pre">{c.body}</pre>)}
                {!c.body && c.fileName && <p className="arh-mini">{L(`Priložen dokument: ${c.fileName}. Odpri ga v razdelku Pogodbe.`, `Attached document: ${c.fileName}. Open it in the Contracts section.`)}</p>}
                {op && (op.alert
                  ? <div className="arh-opomba-kartica" role="alert"><Warning size={20} weight="bold" aria-hidden /><div><strong>{L('Opozorilo', 'Warning')}</strong><p>{op.besedilo}</p></div></div>
                  : <div className="arh-opomba-blok"><strong>{L('Opomba', 'Note')}</strong><p>{op.besedilo}</p></div>)}
                <div className="arh-akcije">
                  <button type="button" className="arh-poslji" onClick={() => posljiStranki(c.sourceOfferId, c.client, L(`Pogodba — ${c.title}`, `Contract — ${c.title}`), L(`Pozdravljeni,\n\nv prilogi vam pošiljam pogodbo »${c.title}«. Prosim za pregled in podpis.\n\nLep pozdrav`, `Hello,\n\nplease find attached the contract "${c.title}". Kindly review and sign it.\n\nBest regards`))}>{L('Pošlji stranki', 'Send to client')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></button>
                  <a className="arh-povezava arh-povezava-sekundarna" href={`${base}/kalkulator/pogodbe`}>{L('Uredi v Pogodbah', 'Edit in Contracts')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></a>
                </div>
                <p className="arh-mini">{L('Do postavitve pošiljanja s priponko pripni PDF ročno (Prenesi → priloži).', 'Until attachment sending is set up, attach the PDF manually (Download → attach).')}</p>
              </>;
            })()}

            {detajl.vrsta === 'racun' && (() => {
              const r = detajl.zapis;
              return <>
                {(() => {
                  const items = r.items || [];
                  const imaPopust = items.some(i => (i.popust || 0) > 0);
                  const imaDdv = items.some(i => (i.ddv || 0) > 0);
                  return <>
                    <DetajlGlava
                      ikona={<Receipt size={17} weight="regular" />}
                      naslov={`${r.predracun ? L('Predračun', 'Proforma') : L('Račun', 'Invoice')}${r.number ? ' ' + r.number : ''}`}
                      podnaslov={`${r.client}${r.date ? ' · ' + datStr(r.date) : ''}`}
                      status={<StatusUredi tip="invoice" id={r.id} vrednost={statusVred('invoice', r.id, String(r.paid))} opcije={invoiceOpcije} />}
                      izvozNaslov={`${r.predracun ? 'Predracun' : 'Racun'} ${r.number || ''}`.trim()}
                      onExcel={() => izvoziCsv(`${r.predracun ? 'Predracun' : 'Racun'} ${r.number || ''}`, [
                        [r.predracun ? 'Predračun' : 'Račun', r.number || ''],
                        ['Stranka', r.client], ['Datum', datStr(r.date)], ['Status', r.paid ? 'Plačan' : 'Odprt'], [],
                        ['Opis', 'Količina', 'Cena', 'Popust %', 'DDV %', 'Skupaj'],
                        ...items.map(it => [it.opis, it.kolicina, it.cena, it.popust || 0, it.ddv || 0, Math.round(it.kolicina * it.cena * (1 - (it.popust || 0) / 100) * 100) / 100]),
                        [],
                        ...(typeof r.net === 'number' ? [['Neto', r.net]] : []),
                        ...(typeof r.vatAmount === 'number' && r.vatAmount > 0 ? [['DDV', r.vatAmount]] : []),
                        ['Za plačilo', r.amount],
                      ])}
                    />

                    {/* cel racun/predracun v panelu (kot pogodba/ponudba): letterhead + postavke + vsote */}
                    <div id="arh-izvoz" className="arh-ponudba-dok">
                      <div className="arh-ponudba-dok-glava">
                        <p className="arh-ponudba-dok-kick">{r.predracun ? L('PREDRAČUN', 'PROFORMA') : L('RAČUN', 'INVOICE')}{r.number ? ` · ${r.number}` : ''}</p>
                        <h3 className="arh-ponudba-dok-naslov">{r.title || (r.predracun ? L('Predračun', 'Proforma') : L('Račun', 'Invoice'))}</h3>
                        <div className="arh-ponudba-dok-meta">
                          <span><small>{L('Stranka', 'Client')}</small><strong>{r.client}</strong></span>
                          <span><small>{L('Datum', 'Date')}</small><strong>{datStr(r.date)}</strong></span>
                          {r.serviceDate && <span><small>{L('Opravljeno', 'Service date')}</small><strong>{datStr(r.serviceDate)}</strong></span>}
                          {typeof r.dueDays === 'number' && <span><small>{L('Rok plačila', 'Payment due')}</small><strong>{r.dueDays} {L('dni', 'days')}</strong></span>}
                        </div>
                      </div>

                      {items.length ? (
                        <div className="arh-racun-telo" style={{ paddingBottom: '40px' }}>
                          <div className="arh-racun-tabela-ovoj">
                            <table className="arh-racun-tabela">
                              <thead><tr><th>{L('Opis', 'Description')}</th><th>{L('Kol.', 'Qty')}</th><th>{L('Cena', 'Price')}</th>{imaPopust && <th>{L('Popust', 'Discount')}</th>}{imaDdv && <th>{L('DDV', 'VAT')}</th>}<th>{L('Skupaj', 'Total')}</th></tr></thead>
                              <tbody>
                                {items.map((it, i) => <tr key={`${it.opis}-${i}`}>
                                  <td>{it.opis}</td>
                                  <td>{it.kolicina}</td>
                                  <td>{eur(it.cena)}</td>
                                  {imaPopust && <td>{it.popust ? `${it.popust}%` : '—'}</td>}
                                  {imaDdv && <td>{it.ddv ? `${it.ddv}%` : '—'}</td>}
                                  <td>{eur(it.kolicina * it.cena * (1 - (it.popust || 0) / 100))}</td>
                                </tr>)}
                              </tbody>
                            </table>
                          </div>
                          <div className="arh-racun-vsote">
                            {typeof r.net === 'number' && <div><span>{L('Neto', 'Net')}</span><strong>{eur(r.net)}</strong></div>}
                            {typeof r.vatAmount === 'number' && r.vatAmount > 0 && <div><span>{L('DDV', 'VAT')}</span><strong>{eur(r.vatAmount)}</strong></div>}
                            <div className="arh-racun-skupaj"><span>{L('Za plačilo', 'Amount due')}</span><strong>{eur(r.amount)}</strong></div>
                          </div>
                          {r.vatPayer === false && <p className="arh-mini">{L('Nisem zavezanec za DDV — DDV ni obračunan.', 'Not registered for VAT — VAT is not charged.')}</p>}
                        </div>
                      ) : (
                        <div className="arh-ponudba-dok-telo">
                          <div className="arh-ponudba-dok-znesek"><span>{L('Za plačilo', 'Amount due')}</span><strong>{eur(r.amount)}</strong></div>
                        </div>
                      )}
                    </div>

                    <div className="arh-akcije">
                      <button type="button" className="arh-poslji" onClick={() => posljiStranki(r.sourceOfferId, r.client, L(`Račun ${r.number || ''}`.trim(), `Invoice ${r.number || ''}`.trim()), L(`Pozdravljeni,\n\nv prilogi vam pošiljam račun ${r.number || ''} v znesku ${eur(r.amount)}${typeof r.dueDays === 'number' ? `, z rokom plačila ${r.dueDays} dni` : ''}.\n\nLep pozdrav`, `Hello,\n\nplease find attached invoice ${r.number || ''} for ${eur(r.amount)}${typeof r.dueDays === 'number' ? `, due in ${r.dueDays} days` : ''}.\n\nBest regards`))}>{L('Pošlji stranki', 'Send to client')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></button>
                      <a className="arh-povezava arh-povezava-sekundarna" href={`${base}/kalkulator/racuni`}>{L('Uredi v Računih', 'Edit in Invoices')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></a>
                    </div>
                    <p className="arh-mini">{L('Do postavitve pošiljanja s priponko pripni PDF ročno (Prenesi → priloži).', 'Until attachment sending is set up, attach the PDF manually (Download → attach).')}</p>
                  </>;
                })()}
              </>;
            })()}
          </aside>
        </div>
      )}

      {/* stili — prefiks arh-, prenos okvira iz rw- (RetainerWorkspace). Navaden
          <style> (globalno), ker so razredi prefiksirani in ne trcijo. */}
      <style>{`
        .arh{position:relative;min-height:100dvh;color:var(--ink);font-weight:400;overflow-x:clip}

        /* ozadje: papir + gradientna mreza + mehki blobi (kopija .rw-ozadje) */
        .arh-ozadje{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background-color:transparent}
        .arh-ozadje .arh-blob{position:absolute;width:min(60vw,760px);aspect-ratio:1;border-radius:50%;filter:blur(70px)}
        .arh-blob-roza{top:-16vh;left:-12vw;background:radial-gradient(circle, oklch(74% .18 300 / .55), transparent 68%);opacity:.12;animation:arhRoza 22s ease-in-out infinite}
        .arh-blob-modra{bottom:-22vh;right:-14vw;background:radial-gradient(circle, oklch(82% .15 162 / .55), transparent 68%);opacity:.1;animation:arhModra 25s ease-in-out infinite}
        @keyframes arhRoza{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(32vw,24vh) scale(1.15)}50%{transform:translate(16vw,46vh) scale(.92)}75%{transform:translate(38vw,12vh) scale(1.08)}}
        @keyframes arhModra{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-28vw,-22vh) scale(1.12)}50%{transform:translate(-44vw,-10vh) scale(.9)}75%{transform:translate(-16vw,-32vh) scale(1.06)}}
        @media (prefers-reduced-motion:reduce){.arh-blob{animation:none}}

        /* sredinski stolpec — sirsi od retainerja (1000px), ker imamo tabele */
        /* Arhiv je PREGLEDNA (admin) stran → polna širina kot nadzorna plošča/stranke,
           NE ozek stolpec (ta velja samo za vprašalnike/urejanje dokumentov). */
        .arh-vsebina{position:relative;z-index:1;width:100%;max-width:100%;margin:0;padding:0 0 6rem;min-width:0}
        .arh-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0 0 .3rem}
        .arh-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(1.7rem,3.4vw,2.4rem);line-height:1;letter-spacing:-.012em;margin:0 0 .6rem;color:var(--ink)}
        .arh-uvod{font-size:1rem;line-height:1.55;color:rgba(17,17,17,.72);margin:0 0 2rem;max-width:38rem}
        /* mobile: naslov+podnaslov + orodna vrstica (zavihki/gumbi) zamaknjeni na 1.41rem; tabela/seznam ostane širok */
        @media (max-width:640px){.arh-kicker,.arh-h1,.arh-uvod,.arh-glava{padding-left:1.06rem;padding-right:1.06rem;box-sizing:border-box}}

        /* glava: zavihki (levo) + ArhivFilter aktivnega zavihka (desno) v ENI vrsti
           na namizju; flex-wrap na ozkem/mobilnem prelomi ArhivFilter pod zavihke
           (locene vrstice), ker za skupno vrstico zmanjka prostora */
        .arh-glava{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem .9rem;margin-bottom:1.1rem}
        .arh-glava-filter{flex:1 1 22rem;min-width:0}

        /* zavihki + segpills (kopija .rw-segpills) */
        /* ista visina kot iskalnik/pilule v ArhivFilter (2.75rem), da je vrstica poenotena */
        .arh-segpills{display:inline-flex;align-items:center;height:2.75rem;box-sizing:border-box;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.25rem;gap:.15rem;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
        .arh-segpills button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .9rem;border-radius:999px;cursor:pointer;white-space:nowrap;transition:background .18s,color .18s}
        .arh-segpills button.on{background:var(--ink);color:var(--paper)}
        .arh-zavihki{flex:0 0 auto}
        .arh-pogled-preklop{flex:0 0 auto}
        .arh-pp-ik{display:none}
        .arh-akcija-mob{display:none}
        .arh-zav-mob{display:none}
        @media (max-width:640px){
          /* VSE v eni vrsti (kompaktno): Projekti · iskalnik · filter · pogled · +.
             arh-glava = pozicijsko sidrisce za iskalni overlay (.af-iskanje inset:0 -> cela vrstica). */
          .arh-glava{gap:.3rem;flex-wrap:nowrap;align-items:center;position:relative}
          .arh-glava .mobtabs{order:0;flex:none}
          .arh-glava .mobtabs-gumb{min-height:2.5rem;padding:0 .6rem;font-size:.74rem;gap:.2rem}
          .arh-glava-filter{order:1;flex:0 1 auto;min-width:0;position:static}
          .arh-pogled-preklop{order:2}
          .arh-akcija-mob{order:3;display:inline-flex;margin-left:auto}
          .af-mob-akcija{display:none}
          .arh-pogled-preklop{padding:.15rem}
          .arh-pogled-preklop button{padding:.4rem .5rem}
          .arh-pp-ik{display:inline-flex}
          .arh-pp-txt{display:none}
          /* Tabela = kartični preliv (brez horizontalnega scrolla): naziv v svojo vrsto, meta se ovije */
          .arh-tabela-ovoj{overflow-x:hidden}
          .arh-tabela{min-width:0}
          .arh-tabela > header{display:none}
          .arh-vrstica{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .7rem;padding:.8rem .85rem}
          .arh-vrstica > *{min-width:0;font-size:.76rem;color:rgba(17,17,17,.6)}
          .arh-vrstica > .arh-chk-cel{order:-1}
          .arh-vrstica > .arh-glavna{flex:1 1 100%;font-size:.92rem;color:var(--ink)}
          .arh-vrstica > .arh-glavna strong{font-size:.92rem}
        }

        .arh-panel{animation:arhSek .45s cubic-bezier(.16,1,.3,1) both;min-width:0}
        @keyframes arhSek{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion:reduce){.arh-panel{animation:none}}
        /* projekti: obstojeci ProjectsWorkspace ima svoj razmik — le malo zraka nad njim */
        .arh-projekti{margin-top:.4rem}

        /* oznaka skupine — se uporablja v detajl panelu (Obseg); filtri jih ne kazejo vec */
        .arh-filter-oznaka{font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(17,17,17,.55)}

        /* povzetek Pogodbe: kratek stevec po statusu (pilule) */
        .arh-pog-povzetek{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1rem}
        .arh-pog-pil{display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .85rem;border:1px solid oklch(93% .006 82 / .55);border-radius:999px;background:rgba(255,255,255,.55);font-size:.78rem;color:rgba(17,17,17,.72)}
        .arh-pog-pil b{font:700 .92rem var(--font-sans),sans-serif;color:var(--ink)}

        /* prazni seznam / prazen filter */
        .arh-prazno{margin:1.4rem 0;padding:1.4rem;border:1px dashed rgba(17,17,17,.18);border-radius:14px;background:rgba(255,255,255,.4);color:rgba(17,17,17,.7);font-size:.94rem;text-align:center}

        /* tabela: vodoravni drs znotraj svojega okvirja (mobilno ne pobegne cez rob) */
        .arh-tabela-ovoj{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:14px}
        .arh-tabela{min-width:640px;display:grid;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:14px;overflow:hidden}
        .arh-tabela-ponudbe{grid-template-columns:1.7rem minmax(0,2.2fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,.8fr) minmax(0,1fr) 1.6rem}
        .arh-tabela-pogodbe{grid-template-columns:1.7rem minmax(0,2fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.6fr) 1.6rem}
        .arh-tabela-racuni{grid-template-columns:1.7rem minmax(0,1.9fr) minmax(0,1fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,1fr) 1.6rem}
        .arh-chk-cel{display:flex;align-items:center;justify-content:center}
        .arh-chk{width:1.05rem;height:1.05rem;border-radius:.34rem;border:1.5px solid oklch(78% .02 80);background:#fff;cursor:pointer;flex:none;display:grid;place-items:center;transition:background .12s,border-color .12s}
        .arh-chk::after{content:"";width:.5rem;height:.28rem;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg) translate(0,-1px);opacity:0;transition:opacity .12s}
        .arh-chk.on{background:oklch(52% .13 300);border-color:oklch(52% .13 300)}
        .arh-chk.on::after{opacity:1}
        .arh-izbor-letev{position:fixed;left:50%;bottom:1.4rem;transform:translateX(-50%);z-index:1200;width:max-content;max-width:calc(100vw - 2rem);display:flex;align-items:center;gap:.9rem;padding:.6rem .7rem .6rem 1.1rem;border-radius:999px;background:oklch(28% .02 300);color:#fff;box-shadow:0 .8rem 2.4rem oklch(22% .04 300 / .32);animation:arhLetevIn .3s cubic-bezier(.16,1,.3,1) both}
        @keyframes arhLetevIn{from{opacity:0;transform:translate(-50%,1rem)}to{opacity:1;transform:translate(-50%,0)}}
        .arh-izbor-st{font-size:.8rem;font-weight:700;white-space:nowrap}
        .arh-izbor-gumb{border:0;border-radius:999px;padding:.45rem .95rem;background:#fff;color:oklch(30% .03 300);font:700 .78rem var(--font-sans),system-ui,sans-serif;cursor:pointer;white-space:nowrap}
        .arh-izbor-gumb:hover:not(:disabled){background:oklch(96% .02 300)}
        .arh-izbor-gumb2{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px oklch(100% 0 0 / .38)}
        .arh-izbor-gumb2:hover:not(:disabled){background:oklch(100% 0 0 / .12)}
        .arh-izbor-gumb:disabled,.arh-izbor-prekl:disabled{opacity:.6;cursor:default}
        /* med PDF zajemom detajl premaknemo izven zaslona (v DOM ostane za html2canvas) — brez utripanja */
        .arh-zajem{position:fixed!important;left:-250vw!important;top:0!important;right:auto!important;bottom:auto!important;width:auto!important;height:auto!important;padding:0!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;animation:none!important;transition:none!important;z-index:-1!important;pointer-events:none!important;overflow:visible!important}
        .arh-zajem .arh-detajl{animation:none!important;transition:none!important;transform:none!important;box-shadow:none!important;max-height:none!important;height:auto!important;overflow:visible!important}
        .arh-izbor-prekl{border:0;background:transparent;color:oklch(88% .02 300);font:600 .76rem var(--font-sans),system-ui,sans-serif;cursor:pointer;padding:.45rem .5rem}
        .arh-izbor-prekl:hover{color:#fff}
        /* gap tudi na header (prej ga ni imel -> "ZNESEKDATUM" se je dotikal) + vecji razmik */
        /* naslovna vrstica tabele (oznaka + stevec) = DEL tabele, vijola podlaga */
        .arh-tabela-naslov{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.95rem 1rem .85rem;background:oklch(95% .035 300);border-bottom:1px solid rgba(17,17,17,.08)}
        .arh-tabela-oznaka{font-size:.66rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:oklch(45% .12 300)}
        .arh-tabela-naslov strong{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:1.6rem;line-height:1;color:var(--ink)}
        .arh-tabela > header{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;gap:1.1rem;padding:.7rem .9rem;font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(17,17,17,.5);border-bottom:1px solid rgba(17,17,17,.1)}
        .arh-vrstica{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;gap:1.1rem;padding:.85rem .9rem;border:none;border-bottom:1px solid rgba(17,17,17,.07);background:transparent;font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:background .14s}
        .arh-vrstica:last-child{border-bottom:none}
        .arh-vrstica:hover{background:oklch(100% 0 0 / .5)}
        .arh-vrstica > span{min-width:0;font-size:.86rem;overflow-wrap:anywhere}
        /* status pilula — ISTE barve kot nadzorna plosca (.statusPill + status_*) */
        .arh-status{display:inline-flex;align-items:center;gap:.6rem;width:max-content;max-width:100%;padding:.4rem .85rem;border:1px solid color-mix(in oklch, var(--pill-ink, oklch(48% .015 70)) 14%, transparent);border-radius:999px;background:var(--pill-bg, oklch(95.5% .008 87));color:var(--pill-ink, oklch(48% .015 70));font-size:.78rem;font-weight:700;white-space:nowrap}
        .arh-status::before{content:'';width:.52rem;height:.52rem;border-radius:50%;background:var(--pika,oklch(62% .02 70));flex:none}
        .arh-status[data-tone='waiting']{--pika:oklch(72% .16 75);--pill-bg:oklch(96.5% .03 82);--pill-ink:oklch(54% .09 68)}
        .arh-status[data-tone='success']{--pika:oklch(62% .15 150);--pill-bg:oklch(96% .035 158);--pill-ink:oklch(50% .085 158)}
        .arh-status[data-tone='danger']{--pika:oklch(58% .19 25);--pill-bg:oklch(96.5% .03 28);--pill-ink:oklch(55% .11 27)}
        .arh-status[data-tone='neutral']{--pika:oklch(62% .02 70);--pill-bg:oklch(95.5% .008 87);--pill-ink:oklch(48% .015 70)}
        /* urejanje statusa: klik na pilulo -> prekriven select (samo »Moji podatki«) */
        .arh-status-ured{position:relative;display:inline-flex;max-width:100%}
        .arh-status-ured[data-editable] .arh-status{padding-right:1.5rem;cursor:pointer}
        .arh-status-ured[data-editable]::after{content:'';position:absolute;right:.66rem;top:50%;width:.32rem;height:.32rem;border-right:1.4px solid oklch(40% .02 70);border-bottom:1.4px solid oklch(40% .02 70);transform:translate(0,-60%) rotate(45deg);opacity:.55;pointer-events:none}
        .arh-status-select{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;opacity:0;border:0;border-radius:999px;background:transparent;appearance:none;-webkit-appearance:none;cursor:pointer;font:inherit}
        .arh-status-select:disabled{cursor:default}
        .arh-glavna{display:flex;align-items:center;gap:.6rem;min-width:0}
        .arh-glavna strong{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis}
        .arh-ikona{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:oklch(94% .025 87);color:var(--accent);flex:none}
        /* vodilna status-pika v vrstici (nadomesti ponavljajoco ikono); pilulina pika v vrstici skrita, da ni dvojne */
        .arh-rowdot{width:.62rem;height:.62rem;border-radius:50%;flex:none;background:oklch(62% .02 70)}
        .arh-rowdot[data-tone='waiting']{background:oklch(72% .16 75)}
        .arh-rowdot[data-tone='success']{background:oklch(62% .15 150)}
        .arh-rowdot[data-tone='danger']{background:oklch(58% .19 25)}
        .arh-rowdot[data-tone='neutral']{background:oklch(62% .02 70)}
        .arh-vrstica .arh-status::before{display:none}
        .arh-mut{color:rgba(17,17,17,.62)}
        .arh-desno{text-align:right;font-weight:700}
        .arh-kazalec{color:rgba(17,17,17,.4);font-size:1.1rem;text-align:center}
        .arh-op-cel small{display:inline-flex;align-items:center;gap:.35rem}
        .arh-opomba{font-size:.78rem;color:rgba(17,17,17,.6);line-height:1.35}
        .arh-opomba-alert{color:#B0243B;font-weight:600}
        .arh-opomba-pika{width:.5rem;height:.5rem;border-radius:50%;background:#B0243B;flex:none}
        .arh-znacka{display:inline-block;padding:.2rem .6rem;border-radius:999px;font-size:.72rem;font-weight:700;flex:none}
        .arh-znacka-placano{background:oklch(88% .09 162);color:oklch(38% .09 162)}
        .arh-znacka-odprto{background:oklch(92% .05 65);color:oklch(45% .1 65)}
        /* predracun = poziv k placilu vnaprej, NI knjigovodska listina — loci se od pravega racuna v seznamu */
        .arh-znacka-predracun{background:oklch(92% .05 300);color:oklch(42% .13 300)}

        /* ── detajl panel (vzorec ContractWorkspace) ── */
        .arh-detajl{width:min(42rem,94vw);display:flex;flex-direction:column;gap:.2rem;padding-bottom:6rem}
        .arh-detajl h2{margin:.4rem 0 .5rem;font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(1.8rem,3vw,2.6rem);line-height:1.05;color:var(--ink)}
        .arh-det-statusvrsta{margin:0 0 1.1rem}
        /* lepljivi X ostane v kotu med drsenjem (kopija .pg-det-x) */
        /* × FIKSEN v desnem kotu panela, POD topbarom (fixed z-100) in NAD njim po z-indexu — vedno viden, ne odscrolla (panel je overflow-y:auto, absoluten × bi odscrollal) */
        .arh-det-x{position:fixed;top:3.85rem;right:1.4rem;z-index:101;display:grid;place-items:center;width:2.2rem;height:2.2rem;padding:0;border:1px solid rgba(17,17,17,.18);border-radius:50%;background:var(--paper);color:var(--ink);font-size:1rem;line-height:1;cursor:pointer;box-shadow:0 4px 14px rgba(17,17,17,.12)}
        .arh-det-x:hover{background:var(--ink);color:var(--paper)}
        .arh-det-meta{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;min-width:0;margin-bottom:.6rem}
        .arh-det-meta span{display:grid;gap:.25rem;padding:.7rem;border-radius:.7rem;background:oklch(94% .025 87);min-width:0}
        .arh-det-meta small{color:rgba(17,17,17,.55);font-size:.72rem}
        .arh-det-meta strong{font-size:.88rem;line-height:1.35;overflow-wrap:anywhere}
        .arh-det-obseg{margin:.4rem 0 .8rem;display:grid;gap:.4rem}
        .arh-det-obseg ul{margin:0;padding-left:1.15rem}
        .arh-det-obseg li{margin:.2rem 0;font-size:.9rem}
        .arh-mini{color:rgba(17,17,17,.6);font-size:.85rem;line-height:1.5;margin:.2rem 0 1.1rem}
        .arh-povezava{display:inline-flex;align-items:center;gap:.35rem;margin-top:.9rem;font-size:.88rem;font-weight:600;color:var(--ink);text-decoration:underline;text-underline-offset:.28em;text-decoration-thickness:1px}
        /* sekundarna razlicica (ponudba kot dokument zdaj nosi glavno pozornost,
           povezava v kalkulator je samo se pot do urejanja) */
        .arh-povezava-sekundarna{font-size:.8rem;font-weight:500;color:rgba(17,17,17,.62)}
        /* akcije ob pregledu (pošlji stranki + uredi) */
        .arh-akcije{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1.1rem;margin-top:2rem}
        .puscica-svg{vertical-align:-2px;flex:none}
        .arh-poslji{display:inline-flex;align-items:center;gap:.4rem;white-space:nowrap;padding:.6rem 1.05rem;border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--paper);font:700 .78rem var(--font-sans),sans-serif;cursor:pointer}
        .arh-poslji:hover{background:transparent;color:var(--ink)}
        .arh-akcije .arh-povezava{margin-top:0}

        /* ── račun kot DOKUMENT v panelu (postavke + vsote), znotraj arh-ponudba-dok letterheada ── */
        .arh-racun-telo{padding:.2rem .1rem .1rem}
        .arh-racun-tabela-ovoj{overflow-x:auto}
        .arh-racun-tabela{width:100%;border-collapse:collapse;font-size:.82rem}
        .arh-racun-tabela th{padding:.4rem .5rem;text-align:right;font-size:.62rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgba(17,17,17,.5);border-bottom:1px solid oklch(93% .006 82 / .55);white-space:nowrap}
        .arh-racun-tabela th:first-child{text-align:left}
        .arh-racun-tabela td{padding:.5rem .5rem;text-align:right;border-bottom:1px solid rgba(17,17,17,.07);font-variant-numeric:tabular-nums;white-space:nowrap}
        .arh-racun-tabela td:first-child{text-align:left;white-space:normal;font-weight:600}
        .arh-racun-vsote{margin-top:.7rem;padding-right:.5rem;display:grid;gap:.25rem;justify-items:end}
        .arh-racun-vsote > div{display:flex;gap:1.2rem;align-items:baseline;font-size:.82rem;color:rgba(17,17,17,.62)}
        .arh-racun-vsote > div strong{min-width:5rem;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink)}
        .arh-racun-skupaj{margin-top:.25rem;padding-top:.45rem;border-top:1px solid oklch(93% .006 82 / .55)}
        .arh-racun-skupaj span{font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgba(17,17,17,.6)}
        .arh-racun-skupaj strong{font:700 1.3rem var(--font-sans),system-ui,sans-serif;letter-spacing:-.01em}

        /* ── ponudba kot DOKUMENT (NALOGA #44): kremni list + senca + Bodoni naslov,
           mini letterhead videz namesto golih kartic ── */
        .arh-ponudba-dok{margin-top:.9rem;border:1px solid oklch(93% .006 82 / .55);border-radius:10px;background:#fff;box-shadow:0 10px 28px rgba(17,17,17,.08);overflow:hidden}
        .arh-ponudba-dok-glava{padding:1.5rem 1.6rem 1.2rem;border-bottom:1px solid rgba(17,17,17,.1);background:linear-gradient(180deg, oklch(98% .01 87), #fff)}
        .arh-ponudba-dok-kick{margin:0 0 .5rem;font-size:.66rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--accent,#B25476)}
        .arh-ponudba-dok-naslov{margin:0 0 1rem;font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(1.3rem,2.6vw,1.7rem);line-height:1.1;color:var(--ink)}
        .arh-ponudba-dok-meta{display:flex;flex-wrap:wrap;gap:1.4rem}
        .arh-ponudba-dok-meta span{display:grid;gap:.15rem;min-width:0}
        .arh-ponudba-dok-meta small{font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(17,17,17,.5)}
        .arh-ponudba-dok-meta strong{font-size:.86rem;overflow-wrap:anywhere}
        .arh-ponudba-dok-telo{padding:1.4rem 1.6rem 40px}
        .arh-ponudba-dok-obseg{margin-bottom:1.1rem}
        .arh-ponudba-dok-obseg ul{margin:.4rem 0 0;padding-left:1.15rem}
        .arh-ponudba-dok-obseg li{margin:.25rem 0;font-size:.9rem;line-height:1.5}
        .arh-ponudba-dok-znesek{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding-top:1rem;border-top:1px dashed rgba(17,17,17,.16)}
        .arh-ponudba-dok-znesek span{font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(17,17,17,.55)}
        .arh-ponudba-dok-znesek strong{font-family:var(--font-sans),system-ui,sans-serif;font-weight:700;font-size:1.4rem;letter-spacing:-.01em;color:var(--ink)}
        /* injecirani HTML dokument (arh-doktelo) znotraj arh-ponudba-dok: odstrani
           lasten okvir/senco/rob (parent jih ze da), obdrzi samo tipografijo */
        .arh-ponudba-dok .arh-doktelo{margin-top:0;border:none;border-radius:0;background:transparent;padding:1.4rem 1.6rem 40px}
        .arh-det-ponudba{margin:.2rem 0 .6rem;border:1px solid oklch(93% .006 82 / .55);border-radius:.7rem;background:rgba(255,255,255,.72);overflow:hidden;min-width:0}
        .arh-det-ponudba-vrstica{display:flex;align-items:center;gap:.7rem;width:100%;padding:.65rem .8rem;border:none;background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer;min-width:0}
        .arh-det-ponudba-ime{flex:1;min-width:0;font-size:.88rem;font-weight:700;overflow-wrap:anywhere}
        .arh-det-ponudba-vrstica:hover .arh-det-ponudba-ime{text-decoration:underline;text-underline-offset:.2rem}
        .arh-det-ponudba-kazalec{display:grid;place-items:center;width:1.6rem;height:1.6rem;border-radius:50%;background:rgba(17,17,17,.06);color:var(--ink);flex:none}
        .arh-det-ponudba-vec{padding:.15rem .8rem .9rem}
        .arh-det-ponudba-vec ul{margin:.3rem 0 0;padding-left:1.15rem}
        .arh-det-ponudba-vec li{margin:.15rem 0;font-size:.85rem}
        .arh-det-ponudba-naslov{margin:.5rem 0 .2rem;font-size:.85rem}

        /* telo pogodbe (kopija .pg-doktelo) */
        .arh-doktelo{width:100%;min-width:0;margin-top:1rem;border:1px solid oklch(93% .006 82 / .55);background:#fff;padding:1.35rem;color:var(--ink);font-family:var(--font-sans),system-ui,sans-serif;font-size:.9rem;line-height:1.62;overflow:visible;flex:none;border-radius:8px}
        .arh-doktelo h1{margin:0 0 .6rem;font-family:var(--font-serif),Didot,serif;font-size:clamp(1.4rem,3.4vw,1.9rem);line-height:1.05;font-weight:500}
        .arh-doktelo h2{margin:1.2rem 0 .4rem;font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent,#B25476)}
        .arh-doktelo p{margin:0 0 .7rem;max-width:70ch}
        .arh-doktelo b,.arh-doktelo strong{font-weight:800}
        .arh-doktelo ul{margin:.2rem 0 .9rem;padding-left:1.2rem;list-style:disc}
        .arh-doktelo li{margin:.2rem 0}
        .arh-doktelo .kick{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#B25476);font-weight:700;margin-bottom:.3rem}
        .arh-doktelo .meta{color:#666;font-size:.85rem;margin:.1rem 0 .6rem}
        .arh-doktelo .mut{color:#8a8177;font-size:.82rem}
        .arh-doktelo .pog-clen{margin:.7rem 0}
        .arh-doktelo .pog-clen h2{margin:.6rem 0 .2rem}
        .arh-doktelo .parties p{margin:.1rem 0}
        .arh-doktelo .sig{display:flex;gap:2.5rem;margin-top:1.4rem}
        .arh-doktelo .sig>div{flex:1;font-size:.85rem;color:#444}
        .arh-doktelo .sig .lin{display:block;border-top:1px solid #111;margin:2rem 0 .3rem}
        .arh-doktelo .podpis-img{display:block;max-height:52px;max-width:200px;margin:0 0 -8px}
        .arh-doktelo-pre{width:100%;min-width:0;margin-top:1rem;padding:1.2rem;border:1px solid oklch(93% .006 82 / .55);border-radius:8px;background:#fff;white-space:pre-wrap;font:500 .82rem/1.6 var(--font-sans),system-ui,sans-serif;overflow:auto}

        /* opomba v detajlu */
        .arh-opomba-kartica{display:flex;gap:.7rem;align-items:flex-start;margin-top:1rem;padding:.9rem 1rem;border-radius:.75rem;background:oklch(92% .06 25);color:#8a1a2c}
        .arh-opomba-kartica strong{display:block;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase}
        .arh-opomba-kartica p{margin:.3rem 0 0;font-size:.85rem;line-height:1.5;color:#7a1727}
        .arh-opomba-blok{margin-top:1rem;padding:.9rem;border-radius:.75rem;background:oklch(95% .04 65)}
        .arh-opomba-blok strong{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(17,17,17,.6)}
        .arh-opomba-blok p{margin:.35rem 0 0;font-size:.85rem;line-height:1.5}

        @media (max-width:640px){
          .arh-det-meta{grid-template-columns:1fr}
          /* × je fiksen v kotu (top:3.85rem, sega do ~6rem); spusti vsebino, da naslov pride POD × in se ne prekrivata */
          .arh-detajl.arh-detajl{padding-top:6.4rem}
        }
      `}</style>
    </div>
  );
}
