'use client';

/* KOLEDAR / ROKI — notranji pregled zapadlosti (BREZ zunanjih storitev). Združi
   roke plačil računov (datum + dueDays) in roke nalog (lib/naloge.ts) v agendo
   Zapadlo / Ta teden / Kasneje. Ob vsakem dogodku »Dodaj v Apple koledar« (.ics,
   lib/ics.ts) — tapneš na iPhonu in dogodek skoči v tvoj koledar. */

import { useEffect, useState } from 'react';
import { CalendarPlus, Receipt, Kanban } from '@phosphor-icons/react';
import { loadFlowData } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { preberiNaloge } from '@/lib/naloge';
import { prenesiIcs } from '@/lib/ics';

type Dogodek = { datum: string; naslov: string; pod?: string; tip: 'racun' | 'naloga' };

const money = (v: number) => `${Math.round(v).toLocaleString('sl-SI')} €`;
const dodajDni = (iso: string, dni: number) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso; d.setDate(d.getDate() + dni); return d.toISOString().slice(0, 10); };
const danesISO = () => new Date().toISOString().slice(0, 10);
const datLep = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleDateString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' }); };
const dan = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : String(d.getDate()); };
const mesecKratko = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('sl-SI', { month: 'short' }).replace('.', ''); };

export default function KoledarWorkspace() {
  const [nacin] = usePredogled();
  const [dogodki, setDogodki] = useState<Dogodek[]>([]);

  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    const izRacunov: Dogodek[] = (flow.invoices || [])
      .filter((r) => !r.paid)
      .map((r) => ({ datum: dodajDni(r.date, typeof r.dueDays === 'number' ? r.dueDays : 15), naslov: `Plačilo · Račun ${r.number || ''}`.trim(), pod: `${r.client || ''}${r.amount ? ' · ' + money(r.amount) : ''}`, tip: 'racun' as const }));
    const izNalog: Dogodek[] = preberiNaloge()
      .filter((n) => n.rok && n.stolpec !== 'done')
      .map((n) => ({ datum: n.rok as string, naslov: n.naslov, pod: n.dodeljenoOseba ? 'Dodeljeno: ' + n.dodeljenoOseba : undefined, tip: 'naloga' as const }));
    setDogodki([...izRacunov, ...izNalog].filter((d) => d.datum).sort((a, b) => a.datum.localeCompare(b.datum)));
  }, [nacin]);

  const danes = danesISO();
  const cezTeden = dodajDni(danes, 7);
  const zapadlo = dogodki.filter((d) => d.datum < danes);
  const taTeden = dogodki.filter((d) => d.datum >= danes && d.datum <= cezTeden);
  const kasneje = dogodki.filter((d) => d.datum > cezTeden);

  const skupine: { kljuc: string; naslov: string; dogodki: Dogodek[]; ton?: string }[] = [
    { kljuc: 'zapadlo', naslov: 'Zapadlo', dogodki: zapadlo, ton: 'zapadlo' },
    { kljuc: 'teden', naslov: 'Ta teden', dogodki: taTeden },
    { kljuc: 'kasneje', naslov: 'Kasneje', dogodki: kasneje },
  ].filter((s) => s.dogodki.length > 0);

  const dodajVKoledar = (d: Dogodek) => prenesiIcs(d.naslov, d.datum, d.pod);

  return (
    <div className="kol">
      <header className="kol-glava">
        <p className="kol-eyebrow">KOLEDAR</p>
        <h1 className="kol-naslov">Roki na enem mestu.</h1>
        <p className="kol-podnaslov">Zapadlost plačil in roki nalog. Klikni »Dodaj v koledar« in dogodek skoči v tvoj Apple (ali drug) koledar — brez povezovanja računov.</p>
      </header>

      {skupine.length === 0 ? (
        <div className="kol-prazno"><CalendarBlankPrazno /><strong>Ni prihajajočih rokov.</strong><p>Ko dodaš rok nalogi ali imaš odprt račun, se bo tu prikazal.</p></div>
      ) : (
        skupine.map((s) => (
          <section key={s.kljuc} className="kol-skupina" data-ton={s.ton}>
            <h2 className="kol-skupina-naslov">{s.naslov} <span>{s.dogodki.length}</span></h2>
            <ul className="kol-seznam">
              {s.dogodki.map((d, i) => (
                <li key={`${d.tip}-${d.datum}-${i}`} className="kol-vrstica" data-tip={d.tip}>
                  <div className="kol-datum" aria-hidden><strong>{dan(d.datum)}</strong><small>{mesecKratko(d.datum)}</small></div>
                  <span className="kol-ikona" aria-hidden>{d.tip === 'racun' ? <Receipt size={16} weight="fill" /> : <Kanban size={16} weight="fill" />}</span>
                  <div className="kol-besedilo">
                    <strong>{d.naslov}</strong>
                    <small>{datLep(d.datum)}{d.pod ? ' · ' + d.pod : ''}</small>
                  </div>
                  <button type="button" className="kol-dodaj" onClick={() => dodajVKoledar(d)} title="Prenesi .ics in dodaj v koledar"><CalendarPlus size={15} weight="bold" /> Dodaj v koledar</button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <style>{`
        .kol{padding:1.6rem clamp(1rem,3vw,2.2rem) 4rem;max-width:52rem;min-width:0}
        .kol-eyebrow{margin:0 0 .35rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
        .kol-naslov{margin:0;font:500 clamp(2rem,4vw,2.8rem)/1 var(--font-serif),Georgia,serif;color:var(--ink)}
        .kol-podnaslov{margin:.55rem 0 1.8rem;max-width:52ch;color:var(--muted);font-size:.86rem;line-height:1.5}
        .kol-skupina{margin-bottom:1.8rem}
        .kol-skupina-naslov{display:flex;align-items:center;gap:.6rem;margin:0 0 .7rem;font:800 .7rem var(--font-sans),sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink)}
        .kol-skupina-naslov span{min-width:1.5rem;height:1.5rem;padding:0 .45rem;display:grid;place-items:center;border-radius:999px;background:oklch(94% .01 87);color:var(--muted);font-size:.66rem}
        .kol-skupina[data-ton='zapadlo'] .kol-skupina-naslov{color:oklch(48% .16 30)}
        .kol-skupina[data-ton='zapadlo'] .kol-skupina-naslov span{background:oklch(93% .06 30);color:oklch(48% .16 30)}
        .kol-seznam{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.55rem}
        .kol-vrstica{display:flex;align-items:center;gap:.85rem;padding:.7rem .85rem;border:1px solid var(--line);border-radius:1rem;background:oklch(99% .006 87 / .85)}
        .kol-skupina[data-ton='zapadlo'] .kol-vrstica{border-color:oklch(86% .06 30);background:oklch(98% .02 40 / .7)}
        .kol-datum{flex:none;width:2.9rem;height:2.9rem;display:grid;place-items:center;border-radius:.7rem;background:oklch(95% .02 300);color:oklch(40% .12 300);line-height:1;text-align:center}
        .kol-vrstica[data-tip='naloga'] .kol-datum{background:oklch(95% .03 165);color:oklch(40% .1 165)}
        .kol-datum strong{font:600 1.05rem var(--font-serif),Georgia,serif}
        .kol-datum small{font-size:.52rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
        .kol-ikona{flex:none;color:var(--muted)}
        .kol-besedilo{flex:1;min-width:0;display:flex;flex-direction:column;gap:.1rem}
        .kol-besedilo strong{font-size:.86rem;font-weight:650;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-besedilo small{font-size:.68rem;color:var(--muted)}
        .kol-dodaj{flex:none;display:inline-flex;align-items:center;gap:.35rem;padding:.5rem .8rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
        .kol-dodaj:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        .kol-prazno{display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:3rem 1rem;border:1px dashed var(--line);border-radius:1.2rem;text-align:center;color:var(--muted)}
        .kol-prazno strong{color:var(--ink);font-size:1rem}
        .kol-prazno p{margin:0;font-size:.8rem;max-width:32ch}
        @media (max-width:560px){.kol-dodaj{padding:.5rem;font-size:0}.kol-dodaj svg{margin:0}}
      `}</style>
    </div>
  );
}

function CalendarBlankPrazno() {
  return <CalendarPlus size={30} weight="light" aria-hidden />;
}
