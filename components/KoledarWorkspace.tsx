'use client';

/* KOLEDAR — pravi dnevni koledar (Teams-meetings varianta). Prej samo agenda
   zapadlosti; zdaj: navigacija po dnevih (‹ prejšnji / danes / naslednji ›),
   sestanki + klici (lib/sestanki.ts, lokalna shramba), poleg tega roki plačil
   (računi) vedno vidni in roki nalog kot neobvezen preklop (»Pokaži naloge«,
   overlay čez delovni tok). Nov sestanek/klic se ob izbrani stranki samodejno
   zabeleži tudi v CRM dnevnik stranke (lib/dnevnik.ts). Ob vsakem dogodku
   »Dodaj v koledar« (.ics, lib/ics.ts) — tapneš na iPhonu in dogodek skoči v
   tvoj Apple (ali drug) koledar. */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarPlus,
  Receipt,
  Kanban,
  CaretLeft,
  CaretRight,
  Plus,
  UsersThree,
  Phone,
  PencilSimple,
  Trash,
  X,
  VideoCamera,
} from '@phosphor-icons/react';
import { loadFlowData, type FlowClient } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { preberiNaloge, type Naloga } from '@/lib/naloge';
import { prenesiIcs } from '@/lib/ics';
import { preberiSestanki, shraniSestanek, izbrisiSestanek, type Sestanek, type SestanekTip } from '@/lib/sestanki';
import { zabeleziInterakcijo } from '@/lib/dnevnik';

type RacunRok = { datum: string; naslov: string; pod?: string };

type Postavka = {
  id: string;
  tip: SestanekTip | 'racun' | 'naloga';
  naslov: string;
  ura?: string;
  pod?: string;
  original?: Sestanek;
  icsOpis?: string;
  videoUrl?: string;
};

const money = (v: number) => `${Math.round(v).toLocaleString('sl-SI')} €`;
const dodajDni = (iso: string, dni: number) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso; d.setDate(d.getDate() + dni); return d.toISOString().slice(0, 10); };
const danesISO = () => new Date().toISOString().slice(0, 10);
const veliko = (s: string) => (s ? s[0].toLocaleUpperCase('sl-SI') + s.slice(1) : s);
const naslovDneva = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : veliko(d.toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })); };
const kratekDatum = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' }); };

const PRAZEN_OBRAZEC = {
  naslov: '',
  datum: '',
  ura: '09:00',
  trajanjeMin: '',
  strankaId: '',
  kontaktId: '',
  lokacija: '',
  videoUrl: '',
  opomba: '',
};

export default function KoledarWorkspace() {
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';

  const [izbranDan, setIzbranDan] = useState(danesISO());
  const [sestanki, setSestanki] = useState<Sestanek[]>([]);
  const [rokiRacunov, setRokiRacunov] = useState<RacunRok[]>([]);
  const [stranke, setStranke] = useState<FlowClient[]>([]);
  const [naloge, setNaloge] = useState<Naloga[]>([]);
  const [pokaziNaloge, setPokaziNaloge] = useState(false);

  const [obrazecOdprt, setObrazecOdprt] = useState(false);
  const [urejamId, setUrejamId] = useState<string | null>(null);
  const [obrazecTip, setObrazecTip] = useState<SestanekTip>('sestanek');
  const [obrazec, setObrazec] = useState(PRAZEN_OBRAZEC);

  const osveziSestanke = () => setSestanki(preberiSestanki());
  const osveziNaloge = () => setNaloge(preberiNaloge());

  useEffect(() => { osveziSestanke(); osveziNaloge(); }, []);

  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    setStranke(flow.clients || []);
    const izRacunov: RacunRok[] = (flow.invoices || [])
      .filter((r) => !r.paid)
      .map((r) => ({ datum: dodajDni(r.date, typeof r.dueDays === 'number' ? r.dueDays : 15), naslov: `Plačilo · Račun ${r.number || ''}`.trim(), pod: `${r.client || ''}${r.amount ? ' · ' + money(r.amount) : ''}` }))
      .filter((r) => r.datum);
    setRokiRacunov(izRacunov);
  }, [nacin]);

  const danes = danesISO();
  const zapadliRacuni = useMemo(
    () => rokiRacunov.filter((r) => r.datum < danes).sort((a, b) => a.datum.localeCompare(b.datum)),
    [rokiRacunov, danes]
  );

  const najdiStranko = (id?: string) => stranke.find((s) => s.id === id);

  const sestanekPod = (s: Sestanek): string => {
    const deli: string[] = [];
    const stranka = najdiStranko(s.strankaId);
    if (stranka) deli.push(stranka.name);
    if (s.kontaktId) deli.push(s.kontaktId);
    if (s.trajanjeMin) deli.push(`${s.trajanjeMin} min`);
    if (s.lokacija) deli.push(s.lokacija);
    if (s.videoUrl) deli.push('video klic');
    return deli.join(' · ');
  };

  const termini: Postavka[] = useMemo(
    () => sestanki
      .filter((s) => s.datum === izbranDan)
      .sort((a, b) => a.ura.localeCompare(b.ura))
      .map((s) => ({
        id: s.id,
        tip: s.tip,
        naslov: s.naslov,
        ura: s.ura,
        pod: sestanekPod(s),
        original: s,
        videoUrl: s.videoUrl,
        icsOpis: [s.ura, najdiStranko(s.strankaId)?.name, s.lokacija, s.videoUrl, s.opomba].filter(Boolean).join(' · '),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sestanki, izbranDan, stranke]
  );

  const dnevniRacuni: Postavka[] = rokiRacunov
    .filter((r) => r.datum === izbranDan)
    .map((r, i) => ({ id: `racun-${izbranDan}-${i}`, tip: 'racun' as const, naslov: r.naslov, pod: r.pod, icsOpis: r.pod }));

  const dnevneNaloge: Postavka[] = pokaziNaloge
    ? naloge
      .filter((n) => n.rok === izbranDan && n.stolpec !== 'done')
      .map((n) => ({ id: `naloga-${n.id}`, tip: 'naloga' as const, naslov: n.naslov, pod: n.dodeljenoOsebaIme || n.dodeljenoOseba ? 'Dodeljeno: ' + (n.dodeljenoOsebaIme || n.dodeljenoOseba) : undefined, icsOpis: n.opis }))
    : [];

  const roki = [...dnevniRacuni, ...dnevneNaloge];

  const premakniDan = (delta: number) => setIzbranDan((d) => dodajDni(d, delta));

  const odpriNov = (tip: SestanekTip) => {
    setUrejamId(null);
    setObrazecTip(tip);
    setObrazec({ ...PRAZEN_OBRAZEC, datum: izbranDan });
    setObrazecOdprt(true);
  };

  const odpriUredi = (s: Sestanek) => {
    setUrejamId(s.id);
    setObrazecTip(s.tip);
    setObrazec({
      naslov: s.naslov,
      datum: s.datum,
      ura: s.ura,
      trajanjeMin: s.trajanjeMin ? String(s.trajanjeMin) : '',
      strankaId: s.strankaId || '',
      kontaktId: s.kontaktId || '',
      lokacija: s.lokacija || '',
      videoUrl: s.videoUrl || '',
      opomba: s.opomba || '',
    });
    setObrazecOdprt(true);
  };

  const zapriObrazec = () => { setObrazecOdprt(false); setUrejamId(null); };

  const shrani = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!obrazec.naslov.trim() || !obrazec.datum || !obrazec.ura) return;
    const s: Sestanek = {
      id: urejamId || crypto.randomUUID(),
      tip: obrazecTip,
      naslov: obrazec.naslov.trim(),
      datum: obrazec.datum,
      ura: obrazec.ura,
      trajanjeMin: obrazec.trajanjeMin ? Number(obrazec.trajanjeMin) : undefined,
      strankaId: obrazec.strankaId || undefined,
      kontaktId: obrazec.kontaktId.trim() || undefined,
      lokacija: obrazec.lokacija.trim() || undefined,
      videoUrl: obrazec.videoUrl.trim() || undefined,
      opomba: obrazec.opomba.trim() || undefined,
    };
    shraniSestanek(s);
    if (s.strankaId) {
      zabeleziInterakcijo(s.strankaId, {
        tip: s.tip === 'klic' ? 'klic' : 'sestanek',
        besedilo: (s.tip === 'klic' ? 'Klic — ' : 'Sestanek — ') + s.naslov,
        kontaktId: s.kontaktId,
      });
    }
    osveziSestanke();
    zapriObrazec();
  };

  const izbrisi = (id: string) => {
    if (!window.confirm('Izbrišem ta termin?')) return;
    izbrisiSestanek(id);
    osveziSestanke();
  };

  const dodajVKoledar = (p: Postavka) => prenesiIcs(p.naslov, izbranDan, p.icsOpis);

  const ikonaZa = (tip: Postavka['tip']) => {
    if (tip === 'sestanek') return <UsersThree size={16} weight="fill" />;
    if (tip === 'klic') return <Phone size={16} weight="fill" />;
    if (tip === 'racun') return <Receipt size={16} weight="fill" />;
    return <Kanban size={16} weight="fill" />;
  };

  const prazno = termini.length === 0 && roki.length === 0;

  return (
    <div className="kol">
      <header className="kol-glava">
        <p className="kol-eyebrow">KOLEDAR</p>
        <h1 className="kol-naslov">Sestanki, klici in roki.</h1>
        <p className="kol-podnaslov">Dnevni pregled dogovorjenih terminov, poleg tega zapadlost plačil (in po želji roki nalog). »Dodaj v koledar« prenese .ics za tvoj Apple ali drug koledar.</p>
      </header>

      {zapadliRacuni.length > 0 && (
        <button type="button" className="kol-zapadlo-trak" onClick={() => setIzbranDan(zapadliRacuni[0].datum)}>
          <Receipt size={15} weight="bold" /> {zapadliRacuni.length} {zapadliRacuni.length === 1 ? 'zapadel rok plačila' : 'zapadlih rokov plačil'} pred danes — pojdi na najzgodnejšega
        </button>
      )}

      <div className="kol-nav">
        <button type="button" className="kol-nav-gumb" onClick={() => premakniDan(-1)} aria-label="Prejšnji dan"><CaretLeft size={16} weight="bold" /></button>
        <div className="kol-nav-sredina">
          <button type="button" className="kol-danes" onClick={() => setIzbranDan(danes)}>Danes</button>
          <strong className="kol-nav-datum">{naslovDneva(izbranDan)}</strong>
        </div>
        <button type="button" className="kol-nav-gumb" onClick={() => premakniDan(1)} aria-label="Naslednji dan"><CaretRight size={16} weight="bold" /></button>
      </div>

      <div className="kol-akcije">
        <label className="kol-preklop">
          <input type="checkbox" checked={pokaziNaloge} onChange={(e) => setPokaziNaloge(e.target.checked)} />
          Pokaži naloge
        </label>
        {!samoOgled ? (
          <div className="kol-novi">
            <button type="button" className="kol-nov-gumb" onClick={() => odpriNov('sestanek')}><Plus size={14} weight="bold" /> Nov sestanek</button>
            <button type="button" className="kol-nov-gumb" onClick={() => odpriNov('klic')}><Plus size={14} weight="bold" /> Nov klic</button>
          </div>
        ) : (
          <p className="kol-demo-namig">Dodajanje ni na voljo v predogledu (demo). Prijavi se v svoj račun.</p>
        )}
      </div>

      {prazno ? (
        <div className="kol-prazno"><CalendarPlus size={30} weight="light" aria-hidden /><strong>Ta dan je prost.</strong><p>Dodaj sestanek, klic, ali pa se rok pojavi tu sam (računi, po želji naloge).</p></div>
      ) : (
        <>
          {termini.length > 0 && (
            <section className="kol-skupina">
              <h2 className="kol-skupina-naslov">Termini <span>{termini.length}</span></h2>
              <ul className="kol-seznam">
                {termini.map((p) => (
                  <li key={p.id} className="kol-vrstica" data-tip={p.tip}>
                    <span className="kol-ura" aria-hidden>{p.ura}</span>
                    <span className="kol-ikona-oznaka" data-tip={p.tip} aria-hidden>{ikonaZa(p.tip)}</span>
                    <div className="kol-besedilo">
                      <strong>{p.naslov}</strong>
                      {p.pod && <small>{p.pod}</small>}
                    </div>
                    <div className="kol-vrstica-akcije">
                      {p.videoUrl && <a className="kol-video" href={p.videoUrl} target="_blank" rel="noopener noreferrer"><VideoCamera size={14} weight="bold" /> Pridruži se</a>}
                      {!samoOgled && (
                        <>
                          <button type="button" className="kol-ikona-gumb" onClick={() => p.original && odpriUredi(p.original)} aria-label="Uredi"><PencilSimple size={14} weight="bold" /></button>
                          <button type="button" className="kol-ikona-gumb" onClick={() => izbrisi(p.id)} aria-label="Izbriši"><Trash size={14} weight="bold" /></button>
                        </>
                      )}
                      <button type="button" className="kol-dodaj" onClick={() => dodajVKoledar(p)} title="Prenesi .ics in dodaj v koledar"><CalendarPlus size={15} weight="bold" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {roki.length > 0 && (
            <section className="kol-skupina">
              <h2 className="kol-skupina-naslov">Roki <span>{roki.length}</span></h2>
              <ul className="kol-seznam">
                {roki.map((p) => (
                  <li key={p.id} className="kol-vrstica" data-tip={p.tip}>
                    <span className="kol-ikona-oznaka" data-tip={p.tip} aria-hidden>{ikonaZa(p.tip)}</span>
                    <div className="kol-besedilo">
                      <strong>{p.naslov}</strong>
                      {p.pod && <small>{p.pod}</small>}
                    </div>
                    <div className="kol-vrstica-akcije">
                      <button type="button" className="kol-dodaj" onClick={() => dodajVKoledar(p)} title="Prenesi .ics in dodaj v koledar"><CalendarPlus size={15} weight="bold" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {obrazecOdprt && !samoOgled && (
        <div className="kol-modal-ozadje" onClick={zapriObrazec}>
          <form className="kol-modal" onClick={(e) => e.stopPropagation()} onSubmit={shrani}>
            <div className="kol-modal-glava">
              <h2>{urejamId ? 'Uredi termin' : 'Nov termin'}</h2>
              <button type="button" className="kol-ikona-gumb" onClick={zapriObrazec} aria-label="Zapri"><X size={16} weight="bold" /></button>
            </div>

            <div className="kol-modal-tip" role="group" aria-label="Vrsta termina">
              <button type="button" data-aktiven={obrazecTip === 'sestanek'} onClick={() => setObrazecTip('sestanek')}><UsersThree size={14} weight="bold" /> Sestanek</button>
              <button type="button" data-aktiven={obrazecTip === 'klic'} onClick={() => setObrazecTip('klic')}><Phone size={14} weight="bold" /> Klic</button>
            </div>

            <label>Naslov<input required value={obrazec.naslov} onChange={(e) => setObrazec({ ...obrazec, naslov: e.target.value })} placeholder="npr. Uskladitev ponudbe" /></label>

            <div className="kol-modal-vrsta">
              <label>Datum<input required type="date" value={obrazec.datum} onChange={(e) => setObrazec({ ...obrazec, datum: e.target.value })} /></label>
              <label>Ura<input required type="time" value={obrazec.ura} onChange={(e) => setObrazec({ ...obrazec, ura: e.target.value })} /></label>
              <label>Trajanje (min)<input type="number" min={0} step={5} value={obrazec.trajanjeMin} onChange={(e) => setObrazec({ ...obrazec, trajanjeMin: e.target.value })} placeholder="npr. 30" /></label>
            </div>

            <div className="kol-modal-vrsta">
              <label>Stranka<select value={obrazec.strankaId} onChange={(e) => setObrazec({ ...obrazec, strankaId: e.target.value })}><option value="">Brez stranke</option>{stranke.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label>Kontaktna oseba<input value={obrazec.kontaktId} onChange={(e) => setObrazec({ ...obrazec, kontaktId: e.target.value })} placeholder={najdiStranko(obrazec.strankaId)?.contact || 'neobvezno'} /></label>
            </div>

            <div className="kol-modal-vrsta">
              <label>Lokacija<input value={obrazec.lokacija} onChange={(e) => setObrazec({ ...obrazec, lokacija: e.target.value })} placeholder="npr. Pisarna stranke" /></label>
              <label>Video povezava<input type="url" value={obrazec.videoUrl} onChange={(e) => setObrazec({ ...obrazec, videoUrl: e.target.value })} placeholder="https://teams.microsoft.com/…" /></label>
            </div>

            <label>Opomba<textarea rows={3} value={obrazec.opomba} onChange={(e) => setObrazec({ ...obrazec, opomba: e.target.value })} placeholder="O čem tečejo pogovori?" /></label>

            <div className="kol-modal-akcije">
              {urejamId && <button type="button" className="kol-modal-izbrisi" onClick={() => { izbrisi(urejamId); zapriObrazec(); }}><Trash size={14} weight="bold" /> Izbriši</button>}
              <div className="kol-modal-akcije-desno">
                <button type="button" onClick={zapriObrazec}>Prekliči</button>
                <button type="submit" className="kol-modal-shrani">Shrani termin</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .kol{padding:1.6rem clamp(1rem,3vw,2.2rem) 4rem;max-width:52rem;min-width:0}
        .kol-eyebrow{margin:0 0 .35rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
        .kol-naslov{margin:0;font:500 clamp(2rem,4vw,2.8rem)/1 var(--font-serif),Georgia,serif;color:var(--ink)}
        .kol-podnaslov{margin:.55rem 0 1.6rem;max-width:56ch;color:var(--muted);font-size:.86rem;line-height:1.5}

        .kol-zapadlo-trak{display:flex;align-items:center;gap:.5rem;width:100%;margin-bottom:1.2rem;padding:.65rem .9rem;border:1px solid oklch(86% .06 30);border-radius:.9rem;background:oklch(98% .02 40 / .7);color:oklch(48% .16 30);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer;text-align:left}
        .kol-zapadlo-trak:hover{background:oklch(96% .04 40)}

        .kol-nav{display:flex;align-items:center;justify-content:space-between;gap:.8rem;margin-bottom:1rem;padding:.6rem .3rem;border-bottom:1px solid var(--line)}
        .kol-nav-gumb{flex:none;width:2.2rem;height:2.2rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);cursor:pointer}
        .kol-nav-gumb:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        .kol-nav-sredina{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:.2rem;text-align:center}
        .kol-nav-datum{font:600 1.05rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .kol-danes{border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--muted);font:700 .62rem var(--font-sans),sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:.25rem .7rem;cursor:pointer}
        .kol-danes:hover{color:var(--ink);border-color:var(--ink)}

        .kol-akcije{display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap;margin-bottom:1.4rem}
        .kol-preklop{display:inline-flex;align-items:center;gap:.45rem;font:600 .78rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
        .kol-preklop input{width:1rem;height:1rem;accent-color:var(--ink)}
        .kol-novi{display:flex;gap:.5rem;flex-wrap:wrap}
        .kol-nov-gumb{display:inline-flex;align-items:center;gap:.35rem;padding:.5rem .85rem;border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--paper);font:700 .7rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
        .kol-nov-gumb:hover{opacity:.85}
        .kol-demo-namig{margin:0;font-size:.76rem;color:var(--muted)}

        .kol-skupina{margin-bottom:1.8rem}
        .kol-skupina-naslov{display:flex;align-items:center;gap:.6rem;margin:0 0 .7rem;font:800 .7rem var(--font-sans),sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink)}
        .kol-skupina-naslov span{min-width:1.5rem;height:1.5rem;padding:0 .45rem;display:grid;place-items:center;border-radius:999px;background:oklch(94% .01 87);color:var(--muted);font-size:.66rem}

        .kol-seznam{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.55rem}
        .kol-vrstica{display:flex;align-items:center;gap:.75rem;padding:.7rem .85rem;border:1px solid var(--line);border-radius:1rem;background:oklch(99% .006 87 / .85)}
        .kol-ura{flex:none;width:3.1rem;font:700 .78rem var(--font-sans),sans-serif;color:var(--ink);text-align:right}
        .kol-ikona-oznaka{flex:none;width:2.4rem;height:2.4rem;display:grid;place-items:center;border-radius:.7rem;background:oklch(95% .02 300);color:oklch(40% .12 300)}
        .kol-ikona-oznaka[data-tip='klic']{background:oklch(95% .04 70);color:oklch(42% .13 70)}
        .kol-ikona-oznaka[data-tip='racun']{background:oklch(93% .06 30);color:oklch(48% .16 30)}
        .kol-ikona-oznaka[data-tip='naloga']{background:oklch(95% .03 165);color:oklch(40% .1 165)}
        .kol-besedilo{flex:1;min-width:0;display:flex;flex-direction:column;gap:.1rem}
        .kol-besedilo strong{font-size:.86rem;font-weight:650;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-besedilo small{font-size:.68rem;color:var(--muted)}
        .kol-vrstica-akcije{flex:none;display:flex;align-items:center;gap:.4rem}
        .kol-video{display:inline-flex;align-items:center;gap:.3rem;padding:.35rem .65rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);font:700 .64rem var(--font-sans),sans-serif;white-space:nowrap;text-decoration:none}
        .kol-video:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        .kol-ikona-gumb{flex:none;width:2rem;height:2rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--muted);cursor:pointer}
        .kol-ikona-gumb:hover{color:var(--ink);border-color:var(--ink)}
        .kol-dodaj{flex:none;width:2rem;height:2rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);cursor:pointer}
        .kol-dodaj:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}

        .kol-prazno{display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:3rem 1rem;border:1px dashed var(--line);border-radius:1.2rem;text-align:center;color:var(--muted)}
        .kol-prazno strong{color:var(--ink);font-size:1rem}
        .kol-prazno p{margin:0;font-size:.8rem;max-width:32ch}

        .kol-modal-ozadje{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;background:oklch(20% 0 0 / .45);padding:0}
        .kol-modal{width:100%;max-width:34rem;max-height:92vh;overflow-y:auto;background:var(--paper);border-radius:1.4rem 1.4rem 0 0;padding:1.4rem 1.3rem 1.6rem;display:flex;flex-direction:column;gap:.9rem;box-shadow:0 -.5rem 2rem oklch(20% 0 0 / .18)}
        .kol-modal-glava{display:flex;align-items:center;justify-content:space-between}
        .kol-modal-glava h2{margin:0;font:600 1.25rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .kol-modal-tip{display:flex;gap:.5rem}
        .kol-modal-tip button{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;padding:.55rem;border:1px solid var(--line);border-radius:.8rem;background:var(--paper);color:var(--muted);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
        .kol-modal-tip button[data-aktiven='true']{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        .kol-modal label{display:flex;flex-direction:column;gap:.3rem;font:700 .68rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
        .kol-modal input,.kol-modal select,.kol-modal textarea{font:500 .88rem var(--font-sans),sans-serif;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:.65rem;padding:.55rem .7rem;text-transform:none;letter-spacing:normal}
        .kol-modal textarea{resize:vertical;min-height:3.6rem}
        .kol-modal-vrsta{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.7rem}
        .kol-modal-akcije{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.3rem}
        .kol-modal-akcije-desno{display:flex;gap:.5rem;margin-left:auto}
        .kol-modal-akcije button{padding:.6rem 1rem;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
        .kol-modal-shrani{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        .kol-modal-shrani:hover{opacity:.85}
        .kol-modal-izbrisi{display:inline-flex;align-items:center;gap:.35rem;color:oklch(48% .16 30);border-color:oklch(86% .06 30)}

        @media (min-width:640px){.kol-modal-ozadje{align-items:center}.kol-modal{border-radius:1.4rem}}
        @media (max-width:560px){.kol-ura{width:2.5rem;font-size:.7rem}}
      `}</style>
    </div>
  );
}
