'use client';

/* Moderni (work-first) pogled detajla projekta — DODATEN pogled ob obstojecem
   tabelnem (ProjectsWorkspace ga izbere prek preklopa). Bere ISTE podatke kot
   tabelni (selected), zato nic novega ne shranjuje. Kolaboracijski deli (dodaj/
   odvzemi sodelavca, AI agenti s statusi, cross-org) so za zdaj UI/lokalno —
   pravo zaledje pride post-launch. Uporablja app CSS tokene (DM Serif/Archivo,
   --accent/--paper/--ink/--line), da samodejno sledi CGP. */

import { useState } from 'react';
import Link from 'next/link';
import type { FlowOffer, FlowInvoice, FlowContract, FlowExpense } from '@/lib/pinartFlowStore';
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

const zacetnice = (ime: string) => ime.split(/\s+/).filter(Boolean).slice(0, 2).map(d => d[0]?.toUpperCase() || '').join('') || '?';

export default function ProjectDetailModern({
  data, sodelavci, jeEn, base, money, canEditTeam = false, onToggleMember, posta = [], onOpenZapis, ekipaStatus, agenti = [],
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
  ekipaStatus?: Record<string, EkipaStanje>;
  agenti?: AgentClan[];
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const { offer, real } = data;
  const [dodajOdprt, setDodajOdprt] = useState(false);
  const [briefOdprt, setBriefOdprt] = useState(false);
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
  const komZadnje = komAktivna.slice(0, 3);
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
                <Link href={`${base}/kalkulator/ekipa`} className="pm-add-manage">{L('Uredi ekipo', 'Manage team')} →</Link>
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
                <Link className="pm-act" href={`${base}/kalkulator/naloge`}>{L('Več', 'More')} →</Link>
                <Link className="pm-iconbtn" href={`${base}/kalkulator/naloge`} aria-label={L('Dodaj nalogo', 'Add task')}>+</Link>
              </span>
            </header>
            <p className="pm-muted">{L('Naloge tega projekta vodiš v Task managerju. Povezava naloga↔projekt pride s kolaboracijo.', 'You manage this project’s tasks in the Task manager. Task-to-project linking comes with collaboration.')}</p>
          </section>

          {/* BRIEF */}
          <section className="pm-card pm-brief">
            <header><h3>{L('BRIEF · ŽELJE STRANKE', 'BRIEF · CLIENT WISHES')}</h3>{imaBrief && <button type="button" className="pm-act" onClick={() => setBriefOdprt(true)}>{L('Več', 'More')} →</button>}</header>
            <div className="pm-title">{L('Kaj gradimo in za koga.', 'What we build and for whom.')}</div>
            {briefPolja.length ? briefPolja.map(([k, v]) => (
              <div key={k} className="pm-brow"><span className="pm-bk">{k}</span><span className="pm-bv">{v}</span></div>
            )) : offer.scope?.length ? (
              <div className="pm-brow"><span className="pm-bk">{L('Obseg', 'Scope')}</span><span className="pm-bv">{offer.scope.join(' · ')}</span></div>
            ) : <p className="pm-muted">{L('Brief še ni izpolnjen. Dodaš ga ob odprtju projekta (vprašanja).', 'The brief is not filled in yet. Add it when opening the project (questions).')}</p>}
            {cilji.length > 0 && <div className="pm-cilji">{cilji.map(c => <span key={c.id} className="pm-cilj">◎ {c.besedilo}{c.tarca ? ` · ${c.tarca}` : ''}</span>)}</div>}
          </section>

          {/* PRIHAJAJOČI DATUMI */}
          <section className="pm-card">
            <header><h3>{L('PRIHAJAJOČI DATUMI', 'UPCOMING DATES')}</h3><Link className="pm-act" href={`${base}/kalkulator/koledar`}>{L('Koledar', 'Calendar')} →</Link></header>
            {roki.length ? (
              <ul className="pm-roki">
                {roki.map(r => { const d = dniDo(r.rok); return (
                  <li key={r.id} className="pm-rok">
                    <span className="pm-rok-pika" data-late={d < 0 ? 'true' : 'false'} aria-hidden />
                    <span className="pm-rok-txt">{L('Rok plačila', 'Payment due')} · {r.oznaka}</span>
                    <span className="pm-rok-dan">{datPolno(r.rok)}{d < 0 ? ` · ${L('zapadlo', 'overdue')}` : d === 0 ? ` · ${L('danes', 'today')}` : ` · ${jeEn ? `in ${d}d` : `čez ${d} dni`}`}</span>
                  </li>
                ); })}
              </ul>
            ) : <p className="pm-muted">{L('Ni odprtih rokov. Sestanke in roke povežeš prek Koledarja.', 'No open deadlines. Link meetings and deadlines via the Calendar.')}</p>}
          </section>

          {/* KOMUNIKACIJA */}
          <section className="pm-card">
            <header>
              <h3>{L('KOMUNIKACIJA', 'COMMUNICATION')}{komAktivna.length ? ` · ${komAktivna.length}` : ''}</h3>
              {onOpenZapis
                ? <button type="button" className="pm-act" onClick={onOpenZapis}>{L('Odpri vse', 'Open all')}</button>
                : <Link className="pm-act" href={`${base}/kalkulator/projekti`}>{L('Odpri', 'Open')}</Link>}
            </header>
            {komZadnje.length ? (
              <ul className="pm-mails">
                {komZadnje.map(v => (
                  <li key={v.id} className="pm-mail">
                    <span className="pm-mail-kdo">{v.prejemniki.join(', ') || '—'}</span>
                    <span className="pm-mail-zad">{v.zadeva || L('(brez zadeve)', '(no subject)')}</span>
                    <span className="pm-mail-dan">{datKratko(v.datum)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="pm-muted">{L('Še ni sporočil. Napiši prvo v polnem pogledu.', 'No messages yet. Write the first one in the full view.')}</p>}
          </section>

          {/* CRM DNEVNIK */}
          <Link className="pm-card pm-crm" href={`${base}/kalkulator/stranke?stranka=${encodeURIComponent(offer.client)}`}>
            <div className="pm-crm-h"><h3>{L('CRM DNEVNIK', 'CRM DIARY')}</h3><span className="pm-act">{L('Odpri', 'Open')} →</span></div>
            <p className="pm-muted">{jeEn ? `Timeline of the relationship with “${offer.client}” — calls, meetings, agreements.` : `Kronologija odnosa s stranko »${offer.client}« — klici, sestanki, dogovori.`}</p>
          </Link>
        </div>

        <div className="pm-col">
          {/* FINANCE (povzetek) */}
          <section className="pm-card">
            <header><h3>{L('POSLOVNI ZAPIS', 'BUSINESS RECORD')}</h3>{onOpenZapis && <button type="button" className="pm-act" onClick={onOpenZapis}>{L('Poln zapis', 'Full record')} →</button>}</header>
            <div className="pm-fin">
              <div className="pm-f"><small>{L('Dogovorjeno', 'Agreed')}</small><b>{data.agreed ? money(data.agreed) : '—'}</b></div>
              <div className="pm-f"><small>{L('Zaračunano', 'Billed')}</small><b>{money(data.billed)}</b></div>
              <div className="pm-f"><small>{L('Še ni zaračunano', 'Not yet billed')}</small><b>{data.agreed ? money(data.unbilled) : '—'}</b></div>
              <div className="pm-f"><small>{L('Ocenjeni rezultat', 'Estimated result')}</small><b>{money(data.profit)}</b></div>
            </div>
            <div className="pm-rec">
              <div className="pm-rline"><span>{L('Pogodbe', 'Contracts')}</span><b>{data.contracts.length}</b></div>
              <div className="pm-rline"><span>{L('Računi', 'Invoices')}</span><b>{data.invoices.length}</b></div>
              <div className="pm-rline"><span>{L('Stroški', 'Expenses')}</span><b>{money(data.costs)}</b></div>
            </div>
          </section>
        </div>
      </div>

      {briefOdprt && (
        <div className="pm-modal-back" role="presentation" onMouseDown={() => setBriefOdprt(false)}>
          <div className="pm-modal" role="dialog" aria-modal="true" aria-label={L('Brief projekta', 'Project brief')} onMouseDown={e => e.stopPropagation()}>
            <header className="pm-modal-h">
              <div><p className="pm-modal-kick">{L('BRIEF · VSA VPRAŠANJA', 'BRIEF · ALL QUESTIONS')}</p><h2>{offer.title}</h2></div>
              <button type="button" className="pm-modal-x" onClick={() => setBriefOdprt(false)} aria-label={L('Zapri', 'Close')}>✕</button>
            </header>
            <div className="pm-modal-body">
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
            </div>
            {real && <Link href={`${base}/kalkulator/projekti`} className="pm-modal-edit">{L('Uredi v projektih', 'Edit in projects')} →</Link>}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .pm { --pm-line: var(--line, #E2DBC9); --pm-acc: var(--accent, oklch(58% .19 297)); }
        .pm-team { display:flex; align-items:center; gap:.7rem; flex-wrap:wrap; background:var(--paper,#F5F2EA); border:1px solid var(--pm-line); border-radius:16px; padding:.8rem 1rem; margin-bottom:1.2rem; }
        .pm-team-lbl { font-size:.7rem; letter-spacing:.14em; text-transform:uppercase; color:var(--muted,#6a6559); font-weight:700; }
        .pm-member { display:inline-flex; align-items:center; gap:.5rem; padding:.3rem .6rem .3rem .35rem; border-radius:999px; border:1px solid var(--pm-line); background:#fff; }
        .pm-av { width:1.7rem; height:1.7rem; border-radius:50%; display:grid; place-items:center; font-size:.7rem; font-weight:700; color:#fff; background:linear-gradient(135deg, var(--pm-acc), oklch(70% .16 320)); }
        .pm-mtxt b { font-size:.8rem; font-weight:650; display:block; line-height:1.1; }
        .pm-mtxt small { font-size:.66rem; color:var(--muted,#9c968a); }
        .pm-addmember { text-decoration:none; display:inline-flex; align-items:center; gap:.3rem; border:1px dashed var(--pm-line); color:var(--muted,#6a6559); border-radius:999px; padding:.42rem .7rem; font-size:.78rem; font-weight:600; }
        .pm-addmember:hover { border-color:var(--pm-acc); color:var(--pm-acc); }
        .pm-mx { border:0; background:none; cursor:pointer; color:var(--muted,#9c968a); font-size:1rem; line-height:1; padding:0 .1rem 0 .2rem; border-radius:50%; }
        .pm-mx:hover { color:oklch(52% .18 25); }
        .pm-add-wrap { position:relative; display:inline-flex; }
        .pm-add-menu { position:absolute; top:calc(100% + .4rem); left:0; z-index:20; min-width:14rem; background:#fff; border:1px solid var(--pm-line); border-radius:12px; padding:.35rem; box-shadow:0 12px 30px -12px rgba(17,17,17,.25); display:flex; flex-direction:column; gap:.1rem; }
        .pm-add-opt { display:flex; align-items:center; gap:.5rem; width:100%; text-align:left; border:0; background:none; cursor:pointer; padding:.4rem .5rem; border-radius:8px; color:var(--ink,#111); }
        .pm-add-opt:hover { background:var(--paper,#F5F2EA); }
        .pm-add-opt b { font-size:.82rem; font-weight:600; }
        .pm-add-opt small { margin-left:auto; font-size:.68rem; color:var(--muted,#9c968a); }
        .pm-av-sm { width:1.4rem; height:1.4rem; font-size:.6rem; }
        .pm-add-empty { margin:0; padding:.5rem; font-size:.8rem; color:var(--muted,#6a6559); }
        .pm-add-manage { display:block; text-decoration:none; margin-top:.15rem; padding:.4rem .5rem; font-size:.74rem; font-weight:600; color:var(--pm-acc); border-top:1px solid var(--pm-line); }
        .pm-soon { font-size:.7rem; color:var(--muted,#9c968a); font-style:italic; margin-left:auto; }
        .pm-empty { font-size:.85rem; color:var(--muted,#9c968a); }
        .pm-grid { display:grid; grid-template-columns:1fr; gap:1.1rem; }
        @media (min-width:880px){ .pm-grid { grid-template-columns:1.7fr 1fr; align-items:start; } }
        .pm-col { display:flex; flex-direction:column; gap:1.1rem; }
        .pm-card { background:#fff; border:1px solid var(--pm-line); border-radius:16px; padding:1.1rem 1.2rem; }
        .pm-card > header { display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-bottom:.5rem; }
        .pm-card h3 { margin:0; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:var(--muted,#9c968a); font-weight:700; }
        .pm-title { font-family:var(--font-serif), Georgia, serif; font-size:1.3rem; margin:0 0 .7rem; color:var(--ink,#111); }
        .pm-act { text-decoration:none; border:1px solid var(--pm-line); background:var(--paper,#F5F2EA); color:var(--muted,#6a6559); border-radius:8px; padding:.28rem .55rem; font-size:.74rem; font-weight:600; }
        .pm-act:hover { color:var(--pm-acc); border-color:var(--pm-acc); }
        .pm-brief { background:linear-gradient(165deg, color-mix(in oklab, var(--pm-acc) 8%, #fff), #fff 72%); }
        .pm-brow { display:flex; gap:.7rem; padding:.5rem 0; border-top:1px solid color-mix(in oklab, var(--pm-line) 60%, transparent); }
        .pm-brow:first-of-type { border-top:0; }
        .pm-bk { flex:0 0 9rem; color:var(--muted,#6a6559); font-size:.8rem; font-weight:600; }
        .pm-bv { font-size:.88rem; color:var(--ink,#111); }
        .pm-cilji { display:flex; flex-direction:column; gap:.35rem; margin-top:.7rem; }
        .pm-cilj { font-size:.85rem; color:var(--ink,#111); }
        .pm-muted { color:var(--muted,#6a6559); font-size:.86rem; margin:.2rem 0 0; }
        .pm-mails { list-style:none; margin:.2rem 0 0; padding:0; display:flex; flex-direction:column; }
        .pm-mail { display:flex; align-items:baseline; gap:.6rem; padding:.45rem 0; border-top:1px solid color-mix(in oklab, var(--pm-line) 60%, transparent); }
        .pm-mail:first-child { border-top:0; }
        .pm-mail-kdo { flex:0 0 30%; min-width:0; font-size:.8rem; font-weight:600; color:var(--ink,#111); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pm-mail-zad { flex:1; min-width:0; font-size:.82rem; color:var(--muted,#6a6559); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pm-mail-dan { flex:none; font-size:.7rem; color:var(--muted,#9c968a); font-variant-numeric:tabular-nums; }
        .pm-fin { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; margin-bottom:.8rem; }
        .pm-f { border:1px solid var(--pm-line); border-radius:12px; padding:.7rem .8rem; background:var(--paper,#F5F2EA); }
        .pm-f small { font-size:.72rem; color:var(--muted,#6a6559); }
        .pm-f b { display:block; font-family:var(--font-serif), Georgia, serif; font-size:1.25rem; margin-top:.15rem; color:var(--ink,#111); }
        .pm-rec { border-top:1px solid var(--pm-line); padding-top:.6rem; }
        .pm-rline { display:flex; justify-content:space-between; font-size:.85rem; padding:.35rem 0; }
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
        .pm-st[data-st="dela"] { color:var(--muted,#6a6559); background:color-mix(in oklab, var(--pm-line) 40%, transparent); }
        .pm-st[data-st="koncal"] { color:oklch(42% .12 155); background:oklch(93% .06 160); }
        .pm-st[data-st="review"] { color:oklch(48% .14 55); background:oklch(94% .07 75); }
        /* AI agent clan */
        .pm-member-ai { border-style:dashed; }
        .pm-av-ai { background:linear-gradient(135deg, oklch(62% .16 280), oklch(70% .15 200)); }
        /* header akcije (Vec + gumb) */
        .pm-hact { display:inline-flex; align-items:center; gap:.4rem; }
        .pm-iconbtn { text-decoration:none; display:inline-grid; place-items:center; width:1.55rem; height:1.55rem; border:1px solid var(--pm-line); border-radius:8px; color:var(--muted,#6a6559); font-size:1.05rem; line-height:1; }
        .pm-iconbtn:hover { border-color:var(--pm-acc); color:var(--pm-acc); }
        /* prihajajoci datumi */
        .pm-roki { list-style:none; margin:.2rem 0 0; padding:0; display:flex; flex-direction:column; }
        .pm-rok { display:flex; align-items:center; gap:.55rem; padding:.45rem 0; border-top:1px solid color-mix(in oklab, var(--pm-line) 60%, transparent); }
        .pm-rok:first-child { border-top:0; }
        .pm-rok-pika { flex:none; width:.5rem; height:.5rem; border-radius:50%; background:var(--pm-acc); }
        .pm-rok-pika[data-late="true"] { background:oklch(58% .18 25); }
        .pm-rok-txt { flex:1; min-width:0; font-size:.82rem; color:var(--ink,#111); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pm-rok-dan { flex:none; font-size:.72rem; color:var(--muted,#6a6559); font-variant-numeric:tabular-nums; }
        /* CRM kartica (link) */
        .pm-crm { text-decoration:none; color:inherit; display:block; }
        .pm-crm:hover { border-color:var(--pm-acc); }
        .pm-crm-h { display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-bottom:.5rem; }
        .pm-crm-h h3 { margin:0; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:var(--muted,#9c968a); font-weight:700; }
        /* brief modal — cela stran z vsemi vprasanji */
        .pm-modal-back { position:fixed; inset:0; z-index:60; background:rgba(17,17,17,.35); display:flex; justify-content:center; align-items:flex-start; padding:6vh 1rem; overflow-y:auto; }
        .pm-modal { width:100%; max-width:640px; background:var(--paper,#F5F2EA); border:1px solid var(--pm-line); border-radius:18px; padding:1.4rem 1.5rem 1.5rem; box-shadow:0 30px 70px -30px rgba(17,17,17,.5); }
        .pm-modal-h { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
        .pm-modal-kick { margin:0 0 .2rem; font-size:.66rem; letter-spacing:.14em; text-transform:uppercase; color:var(--muted,#9c968a); font-weight:700; }
        .pm-modal-h h2 { margin:0; font-family:var(--font-serif), Georgia, serif; font-size:1.5rem; color:var(--ink,#111); }
        .pm-modal-x { flex:none; border:1px solid var(--pm-line); background:#fff; border-radius:8px; width:2rem; height:2rem; cursor:pointer; color:var(--ink,#111); }
        .pm-modal-body { display:flex; flex-direction:column; gap:.9rem; }
        .pm-qa-k { display:block; font-size:.7rem; letter-spacing:.06em; text-transform:uppercase; color:var(--muted,#6a6559); font-weight:700; margin-bottom:.25rem; }
        .pm-qa-v { margin:0; font-size:.9rem; color:var(--ink,#111); line-height:1.5; }
        .pm-qa-cilji { margin:.1rem 0 0; padding-left:1.1rem; display:flex; flex-direction:column; gap:.25rem; }
        .pm-qa-cilji b { font-size:.88rem; }
        .pm-qa-cilji small { margin-left:.4rem; color:var(--muted,#9c968a); font-size:.75rem; }
        .pm-modal-edit { display:inline-block; margin-top:1.1rem; text-decoration:none; font-size:.8rem; font-weight:600; color:var(--pm-acc); }
      ` }} />
    </div>
  );
}
