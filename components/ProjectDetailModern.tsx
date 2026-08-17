'use client';

/* Moderni (work-first) pogled detajla projekta — DODATEN pogled ob obstojecem
   tabelnem (ProjectsWorkspace ga izbere prek preklopa). Bere ISTE podatke kot
   tabelni (selected), zato nic novega ne shranjuje. Kolaboracijski deli (dodaj/
   odvzemi sodelavca, AI agenti s statusi, cross-org) so za zdaj UI/lokalno —
   pravo zaledje pride post-launch. Uporablja app CSS tokene (DM Serif/Archivo,
   --accent/--paper/--ink/--line), da samodejno sledi CGP. */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import MetricIcon from '@/components/MetricIcon';
import type { FlowOffer, FlowInvoice, FlowContract, FlowExpense, FlowProjectLink } from '@/lib/pinartFlowStore';
import type { Projekt } from '@/lib/projekti';
import type { Sodelavec } from '@/lib/naloge';
import type { PostaVnos } from '@/lib/postaDnevnik';
import { vlogaOznaka } from '@/lib/sodelavci';

export type ModernProject = {
  offer: FlowOffer;
  real?: Projekt;
  invoices: FlowInvoice[];
  expenses: FlowExpense[];
  contracts: FlowContract[];
  billed: number;
  paid: number;
  costs: number;
  agreed: number;
  unbilled: number;
  profit: number;
};

/* stanje sodelavca/agenta na projektu (orkestracija — vidno kdo dela / je koncal
   / caka na tvoj pregled). Pravi vir statusa pride s kolaboracijo/agenti; za zdaj
   ga podamo iz predogleda, da se vidi smer. */
export type EkipaStanje = 'dela' | 'koncal' | 'review';
export type AgentClan = { id: string; ime: string; stanje: EkipaStanje };
export type CrmVnos = { id: string; datum: string; tip: string; opis: string };
export type NalogaLite = { id: string; naslov: string; status: 'todo' | 'dela' | 'pregled' | 'koncano'; oseba?: string };

const zacetnice = (ime: string) => ime.split(/\s+/).filter(Boolean).slice(0, 2).map(d => d[0]?.toUpperCase() || '').join('') || '?';

/* iniciale + barven krogec iz e-naslova (da poštni seznam ni pust) */
const mailIniciale = (naslov: string) => {
  const lokalni = (naslov || '').split('@')[0].replace(/[^a-zA-ZčšžćđČŠŽĆĐ]+/g, ' ').trim();
  const d = lokalni.split(/\s+/).filter(Boolean);
  return ((d[0]?.[0] || '?') + (d[1]?.[0] || '')).toUpperCase();
};
const hueOd = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const avatarOzadje = (s: string) => `linear-gradient(135deg, oklch(72% .13 ${hueOd(s)}), oklch(63% .15 ${(hueOd(s) + 45) % 360}))`;
/* barva pike CRM vnosa po tipu */
const crmBarva = (tip: string) => {
  const t = (tip || '').toLowerCase();
  return t.includes('sestanek') ? 'oklch(66% .2 297)' : t.includes('klic') ? 'oklch(62% .15 150)' : (t.includes('pošt') || t.includes('mail') || t.includes('mejl')) ? 'oklch(68% .14 250)' : t.includes('dogovor') ? 'oklch(72% .15 60)' : 'oklch(62% .02 70)';
};

/* CGP puscica (enaka kot .puscica-svg drugod v portalu) — diagonalna NE */
const Puscica = () => (
  <svg className="pm-arr" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg>
);

export default function ProjectDetailModern({
  data, sodelavci, jeEn, base, money, canEditTeam = false, onToggleMember, posta = [], onOpenZapis, onSaveAgreed, onSaveBrief, ekipaStatus, agenti = [], links = [], crmVnosi = [], onOdpriKomunikacije, onOdpriVse, onOdpriDokument, naloge = [], onOdpriMail, onOdpriDokumentacija,
}: {
  data: ModernProject;
  sodelavci: Sodelavec[];
  jeEn: boolean;
  base: string;
  money: (n: number) => string;
  canEditTeam?: boolean;
  onToggleMember?: (sodelavecId: string) => void;
  posta?: PostaVnos[];
  onOpenZapis?: () => void;
  onSaveAgreed?: (value: number) => void;
  onSaveBrief?: (patch: Partial<Projekt>) => void;
  ekipaStatus?: Record<string, EkipaStanje>;
  agenti?: AgentClan[];
  links?: FlowProjectLink[];
  crmVnosi?: CrmVnos[];
  onOdpriKomunikacije?: () => void;
  onOdpriVse?: (tip: 'pogodbe' | 'racuni' | 'stroski') => void;
  onOdpriDokument?: (tip: 'pogodbe' | 'racuni' | 'stroski', item: FlowContract | FlowInvoice | FlowExpense) => void;
  onOdpriDokumentacija?: () => void;
  naloge?: NalogaLite[];
  onOdpriMail?: (v: PostaVnos) => void;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const { offer, real } = data;
  const [dodajOdprt, setDodajOdprt] = useState(false);
  const [briefOdprt, setBriefOdprt] = useState(false);
  const [ciljiUrejam, setCiljiUrejam] = useState(false);
  const [taskOdprt, setTaskOdprt] = useState<NalogaLite | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const dodeljeniIds = real?.dodeljeni || [];
  const ekipa = dodeljeniIds.map(id => sodelavci.find(s => s.id === id)).filter(Boolean) as Sodelavec[];
  const naVoljo = sodelavci.filter(s => s.aktiven && !dodeljeniIds.includes(s.id));
  const urejaEkipo = canEditTeam && !!onToggleMember;
  const stanjeOznaka = (st: EkipaStanje) => st === 'review' ? L('za pregled', 'for review') : st === 'koncal' ? L('končal', 'done') : L('dela', 'working');
  const clani = ekipa.map(s => ({ id: s.id, ime: s.ime, pod: vlogaOznaka(s.vloga), stanje: ekipaStatus?.[s.id], jeAgent: false }));
  const agentClani = agenti.map(a => ({ id: a.id, ime: a.ime, pod: L('AI agent', 'AI agent'), stanje: a.stanje as EkipaStanje | undefined, jeAgent: true }));
  const vsiClani = [...clani, ...agentClani];
  const zaPregled = vsiClani.filter(c => c.stanje === 'review').length;
  const komAktivna = [...posta].filter(v => !v.izbrisano).sort((a, b) => b.datum.localeCompare(a.datum));
  const komZadnje = komAktivna.slice(0, 4);
  const datKratko = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI', { day: '2-digit', month: '2-digit' }); };
  const datPolno = (d: Date) => d.toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
  /* prihajajoci datumi = roki placila odprtih racunov (date + dueDays) */
  const rokRacuna = (inv: FlowInvoice) => { const d = new Date(inv.date); d.setDate(d.getDate() + (inv.dueDays || 15)); return d; };
  const roki = data.invoices
    .filter(i => !i.paid)
    .map(i => ({ id: i.id, oznaka: i.number || i.title, rok: rokRacuna(i) }))
    .filter(r => !isNaN(r.rok.getTime()))
    .sort((a, b) => a.rok.getTime() - b.rok.getTime())
    .slice(0, 4);
  const danesMs = Date.parse(new Date().toISOString().slice(0, 10));
  const dniDo = (d: Date) => Math.round((Date.parse(d.toISOString().slice(0, 10)) - danesMs) / 86400000);
  const dodatna = real?.dodatnaVprasanja?.filter(v => v.vprasanje?.trim()) || [];
  const pogodbeSort = [...data.contracts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const racuniSort = [...data.invoices].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const strosekSort = [...data.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const NAJVEC = 4;
  const briefPolja: Array<[string, string | undefined]> = real ? [
    [L('Cilj / želje', 'Goal / wishes'), real.zelje],
    [L('Stranka', 'Client'), real.opisStranke],
    [L('Panoga', 'Industry'), real.panoga],
    [L('Ciljna publika', 'Target audience'), real.ciljnaSkupina],
    [L('Dizajn želje', 'Design wishes'), real.dizajnZelje],
    [L('Ton / glas', 'Tone / voice'), real.voice],
    [L('Konkurenca', 'Competitors'), real.konkurenca],
  ].filter(([, v]) => v && v.trim()) as Array<[string, string]> : [];
  const cilji = real?.cilji?.filter(c => c.besedilo?.trim()) || [];
  const imaBrief = briefPolja.length > 0 || cilji.length > 0 || dodatna.length > 0;

  return (
    <div className="pm">
      {/* EKIPA & STATUSI */}
      <div className="pm-team">
        <span className="pm-team-lbl">{L('Na projektu', 'On this project')}</span>
        {zaPregled > 0 && <span className="pm-alert">{zaPregled} {jeEn ? 'awaiting your review' : (zaPregled === 1 ? 'čaka na tvoj pregled' : 'čakajo na tvoj pregled')}</span>}
        {vsiClani.length ? vsiClani.map(c => (
          <span key={c.id} className={'pm-member' + (c.jeAgent ? ' pm-member-ai' : '')} data-st={c.stanje || ''}>
            <span className={'pm-av' + (c.jeAgent ? ' pm-av-ai' : '')}>{c.jeAgent ? '✦' : zacetnice(c.ime)}</span>
            <span className="pm-mtxt"><b>{c.ime}</b><small>{c.pod}</small></span>
            {c.stanje && <span className="pm-st" data-st={c.stanje}>{stanjeOznaka(c.stanje)}</span>}
            {urejaEkipo && !c.jeAgent && <button type="button" className="pm-mx" onClick={() => onToggleMember!(c.id)} aria-label={`${L('Odstrani', 'Remove')} ${c.ime}`}>×</button>}
          </span>
        )) : <span className="pm-empty">{L('Še ni sodelavcev na projektu.', 'No collaborators on this project yet.')}</span>}
        {urejaEkipo ? (
          <span className="pm-add-wrap">
            <button type="button" className="pm-addmember" aria-expanded={dodajOdprt} onClick={() => setDodajOdprt(o => !o)}>+ {L('Dodaj', 'Add')}</button>
            {dodajOdprt && (
              <div className="pm-add-menu">
                {naVoljo.length ? naVoljo.map(s => (
                  <button key={s.id} type="button" className="pm-add-opt" onClick={() => { onToggleMember!(s.id); setDodajOdprt(false); }}>
                    <span className="pm-av pm-av-sm">{zacetnice(s.ime)}</span><b>{s.ime}</b><small>{vlogaOznaka(s.vloga)}</small>
                  </button>
                )) : <p className="pm-add-empty">{L('Vsi sodelavci so že dodani.', 'All collaborators already added.')}</p>}
                <Link href={`${base}/kalkulator/ekipa`} className="pm-add-manage">{L('Uredi ekipo', 'Manage team')} <Puscica /></Link>
              </div>
            )}
          </span>
        ) : (
          <Link href={`${base}/kalkulator/ekipa`} className="pm-addmember">+ {L('Sodelavci', 'Collaborators')}</Link>
        )}
        <span className="pm-soon">{L('Deljenje projekta + AI agenti = kmalu', 'Project sharing + AI agents = soon')}</span>
      </div>

      <div className="pm-grid">
        <div className="pm-col">
          {/* AKTIVNI TASKI (skupaj s sodelavci — kdo dela kaj) */}
          <section className="pm-card">
            <header>
              <h3>{L('AKTIVNI TASKI', 'ACTIVE TASKS')}</h3>
              <span className="pm-hact">
                <Link className="pm-act" href={`${base}/kalkulator/naloge`}>{L('Več', 'More')} <Puscica /></Link>
                <Link className="pm-iconbtn" href={`${base}/kalkulator/naloge`} aria-label={L('Dodaj nalogo', 'Add task')}>+</Link>
              </span>
            </header>
            {naloge.length ? (
              <ul className="pm-naloge">
                {naloge.slice(0, 4).map(n => (
                  <li key={n.id}>
                    <button type="button" className="pm-naloga pm-naloga-link" onClick={() => setTaskOdprt(n)}>
                      <span className="pm-naloga-dot" data-st={n.status} aria-hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg></span>
                      <span className="pm-naloga-t">{n.naslov}</span>
                      {n.oseba && <span className="pm-naloga-av" style={{ background: avatarOzadje(n.oseba) }} aria-hidden>{zacetnice(n.oseba)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="pm-muted">{L('Naloge tega projekta vodiš v Task managerju. Povezava naloga↔projekt pride s kolaboracijo.', 'You manage this project’s tasks in the Task manager. Task-to-project linking comes with collaboration.')}</p>}
          </section>

          {/* BRIEF */}
          <section className="pm-card pm-brief">
            <header><h3>{L('BRIEF · ŽELJE STRANKE', 'BRIEF · CLIENT WISHES')}</h3>{real && <button type="button" className="pm-act" onClick={() => setBriefOdprt(true)}>{onSaveBrief ? L('Uredi', 'Edit') : L('Več', 'More')} <Puscica /></button>}</header>
            <div className="pm-title">{L('Kaj gradimo in za koga.', 'What we build and for whom.')}</div>
            {briefPolja.length ? briefPolja.map(([k, v]) => (
              <div key={k} className="pm-brow"><span className="pm-bk">{k}</span><span className="pm-bv">{v}</span></div>
            )) : offer.scope?.length ? (
              <div className="pm-brow"><span className="pm-bk">{L('Obseg', 'Scope')}</span><span className="pm-bv">{offer.scope.join(' · ')}</span></div>
            ) : <p className="pm-muted">{L('Brief še ni izpolnjen. Dodaš ga ob odprtju projekta (vprašanja).', 'The brief is not filled in yet. Add it when opening the project (questions).')}</p>}
          </section>

          {(cilji.length > 0 || (real && onSaveBrief)) && (
            <section className="pm-card">
              <header><h3>{L('CILJI PROJEKTA', 'PROJECT GOALS')}</h3>{real && (onSaveBrief
                ? <button type="button" className="pm-act" onClick={() => setCiljiUrejam(v => !v)}>{ciljiUrejam ? L('Končaj', 'Done') : L('Uredi', 'Edit')} <Puscica /></button>
                : <button type="button" className="pm-act" onClick={() => setBriefOdprt(true)}>{L('Več', 'More')} <Puscica /></button>)}</header>
              {ciljiUrejam && onSaveBrief && real ? (
                <div className="pm-cilji-edit">
                  {(real.cilji || []).map((c, i) => (
                    <div key={c.id} className="pm-cilj-row">
                      <input className="pm-inp" defaultValue={c.besedilo} placeholder={L('Cilj …', 'Goal …')} onBlur={e => onSaveBrief({ cilji: (real.cilji || []).map((x, j) => j === i ? { ...x, besedilo: e.target.value } : x) })} />
                      <input className="pm-inp pm-inp-s" defaultValue={c.metrika || ''} placeholder={L('metrika', 'metric')} onBlur={e => onSaveBrief({ cilji: (real.cilji || []).map((x, j) => j === i ? { ...x, metrika: e.target.value.trim() || undefined } : x) })} />
                      <input className="pm-inp pm-inp-s" defaultValue={c.tarca || ''} placeholder={L('tarča', 'target')} onBlur={e => onSaveBrief({ cilji: (real.cilji || []).map((x, j) => j === i ? { ...x, tarca: e.target.value.trim() || undefined } : x) })} />
                      <button type="button" className="pm-cilj-x" aria-label={L('Odstrani cilj', 'Remove goal')} onClick={() => onSaveBrief({ cilji: (real.cilji || []).filter((_, j) => j !== i) })}>✕</button>
                    </div>
                  ))}
                  <button type="button" className="pm-cilj-add" onClick={() => onSaveBrief({ cilji: [...(real.cilji || []), { id: crypto.randomUUID(), besedilo: '' }] })}>+ {L('Dodaj cilj', 'Add goal')}</button>
                </div>
              ) : (
                <ul className="pm-goals">
                  {cilji.map(c => (
                    <li key={c.id}><span className="pm-goal-b">{c.besedilo}</span>{(c.metrika || c.tarca) && <span className="pm-goal-t">{[c.metrika, c.tarca].filter(Boolean).join(' · ')}</span>}</li>
                  ))}
                  {cilji.length === 0 && <li className="pm-muted">{L('Ni ciljev — klikni Uredi za dodajanje.', 'No goals — click Edit to add.')}</li>}
                </ul>
              )}
            </section>
          )}

          {/* PRIHAJAJOČI DATUMI */}
          <section className="pm-card">
            <header><h3>{L('PRIHAJAJOČI DATUMI', 'UPCOMING DATES')}</h3><Link className="pm-act" href={`${base}/kalkulator/koledar`}>{L('Koledar', 'Calendar')} <Puscica /></Link></header>
            {roki.length ? (
              <ul className="pm-roki">
                {roki.map(r => { const d = dniDo(r.rok); return (
                  <li key={r.id}>
                    <Link href={`${base}/kalkulator/koledar?datum=${r.rok.toISOString().slice(0, 10)}`} className="pm-rok pm-rok-link">
                      <span className="pm-rok-pika" data-late={d < 0 ? 'true' : 'false'} aria-hidden />
                      <span className="pm-rok-txt">{L('Rok plačila', 'Payment due')} · {r.oznaka}</span>
                      <span className="pm-rok-dan">{datPolno(r.rok)}{d < 0 ? ` · ${L('zapadlo', 'overdue')}` : d === 0 ? ` · ${L('danes', 'today')}` : ` · ${jeEn ? `in ${d}d` : `čez ${d} dni`}`}</span>
                    </Link>
                  </li>
                ); })}
              </ul>
            ) : <p className="pm-muted">{L('Ni odprtih rokov. Sestanke in roke povežeš prek Koledarja.', 'No open deadlines. Link meetings and deadlines via the Calendar.')}</p>}
          </section>

          {/* KOMUNIKACIJA */}
          <section className="pm-card">
            <header>
              <h3>{L('KOMUNIKACIJA', 'COMMUNICATION')}{komAktivna.length ? ` · ${komAktivna.length}` : ''}</h3>
              {(onOdpriKomunikacije || onOpenZapis)
                ? <button type="button" className="pm-act" onClick={onOdpriKomunikacije || onOpenZapis}>{L('Odpri vse', 'Open all')} <Puscica /></button>
                : <Link className="pm-act" href={`${base}/kalkulator/projekti?projekt=${offer.id}`}>{L('Odpri', 'Open')} <Puscica /></Link>}
            </header>
            {komZadnje.length ? (
              <ul className="pm-mails">
                {komZadnje.map(v => (
                  <li key={v.id}>
                    <button type="button" className="pm-mail pm-mail-btn" onClick={() => onOdpriMail?.(v)}>
                      <span className="pm-mail-av" style={{ background: avatarOzadje(v.prejemniki[0] || '?') }} aria-hidden>{mailIniciale(v.prejemniki[0] || '?')}</span>
                      <span className="pm-mail-kdo">{v.prejemniki.join(', ') || '—'}</span>
                      <span className="pm-mail-zad">{v.zadeva || L('(brez zadeve)', '(no subject)')}</span>
                      <span className="pm-mail-dan">{datKratko(v.datum)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="pm-muted">{L('Še ni sporočil. Napiši prvo v polnem pogledu.', 'No messages yet. Write the first one in the full view.')}</p>}
          </section>

          {/* CRM DNEVNIK */}
          <section className="pm-card">
            <header><h3>{L('CRM DNEVNIK', 'CRM DIARY')}</h3><Link className="pm-act" href={`${base}/kalkulator/stranke?stranka=${encodeURIComponent(offer.client)}`}>{L('Odpri', 'Open')} <Puscica /></Link></header>
            {crmVnosi.length ? (
              <ul className="pm-crm-list">
                {crmVnosi.slice(0, 4).map(v => (
                  <li key={v.id} className="pm-crm-vnos">
                    <span className="pm-crm-pika" style={{ background: crmBarva(v.tip) }} aria-hidden />
                    <span className="pm-crm-tip">{v.tip}</span>
                    <span className="pm-crm-opis">{v.opis}</span>
                    <span className="pm-crm-dan">{datKratko(v.datum)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="pm-muted">{jeEn ? `Timeline of the relationship with “${offer.client}” — calls, meetings, agreements.` : `Kronologija odnosa s stranko »${offer.client}« — klici, sestanki, dogovori.`}</p>}
          </section>
        </div>

        <div className="pm-col">
          {/* POSLOVNI ZAPIS — finance */}
          <section className="pm-card">
            <header><h3>{L('POSLOVNI ZAPIS', 'BUSINESS RECORD')}</h3></header>
            <div className="pm-fin">
              <div className="pm-f"><small>{L('Dogovorjeno', 'Agreed')}</small>{onSaveAgreed ? <b><input type="number" min="0" step="0.01" defaultValue={data.agreed || ''} onChange={e => onSaveAgreed(Number(e.target.value))} aria-label={L('Dogovorjena vrednost', 'Agreed value')} style={{ width: '6rem', maxWidth: '100%', border: 0, borderBottom: '1.5px solid currentColor', background: 'transparent', font: 'inherit', color: 'inherit', padding: 0 }} /> €</b> : <b>{data.agreed ? money(data.agreed) : '—'}</b>}<span className="pm-f-ic"><MetricIcon type="document" /></span></div>
              <div className="pm-f"><small>{L('Zaračunano', 'Billed')}</small><b>{money(data.billed)}</b><span className="pm-f-ic"><MetricIcon type="paid" /></span></div>
              <div className="pm-f"><small>{L('Še ni zaračunano', 'Not yet billed')}</small><b>{data.agreed ? money(data.unbilled) : '—'}</b><span className="pm-f-ic"><MetricIcon type="cost" /></span></div>
              <div className="pm-f"><small>{L('Ocenjeni rezultat', 'Estimated result')}</small><b>{money(data.profit)}</b><span className="pm-f-ic"><MetricIcon type="profit" /></span></div>
            </div>
          </section>

          {/* PONUDBE IN POGODBE (osnova projekta — obicajno 1 ponudba + 1 pogodba +aneks) */}
          <section className="pm-card">
            <header><h3>{L('PONUDBE IN POGODBE', 'OFFERS & CONTRACTS')}</h3><Link className="pm-iconbtn" href={`${base}/kalkulator/pogodbe`} aria-label={L('Dodaj pogodbo', 'Add contract')}>+</Link></header>
            <ul className="pm-list">
              <li>
                <Link className="pm-li pm-li-btn" href={`${base}/kalkulator/orodje?od=pregled`}>
                  <span className="pm-li-tip" data-tip="ponudba">{L('Ponudba', 'Offer')}</span>
                  <span className="pm-li-n">{offer.number || offer.title}{offer.scope?.length ? ` · ${offer.scope.length} ${L('postavk', 'items')}` : ''}</span>
                  <span className="pm-li-a">{data.agreed ? money(data.agreed) : '—'}</span>
                </Link>
              </li>
              {pogodbeSort.slice(0, NAJVEC).map(c => (
                <li key={c.id}>
                  <button type="button" className="pm-li pm-li-btn" onClick={() => onOdpriDokument?.('pogodbe', c)}>
                    <span className="pm-li-tip" data-tip="pogodba">{L('Pogodba', 'Contract')}</span>
                    <span className="pm-li-n">{c.title}</span>
                    <span className="pm-li-s">{c.status}</span>
                    <span className="pm-li-d">{datKratko(c.date)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {pogodbeSort.length > NAJVEC && (onOdpriVse || onOpenZapis) && <button type="button" className="pm-vec" onClick={() => onOdpriVse ? onOdpriVse('pogodbe') : onOpenZapis?.()}>{L('Prikaži vse pogodbe', 'Show all contracts')} ({pogodbeSort.length}) <Puscica /></button>}
          </section>

          {/* RAČUNI */}
          <section className="pm-card">
            <header><h3>{L('RAČUNI', 'INVOICES')} · {money(data.billed)}</h3><Link className="pm-iconbtn" href={`${base}/kalkulator/racuni`} aria-label={L('Dodaj račun', 'Add invoice')}>+</Link></header>
            {racuniSort.length ? (<>
              <ul className="pm-list">
                {racuniSort.slice(0, NAJVEC).map(r => (
                  <li key={r.id}><button type="button" className="pm-li pm-li-btn" onClick={() => onOdpriDokument?.('racuni', r)}><span className="pm-li-pika" data-paid={r.paid ? 'true' : 'false'} aria-hidden /><span className="pm-li-n">{r.number || r.title}</span><span className="pm-li-a">{money(r.amount)}</span></button></li>
                ))}
              </ul>
              {racuniSort.length > NAJVEC && (onOdpriVse || onOpenZapis) && <button type="button" className="pm-vec" onClick={() => onOdpriVse ? onOdpriVse('racuni') : onOpenZapis?.()}>{L('Prikaži vse', 'Show all')} ({racuniSort.length}) <Puscica /></button>}
            </>) : <p className="pm-muted">{L('Še ni računov.', 'No invoices yet.')}</p>}
          </section>

          {/* STROŠKI */}
          <section className="pm-card">
            <header><h3>{L('STROŠKI', 'EXPENSES')} · {money(data.costs)}</h3><Link className="pm-iconbtn" href={`${base}/kalkulator/stroski`} aria-label={L('Dodaj strošek', 'Add expense')}>+</Link></header>
            {strosekSort.length ? (<>
              <ul className="pm-list">
                {strosekSort.slice(0, NAJVEC).map(s => (
                  <li key={s.id}><button type="button" className="pm-li pm-li-btn" onClick={() => onOdpriDokument?.('stroski', s)}><span className="pm-li-n">{s.title}</span><span className="pm-li-a">{money(s.amount)}</span></button></li>
                ))}
              </ul>
              {strosekSort.length > NAJVEC && (onOdpriVse || onOpenZapis) && <button type="button" className="pm-vec" onClick={() => onOdpriVse ? onOdpriVse('stroski') : onOpenZapis?.()}>{L('Prikaži vse', 'Show all')} ({strosekSort.length}) <Puscica /></button>}
            </>) : <p className="pm-muted">{L('Ni stroškov.', 'No expenses.')}</p>}
          </section>

          {/* DOKUMENTACIJA (zunanje povezave) */}
          <section className="pm-card">
            <header><h3>{L('DOKUMENTACIJA', 'DOCUMENTATION')}</h3>{(onOdpriDokumentacija || onOpenZapis) && <button type="button" className="pm-iconbtn" onClick={onOdpriDokumentacija || onOpenZapis} aria-label={L('Upravljaj povezave', 'Manage links')}>+</button>}</header>
            {links.length ? (
              <ul className="pm-linki">
                {links.map((l, i) => (
                  <li key={`${l.url}-${i}`}><a href={l.url} target="_blank" rel="noopener noreferrer">{l.oznaka}</a></li>
                ))}
              </ul>
            ) : <button type="button" className="pm-muted pm-dok-prazno" onClick={onOdpriDokumentacija || onOpenZapis}>{L('Ni povezav. Dodaj Figmo, Drive, Miro …', 'No links. Add Figma, Drive, Miro …')}</button>}
          </section>
        </div>
      </div>

      {mounted && briefOdprt && createPortal(
        <div className="pm-modal-back" role="presentation" onMouseDown={() => setBriefOdprt(false)}>
          <div className="pm-modal" role="dialog" aria-modal="true" aria-label={L('Brief projekta', 'Project brief')} onMouseDown={e => e.stopPropagation()}>
            <header className="pm-modal-h">
              <div><p className="pm-modal-kick">{L('BRIEF · VSA VPRAŠANJA', 'BRIEF · ALL QUESTIONS')}</p><h2>{offer.title}</h2></div>
              <button type="button" className="pm-modal-x" onClick={() => setBriefOdprt(false)} aria-label={L('Zapri', 'Close')}>✕</button>
            </header>
            <div className="pm-modal-body">
              {onSaveBrief && real ? (<>
                {([[L('Cilj / želje', 'Goal / wishes'), 'zelje'], [L('Stranka', 'Client'), 'opisStranke'], [L('Panoga', 'Industry'), 'panoga'], [L('Ciljna publika', 'Target audience'), 'ciljnaSkupina'], [L('Dizajn želje', 'Design wishes'), 'dizajnZelje'], [L('Ton / glas', 'Tone / voice'), 'voice'], [L('Konkurenca', 'Competitors'), 'konkurenca']] as Array<[string, keyof Projekt]>).map(([label, key]) => (
                  <label key={key} className="pm-qa pm-qa-edit"><span className="pm-qa-k">{label}</span><textarea className="pm-inp" rows={2} defaultValue={(real[key] as string) || ''} placeholder={L('Vpiši …', 'Type …')} onBlur={e => onSaveBrief({ [key]: e.target.value.trim() || undefined } as Partial<Projekt>)} /></label>
                ))}
                {dodatna.map(v => (
                  <div key={v.id} className="pm-qa"><span className="pm-qa-k">{v.vprasanje}</span><p className="pm-qa-v">{v.odgovor}</p></div>
                ))}
                <p className="pm-muted pm-brief-namig">{L('Cilje urejaš v kartici »Cilji projekta«.', 'Edit goals in the »Project goals« card.')}</p>
              </>) : (<>
                {briefPolja.map(([k, v]) => (
                  <div key={k} className="pm-qa"><span className="pm-qa-k">{k}</span><p className="pm-qa-v">{v}</p></div>
                ))}
                {cilji.length > 0 && (
                  <div className="pm-qa"><span className="pm-qa-k">{L('Cilji', 'Goals')}</span>
                    <ul className="pm-qa-cilji">{cilji.map(c => <li key={c.id}><b>{c.besedilo}</b>{(c.metrika || c.tarca) && <small>{[c.metrika, c.tarca].filter(Boolean).join(' · ')}</small>}</li>)}</ul>
                  </div>
                )}
                {dodatna.map(v => (
                  <div key={v.id} className="pm-qa"><span className="pm-qa-k">{v.vprasanje}</span><p className="pm-qa-v">{v.odgovor}</p></div>
                ))}
                {!imaBrief && <p className="pm-muted">{L('Brief še ni izpolnjen.', 'The brief is not filled in yet.')}</p>}
              </>)}
            </div>
            {real && <Link href={`${base}/kalkulator/nov-projekt?uredi=${real.id}`} className="pm-modal-edit">{L('Celoten urejevalnik', 'Full editor')} <Puscica /></Link>}
          </div>
        </div>
      , document.body)}

      {mounted && taskOdprt && createPortal(
        <div className="pm-modal-back" role="presentation" onMouseDown={() => setTaskOdprt(null)}>
          <div className="pm-modal pm-task-modal" role="dialog" aria-modal="true" aria-label={L('Naloga', 'Task')} onMouseDown={e => e.stopPropagation()}>
            <header className="pm-modal-h">
              <div><p className="pm-modal-kick">{L('NALOGA · TA PROJEKT', 'TASK · THIS PROJECT')}</p><h2>{taskOdprt.naslov}</h2></div>
              <button type="button" className="pm-modal-x" onClick={() => setTaskOdprt(null)} aria-label={L('Zapri', 'Close')}>✕</button>
            </header>
            <div className="pm-modal-body">
              <div className="pm-task-vrs">
                <span className="pm-task-lbl">{L('Status', 'Status')}</span>
                <span className="pm-task-status" data-st={taskOdprt.status}>
                  <span className="pm-naloga-dot" data-st={taskOdprt.status} aria-hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg></span>
                  {taskOdprt.status === 'koncano' ? L('Končano', 'Done') : taskOdprt.status === 'pregled' ? L('V pregledu', 'In review') : taskOdprt.status === 'dela' ? L('V teku', 'In progress') : L('Za začeti', 'To do')}
                </span>
              </div>
              {taskOdprt.oseba && (
                <div className="pm-task-vrs">
                  <span className="pm-task-lbl">{L('Nosilec', 'Owner')}</span>
                  <span className="pm-task-oseba"><span className="pm-naloga-av" style={{ background: avatarOzadje(taskOdprt.oseba) }} aria-hidden>{zacetnice(taskOdprt.oseba)}</span>{taskOdprt.oseba}</span>
                </div>
              )}
              <p className="pm-muted" style={{ marginTop: '.3rem' }}>{L('Celotno nalogo (opis, komentarji, rok) urejaš v Task managerju.', 'You edit the full task (description, comments, due date) in the Task manager.')}</p>
            </div>
            <Link href={`${base}/kalkulator/naloge`} className="pm-modal-edit">{L('Odpri v Task managerju', 'Open in Task manager')} <Puscica /></Link>
          </div>
        </div>
      , document.body)}

      <style dangerouslySetInnerHTML={{ __html: `
        .pm { --pm-ink: var(--ink, oklch(19% 0.014 55)); --pm-paper: var(--paper, oklch(97% 0.012 87)); --pm-line: var(--line, oklch(93% 0.007 82)); --pm-acc: var(--purple, oklch(66% 0.2 297)); --pm-card: #fff; --pm-muted: color-mix(in oklch, var(--ink) 70%, var(--pm-card)); --pm-soft: color-mix(in oklch, var(--ink) 52%, var(--pm-card)); max-width:100%; min-width:0; overflow-x:clip; }
        .pm-team { display:flex; align-items:center; gap:.7rem; flex-wrap:wrap; background:var(--pm-card); border:1px solid var(--pm-line); border-radius:16px; padding:.8rem 1rem; margin-bottom:1.2rem; }
        .pm-team-lbl { font-size:.7rem; letter-spacing:.14em; text-transform:uppercase; color:var(--pm-muted); font-weight:700; }
        .pm-member { display:inline-flex; align-items:center; gap:.5rem; padding:.3rem .6rem .3rem .35rem; border-radius:999px; border:1px solid var(--pm-line); background:var(--pm-card); }
        .pm-av { width:1.7rem; height:1.7rem; border-radius:50%; display:grid; place-items:center; font-size:.7rem; font-weight:700; color:#fff; background:linear-gradient(135deg, var(--pm-acc), oklch(70% .16 320)); }
        .pm-mtxt b { font-size:.8rem; font-weight:650; display:block; line-height:1.1; }
        .pm-mtxt small { font-size:.66rem; color:var(--pm-muted); }
        .pm-addmember { text-decoration:none; display:inline-flex; align-items:center; gap:.3rem; border:1px dashed var(--pm-line); color:var(--pm-muted); border-radius:999px; padding:.42rem .7rem; font-size:.78rem; font-weight:600; }
        .pm-addmember:hover { border-color:var(--pm-acc); color:var(--pm-acc); }
        .pm-mx { border:0; background:none; cursor:pointer; color:var(--pm-muted); font-size:1rem; line-height:1; padding:0 .1rem 0 .2rem; border-radius:50%; }
        .pm-mx:hover { color:oklch(52% .18 25); }
        .pm-add-wrap { position:relative; display:inline-flex; }
        /* Gumb za dodajanje sodelavcev poravnan DESNO v NA PROJEKTU vrstici */
        .pm-team > .pm-addmember, .pm-team > .pm-add-wrap { margin-left:auto; }
        .pm-add-menu { position:absolute; top:calc(100% + .4rem); left:0; z-index:20; min-width:14rem; background:var(--pm-card); border:1px solid var(--pm-line); border-radius:12px; padding:.35rem; box-shadow:0 12px 30px -12px rgba(17,17,17,.25); display:flex; flex-direction:column; gap:.1rem; }
        .pm-add-opt { display:flex; align-items:center; gap:.5rem; width:100%; text-align:left; border:0; background:none; cursor:pointer; padding:.4rem .5rem; border-radius:8px; color:var(--pm-ink); }
        .pm-add-opt:hover { background:var(--pm-paper); }
        .pm-add-opt b { font-size:.82rem; font-weight:600; }
        .pm-add-opt small { margin-left:auto; font-size:.68rem; color:var(--pm-muted); }
        .pm-av-sm { width:1.4rem; height:1.4rem; font-size:.6rem; }
        .pm-add-empty { margin:0; padding:.5rem; font-size:.8rem; color:var(--pm-muted); }
        .pm-add-manage { display:block; text-decoration:none; margin-top:.15rem; padding:.4rem .5rem; font-size:.74rem; font-weight:600; color:var(--pm-acc); border-top:1px solid var(--pm-line); }
        .pm-soon { font-size:.7rem; color:var(--pm-muted); font-style:italic; margin-left:auto; }
        .pm-empty { font-size:.85rem; color:var(--pm-muted); }
        .pm-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:1.1rem; }
        .pm-grid > * { min-width:0; }
        @media (min-width:880px){ .pm-grid { grid-template-columns:1.7fr 1fr; align-items:start; } }
        .pm-col { display:flex; flex-direction:column; gap:1.1rem; }
        .pm-card { background:var(--pm-card); border:1px solid var(--pm-line); border-radius:16px; padding:1.1rem 1.2rem; min-width:0; max-width:100%; overflow:hidden; }
        .pm-card > header h3 { min-width:0; overflow-wrap:anywhere; }
        /* Enaki stranski razmiki: NA PROJEKTU vrstica poravnana s karticami */
        @media (max-width:640px){ .pm-team { padding-left:1rem; padding-right:1rem; } .pm-card { padding-left:.65rem; padding-right:.65rem; } }
        .pm-card > header { display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-bottom:.5rem; }
        .pm-card h3 { margin:0; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:var(--pm-muted); font-weight:700; }
        .pm-title { font-family:var(--font-serif), Georgia, serif; font-size:1.3rem; margin:0 0 .7rem; color:var(--pm-ink); }
        .pm-act { display:inline-flex; align-items:center; gap:.3rem; height:1.9rem; box-sizing:border-box; cursor:pointer; text-decoration:none; border:1px solid color-mix(in oklch, var(--pm-ink) 12%, transparent); background:color-mix(in oklch, var(--pm-ink) 5%, transparent); color:var(--pm-ink); border-radius:999px; padding:0 .85rem; font-size:.74rem; font-weight:700; white-space:nowrap; transition:background .16s ease, border-color .16s ease; }
        .pm-act:hover { background:#fff; color:var(--pm-ink); border-color:var(--pm-ink); }
        /* urejljiva brief polja (inline v panelu) */
        .pm-qa-edit { display:block; }
        .pm-inp { width:100%; box-sizing:border-box; margin-top:.3rem; padding:.5rem .6rem; border:1px solid color-mix(in oklch, #fff 55%, transparent); border-radius:.55rem; background:color-mix(in oklch, #fff 34%, transparent); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); font:inherit; font-size:.9rem; color:var(--pm-ink); resize:vertical; }
        .pm-inp:focus { outline:none; border-color:var(--pm-ink); }
        .pm-cilji-edit { display:flex; flex-direction:column; gap:.4rem; margin-top:.35rem; }
        .pm-cilj-row { display:flex; gap:.35rem; align-items:center; }
        .pm-cilj-row .pm-inp { margin-top:0; }
        .pm-inp-s { flex:0 0 5.5rem; min-width:0; }
        .pm-cilj-x { flex:none; width:2rem; height:2rem; padding:0; border:1px solid color-mix(in oklch, oklch(52% .16 25) 40%, var(--pm-line)); border-radius:50%; background:transparent; color:oklch(52% .16 25); cursor:pointer; }
        .pm-cilj-add { align-self:flex-start; margin-top:.1rem; padding:.4rem .85rem; border:1px dashed var(--pm-line); border-radius:999px; background:transparent; color:var(--pm-ink); font:inherit; font-size:.82rem; font-weight:600; cursor:pointer; }
        .pm-act:hover { background:var(--pm-paper); }
        .pm-brief { background:linear-gradient(165deg, color-mix(in oklab, var(--pm-acc) 8%, var(--pm-card)), var(--pm-card) 72%); }
        .pm-brow { display:flex; align-items:center; gap:.7rem; padding:.72rem 0; border-top:1px solid color-mix(in oklch, var(--pm-ink) 9%, transparent); }
        .pm-brow:first-of-type { border-top:0; }
        .pm-bk { flex:0 0 7rem; min-width:0; color:var(--pm-muted); font-size:.8rem; font-weight:600; overflow-wrap:anywhere; }
        .pm-bv { flex:1; min-width:0; font-size:.88rem; color:var(--pm-ink); overflow-wrap:anywhere; }
        .pm-cilji { display:flex; flex-direction:column; gap:.35rem; margin-top:.7rem; }
        .pm-cilj { font-size:.85rem; color:var(--pm-ink); }
        .pm-muted { color:var(--pm-muted); font-size:.86rem; margin:.2rem 0 0; }
        .pm-dok-prazno { display:block; width:100%; border:0; background:none; text-align:left; cursor:pointer; font:inherit; padding:.2rem 0; }
        .pm-dok-prazno:hover { color:var(--pm-acc); }
        .pm-mails { list-style:none; margin:.2rem 0 0; padding:0; display:flex; flex-direction:column; }
        .pm-mail { display:flex; align-items:center; gap:.6rem; padding:.72rem .6rem; margin:0 -.6rem; border-radius:10px; }
        .pm-mails > li + li { border-top:1px solid color-mix(in oklch, var(--pm-ink) 9%, transparent); }
        .pm-mail-btn { width:100%; box-sizing:border-box; border:0; background:none; cursor:pointer; text-align:left; font:inherit; border-radius:10px; }
        .pm-mail-btn:hover { background:var(--pm-paper); }
        .pm-mails > li:has(.pm-mail-btn:hover), .pm-mails > li:has(.pm-mail-btn:hover) + li { border-top-color:transparent; }
        .pm-mail-kdo { flex:0 0 30%; min-width:0; font-size:.8rem; font-weight:600; color:var(--pm-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pm-mail-zad { flex:1; min-width:0; font-size:.82rem; color:var(--pm-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pm-mail-dan { flex:none; font-size:.7rem; color:var(--pm-muted); font-variant-numeric:tabular-nums; }
        .pm-fin { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:.6rem; margin-bottom:.8rem; }
        .pm-fin .pm-f b { overflow-wrap:anywhere; }
        .pm-f { border:1px solid var(--pm-line); border-radius:12px; padding:.7rem .8rem; background:var(--pm-paper); }
        .pm-f small { font-size:.72rem; color:var(--pm-muted); }
        .pm-f b { display:block; font-family:var(--font-sans), system-ui, sans-serif; font-weight:700; font-size:1.25rem; margin-top:.15rem; color:var(--pm-ink); }
        .pm-fin .pm-f { border-color:transparent; position:relative; overflow:hidden; min-height:5.2rem; }
        .pm-fin .pm-f:nth-child(1) { background:linear-gradient(140deg, oklch(96% .035 295), oklch(88% .075 297)); }
        .pm-fin .pm-f:nth-child(2) { background:linear-gradient(140deg, oklch(96% .035 160), oklch(86% .08 163)); }
        .pm-fin .pm-f:nth-child(3) { background:linear-gradient(140deg, oklch(97% .025 87), oklch(91% .045 87)); }
        .pm-fin .pm-f:nth-child(4) { background:linear-gradient(140deg, oklch(97% .03 65), oklch(89% .075 60)); }
        .pm-fin .pm-f small, .pm-fin .pm-f b { position:relative; z-index:1; }
        .pm-fin .pm-f small { color:color-mix(in oklch, var(--pm-ink) 62%, transparent); }
        .pm-f-ic { position:absolute; z-index:0; right:.5rem; bottom:.4rem; width:3.2rem; display:grid; place-items:center; opacity:.16; transform:rotate(-9deg); pointer-events:none; }
        .pm-f-ic svg { width:3rem !important; height:3rem !important; }
        .pm-fin .pm-f:nth-child(1) .pm-f-ic { color:var(--pm-acc); }
        .pm-fin .pm-f:nth-child(2) .pm-f-ic { color:oklch(58% .15 160); }
        .pm-fin .pm-f:nth-child(3) .pm-f-ic { color:oklch(60% .06 85); }
        .pm-fin .pm-f:nth-child(4) .pm-f-ic { color:oklch(66% .18 52); }
        .pm-rec { border-top:1px solid var(--pm-line); padding-top:.6rem; }
        .pm-rline { display:flex; justify-content:space-between; font-size:.85rem; padding:.35rem 0; }
        .pm-rline-top { margin-top:.4rem; padding-top:.55rem; border-top:1px solid color-mix(in oklch, var(--pm-line) 60%, transparent); }
        .pm-rline b { font-variant-numeric:tabular-nums; }

        /* kompaktnejsa ekipa (ne rabi vec prostora za par imen) */
        .pm-team { padding:.5rem .7rem; gap:.4rem .5rem; margin-bottom:1rem; }
        .pm-member { padding:.2rem .5rem .2rem .26rem; gap:.38rem; }
        .pm-av { width:1.45rem; height:1.45rem; font-size:.6rem; }
        .pm-mtxt b { font-size:.76rem; }
        .pm-mtxt small { display:none; }
        .pm-soon { display:none; }
        /* alert (nekdo/agent caka na tvoj pregled) */
        .pm-alert { display:inline-flex; align-items:center; gap:.35rem; font-size:.7rem; font-weight:700; color:oklch(48% .14 55); background:oklch(95% .06 75); border:1px solid oklch(80% .1 70); border-radius:999px; padding:.24rem .6rem; }
        .pm-alert::before { content:""; width:.5rem; height:.5rem; border-radius:50%; background:oklch(70% .17 60); }
        /* status clana */
        .pm-st { font-size:.62rem; font-weight:700; letter-spacing:.02em; text-transform:uppercase; border-radius:999px; padding:.12rem .4rem; }
        .pm-st[data-st="dela"] { color:var(--pm-muted); background:color-mix(in oklab, var(--pm-line) 40%, transparent); }
        .pm-st[data-st="koncal"] { color:oklch(42% .12 155); background:oklch(93% .06 160); }
        .pm-st[data-st="review"] { color:oklch(48% .14 55); background:oklch(94% .07 75); }
        /* AI agent clan */
        .pm-member-ai { border-style:dashed; }
        .pm-av-ai { background:linear-gradient(135deg, oklch(62% .16 280), oklch(70% .15 200)); }
        /* header akcije (Vec + gumb) */
        .pm-hact { display:inline-flex; align-items:center; gap:.4rem; }
        .pm-iconbtn { text-decoration:none; display:inline-grid; place-items:center; width:1.9rem; height:1.9rem; box-sizing:border-box; border:1px solid color-mix(in oklch, var(--pm-ink) 7%, transparent); border-radius:999px; background:transparent; color:var(--pm-ink); font-size:1.05rem; line-height:1; transition:background .16s ease; }
        .pm-iconbtn:hover { background:var(--pm-paper); }
        /* prihajajoci datumi */
        .pm-roki { list-style:none; margin:.2rem 0 0; padding:0; display:flex; flex-direction:column; }
        .pm-rok { display:flex; align-items:center; gap:.55rem; padding:.72rem .6rem; margin:0 -.6rem; border-radius:10px; }
        .pm-roki > li + li { border-top:1px solid color-mix(in oklch, var(--pm-ink) 9%, transparent); }
        .pm-roki > li:has(.pm-rok-link:hover), .pm-roki > li:has(.pm-rok-link:hover) + li { border-top-color:transparent; }
        .pm-rok-pika { flex:none; width:.5rem; height:.5rem; border-radius:50%; background:var(--pm-acc); }
        .pm-rok-pika[data-late="true"] { background:oklch(58% .18 25); }
        .pm-rok-txt { flex:1; min-width:0; font-size:.82rem; color:var(--pm-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pm-rok-dan { flex:none; font-size:.72rem; color:var(--pm-muted); font-variant-numeric:tabular-nums; }
        /* CRM kartica (link) */
        .pm-crm { text-decoration:none; color:inherit; display:block; }
        .pm-crm:hover { border-color:var(--pm-acc); }
        .pm-crm-h { display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-bottom:.5rem; }
        .pm-crm-h h3 { margin:0; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:var(--pm-muted); font-weight:700; }
        /* brief modal — cela stran z vsemi vprasanji */
        .pm-modal-back { position:fixed; inset:0; z-index:60; background:oklch(97% .006 87 / .4); backdrop-filter:blur(9px); -webkit-backdrop-filter:blur(9px); display:flex; justify-content:flex-end; }
        .pm-modal { width:min(640px,94vw); height:100%; overflow-y:auto; background:#fff; border:0; border-radius:0; padding:2.4rem 2rem; box-shadow:-1.6rem 0 4rem oklch(20% .03 55 / .2); animation:pmSlideIn .5s cubic-bezier(.16,1,.3,1) both; }
        @keyframes pmSlideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
        @media (prefers-reduced-motion:reduce){ .pm-modal { animation:none; } }
        .pm-modal-h { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
        .pm-modal-kick { margin:0 0 .2rem; font-size:.66rem; letter-spacing:.14em; text-transform:uppercase; color:var(--pm-muted); font-weight:700; }
        .pm-modal-h h2 { margin:0; font-family:var(--font-sans), system-ui, sans-serif; font-weight:600; font-size:1.5rem; color:var(--pm-ink); }
        .pm-modal-x { flex:none; display:grid; place-items:center; border:1px solid rgba(17,17,17,.18); background:var(--pm-card); border-radius:50%; width:2.2rem; height:2.2rem; padding:0; cursor:pointer; color:var(--pm-ink); font-size:1rem; line-height:1; box-shadow:0 4px 14px rgba(17,17,17,.1); transition:background .15s, color .15s; }
        .pm-modal-x:hover { background:var(--pm-ink); color:var(--pm-card); }
        .pm-modal-body { display:flex; flex-direction:column; gap:.9rem; }
        .pm-task-vrs { display:flex; align-items:center; gap:.8rem; padding:.55rem 0; border-bottom:1px solid color-mix(in oklch, var(--pm-line) 60%, transparent); }
        .pm-task-lbl { flex:none; width:5rem; font-size:.68rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--pm-muted); }
        .pm-task-status { display:inline-flex; align-items:center; gap:.4rem; font-size:.85rem; font-weight:600; color:var(--pm-ink); }
        .pm-task-oseba { display:inline-flex; align-items:center; gap:.5rem; font-size:.9rem; color:var(--pm-ink); }
        .pm-qa-k { display:block; font-size:.7rem; letter-spacing:.06em; text-transform:uppercase; color:var(--pm-muted); font-weight:700; margin-bottom:.25rem; }
        .pm-qa-v { margin:0; font-size:.9rem; color:var(--pm-ink); line-height:1.5; }
        .pm-qa-cilji { margin:.1rem 0 0; padding-left:1.1rem; display:flex; flex-direction:column; gap:.25rem; }
        .pm-qa-cilji b { font-size:.88rem; }
        .pm-qa-cilji small { margin-left:.4rem; color:var(--pm-muted); font-size:.75rem; }
        .pm-modal-edit { display:inline-block; margin-top:1.1rem; text-decoration:none; font-size:.8rem; font-weight:600; color:var(--pm-acc); }
        /* seznami zapisa (pogodbe/racuni/stroski) */
        .pm-list { list-style:none; margin:.2rem 0 0; padding:0; display:flex; flex-direction:column; }
        .pm-li { display:flex; align-items:center; gap:.5rem; padding:.72rem .6rem; margin:0 -.6rem; border-radius:10px; font-size:.83rem; color:var(--pm-ink); }
        .pm-list > li + li { border-top:1px solid color-mix(in oklch, var(--pm-ink) 9%, transparent); }
        .pm-list > li:has(.pm-li:hover), .pm-list > li:has(.pm-li:hover) + li { border-top-color:transparent; }
        .pm-li-n { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pm-li-tip { flex:none; font-size:.56rem; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:var(--pm-muted); background:color-mix(in oklch, var(--pm-line) 45%, transparent); border-radius:999px; padding:.12rem .42rem; }
        .pm-li-tip[data-tip="ponudba"] { color:var(--pm-acc); background:color-mix(in oklch, var(--pm-acc) 12%, transparent); }
        .pm-li-s { flex:none; font-size:.62rem; font-weight:700; letter-spacing:.02em; text-transform:uppercase; color:var(--pm-muted); background:color-mix(in oklab, var(--pm-line) 40%, transparent); border-radius:999px; padding:.12rem .45rem; }
        .pm-li-d { flex:none; font-size:.72rem; color:var(--pm-muted); font-variant-numeric:tabular-nums; }
        .pm-li-a { flex:none; margin-left:auto; font-weight:600; font-variant-numeric:tabular-nums; }
        .pm-li-pika { flex:none; width:.5rem; height:.5rem; border-radius:50%; background:oklch(80% .03 90); }
        .pm-li-pika[data-paid="true"] { background:oklch(70% .15 155); }
        .pm-vec { margin-top:.5rem; border:0; background:none; cursor:pointer; padding:0; color:var(--pm-acc); font-size:.78rem; font-weight:600; }
        .pm-linki { list-style:none; margin:.2rem 0 0; padding:0; display:flex; flex-direction:column; gap:.15rem; }
        .pm-linki a { display:block; padding:.4rem .5rem; border-radius:8px; text-decoration:none; color:var(--pm-acc); font-size:.85rem; font-weight:500; }
        .pm-linki a:hover { background:var(--pm-paper); }
        .pm-arr { display:inline-block; margin-left:.3rem; vertical-align:-1px; flex:none; }
        /* cilji projekta */
        .pm-goals { list-style:none; margin:.2rem 0 0; padding:0; display:flex; flex-direction:column; }
        .pm-goals li { display:flex; align-items:baseline; gap:.5rem; flex-wrap:wrap; padding:.42rem 0; border-top:1px solid color-mix(in oklch, var(--pm-line) 60%, transparent); }
        .pm-goals li:first-child { border-top:0; }
        .pm-goal-b { min-width:0; font-size:.86rem; color:var(--pm-ink); }
        .pm-goal-t { flex:none; font-size:.66rem; font-weight:700; letter-spacing:.01em; color:var(--pm-acc); background:linear-gradient(135deg, color-mix(in oklch, var(--pm-acc) 16%, transparent), color-mix(in oklch, var(--pm-acc) 7%, transparent)); border-radius:999px; padding:.14rem .55rem; }
        /* crm dnevnik */
        .pm-crm-list { list-style:none; margin:.2rem 0 0; padding:0; display:flex; flex-direction:column; }
        .pm-crm-vnos { display:flex; align-items:center; gap:.55rem; padding:.72rem 0; border-top:1px solid color-mix(in oklch, var(--pm-ink) 9%, transparent); }
        .pm-crm-vnos:first-child { border-top:0; }
        .pm-crm-tip { flex:none; font-size:.62rem; font-weight:700; letter-spacing:.02em; text-transform:uppercase; color:var(--pm-muted); background:color-mix(in oklch, var(--pm-line) 40%, transparent); border-radius:999px; padding:.12rem .45rem; }
        .pm-crm-opis { flex:1; min-width:0; font-size:.83rem; color:var(--pm-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pm-crm-dan { flex:none; font-size:.72rem; color:var(--pm-muted); font-variant-numeric:tabular-nums; }
        /* klikljive vrstice dokumentov (odpre desni panel s predogledom) */
        .pm-li-btn { width:100%; box-sizing:border-box; border:0; background:none; cursor:pointer; text-align:left; margin:0; font:inherit; }
        .pm-li-btn:hover { background:var(--pm-paper); }
        /* klikljiv rok -> koledar */
        .pm-rok-link { text-decoration:none; color:inherit; }
        .pm-rok-link:hover { background:var(--pm-paper); }
        /* poštni avatar */
        .pm-mail-av { flex:none; width:1.55rem; height:1.55rem; border-radius:50%; display:grid; place-items:center; font-size:.58rem; font-weight:700; color:#fff; }
        /* crm pika po tipu */
        .pm-crm-pika { flex:none; width:.5rem; height:.5rem; border-radius:50%; }
        /* aktivni taski */
        .pm-naloge { list-style:none; margin:.2rem 0 0; padding:0; display:flex; flex-direction:column; }
        .pm-naloga { display:flex; align-items:center; gap:.6rem; padding:.72rem .6rem; margin:0 -.6rem; border-radius:10px; }
        .pm-naloge > li + li { border-top:1px solid color-mix(in oklch, var(--pm-ink) 9%, transparent); }
        .pm-naloge > li:has(.pm-naloga:hover), .pm-naloge > li:has(.pm-naloga:hover) + li { border-top-color:transparent; }
        .pm-naloga-link { text-decoration:none; color:inherit; cursor:pointer; width:100%; box-sizing:border-box; background:none; border:0; text-align:left; font:inherit; }
        .pm-naloga-link:hover { background:var(--pm-paper); }
        .pm-naloga-dot { flex:none; display:grid; place-items:center; width:1.5rem; height:1.5rem; border-radius:50%; background:oklch(94% .006 87); color:oklch(55% .015 70); }
        .pm-naloga-dot svg { width:.88rem; height:.88rem; }
        /* poenotena visina vseh vrstic (ne glede na ikono/piko) */
        .pm-naloga, .pm-mail, .pm-li, .pm-rok, .pm-crm-vnos, .pm-brow { min-height:3rem; box-sizing:border-box; }
        .pm-naloga-dot[data-st="dela"] { background:color-mix(in oklch, var(--pm-acc) 14%, transparent); color:var(--pm-acc); }
        .pm-naloga-dot[data-st="pregled"] { background:oklch(95% .04 75); color:oklch(54% .11 65); }
        .pm-naloga-dot[data-st="koncano"] { background:oklch(94% .05 158); color:oklch(50% .1 158); }
        .pm-naloga-t { flex:1; min-width:0; font-size:.84rem; color:var(--pm-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pm-naloga-av { flex:none; width:1.5rem; height:1.5rem; border-radius:50%; display:grid; place-items:center; font-size:.56rem; font-weight:700; color:#fff; }
      ` }} />
    </div>
  );
}
