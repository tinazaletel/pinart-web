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

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { CaretDown, CaretUp, FileText, Receipt, Scroll, Warning } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, type FlowContract, type FlowContractStatus, type FlowInvoice, type FlowOffer, type FlowOfferStatus } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import ProjectsWorkspace from './ProjectsWorkspace';
import ArhivFilter from './ArhivFilter';
import AmbientBubbles from '@/components/AmbientBubbles';
import MetricIcon from '@/components/MetricIcon';

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
  const [nacin] = usePredogled();
  /* podatki iz skupne shrambe (upostevajo predogled: prazno/zacetek/moji/demo) */
  const flow = useMemo(() => podatkiZaPredogled(nacin, loadFlowData()), [nacin]);
  const { offers, contracts, invoices } = flow;

  /* NAKNADNO pošiljanje ob pregledu (arhiv): mailto s prednapolnjeno zadevo/besedilom;
     prejemnik iz imenika strank po imenu (če ima e-pošto). Do postavitve Resend (mail
     zaledje) mailto NE pripne PDF-ja — uporabnica ga pripne ročno; z Resend bo priponka
     samodejna. */
  const strankaEmail = (ime: string) => {
    const c = ime.trim().toLocaleLowerCase('sl-SI');
    return (flow.clients || []).find(x => (x.name || '').trim().toLocaleLowerCase('sl-SI') === c)?.email || '';
  };
  const posljiStranki = (ime: string, zadeva: string, telo: string) => {
    if (typeof window === 'undefined') return;
    window.location.href = `mailto:${encodeURIComponent(strankaEmail(ime))}?subject=${encodeURIComponent(zadeva)}&body=${encodeURIComponent(telo)}`;
  };

  const [zavihek, setZavihek] = useState<Zavihek>('projekti');
  /* ko ProjectsWorkspace odpre detajl projekta kot samostojno stran (klik na
     vrstico v tabeli), skrijemo .arh-glava (zavihki + orodna vrstica) — glej
     onDetajl prop spodaj. Detajl ni vezan na zavihek, zato se ob morebitni
     menjavi zavihka počisti prek onDetajl(false) v ProjectsWorkspace samem. */
  const [projektDetajlOdprt, setProjektDetajlOdprt] = useState(false);
  /* "+ Nov projekt" — gumb zivi tu (na orodni vrstici, ob "+ Nova ponudba"),
     panel/obrazec pa v ProjectsWorkspace (glej pw-nov-panel); krmilimo od tu,
     da je gumb del ISTE vrstice kot "+ Nova ponudba". */
  const [novProjektOdprt, setNovProjektOdprt] = useState(false);
  /* Postavka "Ustvari projekt" (meni > Orodja) pripelje sem z ?nov=1 in odpre brief takoj. */
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('nov') === '1') {
      setZavihek('projekti');
      setNovProjektOdprt(true);
    }
  }, []);

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

  /* PRAVI dokument ponudbe, ce obstaja shranjen HTML v arhivu kalkulatorja
     (glej najdiTeloPonudbe zgoraj) — prazno telo pomeni: izrisi predogled iz
     polj ponudbe namesto injeciranega HTML-ja */
  const ponudbaDok = useMemo(
    () => (detajl?.vrsta === 'ponudba' ? najdiTeloPonudbe(detajl.zapis) : { telo: '' }),
    [detajl]
  );

  /* menjava zavihka: pocisti vsa iskanja/filtre, da se ne prenesejo napacno */
  const menjajZavihek = (z: Zavihek) => {
    setZavihek(z);
    setIskanje(''); setObdobjeOd(''); setObdobjeDo('');
    setStatusPonudba('vse'); setStatusPogodba('vse'); setPlacano('vse'); setStatusProjekt('vse');
    setDetajl(null); setDetObsegOdprt(false); setProjektDetajlOdprt(false);
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

  /* povzetek zavihka Racuni (preseljeno iz InvoiceWorkspace, ki zdaj SAMO
     ustvarja nove racune) — vedno iz CELOTNEGA flow.invoices, ne od filtra */
  const racuniMetrike = useMemo(() => ({
    izdano: invoices.reduce((sum, item) => sum + item.amount, 0),
    placano: invoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0),
    odprto: invoices.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0),
  }), [invoices]);

  /* povzetek zavihka Ponudbe — vedno iz CELOTNEGA flow.offers, ne od filtra
     (isti vzorec kot racuniMetrike zgoraj) */
  const ponudbeMetrike = useMemo(() => ({
    skupaj: offers.reduce((sum, item) => sum + item.agreedAmount, 0),
    sprejeto: offers.filter(item => item.status === 'accepted').reduce((sum, item) => sum + item.agreedAmount, 0),
    caka: offers.filter(item => item.status === 'sent').reduce((sum, item) => sum + item.agreedAmount, 0),
  }), [offers]);

  /* povzetek zavihka Pogodbe — pogodbe nimajo zneska, zato stevilo po statusu */
  const pogodbeMetrike = useMemo(() => ({
    podpisane: contracts.filter(item => item.status === 'signed').length,
    aktivne: contracts.filter(item => item.status === 'active').length,
    vObravnavi: contracts.filter(item => item.status === 'draft' || item.status === 'received' || item.status === 'review').length,
  }), [contracts]);

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
      placeholder: 'Poišči projekt, stranko ali številko …',
      statusOznaka: 'Stanje projekta',
      statusVrednost: statusProjekt,
      onStatus: setStatusProjekt,
      statusOpcije: [{ vrednost: 'vse', oznaka: 'Vsi' }, { vrednost: 'aktivni', oznaka: 'Aktivni' }, { vrednost: 'cakajo', oznaka: 'Čakajo' }, { vrednost: 'zakljuceni', oznaka: 'Zaključeni' }],
      akcija: <>
        <Link className="af-akcija-gumb" href={`${base}/kalkulator/orodje`}>+ Nova ponudba</Link>
        <button type="button" className="af-akcija-gumb" onClick={() => setNovProjektOdprt(true)}>+ Nov projekt</button>
      </>,
    } : zavihek === 'ponudbe' ? {
      placeholder: 'Poišči ponudbo, stranko ali številko …',
      statusOznaka: 'Status ponudbe',
      statusVrednost: statusPonudba,
      onStatus: v => setStatusPonudba(v as 'vse' | FlowOfferStatus),
      statusOpcije: [{ vrednost: 'vse', oznaka: 'Vse' }, ...(Object.entries(offerLabels) as Array<[FlowOfferStatus, string]>).map(([v, n]) => ({ vrednost: v, oznaka: n }))],
      akcija: <Link className="af-akcija-gumb" href={`${base}/kalkulator/orodje`}>+ Nova ponudba</Link>,
    } : zavihek === 'pogodbe' ? {
      placeholder: 'Poišči pogodbo ali stranko …',
      statusOznaka: 'Status pogodbe',
      statusVrednost: statusPogodba,
      onStatus: v => setStatusPogodba(v as 'vse' | FlowContractStatus),
      statusOpcije: [{ vrednost: 'vse', oznaka: 'Vse' }, ...(Object.entries(contractLabels) as Array<[FlowContractStatus, string]>).map(([v, n]) => ({ vrednost: v, oznaka: n }))],
      akcija: <Link className="af-akcija-gumb" href={`${base}/kalkulator/pogodbe`}>+ Nova pogodba</Link>,
    } : zavihek === 'racuni' ? {
      placeholder: 'Poišči račun, stranko ali številko …',
      statusOznaka: 'Plačilo',
      statusVrednost: placano,
      onStatus: v => setPlacano(v as 'vse' | 'placano' | 'odprto'),
      statusOpcije: [{ vrednost: 'vse', oznaka: 'Vsi' }, { vrednost: 'placano', oznaka: 'Plačani' }, { vrednost: 'odprto', oznaka: 'Odprti' }],
      akcija: <Link className="af-akcija-gumb" href={`${base}/kalkulator/racuni`}>+ Nov račun</Link>,
    } : null;

  return (
    <div className="arh">
      <div className="arh-ozadje" aria-hidden>
        <span className="arh-blob arh-blob-roza" />
        <span className="arh-blob arh-blob-modra" />
        <AmbientBubbles />
      </div>

      <div className="arh-vsebina">
        {/* ko je detajl projekta odprt kot samostojna stran, skrijemo naslov +
            glavo (zavihki/orodna vrstica) — glej onDetajl na ProjectsWorkspace */}
        {!projektDetajlOdprt && <>
          <p className="arh-kicker">Arhiv</p>
          <h1 className="arh-h1">Vse na enem mestu.</h1>
          <p className="arh-uvod">Shranjeni projekti, ponudbe, pogodbe in računi — poišči in odpri, kar potrebuješ.</p>

          {/* glava: zavihki (levo) + orodna vrstica aktivnega zavihka (desno) v ENI
              vrsti na namizju; flex-wrap ju na mobilnem prelomi v dve vrsti (locene) */}
          <div className="arh-glava">
            <div className="arh-segpills arh-zavihki" role="tablist" aria-label="Arhiv">
              {(([['projekti', 'Projekti'], ['ponudbe', 'Ponudbe'], ['pogodbe', 'Pogodbe'], ['racuni', 'Računi']]) as Array<[Zavihek, string]>).map(([v, n]) => (
                <button key={v} type="button" role="tab" aria-selected={zavihek === v} className={zavihek === v ? 'on' : ''} onClick={() => menjajZavihek(v)}>{n}</button>
              ))}
            </div>

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
              novProjektOdprt={novProjektOdprt}
              onNovProjektOdprt={setNovProjektOdprt}
            />
          </section>
        )}

        {/* ── PONUDBE ── */}
        {zavihek === 'ponudbe' && (
          <section className="arh-panel">
            {offers.length > 0 && <div className="arh-metrike">
              <article className="arh-metrika arh-metrika-skupaj">
                <small>Skupaj</small><strong>{eur(ponudbeMetrike.skupaj)}</strong><span>{offers.length} ponudb</span>
                <b className="arh-metrika-ikona"><MetricIcon type="document" /></b>
              </article>
              <article className="arh-metrika arh-metrika-sprejeto">
                <small>Sprejeto</small><strong>{eur(ponudbeMetrike.sprejeto)}</strong><span>sprejete ponudbe</span>
                <b className="arh-metrika-ikona"><MetricIcon type="paid" /></b>
              </article>
              <article className="arh-metrika arh-metrika-caka">
                <small>Čaka</small><strong>{eur(ponudbeMetrike.caka)}</strong><span>poslane, čakajo</span>
                <b className="arh-metrika-ikona"><MetricIcon type="profit" /></b>
              </article>
            </div>}

            {!offers.length ? (
              <p className="arh-prazno">Prva shranjena ponudba se bo prikazala tukaj.</p>
            ) : !ponudbePrikaz.length ? (
              <p className="arh-prazno">Ni ponudb za to iskanje ali filter.</p>
            ) : (
              <div className="arh-tabela-ovoj">
                <div className="arh-tabela arh-tabela-ponudbe">
                  <div className="arh-tabela-naslov"><span className="arh-tabela-oznaka">Ponudbe</span><strong>{ponudbePrikaz.length}</strong></div>
                  <header><span>Ponudba</span><span>Stranka</span><span>Datum</span><span>Status</span><span>Št.</span><span className="arh-desno">Znesek</span><span /></header>
                  {ponudbePrikaz.map(o => (
                    <button key={o.id} type="button" className="arh-vrstica" onClick={() => { setDetObsegOdprt(false); setDetajl({ vrsta: 'ponudba', zapis: o }); }}>
                      <span className="arh-glavna"><span className="arh-ikona" aria-hidden><FileText size={17} /></span><strong>{o.title}</strong></span>
                      <span className="arh-mut">{o.client}</span>
                      <span className="arh-mut">{datStr(o.date)}</span>
                      <span><StatusPika label={offerLabels[o.status]} /></span>
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
            {contracts.length > 0 && <div className="arh-metrike">
              <article className="arh-metrika arh-metrika-podpisane">
                <small>Podpisane</small><strong>{pogodbeMetrike.podpisane}</strong><span>sklenjene</span>
                <b className="arh-metrika-ikona"><MetricIcon type="paid" /></b>
              </article>
              <article className="arh-metrika arh-metrika-aktivne">
                <small>Aktivne</small><strong>{pogodbeMetrike.aktivne}</strong><span>v teku</span>
                <b className="arh-metrika-ikona"><MetricIcon type="document" /></b>
              </article>
              <article className="arh-metrika arh-metrika-obravnavi">
                <small>V obravnavi</small><strong>{pogodbeMetrike.vObravnavi}</strong><span>osnutki/pregled</span>
                <b className="arh-metrika-ikona"><MetricIcon type="profit" /></b>
              </article>
            </div>}

            {/* štetje statusov odstranjeno — status je že v dropdown filtru (zdaj v arh-glava) */}
            {!contracts.length ? (
              <p className="arh-prazno">Prva shranjena pogodba se bo prikazala tukaj.</p>
            ) : !pogodbePrikaz.length ? (
              <p className="arh-prazno">Ni pogodb za to iskanje ali filter.</p>
            ) : (
              <div className="arh-tabela-ovoj">
                <div className="arh-tabela arh-tabela-pogodbe">
                  <div className="arh-tabela-naslov"><span className="arh-tabela-oznaka">Pogodbe</span><strong>{pogodbePrikaz.length}</strong></div>
                  <header><span>Pogodba</span><span>Stranka</span><span>Datum</span><span>Status</span><span>Opomba</span><span /></header>
                  {pogodbePrikaz.map(c => {
                    const op = opombaInfo(c.notes);
                    return (
                      <button key={c.id} type="button" className="arh-vrstica" onClick={() => { setDetObsegOdprt(false); setDetajl({ vrsta: 'pogodba', zapis: c }); }}>
                        <span className="arh-glavna"><span className="arh-ikona" aria-hidden><Scroll size={17} /></span><strong>{c.title}</strong></span>
                        <span className="arh-mut">{c.client}</span>
                        <span className="arh-mut">{datStr(c.date)}</span>
                        <span><StatusPika label={contractLabels[c.status]} /></span>
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
            {invoices.length > 0 && <div className="arh-metrike">
              <article className="arh-metrika arh-metrika-izdano">
                <small>Izdano</small><strong>{eur(racuniMetrike.izdano)}</strong><span>{invoices.length} računov</span>
                <b className="arh-metrika-ikona"><MetricIcon type="document" /></b>
              </article>
              <article className="arh-metrika arh-metrika-placano">
                <small>Plačano</small><strong>{eur(racuniMetrike.placano)}</strong><span>potrjena plačila</span>
                <b className="arh-metrika-ikona"><MetricIcon type="paid" /></b>
              </article>
              <article className="arh-metrika arh-metrika-odprto">
                <small>Odprto</small><strong>{eur(racuniMetrike.odprto)}</strong><span>še čaka plačilo</span>
                <b className="arh-metrika-ikona"><MetricIcon type="profit" /></b>
              </article>
            </div>}

            {!invoices.length ? (
              <p className="arh-prazno">Prvi shranjeni račun se bo prikazal tukaj.</p>
            ) : !racuniPrikaz.length ? (
              <p className="arh-prazno">Ni računov za to iskanje ali filter.</p>
            ) : (
              <div className="arh-tabela-ovoj">
                <div className="arh-tabela arh-tabela-racuni">
                  <div className="arh-tabela-naslov"><span className="arh-tabela-oznaka">Računi</span><strong>{racuniPrikaz.length}</strong></div>
                  <header><span>Račun</span><span>Št.</span><span>Stranka</span><span>Datum</span><span>Status</span><span className="arh-desno">Znesek</span><span /></header>
                  {racuniPrikaz.map(r => (
                    <button key={r.id} type="button" className="arh-vrstica" onClick={() => setDetajl({ vrsta: 'racun', zapis: r })}>
                      <span className="arh-glavna"><span className="arh-ikona" aria-hidden><Receipt size={17} /></span><strong>{r.title || `${r.predracun ? 'Predračun' : 'Račun'} ${r.number || ''}`}</strong>{r.predracun && <span className="arh-znacka arh-znacka-predracun">Predračun</span>}</span>
                      <span className="arh-mut">{r.number || '—'}</span>
                      <span className="arh-mut">{r.client}</span>
                      <span className="arh-mut">{datStr(r.date)}</span>
                      <span><StatusPika label={r.paid ? 'Plačano' : 'Odprto'} /></span>
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

      {/* ── DETAJL PANEL Z DESNE (vzorec ContractWorkspace: detailBackdrop + detailPanel + lepljivi X) ── */}
      {detajl && (
        <div className={styles.detailBackdrop} role="presentation" onMouseDown={zapriDetajl}>
          <aside className={`${styles.detailPanel} arh-detajl`} role="dialog" aria-modal="true" aria-labelledby="arh-detajl-naslov" onMouseDown={e => e.stopPropagation()}>
            {/* lepljivi X ostane v kotu tudi med drsenjem (vzorec .pg-det-x) */}
            <button className="arh-det-x" onClick={zapriDetajl} aria-label="Zapri">✕</button>

            {detajl.vrsta === 'ponudba' && (() => {
              const o = detajl.zapis;
              return <>
                <p className={styles.eyebrow}>PONUDBA · {offerLabels[o.status]}</p>
                <h2 id="arh-detajl-naslov">{o.title}</h2>

                {/* ponudba kot DOKUMENT (mini letterhead: kremni list, senca, Bodoni
                    naslov) — ce imamo shranjen pravi HTML iz kalkulatorja (ponudbaDok.telo),
                    ga izrisemo; sicer predogled sestavimo iz polj ponudbe (obseg + znesek) */}
                <div className="arh-ponudba-dok">
                  <div className="arh-ponudba-dok-glava">
                    <p className="arh-ponudba-dok-kick">PONUDBA{o.number ? ` · ${o.number}` : ''}</p>
                    <h3 className="arh-ponudba-dok-naslov">{o.title}</h3>
                    <div className="arh-ponudba-dok-meta">
                      <span><small>Stranka</small><strong>{o.client}</strong></span>
                      <span><small>Datum</small><strong>{datStr(o.date)}</strong></span>
                      {ponudbaDok.veljavnostDni && <span><small>Veljavnost</small><strong>{ponudbaDok.veljavnostDni} dni</strong></span>}
                    </div>
                  </div>

                  {ponudbaDok.telo ? (
                    <div className="arh-doktelo" dangerouslySetInnerHTML={{ __html: ponudbaDok.telo }} />
                  ) : (
                    <div className="arh-ponudba-dok-telo">
                      <div className="arh-ponudba-dok-obseg">
                        <span className="arh-filter-oznaka">Obseg</span>
                        {o.scope.length
                          ? <ul>{o.scope.map((s, i) => <li key={`${s}-${i}`}>{s}</li>)}</ul>
                          : <p className="arh-mini">Ponudba nima vpisanega obsega.</p>}
                      </div>
                      <div className="arh-ponudba-dok-znesek">
                        <span>Dogovorjena vrednost</span>
                        <strong>{dokZnesek(o.agreedAmount)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                <a className="arh-povezava arh-povezava-sekundarna" href={`${base}/kalkulator/orodje`}>Odpri v kalkulatorju ↗</a>
              </>;
            })()}

            {detajl.vrsta === 'pogodba' && (() => {
              const c = detajl.zapis;
              const op = opombaInfo(c.notes);
              return <>
                <p className={styles.eyebrow}>POGODBA · {contractLabels[c.status]}</p>
                <h2 id="arh-detajl-naslov">{c.title}</h2>
                <div className="arh-det-meta">
                  <span><small>Stranka</small><strong>{c.client}</strong></span>
                  <span><small>Datum</small><strong>{datStr(c.date)}</strong></span>
                </div>
                {/* povezana ponudba (ce obstaja) — klik razpre povzetek obsega */}
                {(() => {
                  const offer = offers.find(x => x.id === c.sourceOfferId);
                  if (!offer) return null;
                  return <div className="arh-det-ponudba">
                    <button type="button" className="arh-det-ponudba-vrstica" aria-expanded={detObsegOdprt} onClick={() => setDetObsegOdprt(v => !v)}>
                      <span className="arh-det-ponudba-ime">Ponudba {offer.number || offer.title}</span>
                      <span className="arh-det-ponudba-kazalec" aria-hidden>{detObsegOdprt ? <CaretUp size={13} weight="bold" /> : <CaretDown size={13} weight="bold" />}</span>
                    </button>
                    {detObsegOdprt && <div className="arh-det-ponudba-vec">
                      <p className="arh-det-ponudba-naslov"><b>{offer.title}</b>{offer.agreedAmount > 0 ? ' · ' + eur(offer.agreedAmount) : ''}</p>
                      {offer.scope.length ? <ul>{offer.scope.map((s, i) => <li key={`${s}-${i}`}>{s}</li>)}</ul> : <p className="arh-mini">Ponudba nima vpisanega obsega.</p>}
                    </div>}
                  </div>;
                })()}
                {/* telo pogodbe: novi HTML zapisi -> izris kot dokument; stari golo besedilo -> pre-wrap */}
                {c.body && (jeHtmlTelo(c.body)
                  ? <div className="arh-doktelo" dangerouslySetInnerHTML={{ __html: c.body }} />
                  : <pre className="arh-doktelo-pre">{c.body}</pre>)}
                {!c.body && c.fileName && <p className="arh-mini">Priložen dokument: {c.fileName}. Odpri ga v razdelku Pogodbe.</p>}
                {op && (op.alert
                  ? <div className="arh-opomba-kartica" role="alert"><Warning size={20} weight="bold" aria-hidden /><div><strong>Opozorilo</strong><p>{op.besedilo}</p></div></div>
                  : <div className="arh-opomba-blok"><strong>Opomba</strong><p>{op.besedilo}</p></div>)}
                <div className="arh-akcije">
                  <button type="button" className="arh-poslji" onClick={() => posljiStranki(c.client, `Pogodba — ${c.title}`, `Pozdravljeni,\n\nv prilogi vam pošiljam pogodbo »${c.title}«. Prosim za pregled in podpis.\n\nLep pozdrav`)}>Pošlji stranki ↗</button>
                  <a className="arh-povezava arh-povezava-sekundarna" href={`${base}/kalkulator/pogodbe`}>Uredi v Pogodbah ↗</a>
                </div>
                <p className="arh-mini">Do postavitve pošiljanja s priponko pripni PDF ročno (Prenesi → priloži).</p>
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
                    <p className={styles.eyebrow}>{r.predracun ? 'PREDRAČUN' : 'RAČUN'} · {r.paid ? 'PLAČAN' : 'ODPRT'}</p>
                    <h2 id="arh-detajl-naslov">{r.title || `${r.predracun ? 'Predračun' : 'Račun'} ${r.number || ''}`}</h2>

                    {/* cel racun/predracun v panelu (kot pogodba/ponudba): letterhead + postavke + vsote */}
                    <div className="arh-ponudba-dok">
                      <div className="arh-ponudba-dok-glava">
                        <p className="arh-ponudba-dok-kick">{r.predracun ? 'PREDRAČUN' : 'RAČUN'}{r.number ? ` · ${r.number}` : ''}</p>
                        <h3 className="arh-ponudba-dok-naslov">{r.title || (r.predracun ? 'Predračun' : 'Račun')}</h3>
                        <div className="arh-ponudba-dok-meta">
                          <span><small>Stranka</small><strong>{r.client}</strong></span>
                          <span><small>Datum</small><strong>{datStr(r.date)}</strong></span>
                          {r.serviceDate && <span><small>Opravljeno</small><strong>{datStr(r.serviceDate)}</strong></span>}
                          {typeof r.dueDays === 'number' && <span><small>Rok plačila</small><strong>{r.dueDays} dni</strong></span>}
                        </div>
                      </div>

                      {items.length ? (
                        <div className="arh-racun-telo">
                          <div className="arh-racun-tabela-ovoj">
                            <table className="arh-racun-tabela">
                              <thead><tr><th>Opis</th><th>Kol.</th><th>Cena</th>{imaPopust && <th>Popust</th>}{imaDdv && <th>DDV</th>}<th>Skupaj</th></tr></thead>
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
                            {typeof r.net === 'number' && <div><span>Neto</span><strong>{eur(r.net)}</strong></div>}
                            {typeof r.vatAmount === 'number' && r.vatAmount > 0 && <div><span>DDV</span><strong>{eur(r.vatAmount)}</strong></div>}
                            <div className="arh-racun-skupaj"><span>Za plačilo</span><strong>{eur(r.amount)}</strong></div>
                          </div>
                          {r.vatPayer === false && <p className="arh-mini">Nisem zavezanec za DDV — DDV ni obračunan.</p>}
                        </div>
                      ) : (
                        <div className="arh-ponudba-dok-telo">
                          <div className="arh-ponudba-dok-znesek"><span>Za plačilo</span><strong>{eur(r.amount)}</strong></div>
                        </div>
                      )}
                    </div>

                    <div className="arh-akcije">
                      <button type="button" className="arh-poslji" onClick={() => posljiStranki(r.client, `Račun ${r.number || ''}`.trim(), `Pozdravljeni,\n\nv prilogi vam pošiljam račun ${r.number || ''} v znesku ${eur(r.amount)}${typeof r.dueDays === 'number' ? `, z rokom plačila ${r.dueDays} dni` : ''}.\n\nLep pozdrav`)}>Pošlji stranki ↗</button>
                      <a className="arh-povezava arh-povezava-sekundarna" href={`${base}/kalkulator/racuni`}>Uredi v Računih ↗</a>
                    </div>
                    <p className="arh-mini">Do postavitve pošiljanja s priponko pripni PDF ročno (Prenesi → priloži).</p>
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
        .arh-ozadje{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background-color:oklch(97% 0.012 87);background-image:linear-gradient(color-mix(in oklch, oklch(19% 0.014 55) 7%, transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in oklch, oklch(19% 0.014 55) 7%, transparent) 1px,transparent 1px);background-size:4.5rem 4.5rem}
        .arh-ozadje .arh-blob{position:absolute;width:min(60vw,760px);aspect-ratio:1;border-radius:50%;filter:blur(70px)}
        .arh-blob-roza{top:-16vh;left:-12vw;background:radial-gradient(circle, oklch(74% .18 300 / .55), transparent 68%);opacity:.5;animation:arhRoza 22s ease-in-out infinite}
        .arh-blob-modra{bottom:-22vh;right:-14vw;background:radial-gradient(circle, oklch(82% .15 162 / .55), transparent 68%);opacity:.45;animation:arhModra 25s ease-in-out infinite}
        @keyframes arhRoza{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(32vw,24vh) scale(1.15)}50%{transform:translate(16vw,46vh) scale(.92)}75%{transform:translate(38vw,12vh) scale(1.08)}}
        @keyframes arhModra{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-28vw,-22vh) scale(1.12)}50%{transform:translate(-44vw,-10vh) scale(.9)}75%{transform:translate(-16vw,-32vh) scale(1.06)}}
        @media (prefers-reduced-motion:reduce){.arh-blob{animation:none}}

        /* sredinski stolpec — sirsi od retainerja (1000px), ker imamo tabele */
        /* Arhiv je PREGLEDNA (admin) stran → polna širina kot nadzorna plošča/stranke,
           NE ozek stolpec (ta velja samo za vprašalnike/urejanje dokumentov). */
        .arh-vsebina{position:relative;z-index:1;width:100%;max-width:100%;margin:0;padding:0 0 6rem;min-width:0}
        .arh-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0 0 .3rem}
        .arh-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(2.4rem,6vw,4rem);line-height:1;letter-spacing:-.012em;margin:0 0 .6rem;color:var(--ink)}
        .arh-uvod{font-size:1rem;line-height:1.55;color:rgba(17,17,17,.72);margin:0 0 2rem;max-width:38rem}

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

        .arh-panel{animation:arhSek .45s cubic-bezier(.16,1,.3,1) both;min-width:0}
        @keyframes arhSek{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion:reduce){.arh-panel{animation:none}}
        /* projekti: obstojeci ProjectsWorkspace ima svoj razmik — le malo zraka nad njim */
        .arh-projekti{margin-top:.4rem}

        /* oznaka skupine — se uporablja v detajl panelu (Obseg); filtri jih ne kazejo vec */
        .arh-filter-oznaka{font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(17,17,17,.55)}

        /* povzetek Racuni (preseljeno iz InvoiceWorkspace — vzorec MetricIcon,
           v videzu Arhiva: mehke papirnate kartice namesto belih dashboard kartic) */
        .arh-metrike{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:0 0 1.2rem}
        .arh-metrika{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;min-height:7.4rem;padding:1rem 1.1rem;border:1px solid rgba(17,17,17,.1);border-radius:14px}
        .arh-metrika small{position:relative;z-index:1;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(17,17,17,.55)}
        .arh-metrika strong{position:relative;z-index:1;margin-top:auto;font:500 1.7rem var(--font-serif),Georgia,serif;color:var(--ink);-webkit-text-stroke:.35px var(--ink);text-shadow:0 1px 2px oklch(100% 0 0 / .35)}
        .arh-metrika span{position:relative;z-index:1;margin-top:.2rem;color:rgba(17,17,17,.55);font-size:.78rem}
        .arh-metrika-izdano{background:linear-gradient(140deg,oklch(95% .035 295),oklch(90% .065 297))}
        .arh-metrika-placano{background:linear-gradient(140deg,oklch(96% .035 160),oklch(87% .08 163))}
        .arh-metrika-odprto{background:linear-gradient(140deg,oklch(97% .03 65),oklch(90% .07 60))}
        /* isti trije odtenki (vijola/mint/oranžna), samo poimenovani po novih zavihkih */
        .arh-metrika-skupaj{background:linear-gradient(140deg,oklch(95% .035 295),oklch(90% .065 297))}
        .arh-metrika-sprejeto{background:linear-gradient(140deg,oklch(96% .035 160),oklch(87% .08 163))}
        .arh-metrika-caka{background:linear-gradient(140deg,oklch(97% .03 65),oklch(90% .07 60))}
        .arh-metrika-podpisane{background:linear-gradient(140deg,oklch(96% .035 160),oklch(87% .08 163))}
        .arh-metrika-aktivne{background:linear-gradient(140deg,oklch(95% .035 295),oklch(90% .065 297))}
        .arh-metrika-obravnavi{background:linear-gradient(140deg,oklch(97% .03 65),oklch(90% .07 60))}
        .arh-metrika-ikona{position:absolute;right:-1rem;bottom:-1.6rem;display:grid;place-items:center;width:6.6rem;aspect-ratio:1;border-radius:1.6rem;background:oklch(100% 0 0/.24);color:color-mix(in oklch,currentColor 54%,transparent);transform:rotate(-9deg)}
        @media (max-width:760px){.arh-metrike{grid-template-columns:1fr 1fr}}
        @media (max-width:480px){.arh-metrike{grid-template-columns:1fr}}

        /* povzetek Pogodbe: kratek stevec po statusu (pilule) */
        .arh-pog-povzetek{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1rem}
        .arh-pog-pil{display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .85rem;border:1px solid rgba(17,17,17,.12);border-radius:999px;background:rgba(255,255,255,.55);font-size:.78rem;color:rgba(17,17,17,.72)}
        .arh-pog-pil b{font:700 .92rem var(--font-sans),sans-serif;color:var(--ink)}

        /* prazni seznam / prazen filter */
        .arh-prazno{margin:1.4rem 0;padding:1.4rem;border:1px dashed rgba(17,17,17,.18);border-radius:14px;background:rgba(255,255,255,.4);color:rgba(17,17,17,.7);font-size:.94rem;text-align:center}

        /* tabela: vodoravni drs znotraj svojega okvirja (mobilno ne pobegne cez rob) */
        .arh-tabela-ovoj{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:14px}
        .arh-tabela{min-width:640px;display:grid;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:14px;overflow:hidden}
        .arh-tabela-ponudbe{grid-template-columns:minmax(0,2.2fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,.8fr) minmax(0,1fr) 1.6rem}
        .arh-tabela-pogodbe{grid-template-columns:minmax(0,2fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.6fr) 1.6rem}
        .arh-tabela-racuni{grid-template-columns:minmax(0,1.9fr) minmax(0,1fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,1fr) 1.6rem}
        /* gap tudi na header (prej ga ni imel -> "ZNESEKDATUM" se je dotikal) + vecji razmik */
        /* naslovna vrstica tabele (oznaka + stevec) = DEL tabele, vijola podlaga */
        .arh-tabela-naslov{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.95rem 1rem .85rem;background:oklch(95% .035 300);border-bottom:1px solid rgba(17,17,17,.08)}
        .arh-tabela-oznaka{font-size:.66rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:oklch(45% .12 300)}
        .arh-tabela-naslov strong{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:1.6rem;line-height:1;color:var(--ink)}
        .arh-tabela > header{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;gap:1.1rem;padding:.7rem .9rem;font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(17,17,17,.5);border-bottom:1px solid rgba(17,17,17,.1)}
        .arh-vrstica{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;gap:1.1rem;padding:.85rem .9rem;border:none;border-bottom:1px solid rgba(17,17,17,.07);background:transparent;font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:background .14s}
        .arh-vrstica:last-child{border-bottom:none}
        .arh-vrstica:hover{background:rgba(255,255,255,.6)}
        .arh-vrstica > span{min-width:0;font-size:.86rem;overflow-wrap:anywhere}
        /* status pilula — ISTE barve kot nadzorna plosca (.statusPill + status_*) */
        .arh-status{display:inline-flex;align-items:center;gap:.42rem;width:max-content;max-width:100%;padding:.32rem .66rem;border:1px solid oklch(86% .012 87);border-radius:999px;background:oklch(95% .01 87);color:oklch(40% .02 70);font-size:.62rem;font-weight:700;white-space:nowrap}
        .arh-status::before{content:'';width:.48rem;height:.48rem;border-radius:50%;background:var(--pika,oklch(62% .02 70));flex:none}
        .arh-status[data-tone='waiting']{--pika:oklch(72% .16 75)}
        .arh-status[data-tone='success']{--pika:oklch(62% .15 150)}
        .arh-status[data-tone='danger']{--pika:oklch(58% .19 25)}
        .arh-status[data-tone='neutral']{--pika:oklch(62% .02 70)}
        .arh-glavna{display:flex;align-items:center;gap:.6rem;min-width:0}
        .arh-glavna strong{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis}
        .arh-ikona{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:oklch(94% .025 87);color:var(--accent);flex:none}
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
        .arh-detajl{width:min(42rem,94vw);display:flex;flex-direction:column;gap:.2rem}
        .arh-detajl h2{margin:.4rem 0 1.2rem;font-family:var(--font-serif),Didot,serif;font-weight:600;font-size:clamp(1.8rem,3vw,2.6rem);line-height:1.05;color:var(--ink)}
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
        .arh-mini{color:rgba(17,17,17,.6);font-size:.85rem;line-height:1.5}
        .arh-povezava{display:inline-flex;align-items:center;gap:.35rem;margin-top:.9rem;font-size:.88rem;font-weight:600;color:var(--ink);text-decoration:underline;text-underline-offset:.28em;text-decoration-thickness:1px}
        /* sekundarna razlicica (ponudba kot dokument zdaj nosi glavno pozornost,
           povezava v kalkulator je samo se pot do urejanja) */
        .arh-povezava-sekundarna{font-size:.8rem;font-weight:500;color:rgba(17,17,17,.62)}
        /* akcije ob pregledu (pošlji stranki + uredi) */
        .arh-akcije{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1.1rem;margin-top:.9rem}
        .arh-poslji{display:inline-flex;align-items:center;gap:.4rem;padding:.6rem 1.05rem;border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--paper);font:700 .78rem var(--font-sans),sans-serif;cursor:pointer}
        .arh-poslji:hover{background:transparent;color:var(--ink)}
        .arh-akcije .arh-povezava{margin-top:0}

        /* ── račun kot DOKUMENT v panelu (postavke + vsote), znotraj arh-ponudba-dok letterheada ── */
        .arh-racun-telo{padding:.2rem .1rem .1rem}
        .arh-racun-tabela-ovoj{overflow-x:auto}
        .arh-racun-tabela{width:100%;border-collapse:collapse;font-size:.82rem}
        .arh-racun-tabela th{padding:.4rem .5rem;text-align:right;font-size:.62rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgba(17,17,17,.5);border-bottom:1px solid rgba(17,17,17,.12);white-space:nowrap}
        .arh-racun-tabela th:first-child{text-align:left}
        .arh-racun-tabela td{padding:.5rem .5rem;text-align:right;border-bottom:1px solid rgba(17,17,17,.07);font-variant-numeric:tabular-nums;white-space:nowrap}
        .arh-racun-tabela td:first-child{text-align:left;white-space:normal;font-weight:600}
        .arh-racun-vsote{margin-top:.7rem;display:grid;gap:.25rem;justify-items:end}
        .arh-racun-vsote > div{display:flex;gap:1.2rem;align-items:baseline;font-size:.82rem;color:rgba(17,17,17,.62)}
        .arh-racun-vsote > div strong{min-width:5rem;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink)}
        .arh-racun-skupaj{margin-top:.25rem;padding-top:.45rem;border-top:1px solid rgba(17,17,17,.14)}
        .arh-racun-skupaj span{font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgba(17,17,17,.6)}
        .arh-racun-skupaj strong{font:500 1.4rem var(--font-serif),Georgia,serif}

        /* ── ponudba kot DOKUMENT (NALOGA #44): kremni list + senca + Bodoni naslov,
           mini letterhead videz namesto golih kartic ── */
        .arh-ponudba-dok{margin-top:.9rem;border:1px solid rgba(17,17,17,.14);border-radius:10px;background:#fff;box-shadow:0 10px 28px rgba(17,17,17,.08);overflow:hidden}
        .arh-ponudba-dok-glava{padding:1.5rem 1.6rem 1.2rem;border-bottom:1px solid rgba(17,17,17,.1);background:linear-gradient(180deg, oklch(98% .01 87), #fff)}
        .arh-ponudba-dok-kick{margin:0 0 .5rem;font-size:.66rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--accent,#B25476)}
        .arh-ponudba-dok-naslov{margin:0 0 1rem;font-family:var(--font-serif),Didot,serif;font-weight:600;font-size:clamp(1.3rem,2.6vw,1.7rem);line-height:1.1;color:var(--ink)}
        .arh-ponudba-dok-meta{display:flex;flex-wrap:wrap;gap:1.4rem}
        .arh-ponudba-dok-meta span{display:grid;gap:.15rem;min-width:0}
        .arh-ponudba-dok-meta small{font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(17,17,17,.5)}
        .arh-ponudba-dok-meta strong{font-size:.86rem;overflow-wrap:anywhere}
        .arh-ponudba-dok-telo{padding:1.4rem 1.6rem 1.6rem}
        .arh-ponudba-dok-obseg{margin-bottom:1.1rem}
        .arh-ponudba-dok-obseg ul{margin:.4rem 0 0;padding-left:1.15rem}
        .arh-ponudba-dok-obseg li{margin:.25rem 0;font-size:.9rem;line-height:1.5}
        .arh-ponudba-dok-znesek{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding-top:1rem;border-top:1px dashed rgba(17,17,17,.16)}
        .arh-ponudba-dok-znesek span{font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(17,17,17,.55)}
        .arh-ponudba-dok-znesek strong{font-family:var(--font-serif),Georgia,serif;font-weight:600;font-size:1.5rem;color:var(--ink)}
        /* injecirani HTML dokument (arh-doktelo) znotraj arh-ponudba-dok: odstrani
           lasten okvir/senco/rob (parent jih ze da), obdrzi samo tipografijo */
        .arh-ponudba-dok .arh-doktelo{margin-top:0;border:none;border-radius:0;background:transparent;padding:1.4rem 1.6rem 1.6rem}
        .arh-det-ponudba{margin:.2rem 0 .6rem;border:1px solid rgba(17,17,17,.12);border-radius:.7rem;background:rgba(255,255,255,.72);overflow:hidden;min-width:0}
        .arh-det-ponudba-vrstica{display:flex;align-items:center;gap:.7rem;width:100%;padding:.65rem .8rem;border:none;background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer;min-width:0}
        .arh-det-ponudba-ime{flex:1;min-width:0;font-size:.88rem;font-weight:700;overflow-wrap:anywhere}
        .arh-det-ponudba-vrstica:hover .arh-det-ponudba-ime{text-decoration:underline;text-underline-offset:.2rem}
        .arh-det-ponudba-kazalec{display:grid;place-items:center;width:1.6rem;height:1.6rem;border-radius:50%;background:rgba(17,17,17,.06);color:var(--ink);flex:none}
        .arh-det-ponudba-vec{padding:.15rem .8rem .9rem}
        .arh-det-ponudba-vec ul{margin:.3rem 0 0;padding-left:1.15rem}
        .arh-det-ponudba-vec li{margin:.15rem 0;font-size:.85rem}
        .arh-det-ponudba-naslov{margin:.5rem 0 .2rem;font-size:.85rem}

        /* telo pogodbe (kopija .pg-doktelo) */
        .arh-doktelo{width:100%;min-width:0;margin-top:1rem;border:1px solid rgba(17,17,17,.16);background:#fff;padding:1.35rem;color:var(--ink);font-family:var(--font-sans),system-ui,sans-serif;font-size:.9rem;line-height:1.62;overflow:auto;border-radius:8px}
        .arh-doktelo h1{margin:0 0 .6rem;font-family:var(--font-serif),Didot,serif;font-size:clamp(1.4rem,3.4vw,1.9rem);line-height:1.05;font-weight:600}
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
        .arh-doktelo-pre{width:100%;min-width:0;margin-top:1rem;padding:1.2rem;border:1px solid rgba(17,17,17,.16);border-radius:8px;background:#fff;white-space:pre-wrap;font:500 .82rem/1.6 var(--font-sans),system-ui,sans-serif;overflow:auto}

        /* opomba v detajlu */
        .arh-opomba-kartica{display:flex;gap:.7rem;align-items:flex-start;margin-top:1rem;padding:.9rem 1rem;border-radius:.75rem;background:oklch(92% .06 25);color:#8a1a2c}
        .arh-opomba-kartica strong{display:block;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase}
        .arh-opomba-kartica p{margin:.3rem 0 0;font-size:.85rem;line-height:1.5;color:#7a1727}
        .arh-opomba-blok{margin-top:1rem;padding:.9rem;border-radius:.75rem;background:oklch(95% .04 65)}
        .arh-opomba-blok strong{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(17,17,17,.6)}
        .arh-opomba-blok p{margin:.35rem 0 0;font-size:.85rem;line-height:1.5}

        @media (max-width:640px){
          .arh-det-meta{grid-template-columns:1fr}
        }
      `}</style>
    </div>
  );
}
