'use client';

/* KOLEDAR — Bitrix-slog koledar s tremi pogledi (Dan / Teden / Mesec).
   Kompaktna glava (dve tanki vrstici): »Koledar« + »+ Ustvari« + iskanje;
   spodaj segmentirani zavihki pogledov + obseg + navigacija ‹ Danes ›.
   Mesečni pogled = 7 stolpcev (pon–ned), bele celice s tankimi sivimi
   črtami, datum zgoraj desno, današnji dan v akcentni znački. Tedenski in
   dnevni pogled = urna mreža z dogodki kot bloki od–do + rdeča črta »zdaj«.
   Roki plačil (računi) in po želji roki nalog nimajo ure, zato so v pasu
   »Ves dan«. Vsa logika ostane: dodajanje/urejanje/brisanje sestankov in
   klicev (lib/sestanki), zapis v CRM dnevnik (lib/dnevnik), izvoz .ics
   (lib/ics) ter predogled/demo (lib/predogled). Edge-to-edge (brez robov). */

import { useLocale } from 'next-intl';
import MobTabs from '@/components/MobTabs';
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
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { loadFlowData, type FlowClient } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { preberiNaloge, type Naloga } from '@/lib/naloge';
import { prenesiIcs } from '@/lib/ics';
import { preberiSestanki, shraniSestanek, izbrisiSestanek, type Sestanek, type SestanekTip } from '@/lib/sestanki';
import { zabeleziInterakcijo } from '@/lib/dnevnik';

type RacunRok = { datum: string; naslov: string; pod?: string };
type Pogled = 'dan' | 'teden' | 'mesec';

type Postavka = {
  id: string;
  tip: SestanekTip | 'racun' | 'naloga';
  naslov: string;
  ura?: string;
  datum?: string;
  pod?: string;
  original?: Sestanek;
  icsOpis?: string;
  videoUrl?: string;
};

type Blok = { p: Postavka; start: number; dur: number; col: number; cols: number };

/* Urna mreža: enakomerna višina na uro, cel dan skrolabilen, privzeto
   prikazan razpon 07:00–21:00 (14 ur), nato se lahko skrola do 00:00/24:00. */
const HOUR_HEIGHT = 56;
const GRID_HOURS = 24;
const VISIBLE_HOURS = 14;
const DEFAULT_SCROLL_HOUR = 7;
const MIN_BLOK_PX = 30;

const KRATKA_IMENA = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];
const KRATKA_IMENA_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const money = (v: number) => `${Math.round(v).toLocaleString('sl-SI')} €`;
const dodajDni = (iso: string, dni: number) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso; d.setDate(d.getDate() + dni); return d.toISOString().slice(0, 10); };
const dodajMesece = (iso: string, n: number) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso; d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
const danesISO = () => new Date().toISOString().slice(0, 10);
const veliko = (s: string) => (s ? s[0].toLocaleUpperCase('sl-SI') + s.slice(1) : s);

const zacetekTedna = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dow = (d.getDay() + 6) % 7; // 0 = ponedeljek
  return dodajDni(iso, -dow);
};
const dneviTedna = (iso: string): string[] => {
  const zac = zacetekTedna(iso);
  return Array.from({ length: 7 }, (_, i) => dodajDni(zac, i));
};
const mesecMreza = (iso: string): string[] => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return dneviTedna(iso);
  const leto = d.getFullYear();
  const mesec = d.getMonth();
  const prvi = new Date(Date.UTC(leto, mesec, 1)).toISOString().slice(0, 10);
  const zadnji = new Date(Date.UTC(leto, mesec + 1, 0)).toISOString().slice(0, 10);
  const dnevi: string[] = [];
  let cur = zacetekTedna(prvi);
  while (cur <= zadnji || dnevi.length % 7 !== 0) {
    dnevi.push(cur);
    cur = dodajDni(cur, 1);
    if (dnevi.length >= 42) break;
  }
  return dnevi;
};

const stDneva = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : String(d.getDate()); };
const mesecKr = (iso: string, loc = 'sl-SI') => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(loc, { month: 'short' }); };
const kratkiDan = (iso: string, loc = 'sl-SI') => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : veliko(d.toLocaleDateString(loc, { weekday: 'short' })); };
const naslovDnevaKratek = (iso: string, loc = 'sl-SI') => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : veliko(d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })); };
const naslovMeseca = (iso: string, loc = 'sl-SI') => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : veliko(d.toLocaleDateString(loc, { month: 'long', year: 'numeric' })); };
const naslovTedna = (iso: string, loc = 'sl-SI') => {
  const dnevi = dneviTedna(iso);
  const a = new Date(dnevi[0]);
  const b = new Date(dnevi[6]);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return iso;
  const leto = b.getFullYear();
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}.–${b.getDate()}. ${b.toLocaleDateString(loc, { month: 'short' })} ${leto}`;
  return `${a.getDate()}. ${a.toLocaleDateString(loc, { month: 'short' })} – ${b.getDate()}. ${b.toLocaleDateString(loc, { month: 'short' })} ${leto}`;
};

/* Demo sestanki/klici — SAMO za prikaz v predogledu (nacin 'demo'); se NE
   berejo/pišejo v localStorage. Datumi relativni na danes (nekaj ta teden,
   nekaj drugod v mesecu), da koledar v polnem poslovanju izgleda živ. Klienti
   se ujemajo z demo strankami (demo-s-*) iz lib/predogled, da se imena izpišejo. */
function demoSestanki(): Sestanek[] {
  const zac = zacetekTedna(danesISO()); // ponedeljek tega tedna
  const dan = (offset: number) => dodajDni(zac, offset);
  const vMesecu = (stDan: number) => {
    const t = new Date();
    return new Date(Date.UTC(t.getFullYear(), t.getMonth(), Math.min(stDan, 28))).toISOString().slice(0, 10);
  };
  return [
    { id: 'demo-se-1', tip: 'sestanek', naslov: 'Uvodni sestanek — Modra hiša', datum: dan(0), ura: '09:30', trajanjeMin: 60, strankaId: 'demo-s-0', lokacija: 'Pisarna stranke' },
    { id: 'demo-se-2', tip: 'klic', naslov: 'Klic: uskladitev ponudbe', datum: dan(0), ura: '14:00', trajanjeMin: 30, strankaId: 'demo-s-1' },
    { id: 'demo-se-3', tip: 'sestanek', naslov: 'Predstavitev osnutka', datum: dan(1), ura: '11:00', trajanjeMin: 90, strankaId: 'demo-s-2', lokacija: 'Studio Pinart' },
    { id: 'demo-se-4', tip: 'klic', naslov: 'Klic z dobaviteljem tiska', datum: dan(2), ura: '10:15', trajanjeMin: 20, strankaId: 'demo-s-3' },
    { id: 'demo-se-5', tip: 'sestanek', naslov: 'Tedenski pregled projektov', datum: dan(2), ura: '15:30', trajanjeMin: 45, opomba: 'Interni pregled tekočih projektov' },
    { id: 'demo-se-6', tip: 'sestanek', naslov: 'Delavnica identitete — Nordika', datum: dan(3), ura: '09:00', trajanjeMin: 120, strankaId: 'demo-s-4', lokacija: 'Pisarna stranke' },
    { id: 'demo-se-7', tip: 'klic', naslov: 'Klic: potrditev barvne palete', datum: dan(4), ura: '13:00', trajanjeMin: 25, strankaId: 'demo-s-5' },
    { id: 'demo-se-8', tip: 'sestanek', naslov: 'Primopredaja gradiv', datum: vMesecu(22), ura: '12:00', trajanjeMin: 60, strankaId: 'demo-s-6' },
    { id: 'demo-se-9', tip: 'klic', naslov: 'Klic: nova kampanja', datum: vMesecu(26), ura: '16:00', trajanjeMin: 30, strankaId: 'demo-s-rokus' },
  ];
}

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

/* Razporedi prekrivajoče se dogodke v stolpce (kot Bitrix/Teams koledar):
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
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);
  const dl = locale === 'en' ? 'en-GB' : 'sl-SI';
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';

  const [izbranDan, setIzbranDan] = useState(danesISO());
  const [pogled, setPogled] = useState<Pogled>('mesec');
  const [sestanki, setSestanki] = useState<Sestanek[]>([]);
  const [rokiRacunov, setRokiRacunov] = useState<RacunRok[]>([]);
  const [stranke, setStranke] = useState<FlowClient[]>([]);
  const [naloge, setNaloge] = useState<Naloga[]>([]);
  const [pokaziNaloge, setPokaziNaloge] = useState(false);
  const [iskanje, setIskanje] = useState('');
  /* iskanje je privzeto strnjeno v ikono; klik ga razširi -> orodna vrstica ostane ENA vrsta */
  const [isciOdprt, setIsciOdprt] = useState(false);
  const isciRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (isciOdprt) isciRef.current?.focus(); }, [isciOdprt]);
  const [, setUra] = useState(0); // periodičen re-render (vsako minuto), da črta »zdaj« ostane točna

  const [obrazecOdprt, setObrazecOdprt] = useState(false);
  const [urejamId, setUrejamId] = useState<string | null>(null);
  const [obrazecTip, setObrazecTip] = useState<SestanekTip>('sestanek');
  const [obrazec, setObrazec] = useState(PRAZEN_OBRAZEC);

  const osveziSestanke = () => setSestanki(preberiSestanki());
  const osveziNaloge = () => setNaloge(preberiNaloge());

  useEffect(() => { osveziNaloge(); }, []);

  /* V demo (polno poslovanje) napolni koledar z vzorčnimi dogodki — samo za prikaz,
     brez pisanja v localStorage — in privzeto vklopi roke nalog; sicer prava shramba. */
  useEffect(() => {
    if (nacin === 'empty') {
      /* Nov uporabnik: prazen koledar — brez demo dogodkov in brez branja prave shrambe. */
      setSestanki([]);
      setPokaziNaloge(false);
    } else if (nacin === 'demo') {
      setSestanki(demoSestanki());
      setPokaziNaloge(true);
    } else {
      setSestanki(preberiSestanki());
      setPokaziNaloge(false);
    }
  }, [nacin]);

  // Na ozkem zaslonu (mobilno) privzeto Dan — tedenska urna mreža je pretesna.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width:700px)').matches) setPogled('dan');
  }, []);

  useEffect(() => {
    const id = setInterval(() => setUra((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    setStranke(flow.clients || []);
    const izRacunov: RacunRok[] = (flow.invoices || [])
      .filter((r) => !r.paid)
      .map((r) => ({ datum: dodajDni(r.date, typeof r.dueDays === 'number' ? r.dueDays : 15), naslov: `${L('Plačilo · Račun', 'Payment · Invoice')} ${r.number || ''}`.trim(), pod: `${r.client || ''}${r.amount ? ' · ' + money(r.amount) : ''}` }))
      .filter((r) => r.datum);
    setRokiRacunov(izRacunov);
  }, [nacin]);

  const danes = danesISO();
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
    if (s.videoUrl) deli.push(L('video klic', 'video call'));
    return deli.join(' · ');
  };

  const ujemaIskanje = (naslov: string, pod?: string) => {
    const q = iskanje.trim().toLocaleLowerCase('sl-SI');
    if (!q) return true;
    return (naslov + ' ' + (pod || '')).toLocaleLowerCase('sl-SI').includes(q);
  };

  const sestanekVPostavko = (s: Sestanek): Postavka => ({
    id: s.id,
    tip: s.tip,
    naslov: s.naslov,
    ura: s.ura,
    datum: s.datum,
    pod: sestanekPod(s),
    original: s,
    videoUrl: s.videoUrl,
    icsOpis: [s.ura, najdiStranko(s.strankaId)?.name, s.lokacija, s.videoUrl, s.opomba].filter(Boolean).join(' · '),
  });

  const terminiZaDan = (dan: string): Postavka[] =>
    sestanki
      .filter((s) => s.datum === dan)
      .sort((a, b) => a.ura.localeCompare(b.ura))
      .map(sestanekVPostavko)
      .filter((p) => ujemaIskanje(p.naslov, p.pod));

  const blokiZaDan = (dan: string): Blok[] => {
    const osnova = terminiZaDan(dan).map((p) => {
      const start = parseUra(p.ura || '00:00');
      const dur = p.original?.trajanjeMin && p.original.trajanjeMin > 0 ? p.original.trajanjeMin : 30;
      return { p, start, dur };
    });
    const razporeditev = izracunajRazporeditev(osnova.map((o) => ({ id: o.p.id, startMin: o.start, endMin: o.start + o.dur })));
    return osnova.map((o) => {
      const lay = razporeditev.get(o.p.id) || { col: 0, cols: 1 };
      return { ...o, col: lay.col, cols: lay.cols };
    });
  };

  const rokiZaDan = (dan: string): Postavka[] => {
    const racuni: Postavka[] = rokiRacunov
      .filter((r) => r.datum === dan)
      .map((r, i) => ({ id: `racun-${dan}-${i}`, tip: 'racun' as const, naslov: r.naslov, pod: r.pod, icsOpis: r.pod, datum: dan }))
      .filter((p) => ujemaIskanje(p.naslov, p.pod));
    const dnevneNaloge: Postavka[] = pokaziNaloge
      ? naloge
        .filter((n) => n.rok === dan && n.stolpec !== 'done')
        .map((n) => ({ id: `naloga-${n.id}-${dan}`, tip: 'naloga' as const, naslov: n.naslov, pod: n.dodeljenoOsebaIme || n.dodeljenoOseba ? L('Dodeljeno: ', 'Assigned: ') + (n.dodeljenoOsebaIme || n.dodeljenoOseba) : undefined, icsOpis: n.opis, datum: dan }))
        .filter((p) => ujemaIskanje(p.naslov, p.pod))
      : [];
    return [...racuni, ...dnevneNaloge];
  };

  const mesecniDogodkiZaDan = (dan: string): Postavka[] => [...terminiZaDan(dan), ...rokiZaDan(dan)];

  const premakni = (delta: number) => {
    if (pogled === 'mesec') setIzbranDan((d) => dodajMesece(d, delta));
    else if (pogled === 'teden') setIzbranDan((d) => dodajDni(d, delta * 7));
    else setIzbranDan((d) => dodajDni(d, delta));
  };

  const odpriNov = (tip: SestanekTip, ura?: string, dan?: string) => {
    if (samoOgled) return;
    setUrejamId(null);
    setObrazecTip(tip);
    setObrazec({ ...PRAZEN_OBRAZEC, datum: dan || izbranDan, ura: ura || PRAZEN_OBRAZEC.ura });
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
    if (!window.confirm(L('Izbrišem ta termin?', 'Delete this appointment?'))) return;
    izbrisiSestanek(id);
    osveziSestanke();
  };

  const dodajVKoledar = (p: Postavka) => prenesiIcs(p.naslov, p.datum || izbranDan, p.icsOpis);

  const klikNaProsto = (dan: string, h: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (samoOgled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minuta = offsetY < HOUR_HEIGHT / 2 ? 0 : 30;
    odpriNov('sestanek', `${String(h).padStart(2, '0')}:${minuta === 0 ? '00' : '30'}`, dan);
  };

  const odpriDan = (dan: string) => { setIzbranDan(dan); setPogled('dan'); };

  const ikonaZa = (tip: Postavka['tip']) => {
    if (tip === 'sestanek') return <UsersThree size={13} weight="fill" />;
    if (tip === 'klic') return <Phone size={13} weight="fill" />;
    if (tip === 'racun') return <Receipt size={13} weight="fill" />;
    return <Kanban size={13} weight="fill" />;
  };

  const obseg = pogled === 'mesec' ? naslovMeseca(izbranDan, dl) : pogled === 'teden' ? naslovTedna(izbranDan, dl) : naslovDnevaKratek(izbranDan, dl);

  /* --- delni render pomočniki --- */

  const renderUre = () => (
    <div className="kol-mreza-ure" style={{ height: GRID_HOURS * HOUR_HEIGHT }}>
      {Array.from({ length: GRID_HOURS }).map((_, h) => (
        <div key={h} className="kol-ura-nalepka" style={{ height: HOUR_HEIGHT }}>
          <span>{String(h).padStart(2, '0')}:00</span>
        </div>
      ))}
    </div>
  );

  const renderBlok = ({ p, start, dur, col, cols }: Blok, kompakt: boolean) => {
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
        data-kompakt={kompakt}
        style={{ top, height: visina, left: `${(col / cols) * 100}%`, width: `calc(${100 / cols}% - 3px)` }}
        onClick={() => p.original && odpriUredi(p.original)}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && p.original) { e.preventDefault(); odpriUredi(p.original); } }}
      >
        <span className="kol-blok-glava">
          {!kompakt && <span className="kol-blok-ikona" aria-hidden>{ikonaZa(p.tip)}</span>}
          <span className="kol-blok-ura">{kompakt ? formatUra(start) : formatUraOdDo(start, dur)}</span>
        </span>
        <strong className="kol-blok-naslov">{p.naslov}</strong>
        {!kompakt && jeVelik && p.pod && <small className="kol-blok-pod">{p.pod}</small>}
        {!kompakt && jeVelik && (
          <span className="kol-blok-akcije">
            {p.videoUrl && (
              <a className="kol-blok-akcija" href={p.videoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title={L('Pridruži se video klicu', 'Join video call')} aria-label={L('Pridruži se video klicu', 'Join video call')}>
                <VideoCamera size={12} weight="bold" />
              </a>
            )}
            <button type="button" className="kol-blok-akcija" onClick={(e) => { e.stopPropagation(); dodajVKoledar(p); }} title={L('Prenesi .ics', 'Download .ics')} aria-label={L('Prenesi .ics', 'Download .ics')}>
              <CalendarPlus size={12} weight="bold" />
            </button>
            {!samoOgled && (
              <button type="button" className="kol-blok-akcija" onClick={(e) => { e.stopPropagation(); izbrisi(p.id); }} title={L('Izbriši', 'Delete')} aria-label={L('Izbriši', 'Delete')}>
                <Trash size={12} weight="bold" />
              </button>
            )}
          </span>
        )}
      </div>
    );
  };

  const renderDanStolpec = (dan: string, kompakt: boolean) => (
    <div className="kol-dan-stolpec" style={{ height: GRID_HOURS * HOUR_HEIGHT }}>
      {Array.from({ length: GRID_HOURS }).map((_, h) => (
        <div key={h} className="kol-ura-cona" data-klikljivo={!samoOgled} style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }} onClick={(e) => klikNaProsto(dan, h, e)} />
      ))}
      {dan === danes && (
        <div className="kol-zdaj-crta" style={{ top: (zdajMin / 60) * HOUR_HEIGHT }}>
          <span className="kol-zdaj-pika" />
        </div>
      )}
      {blokiZaDan(dan).map((b) => renderBlok(b, kompakt))}
    </div>
  );

  const renderVsedanPas = (dan: string) => {
    const roki = rokiZaDan(dan);
    if (roki.length === 0) return null;
    return (
      <section className="kol-vsedan" aria-label={L('Roki tega dne', 'Deadlines for this day')}>
        <span className="kol-vsedan-oznaka">{L('Ves dan', 'All day')}</span>
        <div className="kol-vsedan-pilule">
          {roki.map((p) => (
            <div key={p.id} className="kol-pilula" data-tip={p.tip}>
              <span className="kol-pilula-ikona" data-tip={p.tip} aria-hidden>{ikonaZa(p.tip)}</span>
              <span className="kol-pilula-besedilo">
                <strong>{p.naslov}</strong>
                {p.pod && <small>{p.pod}</small>}
              </span>
              <button type="button" className="kol-pilula-ics" onClick={() => dodajVKoledar(p)} title={L('Prenesi .ics in dodaj v koledar', 'Download .ics and add to calendar')} aria-label={L('Dodaj v koledar', 'Add to calendar')}><CalendarPlus size={13} weight="bold" /></button>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderDan = () => (
    <div className="kol-dt">
      {renderVsedanPas(izbranDan)}
      <div className="kol-dt-telo">
        <div className="kol-dt-red">
          {renderUre()}
          {renderDanStolpec(izbranDan, false)}
        </div>
      </div>
      {terminiZaDan(izbranDan).length === 0 && rokiZaDan(izbranDan).length === 0 && (
        <div className="kol-prazno-plast" aria-hidden>{L('Ta dan je prost — klikni v mrežo ali dodaj z »+ Ustvari«.', 'This day is free — click the grid or add with »+ Create«.')}</div>
      )}
    </div>
  );

  const renderTeden = () => {
    const dnevi = dneviTedna(izbranDan);
    const imaRoke = dnevi.some((d) => rokiZaDan(d).length > 0);
    return (
      <div className="kol-teden">
        <div className="kol-teden-notri">
          <div className="kol-teden-glave">
            <div className="kol-teden-ura-kot" />
            {dnevi.map((d) => (
              <button key={d} type="button" className="kol-dan-glava" data-danes={d === danes} onClick={() => odpriDan(d)}>
                <span className="kol-dan-ime">{kratkiDan(d, dl)}</span>
                <span className="kol-dan-num">{stDneva(d)}</span>
              </button>
            ))}
          </div>
          {imaRoke && (
            <div className="kol-vsedan-red">
              <div className="kol-vsedan-kot">{L('Ves dan', 'All day')}</div>
              {dnevi.map((d) => (
                <div key={d} className="kol-vsedan-celica">
                  {rokiZaDan(d).map((p) => (
                    <button key={p.id} type="button" className="kol-vsedan-cip" data-tip={p.tip} onClick={() => dodajVKoledar(p)} title={`${p.naslov}${p.pod ? ' · ' + p.pod : ''} — prenesi .ics`}>{p.naslov}</button>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="kol-teden-telo">
            <div className="kol-teden-telo-red">
              {renderUre()}
              <div className="kol-teden-dnevi">
                {dnevi.map((d) => renderDanStolpec(d, true))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMesec = () => {
    const dnevi = mesecMreza(izbranDan);
    const tekociMesec = new Date(izbranDan).getMonth();
    return (
      <div className="kol-mesec">
        <div className="kol-mesec-glave">
          {(locale === 'en' ? KRATKA_IMENA_EN : KRATKA_IMENA).map((ime) => <span key={ime}>{ime}</span>)}
        </div>
        <div className="kol-mesec-mreza">
          {dnevi.map((d) => {
            const izven = new Date(d).getMonth() !== tekociMesec;
            const jeDanes = d === danes;
            const jePrvi = stDneva(d) === '1';
            const dogodki = mesecniDogodkiZaDan(d);
            const prikazani = dogodki.slice(0, 3);
            const vec = dogodki.length - prikazani.length;
            return (
              <button key={d} type="button" className="kol-mesec-celica" data-izven={izven} data-danes-celica={jeDanes} onClick={() => odpriDan(d)}>
                <span className="kol-mesec-vrh">
                  {jePrvi && <span className="kol-mesec-mesec-kr">{mesecKr(d, dl)}</span>}
                  <span className="kol-mesec-num" data-danes={jeDanes}>{stDneva(d)}</span>
                </span>
                <span className="kol-mesec-dogodki">
                  {prikazani.map((ev) => (
                    <span
                      key={ev.id}
                      role="button"
                      tabIndex={0}
                      className="kol-mesec-cip"
                      data-tip={ev.tip}
                      title={`${ev.ura ? ev.ura + ' · ' : ''}${ev.naslov}`}
                      onClick={(e) => { e.stopPropagation(); if (ev.original) odpriUredi(ev.original); else odpriDan(d); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (ev.original) odpriUredi(ev.original); else odpriDan(d); } }}
                    >
                      {ev.ura && <em>{ev.ura}</em>}
                      <span>{ev.naslov}</span>
                    </span>
                  ))}
                  {vec > 0 && <span className="kol-mesec-vec">+{vec} {L('več', 'more')}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="kol">
      <div className="kol-orodna">
        <div className="kol-nav-gruca">
          <button type="button" className="kol-nav-gumb" onClick={() => premakni(-1)} aria-label={L('Nazaj', 'Back')}><CaretLeft size={15} weight="bold" /></button>
          <button type="button" className="kol-danes" onClick={() => setIzbranDan(danes)}>{L('Danes', 'Today')}</button>
          <button type="button" className="kol-nav-gumb" onClick={() => premakni(1)} aria-label={L('Naprej', 'Next')}><CaretRight size={15} weight="bold" /></button>
          <strong className="kol-obseg">{obseg}</strong>
          <div className="kol-seg mobtabs-hide" role="group" aria-label={L('Pogled koledarja', 'Calendar view')}>
            <button type="button" data-aktiven={pogled === 'dan'} onClick={() => setPogled('dan')}>{L('Dan', 'Day')}</button>
            <button type="button" data-aktiven={pogled === 'teden'} onClick={() => setPogled('teden')}>{L('Teden', 'Week')}</button>
            <button type="button" data-aktiven={pogled === 'mesec'} onClick={() => setPogled('mesec')}>{L('Mesec', 'Month')}</button>
          </div>
          <MobTabs label={L('Pogled koledarja', 'Calendar view')} vrednost={pogled} naVrednost={id => setPogled(id as Pogled)} opcije={[{ id: 'dan', label: L('Dan', 'Day') }, { id: 'teden', label: L('Teden', 'Week') }, { id: 'mesec', label: L('Mesec', 'Month') }]} />
        </div>

        <div className="kol-akcije">
          {!samoOgled && (
            <button type="button" className="kol-ustvari" onClick={() => odpriNov('sestanek')}><Plus size={14} weight="bold" /> {L('Ustvari', 'Create')}</button>
          )}
          <button type="button" className="kol-naloge-cip" data-aktiven={pokaziNaloge} aria-pressed={pokaziNaloge} onClick={() => setPokaziNaloge((v) => !v)} title={L('Pokaži roke nalog v koledarju', 'Show task deadlines in the calendar')}>
            <Kanban size={13} weight="bold" /> {L('Naloge', 'Tasks')}
          </button>
          {zapadliRacuni.length > 0 && (
            <button type="button" className="kol-zapadlo-cip" onClick={() => odpriDan(zapadliRacuni[0].datum)} title={L(`${zapadliRacuni.length} ${zapadliRacuni.length === 1 ? 'zapadel rok plačila' : 'zapadlih rokov plačil'} — pojdi na najzgodnejšega`, `${zapadliRacuni.length} ${zapadliRacuni.length === 1 ? 'overdue payment' : 'overdue payments'} — go to the earliest`)} aria-label={L('Zapadli roki plačil', 'Overdue payments')}>
              <Receipt size={13} weight="bold" />
              <span>{zapadliRacuni.length} {L('zapadlo', 'overdue')}</span>
            </button>
          )}
          <div className={`kol-isci${isciOdprt || iskanje ? ' odprt' : ''}`}>
            <button type="button" className="kol-isci-gumb" aria-label={L('Iskanje', 'Search')} aria-expanded={isciOdprt || !!iskanje} onClick={() => { if (isciOdprt && !iskanje) { setIsciOdprt(false); } else { setIsciOdprt(true); } }}>
              <MagnifyingGlass size={16} weight="bold" aria-hidden />
            </button>
            <input ref={isciRef} value={iskanje} onChange={(e) => setIskanje(e.target.value)} onBlur={() => { if (!iskanje) setIsciOdprt(false); }} placeholder={L('Iskanje', 'Search')} aria-label={L('Filter in iskanje', 'Filter and search')} tabIndex={isciOdprt || iskanje ? 0 : -1} />
          </div>
        </div>
      </div>

      {pogled === 'mesec' ? renderMesec() : pogled === 'teden' ? renderTeden() : renderDan()}

      {obrazecOdprt && !samoOgled && (
        <div className="kol-modal-ozadje" onClick={zapriObrazec}>
          <form className="kol-modal" onClick={(e) => e.stopPropagation()} onSubmit={shrani}>
            <div className="kol-modal-glava">
              <h2>{urejamId ? L('Uredi termin', 'Edit appointment') : L('Nov termin', 'New appointment')}</h2>
              <button type="button" className="kol-ikona-gumb" onClick={zapriObrazec} aria-label={L('Zapri', 'Close')}><X size={16} weight="bold" /></button>
            </div>

            <div className="kol-modal-tip" role="group" aria-label={L('Vrsta termina', 'Appointment type')}>
              <button type="button" data-aktiven={obrazecTip === 'sestanek'} onClick={() => setObrazecTip('sestanek')}><UsersThree size={14} weight="bold" /> {L('Sestanek', 'Meeting')}</button>
              <button type="button" data-aktiven={obrazecTip === 'klic'} onClick={() => setObrazecTip('klic')}><Phone size={14} weight="bold" /> {L('Klic', 'Call')}</button>
            </div>

            <label>{L('Naslov', 'Title')}<input required value={obrazec.naslov} onChange={(e) => setObrazec({ ...obrazec, naslov: e.target.value })} placeholder={L('npr. Uskladitev ponudbe', 'e.g. Align on the offer')} /></label>

            <div className="kol-modal-vrsta">
              <label>{L('Datum', 'Date')}<input required type="date" value={obrazec.datum} onChange={(e) => setObrazec({ ...obrazec, datum: e.target.value })} /></label>
              <label>{L('Ura', 'Time')}<input required type="time" value={obrazec.ura} onChange={(e) => setObrazec({ ...obrazec, ura: e.target.value })} /></label>
              <label>{L('Trajanje (min)', 'Duration (min)')}<input type="number" min={0} step={5} value={obrazec.trajanjeMin} onChange={(e) => setObrazec({ ...obrazec, trajanjeMin: e.target.value })} placeholder={L('npr. 30', 'e.g. 30')} /></label>
            </div>

            <div className="kol-modal-vrsta">
              <label>{L('Stranka', 'Client')}<select value={obrazec.strankaId} onChange={(e) => setObrazec({ ...obrazec, strankaId: e.target.value })}><option value="">{L('Brez stranke', 'No client')}</option>{stranke.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label>{L('Kontaktna oseba', 'Contact person')}<input value={obrazec.kontaktId} onChange={(e) => setObrazec({ ...obrazec, kontaktId: e.target.value })} placeholder={najdiStranko(obrazec.strankaId)?.contact || L('neobvezno', 'optional')} /></label>
            </div>

            <div className="kol-modal-vrsta">
              <label>{L('Lokacija', 'Location')}<input value={obrazec.lokacija} onChange={(e) => setObrazec({ ...obrazec, lokacija: e.target.value })} placeholder={L('npr. Pisarna stranke', 'e.g. Client office')} /></label>
              <label>{L('Video povezava', 'Video link')}<input type="url" value={obrazec.videoUrl} onChange={(e) => setObrazec({ ...obrazec, videoUrl: e.target.value })} placeholder="https://teams.microsoft.com/…" /></label>
            </div>

            <label>{L('Opomba', 'Note')}<textarea rows={3} value={obrazec.opomba} onChange={(e) => setObrazec({ ...obrazec, opomba: e.target.value })} placeholder={L('O čem tečejo pogovori?', 'What is the conversation about?')} /></label>

            <div className="kol-modal-akcije">
              {urejamId && <button type="button" className="kol-modal-izbrisi" onClick={() => { izbrisi(urejamId); zapriObrazec(); }}><Trash size={14} weight="bold" /> {L('Izbriši', 'Delete')}</button>}
              <div className="kol-modal-akcije-desno">
                <button type="button" onClick={zapriObrazec}>{L('Prekliči', 'Cancel')}</button>
                <button type="submit" className="kol-modal-shrani">{L('Shrani termin', 'Save appointment')}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .kol{width:100%;min-width:0;padding:.5rem .5rem 1.5rem;
          --kol-accent:oklch(58% .16 297);
          --kol-accent-soft:oklch(96% .03 297);
          --kol-zdaj:oklch(58% .19 25);
          --kol-crta:oklch(93.5% .005 90);
          --kol-podlaga:oklch(100% 0 0);
          --kol-ura-sirina:3.5rem}
        .kol *{box-sizing:border-box}
        .kol-rob{padding-left:clamp(.6rem,2vw,1.1rem);padding-right:clamp(.6rem,2vw,1.1rem)}

        /* --- ena orodna vrstica: leva gruča (navigacija) + desna gruča (akcije) --- */
        .kol-orodna{display:flex;align-items:center;gap:.6rem 1rem;flex-wrap:wrap;margin-bottom:.6rem;padding:0 clamp(.6rem,2vw,1.1rem) .55rem;border-bottom:1px solid var(--line)}
        .kol-nav-gruca{display:inline-flex;align-items:center;gap:.4rem;flex-wrap:wrap}
        .kol-akcije{display:inline-flex;align-items:center;gap:.45rem;margin-left:auto;flex-wrap:wrap}

        /* primarno: navigacija + zavihki (bolj poudarjeno) */
        .kol-nav-gumb{flex:none;width:1.95rem;height:1.95rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:.5rem;background:var(--paper);color:var(--ink);cursor:pointer}
        .kol-nav-gumb:hover{background:var(--kol-accent-soft);border-color:var(--kol-accent);color:var(--kol-accent)}
        .kol-danes{border:1px solid var(--line);border-radius:.5rem;background:var(--paper);color:var(--ink);font:600 .74rem var(--font-sans),sans-serif;padding:.4rem .75rem;cursor:pointer}
        .kol-danes:hover{background:var(--kol-accent-soft);border-color:var(--kol-accent);color:var(--kol-accent)}
        .kol-obseg{margin:0 .35rem 0 .5rem;font:650 .96rem var(--font-sans),sans-serif;letter-spacing:-.01em;color:var(--ink);white-space:nowrap}
        .kol-seg{display:inline-flex;gap:.05rem}
        .kol-seg button{border:none;background:transparent;padding:.42rem .8rem;font:650 .82rem var(--font-sans),sans-serif;color:var(--ink);opacity:.55;cursor:pointer;border-bottom:2px solid transparent}
        .kol-seg button:hover{opacity:.85}
        .kol-seg button[data-aktiven='true']{opacity:1;color:var(--kol-accent);border-bottom-color:var(--kol-accent)}

        /* sekundarno: akcije (vizualno tišje, manjše) */
        .kol-ustvari{flex:none;display:inline-flex;align-items:center;gap:.3rem;padding:.4rem .8rem;border:none;border-radius:999px;background:var(--ink);color:#fff;font:650 .74rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
        .kol-ustvari:hover{filter:brightness(1.12)}
        /* Iskanje: strnjeno v okroglo ikono; klik ga razširi v vnos (kot arhiv) -> orodna vrstica ostane ENA. */
        .kol-isci{flex:none;display:flex;align-items:center;gap:.25rem;min-height:2.5rem}
        .kol-isci-gumb{flex:none;display:grid;place-items:center;width:2.5rem;height:2.5rem;padding:0;border:1px solid var(--line);border-radius:999px;background:oklch(98% .008 87 / .92);color:var(--ink);cursor:pointer;transition:background .15s,color .15s}
        .kol-isci-gumb:hover{background:var(--ink);color:#fff}
        .kol-isci-gumb svg{opacity:.7}
        .kol-isci input{width:0;min-width:0;padding:0;border:0;background:transparent;outline:none;font:500 .78rem var(--font-sans),sans-serif;color:var(--ink);opacity:0;transition:width .26s cubic-bezier(.2,.8,.3,1),opacity .18s,padding .2s}
        .kol-isci.odprt{border:1px solid var(--line);border-radius:999px;background:oklch(98% .008 87 / .92);padding-right:.55rem}
        .kol-isci.odprt .kol-isci-gumb{border:0;background:transparent;color:color-mix(in oklch,var(--ink) 55%,transparent)}
        .kol-isci.odprt .kol-isci-gumb:hover{background:transparent;color:var(--ink)}
        .kol-isci.odprt input{width:11rem;max-width:46vw;opacity:1;padding:.4rem .2rem}
        /* toggle-čip z OČITNIM vklop/izklop stanjem: izklop = tih outline, vklop = poln akcent */
        .kol-naloge-cip{flex:none;display:inline-flex;align-items:center;gap:.3rem;padding:.4rem .7rem;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--ink);opacity:.6;font:600 .72rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
        .kol-naloge-cip:hover{opacity:.9;border-color:var(--kol-accent)}
        .kol-naloge-cip[data-aktiven='true']{background:var(--kol-accent);border-color:var(--kol-accent);color:#fff;opacity:1;box-shadow:0 1px 3px oklch(58% .16 297 / .35)}

        /* --- kompaktna značka zapadlih rokov --- */
        .kol-zapadlo-cip{flex:none;display:inline-flex;align-items:center;gap:.3rem;padding:.34rem .6rem;border:1px solid oklch(86% .07 32);border-radius:999px;background:oklch(96% .04 35);color:oklch(48% .16 30);font:650 .7rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap;animation:kolSlideIn .35s ease}
        .kol-zapadlo-cip:hover{background:oklch(93% .06 35);border-color:oklch(70% .13 30)}
        @keyframes kolSlideIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}

        /* --- namig praznega dne kot lebdeča ploščica nad mrežo (ne svoja vrstica) --- */
        .kol-prazno-plast{position:absolute;top:3.4rem;left:50%;transform:translateX(-50%);z-index:2;pointer-events:none;font:500 .76rem var(--font-sans),sans-serif;color:var(--ink);opacity:.7;background:var(--paper);padding:.35rem .75rem;border:1px solid var(--line);border-radius:999px;box-shadow:0 2px 8px oklch(20% 0 0 / .07);text-align:center;max-width:calc(100% - 2rem)}

        /* --- pas Ves dan (dnevni pogled) --- */
        .kol-vsedan{display:flex;align-items:flex-start;gap:.7rem;margin:.4rem clamp(.6rem,2vw,1.1rem) .5rem;padding:.5rem .65rem;border:1px solid var(--line);border-radius:.6rem;background:oklch(99% .004 90)}
        .kol-vsedan-oznaka{flex:none;padding-top:.3rem;font:800 .58rem var(--font-sans),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);opacity:.5}
        .kol-vsedan-pilule{flex:1;min-width:0;display:flex;gap:.5rem;overflow-x:auto;padding-bottom:.1rem}
        .kol-pilula{flex:none;display:flex;align-items:center;gap:.5rem;min-width:11rem;max-width:18rem;padding:.35rem .5rem;border:1px solid var(--line);border-left:3px solid;border-radius:.5rem;background:var(--paper)}
        .kol-pilula-ikona{flex:none;width:1.7rem;height:1.7rem;display:grid;place-items:center;border-radius:.45rem}
        .kol-pilula-besedilo{flex:1;min-width:0;display:flex;flex-direction:column;gap:.02rem}
        .kol-pilula-besedilo strong{font-size:.74rem;font-weight:650;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-pilula-besedilo small{font-size:.62rem;color:var(--ink);opacity:.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-pilula-ics{flex:none;width:1.7rem;height:1.7rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);cursor:pointer}
        .kol-pilula-ics:hover{background:var(--kol-accent);color:#fff;border-color:var(--kol-accent)}

        /* --- barve po tipu (bloki, mesečni čipi, ves-dan čipi) --- */
        .kol-pilula[data-tip='sestanek'],.kol-blok[data-tip='sestanek'],.kol-mesec-cip[data-tip='sestanek'],.kol-vsedan-cip[data-tip='sestanek']{background:oklch(96.5% .03 265);border-left-color:oklch(60% .14 265);color:oklch(42% .13 265)}
        .kol-pilula[data-tip='klic'],.kol-blok[data-tip='klic'],.kol-mesec-cip[data-tip='klic'],.kol-vsedan-cip[data-tip='klic']{background:oklch(96% .05 165);border-left-color:oklch(58% .12 165);color:oklch(38% .11 165)}
        .kol-pilula[data-tip='racun'],.kol-blok[data-tip='racun'],.kol-mesec-cip[data-tip='racun'],.kol-vsedan-cip[data-tip='racun']{background:oklch(96% .06 75);border-left-color:oklch(66% .15 65);color:oklch(46% .14 55)}
        .kol-pilula[data-tip='naloga'],.kol-blok[data-tip='naloga'],.kol-mesec-cip[data-tip='naloga'],.kol-vsedan-cip[data-tip='naloga']{background:oklch(95.5% .04 305);border-left-color:oklch(60% .14 305);color:oklch(44% .13 305)}
        .kol-pilula-ikona[data-tip]{background:transparent;color:inherit}
        .kol-pilula[data-tip] .kol-pilula-besedilo strong{color:inherit}

        /* --- dnevni / tedenski urna mreža (polna naravna višina, brez notranjega
           navpičnega scrolla — skrola samo stran; neprosojna podlaga) --- */
        .kol-dt,.kol-teden{position:relative;background:var(--kol-podlaga)}
        .kol-teden{overflow-x:auto;overflow-y:hidden}
        .kol-teden-notri{min-width:100%;background:var(--kol-podlaga)}
        .kol-dt-telo,.kol-teden-telo{background:var(--kol-podlaga)}
        .kol-dt-red,.kol-teden-telo-red{display:flex;align-items:stretch}
        .kol-teden-dnevi{flex:1;min-width:0;display:flex}

        .kol-teden-glave{display:flex;background:var(--kol-podlaga)}
        .kol-teden-ura-kot{flex:none;width:var(--kol-ura-sirina);border:none}
        .kol-dan-glava{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:.1rem;padding:.4rem .2rem;border:none;border-bottom:1px solid var(--kol-crta);background:transparent;cursor:pointer}
        .kol-dan-ime{font:700 .58rem var(--font-sans),sans-serif;letter-spacing:.05em;text-transform:uppercase;color:var(--ink);opacity:.5}
        .kol-dan-num{width:1.7rem;height:1.7rem;display:grid;place-items:center;border-radius:999px;font:600 .88rem var(--font-sans),sans-serif;color:var(--ink)}
        .kol-dan-glava[data-danes='true'] .kol-dan-num{background:var(--kol-accent);color:#fff}
        .kol-dan-glava[data-danes='true'] .kol-dan-ime{color:var(--kol-accent);opacity:1}
        .kol-dan-glava:hover .kol-dan-num{background:var(--kol-accent-soft)}
        .kol-dan-glava[data-danes='true']:hover .kol-dan-num{background:var(--kol-accent)}

        .kol-vsedan-red{display:flex;border-bottom:1px solid var(--kol-crta);background:oklch(99% .004 90)}
        .kol-vsedan-kot{flex:none;width:var(--kol-ura-sirina);display:flex;align-items:center;justify-content:flex-end;padding-right:.35rem;font:800 .5rem var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);opacity:.45}
        .kol-vsedan-celica{flex:1;min-width:0;padding:.2rem;display:flex;flex-direction:column;gap:.12rem}
        .kol-vsedan-cip{border:none;border-left:2px solid;text-align:left;padding:.1rem .3rem;border-radius:.28rem;font:600 .6rem var(--font-sans),sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}

        .kol-mreza-ure{flex:none;width:var(--kol-ura-sirina);position:relative;border:none;background:var(--kol-podlaga)}
        .kol-ura-nalepka{position:relative;text-align:right;padding:.1rem .6rem 0 .4rem}
        .kol-ura-nalepka span{position:relative;top:-.6em;display:inline-block;font:700 .58rem var(--font-sans),sans-serif;color:var(--ink);opacity:.4}
        .kol-dan-stolpec{position:relative;flex:1;min-width:0;border-left:1px solid var(--kol-crta);background:var(--kol-podlaga)}
        .kol-teden-dnevi .kol-dan-stolpec:first-child{border-left:none}
        .kol-dt-red .kol-dan-stolpec{border-left:none}
        .kol-ura-cona{position:absolute;left:0;right:0;border-top:1px solid var(--kol-crta);z-index:1}
        .kol-ura-cona[data-klikljivo='true']{cursor:pointer}
        .kol-ura-cona[data-klikljivo='true']:hover{background:oklch(98% .014 297)}

        .kol-zdaj-crta{position:absolute;left:0;right:0;height:0;border-top:2px solid var(--kol-zdaj);z-index:3;pointer-events:none}
        .kol-zdaj-pika{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:999px;background:var(--kol-zdaj)}

        .kol-blok{position:absolute;z-index:2;display:flex;flex-direction:column;gap:.12rem;padding:.28rem .45rem;border-radius:.4rem;border-left:3px solid;cursor:pointer;overflow:hidden;text-align:left;min-height:2.35rem}
        .kol-blok:hover{z-index:5;box-shadow:0 .4rem 1rem oklch(30% .04 285 / .18)}
        .kol-blok:hover{filter:brightness(.98)}
        .kol-blok:focus-visible{outline:2px solid var(--kol-accent);outline-offset:1px}
        .kol-blok[data-kompakt='true']{padding:.2rem .35rem;gap:.05rem}
        .kol-blok-glava{display:flex;align-items:center;gap:.3rem}
        .kol-blok-ikona{display:inline-flex;opacity:.85}
        .kol-blok-ura{font:700 .6rem var(--font-sans),sans-serif;opacity:.85;white-space:nowrap}
        .kol-blok-naslov{font-size:.72rem;font-weight:650;color:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-blok-pod{font-size:.61rem;font-weight:500;color:inherit;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-blok-akcije{margin-top:auto;display:flex;gap:.3rem;align-items:center;padding-top:.15rem}
        .kol-blok-akcija{width:1.2rem;height:1.2rem;display:grid;place-items:center;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;opacity:.7;cursor:pointer;text-decoration:none}
        .kol-blok-akcija:hover{opacity:1}

        /* --- mesečni pogled (komaj opazne črte, neprosojna podlaga, zapolni višino) --- */
        .kol-mesec{margin-top:.1rem;display:flex;flex-direction:column;min-height:calc(100dvh - 12rem);background:var(--kol-podlaga)}
        .kol-mesec-glave{display:grid;grid-template-columns:repeat(7,1fr);background:var(--kol-podlaga)}
        .kol-mesec-glave span{padding:.4rem .5rem;font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.05em;text-transform:uppercase;color:var(--ink);opacity:.5}
        .kol-mesec-mreza{flex:1;display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:1fr;background:var(--kol-podlaga)}
        .kol-mesec-celica{position:relative;min-height:6.4rem;border-top:1px solid var(--kol-crta);border-left:1px solid var(--kol-crta);padding:.25rem .3rem .35rem;display:flex;flex-direction:column;gap:.15rem;background:var(--kol-podlaga);text-align:left;cursor:pointer;font:inherit}
        .kol-mesec-celica:nth-child(7n+1){border-left:none}
        .kol-mesec-celica[data-izven='true']{background:oklch(98.6% .003 90)}
        .kol-mesec-celica[data-izven='true'] .kol-mesec-num{opacity:.4}
        .kol-mesec-celica[data-danes-celica='true']{background:var(--kol-accent-soft)}
        .kol-mesec-celica:hover{background:oklch(98% .014 297)}
        .kol-mesec-vrh{display:flex;align-items:center;justify-content:flex-end;gap:.25rem;min-height:1.4rem}
        .kol-mesec-mesec-kr{font:700 .56rem var(--font-sans),sans-serif;letter-spacing:.03em;text-transform:uppercase;color:var(--ink);opacity:.5}
        .kol-mesec-num{min-width:1.4rem;height:1.4rem;padding:0 .28rem;display:inline-grid;place-items:center;border-radius:999px;font:600 .74rem var(--font-sans),sans-serif;color:var(--ink)}
        .kol-mesec-num[data-danes='true']{background:var(--kol-accent);color:#fff}
        .kol-mesec-dogodki{display:flex;flex-direction:column;gap:.12rem;min-width:0}
        .kol-mesec-cip{display:flex;gap:.28rem;align-items:baseline;min-width:0;padding:.09rem .3rem;border-radius:.28rem;border-left:2px solid;font:600 .62rem var(--font-sans),sans-serif;cursor:pointer}
        .kol-mesec-cip>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kol-mesec-cip em{flex:none;font-style:normal;font-weight:700;opacity:.7}
        .kol-mesec-cip:focus-visible{outline:2px solid var(--kol-accent);outline-offset:1px}
        .kol-mesec-vec{align-self:flex-start;padding:0 .3rem;font:700 .58rem var(--font-sans),sans-serif;color:var(--ink);opacity:.55}

        /* --- modal (nespremenjen slog, brez serifa v naslovu) --- */
        .kol-modal-ozadje{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;background:oklch(20% 0 0 / .45);padding:0}
        .kol-modal{width:100%;max-width:34rem;max-height:92vh;overflow-y:auto;background:var(--paper);border-radius:1.2rem 1.2rem 0 0;padding:1.3rem 1.2rem 1.5rem;display:flex;flex-direction:column;gap:.85rem;box-shadow:0 -.5rem 2rem oklch(20% 0 0 / .18)}
        .kol-modal-glava{display:flex;align-items:center;justify-content:space-between}
        .kol-modal-glava h2{margin:0;font:650 1.1rem var(--font-sans),sans-serif;letter-spacing:-.01em;color:var(--ink)}
        .kol-ikona-gumb{flex:none;width:2rem;height:2rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);opacity:.7;cursor:pointer}
        .kol-ikona-gumb:hover{opacity:1;border-color:var(--ink)}
        .kol-modal-tip{display:flex;gap:.5rem}
        .kol-modal-tip button{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;padding:.55rem;border:1px solid var(--line);border-radius:.7rem;background:var(--paper);color:var(--ink);opacity:.65;font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
        .kol-modal-tip button[data-aktiven='true']{background:var(--kol-accent);color:#fff;border-color:var(--kol-accent);opacity:1}
        .kol-modal label{display:flex;flex-direction:column;gap:.3rem;font:700 .66rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--ink);opacity:.6}
        .kol-modal input,.kol-modal select,.kol-modal textarea{font:500 .88rem var(--font-sans),sans-serif;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:.6rem;padding:.55rem .7rem;text-transform:none;letter-spacing:normal;opacity:1}
        .kol-modal textarea{resize:vertical;min-height:3.6rem}
        .kol-modal-vrsta{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.7rem}
        .kol-modal-akcije{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.3rem}
        .kol-modal-akcije-desno{display:flex;gap:.5rem;margin-left:auto}
        .kol-modal-akcije button{padding:.6rem 1rem;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
        .kol-modal-shrani{background:var(--kol-accent);color:#fff;border-color:var(--kol-accent)}
        .kol-modal-shrani:hover{filter:brightness(1.06)}
        .kol-modal-izbrisi{display:inline-flex;align-items:center;gap:.35rem;color:oklch(48% .16 30);border-color:oklch(86% .06 30)}

        @media (min-width:640px){.kol-modal-ozadje{align-items:center}.kol-modal{border-radius:1.2rem}}
        @media (max-width:700px){
          .kol-orodna{gap:.5rem .7rem}
          .kol-akcije{width:100%;margin-left:0}
          .kol-isci.odprt{flex:1 1 100%}
          .kol-isci.odprt input{width:100%;max-width:none}
          .kol-teden-notri{min-width:46rem}
          .kol-obseg{font-size:.86rem;margin-left:.25rem}
          .kol-mesec-celica{min-height:4.6rem;padding:.2rem}
          .kol-mesec-cip{font-size:.56rem;gap:.2rem}
          .kol-mesec-num{min-width:1.25rem;height:1.25rem;font-size:.68rem}
          .kol-mesec-glave span{padding:.35rem .3rem;font-size:.55rem}
        }
      `}</style>
    </div>
  );
}
