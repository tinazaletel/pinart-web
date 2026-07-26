'use client';

/* KOLEDAR — pravi dnevni koledar (Teams/Apple-koledar varianta): navpična
   urna mreža z dogodki kot bloki od–do, ne le seznam. Navigacija po dnevih
   (‹ prejšnji / danes / naslednji ›), sestanki + klici (lib/sestanki.ts,
   lokalna shramba) so bloki v mreži; roki plačil (računi) in po želji roki
   nalog nimajo ure, zato so prikazani kot pas »Ves dan« nad mrežo. Nov
   sestanek/klic se ob izbrani stranki samodejno zabeleži tudi v CRM dnevnik
   stranke (lib/dnevnik.ts). Ob vsakem dogodku »Dodaj v koledar« (.ics,
   lib/ics.ts) — tapneš na iPhonu in dogodek skoči v tvoj Apple (ali drug)
   koledar. */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CalendarPlus,
  Receipt,
  Kanban,
  CaretLeft,
  CaretRight,
  Plus,
  UsersThree,
  Phone,
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

/* Urna mreža: enakomerna višina na uro, cel dan skrolabilen, privzeto
   prikazan razpon 07:00–21:00 (14 ur), nato se lahko skrola do 00:00/24:00. */
const HOUR_HEIGHT = 56;
const GRID_HOURS = 24;
const VISIBLE_HOURS = 14;
const DEFAULT_SCROLL_HOUR = 7;
const MIN_BLOK_PX = 30;

const money = (v: number) => `${Math.round(v).toLocaleString('sl-SI')} €`;
const dodajDni = (iso: string, dni: number) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso; d.setDate(d.getDate() + dni); return d.toISOString().slice(0, 10); };
const danesISO = () => new Date().toISOString().slice(0, 10);
const veliko = (s: string) => (s ? s[0].toLocaleUpperCase('sl-SI') + s.slice(1) : s);
const naslovDneva = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : veliko(d.toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })); };

const parseUra = (ura: string): number => {
  const [h, m] = ura.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};
const formatUra = (min: number): string => {
  const h = Math.floor(min / 60) % 24;
  const m = ((min % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
const formatUraOdDo = (startMin: number, durMin: number) => `${formatUra(startMin)}–${formatUra(startMin + durMin)}`;

/* Razporedi prekrivajoče se dogodke v stolpce (kot Apple/Teams koledar):
   vsak dogodek dobi svoj stolpec znotraj skupine prekrivajočih se dogodkov,
   skupina pa določi skupno število stolpcev (torej širino vsakega). */
type ZasedbaVhod = { id: string; startMin: number; endMin: number };
type ZasedbaIzhod = { col: number; cols: number };

function izracunajRazporeditev(vhodi: ZasedbaVhod[]): Map<string, ZasedbaIzhod> {
  const razvrsceni = [...vhodi].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const rezultat = new Map<string, ZasedbaIzhod>();
  let aktivni: { id: string; col: number; endMin: number }[] = [];
  let gruca: { id: string; col: number }[] = [];

  const zakljuciGruco = () => {
    if (gruca.length === 0) return;
    const najvecStolpcev = Math.max(...gruca.map((g) => g.col)) + 1;
    gruca.forEach((g) => rezultat.set(g.id, { col: g.col, cols: najvecStolpcev }));
    gruca = [];
  };

  for (const vhod of razvrsceni) {
    aktivni = aktivni.filter((a) => a.endMin > vhod.startMin);
    if (aktivni.length === 0) zakljuciGruco();
    const zasedeni = new Set(aktivni.map((a) => a.col));
    let col = 0;
    while (zasedeni.has(col)) col++;
    aktivni.push({ id: vhod.id, col, endMin: vhod.endMin });
    gruca.push({ id: vhod.id, col });
  }
  zakljuciGruco();
  return rezultat;
}

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
  const [, setUra] = useState(0); // periodičen re-render (vsako minuto), da črta »zdaj« ostane točna

  const [obrazecOdprt, setObrazecOdprt] = useState(false);
  const [urejamId, setUrejamId] = useState<string | null>(null);
  const [obrazecTip, setObrazecTip] = useState<SestanekTip>('sestanek');
  const [obrazec, setObrazec] = useState(PRAZEN_OBRAZEC);

  const scrollRef = useRef<HTMLDivElement>(null);

  const osveziSestanke = () => setSestanki(preberiSestanki());
  const osveziNaloge = () => setNaloge(preberiNaloge());

  useEffect(() => { osveziSestanke(); osveziNaloge(); }, []);

  useEffect(() => {
    const id = setInterval(() => setUra((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    setStranke(flow.clients || []);
    const izRacunov: RacunRok[] = (flow.invoices || [])
      .filter((r) => !r.paid)
      .map((r) => ({ datum: dodajDni(r.date, typeof r.dueDays === 'number' ? r.dueDays : 15), naslov: `Plačilo · Račun ${r.number || ''}`.trim(), pod: `${r.client || ''}${r.amount ? ' · ' + money(r.amount) : ''}` }))
      .filter((r) => r.datum);
    setRokiRacunov(izRacunov);
  }, [nacin]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = DEFAULT_SCROLL_HOUR * HOUR_HEIGHT;
  }, [izbranDan]);

  const danes = danesISO();
  const jeDanes = izbranDan === danes;
  const zdaj = new Date();
  const zdajMin = zdaj.getHours() * 60 + zdaj.getMinutes();
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

  const blokiDogodkov = useMemo(() => {
    const osnova = termini.map((p) => {
      const start = parseUra(p.ura || '00:00');
      const dur = p.original?.trajanjeMin && p.original.trajanjeMin > 0 ? p.original.trajanjeMin : 30;
      return { p, start, dur };
    });
    const razporeditev = izracunajRazporeditev(osnova.map((o) => ({ id: o.p.id, startMin: o.start, endMin: o.start + o.dur })));
    return osnova.map((o) => {
      const lay = razporeditev.get(o.p.id) || { col: 0, cols: 1 };
      return { ...o, col: lay.col, cols: lay.cols };
    });
  }, [termini]);

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

  const odpriNov = (tip: SestanekTip, ura?: string) => {
    if (samoOgled) return;
    setUrejamId(null);
    setObrazecTip(tip);
    setObrazec({ ...PRAZEN_OBRAZEC, datum: izbranDan, ura: ura || PRAZEN_OBRAZEC.ura });
    setObrazecOdprt(true);
  };

  const odpriUredi = (s: Sestanek) => {
    if (samoOgled) return;
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

  const klikNaProsto = (h: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (samoOgled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minuta = offsetY < HOUR_HEIGHT / 2 ? 0 : 30;
    odpriNov('sestanek', `${String(h).padStart(2, '0')}:${minuta === 0 ? '00' : '30'}`);
  };

  const ikonaZa = (tip: Postavka['tip']) => {
    if (tip === 'sestanek') return <UsersThree size={16} weight="fill" />;
    if (tip === 'klic') return <Phone size={16} weight="fill" />;
    if (tip === 'racun') return <Receipt size={16} weight="fill" />;
    return <Kanban size={16} weight="fill" />;
  };

  return (
    <div className="kol">
      <header className="kol-glava">
        <p className="kol-eyebrow">KOLEDAR</p>
        <h1 className="kol-naslov">Sestanki, klici in roki.</h1>
        <p className="kol-podnaslov">Dnevna urna mreža dogovorjenih terminov, poleg tega zapadlost plačil (in po želji roki nalog) v pasu »Ves dan«. »Dodaj v koledar« prenese .ics za tvoj Apple ali drug koledar.</p>
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

      {roki.length > 0 && (
        <section className="kol-vsedan" aria-label="Roki tega dne">
          <span className="kol-vsedan-oznaka">Ves dan</span>
          <div className="kol-vsedan-pilule">
            {roki.map((p) => (
              <div key={p.id} className="kol-pilula" data-tip={p.tip}>
                <span className="kol-ikona-oznaka kol-pilula-ikona" data-tip={p.tip} aria-hidden>{ikonaZa(p.tip)}</span>
                <span className="kol-pilula-besedilo">
                  <strong>{p.naslov}</strong>
                  {p.pod && <small>{p.pod}</small>}
                </span>
                <button type="button" className="kol-dodaj kol-pilula-ics" onClick={() => dodajVKoledar(p)} title="Prenesi .ics in dodaj v koledar" aria-label="Dodaj v koledar"><CalendarPlus size={13} weight="bold" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {termini.length === 0 && (
        <p className="kol-prazno-namig">Ta dan je prost — klikni v mrežo spodaj ali dodaj sestanek/klic zgoraj.</p>
      )}

      <div className="kol-mreza-obal">
        <div className="kol-mreza-scroll" ref={scrollRef} style={{ maxHeight: VISIBLE_HOURS * HOUR_HEIGHT }}>
          <div className="kol-mreza-red">
            <div className="kol-mreza-ure" style={{ height: GRID_HOURS * HOUR_HEIGHT }}>
              {Array.from({ length: GRID_HOURS }).map((_, h) => (
                <div key={h} className="kol-ura-nalepka" style={{ height: HOUR_HEIGHT }}>
                  <span>{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
            <div className="kol-mreza-glavna" style={{ height: GRID_HOURS * HOUR_HEIGHT }}>
              {Array.from({ length: GRID_HOURS }).map((_, h) => (
                <div
                  key={h}
                  className="kol-ura-cona"
                  data-klikljivo={!samoOgled}
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  onClick={(e) => klikNaProsto(h, e)}
                />
              ))}

              {jeDanes && (
                <div className="kol-zdaj-crta" style={{ top: (zdajMin / 60) * HOUR_HEIGHT }}>
                  <span className="kol-zdaj-pika" />
                </div>
              )}

              {blokiDogodkov.map(({ p, start, dur, col, cols }) => {
                const top = (start / 60) * HOUR_HEIGHT;
                const visina = Math.max((dur / 60) * HOUR_HEIGHT, MIN_BLOK_PX);
                const jeVelik = visina >= 46;
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    className="kol-blok"
                    data-tip={p.tip}
                    style={{ top, height: visina, left: `${(col / cols) * 100}%`, width: `calc(${100 / cols}% - 4px)` }}
                    onClick={() => p.original && odpriUredi(p.original)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && p.original) { e.preventDefault(); odpriUredi(p.original); } }}
                  >
                    <span className="kol-blok-glava">
                      <span className="kol-blok-ikona" aria-hidden>{ikonaZa(p.tip)}</span>
                      <span className="kol-blok-ura">{formatUraOdDo(start, dur)}</span>
                    </span>
                    <strong className="kol-blok-naslov">{p.naslov}</strong>
                    {jeVelik && p.pod && <small className="kol-blok-pod">{p.pod}</small>}
                    {jeVelik && (
                      <span className="kol-blok-akcije">
                        {p.videoUrl && (
                          <a
                            className="kol-blok-akcija"
                            href={p.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Pridruži se video klicu"
                            aria-label="Pridruži se video klicu"
                          >
                            <VideoCamera size={12} weight="bold" />
                          </a>
                        )}
                        <button
                          type="button"
                          className="kol-blok-akcija"
                          onClick={(e) => { e.stopPropagation(); dodajVKoledar(p); }}
                          title="Prenesi .ics"
                          aria-label="Prenesi .ics"
                        >
                          <CalendarPlus size={12} weight="bold" />
                        </button>
                        {!samoOgled && (
                          <button
                            type="button"
                            className="kol-blok-akcija"
                            onClick={(e) => { e.stopPropagation(); izbrisi(p.id); }}
                            title="Izbriši"
                            aria-label="Izbriši"
                          >
                            <Trash size={12} weight="bold" />
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
        .kol{padding:1.6rem clamp(1rem,3vw,2.2rem) 4rem;max-width:56rem;min-width:0}
        .kol-eyebrow{margin:0 0 .35rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--ink);opacity:.55}
        .kol-naslov{margin:0;font:500 clamp(2rem,4vw,2.8rem)/1 var(--font-serif),Georgia,serif;color:var(--ink)}
        .kol-podnaslov{margin:.55rem 0 1.6rem;max-width:60ch;color:var(--ink);opacity:.65;font-size:.86rem;line-height:1.5}

        .kol-zapadlo-trak{display:flex;align-items:center;gap:.5rem;width:100%;margin-bottom:1.2rem;padding:.65rem .9rem;border:1px solid oklch(86% .06 30);border-radius:.9rem;background:oklch(98% .02 40 / .7);color:oklch(48% .16 30);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer;text-align:left}
        .kol-zapadlo-trak:hover{background:oklch(96% .04 40)}

        .kol-nav{display:flex;align-items:center;justify-content:space-between;gap:.8rem;margin-bottom:1rem;padding:.6rem .3rem;border-bottom:1px solid var(--line)}
        .kol-nav-gumb{flex:none;width:2.2rem;height:2.2rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);cursor:pointer}
        .kol-nav-gumb:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        .kol-nav-sredina{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:.2rem;text-align:center}
        .kol-nav-datum{font:600 1.05rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .kol-danes{border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);opacity:.65;font:700 .62rem var(--font-sans),sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:.25rem .7rem;cursor:pointer}
        .kol-danes:hover{opacity:1;border-color:var(--ink)}

        .kol-akcije{display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap;margin-bottom:1.2rem}
        .kol-preklop{display:inline-flex;align-items:center;gap:.45rem;font:600 .78rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
        .kol-preklop input{width:1rem;height:1rem;accent-color:var(--ink)}
        .kol-novi{display:flex;gap:.5rem;flex-wrap:wrap}
        .kol-nov-gumb{display:inline-flex;align-items:center;gap:.35rem;padding:.5rem .85rem;border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--paper);font:700 .7rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
        .kol-nov-gumb:hover{opacity:.85}
        .kol-demo-namig{margin:0;font-size:.76rem;color:var(--ink);opacity:.6}

        .kol-vsedan{display:flex;align-items:flex-start;gap:.8rem;margin-bottom:1rem;padding:.7rem .85rem;border:1px solid var(--line);border-radius:1rem;background:oklch(99% .006 87 / .85)}
        .kol-vsedan-oznaka{flex:none;padding-top:.3rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);opacity:.55}
        .kol-vsedan-pilule{flex:1;min-width:0;display:flex;gap:.55rem;overflow-x:auto;padding-bottom:.15rem}
        .kol-pilula{flex:none;display:flex;align-items:center;gap:.5rem;min-width:11rem;max-width:18rem;padding:.4rem .55rem;border:1px solid var(--line);border-radius:.8rem;background:var(--paper)}
        .kol-pilula-ikona{width:1.9rem;height:1.9rem;border-radius:.55rem}
        .kol-pilula-besedilo{flex:1;min-width:0;display:flex;flex-direction:column;gap:.05rem}
        .kol-pilula-besedilo strong{font-size:.76rem;font-weight:650;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-pilula-besedilo small{font-size:.64rem;color:var(--ink);opacity:.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-pilula-ics{flex:none;width:1.7rem;height:1.7rem}

        .kol-ikona-oznaka{flex:none;width:2.4rem;height:2.4rem;display:grid;place-items:center;border-radius:.7rem;background:oklch(95% .02 300);color:oklch(40% .12 300)}
        .kol-ikona-oznaka[data-tip='klic']{background:oklch(95% .04 70);color:oklch(42% .13 70)}
        .kol-ikona-oznaka[data-tip='racun']{background:oklch(93% .06 30);color:oklch(48% .16 30)}
        .kol-ikona-oznaka[data-tip='naloga']{background:oklch(95% .03 165);color:oklch(40% .1 165)}

        .kol-prazno-namig{margin:0 0 .9rem;font-size:.8rem;color:var(--ink);opacity:.55}

        .kol-mreza-obal{border:1px solid var(--line);border-radius:1.1rem;overflow:hidden;background:var(--paper)}
        .kol-mreza-scroll{overflow-y:auto;overflow-x:hidden}
        .kol-mreza-red{display:flex;align-items:stretch}
        .kol-mreza-ure{flex:none;width:3.6rem;position:relative;border-right:1px solid var(--line);background:oklch(99% .006 87 / .6)}
        .kol-ura-nalepka{position:relative;text-align:right;padding-right:.5rem}
        .kol-ura-nalepka span{position:relative;top:-.6em;display:inline-block;font:700 .62rem var(--font-sans),sans-serif;color:var(--ink);opacity:.45}
        .kol-mreza-glavna{position:relative;flex:1;min-width:0;border-bottom:1px solid var(--line)}
        .kol-ura-cona{position:absolute;left:0;right:0;border-top:1px solid var(--line);z-index:1}
        .kol-ura-cona::after{content:'';position:absolute;left:0;right:0;top:50%;border-top:1px dashed var(--line);opacity:.55}
        .kol-ura-cona[data-klikljivo='true']{cursor:pointer}
        .kol-ura-cona[data-klikljivo='true']:hover{background:oklch(97% .012 87 / .7)}

        .kol-zdaj-crta{position:absolute;left:0;right:0;height:0;border-top:2px solid oklch(58% .19 25);z-index:3;pointer-events:none}
        .kol-zdaj-pika{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:999px;background:oklch(58% .19 25)}

        .kol-blok{position:absolute;box-sizing:border-box;z-index:2;display:flex;flex-direction:column;gap:.15rem;padding:.32rem .5rem;border-radius:.6rem;border:1px solid oklch(85% .04 300);background:oklch(95% .035 300 / .95);color:oklch(30% .1 300);cursor:pointer;overflow:hidden;text-align:left}
        .kol-blok[data-tip='klic']{border-color:oklch(84% .07 70);background:oklch(95% .05 70 / .95);color:oklch(32% .12 70)}
        .kol-blok:hover{filter:brightness(.97)}
        .kol-blok:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
        .kol-blok-glava{display:flex;align-items:center;gap:.3rem}
        .kol-blok-ikona{display:inline-flex;opacity:.85}
        .kol-blok-ura{font:700 .6rem var(--font-sans),sans-serif;opacity:.85;white-space:nowrap}
        .kol-blok-naslov{font-size:.74rem;font-weight:650;color:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-blok-pod{font-size:.62rem;font-weight:500;color:inherit;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-blok-akcije{margin-top:auto;display:flex;gap:.3rem;align-items:center;padding-top:.15rem}
        .kol-blok-akcija{width:1.2rem;height:1.2rem;display:grid;place-items:center;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;opacity:.7;cursor:pointer;text-decoration:none}
        .kol-blok-akcija:hover{opacity:1}

        .kol-modal-ozadje{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;background:oklch(20% 0 0 / .45);padding:0}
        .kol-modal{width:100%;max-width:34rem;max-height:92vh;overflow-y:auto;background:var(--paper);border-radius:1.4rem 1.4rem 0 0;padding:1.4rem 1.3rem 1.6rem;display:flex;flex-direction:column;gap:.9rem;box-shadow:0 -.5rem 2rem oklch(20% 0 0 / .18)}
        .kol-modal-glava{display:flex;align-items:center;justify-content:space-between}
        .kol-modal-glava h2{margin:0;font:600 1.25rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .kol-ikona-gumb{flex:none;width:2rem;height:2rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);opacity:.7;cursor:pointer}
        .kol-ikona-gumb:hover{opacity:1;border-color:var(--ink)}
        .kol-dodaj{flex:none;width:2rem;height:2rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);cursor:pointer}
        .kol-dodaj:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        .kol-modal-tip{display:flex;gap:.5rem}
        .kol-modal-tip button{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;padding:.55rem;border:1px solid var(--line);border-radius:.8rem;background:var(--paper);color:var(--ink);opacity:.65;font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
        .kol-modal-tip button[data-aktiven='true']{background:var(--ink);color:var(--paper);border-color:var(--ink);opacity:1}
        .kol-modal label{display:flex;flex-direction:column;gap:.3rem;font:700 .68rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--ink);opacity:.6}
        .kol-modal input,.kol-modal select,.kol-modal textarea{font:500 .88rem var(--font-sans),sans-serif;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:.65rem;padding:.55rem .7rem;text-transform:none;letter-spacing:normal;opacity:1}
        .kol-modal textarea{resize:vertical;min-height:3.6rem}
        .kol-modal-vrsta{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.7rem}
        .kol-modal-akcije{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.3rem}
        .kol-modal-akcije-desno{display:flex;gap:.5rem;margin-left:auto}
        .kol-modal-akcije button{padding:.6rem 1rem;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
        .kol-modal-shrani{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        .kol-modal-shrani:hover{opacity:.85}
        .kol-modal-izbrisi{display:inline-flex;align-items:center;gap:.35rem;color:oklch(48% .16 30);border-color:oklch(86% .06 30)}

        @media (min-width:640px){.kol-modal-ozadje{align-items:center}.kol-modal{border-radius:1.4rem}}
        @media (max-width:560px){
          .kol-mreza-ure{width:2.6rem}
          .kol-ura-nalepka span{font-size:.56rem;top:-.55em}
          .kol-blok-naslov{font-size:.7rem}
          .kol-pilula{min-width:9rem}
        }
      `}</style>
    </div>
  );
}
