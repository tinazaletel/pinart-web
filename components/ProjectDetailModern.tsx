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

const zacetnice = (ime: string) => ime.split(/\s+/).filter(Boolean).slice(0, 2).map(d => d[0]?.toUpperCase() || '').join('') || '?';

export default function ProjectDetailModern({
  data, sodelavci, jeEn, base, money, canEditTeam = false, onToggleMember,
}: {
  data: ModernProject;
  sodelavci: Sodelavec[];
  jeEn: boolean;
  base: string;
  money: (n: number) => string;
  canEditTeam?: boolean;
  onToggleMember?: (sodelavecId: string) => void;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const { offer, real } = data;
  const [dodajOdprt, setDodajOdprt] = useState(false);
  const dodeljeniIds = real?.dodeljeni || [];
  const ekipa = dodeljeniIds.map(id => sodelavci.find(s => s.id === id)).filter(Boolean) as Sodelavec[];
  const naVoljo = sodelavci.filter(s => s.aktiven && !dodeljeniIds.includes(s.id));
  const urejaEkipo = canEditTeam && !!onToggleMember;
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

  return (
    <div className="pm">
      {/* EKIPA & STATUSI */}
      <div className="pm-team">
        <span className="pm-team-lbl">{L('Na projektu', 'On this project')}</span>
        {ekipa.length ? ekipa.map(s => (
          <span key={s.id} className="pm-member">
            <span className="pm-av">{zacetnice(s.ime)}</span>
            <span className="pm-mtxt"><b>{s.ime}</b><small>{vlogaOznaka(s.vloga)}</small></span>
            {urejaEkipo && <button type="button" className="pm-mx" onClick={() => onToggleMember!(s.id)} aria-label={`${L('Odstrani', 'Remove')} ${s.ime}`}>×</button>}
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
          {/* BRIEF */}
          <section className="pm-card pm-brief">
            <header><h3>{L('BRIEF · ŽELJE STRANKE', 'BRIEF · CLIENT WISHES')}</h3>{real && <Link className="pm-act" href={`${base}/kalkulator/projekti`}>{L('Uredi', 'Edit')}</Link>}</header>
            <div className="pm-title">{L('Kaj gradimo in za koga.', 'What we build and for whom.')}</div>
            {briefPolja.length ? briefPolja.map(([k, v]) => (
              <div key={k} className="pm-brow"><span className="pm-bk">{k}</span><span className="pm-bv">{v}</span></div>
            )) : offer.scope?.length ? (
              <div className="pm-brow"><span className="pm-bk">{L('Obseg', 'Scope')}</span><span className="pm-bv">{offer.scope.join(' · ')}</span></div>
            ) : <p className="pm-muted">{L('Brief še ni izpolnjen. Dodaš ga ob odprtju projekta (vprašanja).', 'The brief is not filled in yet. Add it when opening the project (questions).')}</p>}
            {cilji.length > 0 && <div className="pm-cilji">{cilji.map(c => <span key={c.id} className="pm-cilj">◎ {c.besedilo}{c.tarca ? ` · ${c.tarca}` : ''}</span>)}</div>}
          </section>

          {/* NALOGE (povezava — task manager) */}
          <section className="pm-card">
            <header><h3>{L('AKTIVNI TASKI', 'ACTIVE TASKS')}</h3><Link className="pm-act" href={`${base}/kalkulator/naloge`}>{L('Odpri v Task managerju', 'Open in Task manager')}</Link></header>
            <p className="pm-muted">{L('Naloge za ta projekt vodiš v Task managerju. Povezava naloga↔projekt pride s kolaboracijo.', 'You manage this project’s tasks in the Task manager. Task-to-project linking comes with collaboration.')}</p>
          </section>

          {/* KOMUNIKACIJA (povezava) */}
          <section className="pm-card">
            <header><h3>{L('KOMUNIKACIJA', 'COMMUNICATION')}</h3><Link className="pm-act" href={`${base}/kalkulator/projekti`}>{L('Odpri', 'Open')}</Link></header>
            <p className="pm-muted">{L('Vsa komunikacija projekta na enem mestu (v tabelnem pogledu spodaj).', 'All project communication in one place (in the tabular view below).')}</p>
          </section>
        </div>

        <div className="pm-col">
          {/* FINANCE (povzetek) */}
          <section className="pm-card">
            <header><h3>{L('POSLOVNI ZAPIS', 'BUSINESS RECORD')}</h3></header>
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
        .pm-fin { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; margin-bottom:.8rem; }
        .pm-f { border:1px solid var(--pm-line); border-radius:12px; padding:.7rem .8rem; background:var(--paper,#F5F2EA); }
        .pm-f small { font-size:.72rem; color:var(--muted,#6a6559); }
        .pm-f b { display:block; font-family:var(--font-serif), Georgia, serif; font-size:1.25rem; margin-top:.15rem; color:var(--ink,#111); }
        .pm-rec { border-top:1px solid var(--pm-line); padding-top:.6rem; }
        .pm-rline { display:flex; justify-content:space-between; font-size:.85rem; padding:.35rem 0; }
        .pm-rline b { font-variant-numeric:tabular-nums; }
      ` }} />
    </div>
  );
}
