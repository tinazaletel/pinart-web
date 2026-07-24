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

import { useMemo, useState } from 'react';
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

  const [zavihek, setZavihek] = useState<Zavihek>('projekti');

  /* iskanje + filtri (skupno stanje; ob menjavi zavihka jih pocistimo, ker so
     razlicni za vsak tip) */
  const [iskanje, setIskanje] = useState('');
  const [obdobjeOd, setObdobjeOd] = useState('');
  const [obdobjeDo, setObdobjeDo] = useState('');
  const [statusPonudba, setStatusPonudba] = useState<'vse' | FlowOfferStatus>('vse');
  const [statusPogodba, setStatusPogodba] = useState<'vse' | FlowContractStatus>('vse');
  const [placano, setPlacano] = useState<'vse' | 'placano' | 'odprto'>('vse');

  const [detajl, setDetajl] = useState<Detajl | null>(null);
  const [detObsegOdprt, setDetObsegOdprt] = useState(false);

  /* menjava zavihka: pocisti vsa iskanja/filtre, da se ne prenesejo napacno */
  const menjajZavihek = (z: Zavihek) => {
    setZavihek(z);
    setIskanje(''); setObdobjeOd(''); setObdobjeDo('');
    setStatusPonudba('vse'); setStatusPogodba('vse'); setPlacano('vse');
    setDetajl(null); setDetObsegOdprt(false);
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

  /* stevilo aktivnih filtrov (za stevec na gumbu Filtri v ArhivFilter) */
  const datumAktiven = obdobjeOd !== '' || obdobjeDo !== '';
  const stFiltrov = (datumAktiven ? 1 : 0)
    + (zavihek === 'ponudbe' && statusPonudba !== 'vse' ? 1 : 0)
    + (zavihek === 'pogodbe' && statusPogodba !== 'vse' ? 1 : 0)
    + (zavihek === 'racuni' && placano !== 'vse' ? 1 : 0);
  const pocistiFiltre = () => { setObdobjeOd(''); setObdobjeDo(''); setStatusPonudba('vse'); setStatusPogodba('vse'); setPlacano('vse'); };

  const zapriDetajl = () => { setDetajl(null); setDetObsegOdprt(false); };

  return (
    <div className="arh">
      <div className="arh-ozadje" aria-hidden>
        <span className="arh-blob arh-blob-roza" />
        <span className="arh-blob arh-blob-modra" />
        <AmbientBubbles />
      </div>

      <div className="arh-vsebina">
        <p className="arh-kicker">Arhiv</p>
        <h1 className="arh-h1">Vse na enem mestu.</h1>
        <p className="arh-uvod">Shranjeni projekti, ponudbe, pogodbe in računi — poišči in odpri, kar potrebuješ.</p>

        {/* zavihki (pilule kot rw-segpills) */}
        <div className="arh-segpills arh-zavihki" role="tablist" aria-label="Arhiv">
          {(([['projekti', 'Projekti'], ['ponudbe', 'Ponudbe'], ['pogodbe', 'Pogodbe'], ['racuni', 'Računi']]) as Array<[Zavihek, string]>).map(([v, n]) => (
            <button key={v} type="button" role="tab" aria-selected={zavihek === v} className={zavihek === v ? 'on' : ''} onClick={() => menjajZavihek(v)}>{n}</button>
          ))}
        </div>

        {/* ── PROJEKTI: obstojeci ProjectsWorkspace (logike ne prepisujemo) ── */}
        {zavihek === 'projekti' && (
          <section className="arh-panel arh-projekti">
            <ProjectsWorkspace base={base} />
          </section>
        )}

        {/* ── PONUDBE ── */}
        {zavihek === 'ponudbe' && (
          <section className="arh-panel">
            <ArhivFilter
              iskanje={iskanje}
              onIskanje={setIskanje}
              placeholder="Poišči ponudbo, stranko ali številko …"
              datumOd={obdobjeOd}
              datumDo={obdobjeDo}
              onDatumOd={setObdobjeOd}
              onDatumDo={setObdobjeDo}
              statusOznaka="Status ponudbe"
              statusVrednost={statusPonudba}
              onStatus={v => setStatusPonudba(v as 'vse' | FlowOfferStatus)}
              statusOpcije={[{ vrednost: 'vse', oznaka: 'Vse' }, ...(Object.entries(offerLabels) as Array<[FlowOfferStatus, string]>).map(([v, n]) => ({ vrednost: v, oznaka: n }))]}
              aktivnihFiltrov={stFiltrov}
              onPocisti={pocistiFiltre}
              akcija={<Link className="af-akcija-gumb" href={`${base}/kalkulator/orodje`}>+ Nova ponudba</Link>}
            />

            {!offers.length ? (
              <p className="arh-prazno">Prva shranjena ponudba se bo prikazala tukaj.</p>
            ) : !ponudbePrikaz.length ? (
              <p className="arh-prazno">Ni ponudb za to iskanje ali filter.</p>
            ) : (
              <div className="arh-tabela-ovoj">
                <div className="arh-tabela arh-tabela-ponudbe">
                  <header><span>Ponudba</span><span>Stranka</span><span className="arh-desno">Znesek</span><span>Datum</span><span>Št.</span><span /></header>
                  {ponudbePrikaz.map(o => (
                    <button key={o.id} type="button" className="arh-vrstica" onClick={() => { setDetObsegOdprt(false); setDetajl({ vrsta: 'ponudba', zapis: o }); }}>
                      <span className="arh-glavna"><span className="arh-ikona" aria-hidden><FileText size={17} /></span><strong>{o.title}</strong></span>
                      <span className="arh-mut">{o.client}</span>
                      <span className="arh-desno">{dokZnesek(o.agreedAmount)}</span>
                      <span className="arh-mut">{datStr(o.date)}</span>
                      <span className="arh-mut">{o.number || '—'}</span>
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
            {/* štetje statusov odstranjeno — status je že v dropdown filtru */}
            <ArhivFilter
              iskanje={iskanje}
              onIskanje={setIskanje}
              placeholder="Poišči pogodbo ali stranko …"
              datumOd={obdobjeOd}
              datumDo={obdobjeDo}
              onDatumOd={setObdobjeOd}
              onDatumDo={setObdobjeDo}
              statusOznaka="Status pogodbe"
              statusVrednost={statusPogodba}
              onStatus={v => setStatusPogodba(v as 'vse' | FlowContractStatus)}
              statusOpcije={[{ vrednost: 'vse', oznaka: 'Vse' }, ...(Object.entries(contractLabels) as Array<[FlowContractStatus, string]>).map(([v, n]) => ({ vrednost: v, oznaka: n }))]}
              aktivnihFiltrov={stFiltrov}
              onPocisti={pocistiFiltre}
              akcija={<Link className="af-akcija-gumb" href={`${base}/kalkulator/pogodbe`}>+ Nova pogodba</Link>}
            />

            {!contracts.length ? (
              <p className="arh-prazno">Prva shranjena pogodba se bo prikazala tukaj.</p>
            ) : !pogodbePrikaz.length ? (
              <p className="arh-prazno">Ni pogodb za to iskanje ali filter.</p>
            ) : (
              <div className="arh-tabela-ovoj">
                <div className="arh-tabela arh-tabela-pogodbe">
                  <header><span>Pogodba</span><span>Stranka</span><span>Datum</span><span>Status</span><span>Opomba</span><span /></header>
                  {pogodbePrikaz.map(c => {
                    const op = opombaInfo(c.notes);
                    return (
                      <button key={c.id} type="button" className="arh-vrstica" onClick={() => { setDetObsegOdprt(false); setDetajl({ vrsta: 'pogodba', zapis: c }); }}>
                        <span className="arh-glavna"><span className="arh-ikona" aria-hidden><Scroll size={17} /></span><strong>{c.title}</strong></span>
                        <span className="arh-mut">{c.client}</span>
                        <span className="arh-mut">{datStr(c.date)}</span>
                        <span className="arh-mut">{contractLabels[c.status]}</span>
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
            <ArhivFilter
              iskanje={iskanje}
              onIskanje={setIskanje}
              placeholder="Poišči račun, stranko ali številko …"
              datumOd={obdobjeOd}
              datumDo={obdobjeDo}
              onDatumOd={setObdobjeOd}
              onDatumDo={setObdobjeDo}
              statusOznaka="Plačilo"
              statusVrednost={placano}
              onStatus={v => setPlacano(v as 'vse' | 'placano' | 'odprto')}
              statusOpcije={[{ vrednost: 'vse', oznaka: 'Vsi' }, { vrednost: 'placano', oznaka: 'Plačani' }, { vrednost: 'odprto', oznaka: 'Odprti' }]}
              aktivnihFiltrov={stFiltrov}
              onPocisti={pocistiFiltre}
              akcija={<Link className="af-akcija-gumb" href={`${base}/kalkulator/racuni`}>+ Nov račun</Link>}
            />

            {!invoices.length ? (
              <p className="arh-prazno">Prvi shranjeni račun se bo prikazal tukaj.</p>
            ) : !racuniPrikaz.length ? (
              <p className="arh-prazno">Ni računov za to iskanje ali filter.</p>
            ) : (
              <div className="arh-tabela-ovoj">
                <div className="arh-tabela arh-tabela-racuni">
                  <header><span>Račun</span><span>Št.</span><span>Stranka</span><span className="arh-desno">Znesek</span><span>Datum</span><span>Stanje</span><span /></header>
                  {racuniPrikaz.map(r => (
                    <button key={r.id} type="button" className="arh-vrstica" onClick={() => setDetajl({ vrsta: 'racun', zapis: r })}>
                      <span className="arh-glavna"><span className="arh-ikona" aria-hidden><Receipt size={17} /></span><strong>{r.title || `Račun ${r.number || ''}`}</strong></span>
                      <span className="arh-mut">{r.number || '—'}</span>
                      <span className="arh-mut">{r.client}</span>
                      <span className="arh-desno">{eur(r.amount)}</span>
                      <span className="arh-mut">{datStr(r.date)}</span>
                      <span><small className={'arh-znacka ' + (r.paid ? 'arh-znacka-placano' : 'arh-znacka-odprto')}>{r.paid ? 'Plačano' : 'Odprto'}</small></span>
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
                <div className="arh-det-meta">
                  <span><small>Stranka</small><strong>{o.client}</strong></span>
                  <span><small>Datum</small><strong>{datStr(o.date)}</strong></span>
                  <span><small>Številka</small><strong>{o.number || '—'}</strong></span>
                  <span><small>Znesek</small><strong>{dokZnesek(o.agreedAmount)}</strong></span>
                </div>
                <div className="arh-det-obseg">
                  <span className="arh-filter-oznaka">Obseg</span>
                  {o.scope.length
                    ? <ul>{o.scope.map((s, i) => <li key={`${s}-${i}`}>{s}</li>)}</ul>
                    : <p className="arh-mini">Ponudba nima vpisanega obsega.</p>}
                </div>
                <a className="arh-povezava" href={`${base}/kalkulator/orodje`}>Odpri v kalkulatorju ↗</a>
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
                <a className="arh-povezava" href={`${base}/kalkulator/pogodbe`}>Odpri v Pogodbah ↗</a>
              </>;
            })()}

            {detajl.vrsta === 'racun' && (() => {
              const r = detajl.zapis;
              return <>
                <p className={styles.eyebrow}>RAČUN · {r.paid ? 'PLAČAN' : 'ODPRT'}</p>
                <h2 id="arh-detajl-naslov">{r.title || `Račun ${r.number || ''}`}</h2>
                <div className="arh-det-meta">
                  <span><small>Stranka</small><strong>{r.client}</strong></span>
                  <span><small>Številka</small><strong>{r.number || '—'}</strong></span>
                  <span><small>Znesek</small><strong>{eur(r.amount)}</strong></span>
                  <span><small>Datum</small><strong>{datStr(r.date)}</strong></span>
                </div>
                {/* telesa racuna arhiv ne hrani — samo meta + pot v Racune (racuna tu ne generiramo) */}
                <p className="arh-mini">Celoten račun s postavkami in PDF pripraviš v razdelku Računi.</p>
                <a className="arh-povezava" href={`${base}/kalkulator/racuni`}>Odpri v Računih ↗</a>
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
        .arh-vsebina{position:relative;z-index:1;width:100%;max-width:100%;margin:0;padding:clamp(1.6rem,4vw,2.6rem) 0 6rem;min-width:0}
        .arh-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0 0 .3rem}
        .arh-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(2.4rem,6vw,4rem);line-height:1;letter-spacing:-.012em;margin:0 0 .6rem;color:var(--ink)}
        .arh-uvod{font-size:1rem;line-height:1.55;color:rgba(17,17,17,.72);margin:0 0 2rem;max-width:38rem}

        /* zavihki + segpills (kopija .rw-segpills) */
        .arh-segpills{display:inline-flex;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.25rem;gap:.15rem;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
        .arh-segpills button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .9rem;border-radius:999px;cursor:pointer;white-space:nowrap;transition:background .18s,color .18s}
        .arh-segpills button.on{background:var(--ink);color:var(--paper)}
        .arh-zavihki{margin:0 0 1.6rem}

        .arh-panel{animation:arhSek .45s cubic-bezier(.16,1,.3,1) both;min-width:0}
        @keyframes arhSek{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion:reduce){.arh-panel{animation:none}}
        /* projekti: obstojeci ProjectsWorkspace ima svoj razmik — le malo zraka nad njim */
        .arh-projekti{margin-top:.4rem}

        /* oznaka skupine — se uporablja v detajl panelu (Obseg); filtri jih ne kazejo vec */
        .arh-filter-oznaka{font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(17,17,17,.55)}

        /* razmik med filtrom in tabelo */
        .arh-panel > .af{margin:0 0 1rem}

        /* povzetek Racuni (preseljeno iz InvoiceWorkspace — vzorec MetricIcon,
           v videzu Arhiva: mehke papirnate kartice namesto belih dashboard kartic) */
        .arh-metrike{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:0 0 1.2rem}
        .arh-metrika{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;min-height:7.4rem;padding:1rem 1.1rem;border:1px solid rgba(17,17,17,.1);border-radius:14px}
        .arh-metrika small{position:relative;z-index:1;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(17,17,17,.55)}
        .arh-metrika strong{position:relative;z-index:1;margin-top:auto;font:500 1.7rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .arh-metrika span{position:relative;z-index:1;margin-top:.2rem;color:rgba(17,17,17,.55);font-size:.78rem}
        .arh-metrika-izdano{background:linear-gradient(140deg,oklch(95% .035 295),oklch(90% .065 297))}
        .arh-metrika-placano{background:linear-gradient(140deg,oklch(96% .035 160),oklch(87% .08 163))}
        .arh-metrika-odprto{background:linear-gradient(140deg,oklch(97% .03 65),oklch(90% .07 60))}
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
        .arh-tabela-ponudbe{grid-template-columns:minmax(0,2.2fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.8fr) 1.6rem}
        .arh-tabela-pogodbe{grid-template-columns:minmax(0,2fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.6fr) 1.6rem}
        .arh-tabela-racuni{grid-template-columns:minmax(0,1.9fr) minmax(0,1fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.9fr) 1.6rem}
        .arh-tabela > header{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;padding:.7rem .9rem;font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(17,17,17,.5);border-bottom:1px solid rgba(17,17,17,.1)}
        .arh-vrstica{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;gap:.6rem;padding:.85rem .9rem;border:none;border-bottom:1px solid rgba(17,17,17,.07);background:transparent;font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:background .14s}
        .arh-vrstica:last-child{border-bottom:none}
        .arh-vrstica:hover{background:rgba(255,255,255,.6)}
        .arh-vrstica > span{min-width:0;font-size:.86rem;overflow-wrap:anywhere}
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
        .arh-znacka{display:inline-block;padding:.2rem .6rem;border-radius:999px;font-size:.72rem;font-weight:700}
        .arh-znacka-placano{background:oklch(88% .09 162);color:oklch(38% .09 162)}
        .arh-znacka-odprto{background:oklch(92% .05 65);color:oklch(45% .1 65)}

        /* ── detajl panel (vzorec ContractWorkspace) ── */
        .arh-detajl{width:min(42rem,94vw);display:flex;flex-direction:column;gap:.2rem}
        .arh-detajl h2{margin:.4rem 0 1.2rem;font-family:var(--font-serif),Didot,serif;font-weight:600;font-size:clamp(1.8rem,3vw,2.6rem);line-height:1.05;color:var(--ink)}
        /* lepljivi X ostane v kotu med drsenjem (kopija .pg-det-x) */
        .arh-det-x{position:sticky;top:.4rem;z-index:6;align-self:flex-end;flex:0 0 auto;display:grid;place-items:center;width:2.2rem;height:2.2rem;margin:0 0 -2.2rem;padding:0;border:1px solid rgba(17,17,17,.18);border-radius:50%;background:var(--paper);color:var(--ink);font-size:1rem;line-height:1;cursor:pointer;box-shadow:0 4px 14px rgba(17,17,17,.12)}
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
