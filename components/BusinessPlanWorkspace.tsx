'use client';

import { useLocale } from 'next-intl';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  calculatePlan, DEFAULT_BUSINESS_PLAN, deleteCloudPresence, deleteCloudTimeEntry, loadCloudBusinessPlan,
  loadCloudPresence, loadCloudTimeEntries, loadLocalPlan, loadLocalTimeEntries, type BusinessPlan,
  type PrivateTimeEntry, saveCloudBusinessPlan, saveCloudPresence, saveCloudTimeEntry, saveLocalPlan,
  saveLocalTimeEntries,
} from '@/lib/pinartPlanning';
import { loadCloudSettings, saveBusinessGoal, saveCloudSettings } from '@/lib/pinartFlowCloud';
import { usePredogled } from '@/lib/predogled';
import { preklopiPavzo, useTekoceMerjenje, zapisiMerjenje } from '@/lib/tekoceMerjenje';
import TimerValovi from './TimerValovi';
import styles from './BusinessPlanWorkspace.module.css';

const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 0 })} €`;
const duration = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const localDateTimeValue = (date: Date) =>
  `${localDateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const DOLGA_SEJA_H = 10;
const POZABLJEN_CASOVNIK_PRAG_MS = DOLGA_SEJA_H * 60 * 60 * 1000;
/* slovenska dvojina: 1 vnos, 2 vnosa, 3-4 vnosi, 5+ vnosov (velja tudi za 101, 102 ...) */
const vnosiSklon = (n: number) => { const d = n % 100; return d === 1 ? 'vnos' : d === 2 ? 'vnosa' : d === 3 || d === 4 ? 'vnosi' : 'vnosov'; };

/**
 * Prisotnost — alternativa štoparici. Namesto merjenja enega projekta se
 * zabeleži cel delovnik (prihod/odhod/malica); locena shramba (samo
 * localStorage), ker se ne veze na posamezen projekt kot stoparica.
 *
 * Mesečna evidenca: vsak dan ima svojo "vrsto" (redno delo, službena pot,
 * odsotnost …). Stari zapisi brez `vrsta` se štejejo kot 'redno' (glej
 * `vrstaZapisa`), zato polje ostane neobvezno in migracija ni potrebna.
 */
type VrstaPrisotnosti = 'redno' | 'sluzbena' | 'bolniska' | 'zasebni' | 'dopust' | 'praznik';
/* kraj opravljanja dela (za delovne dni) — evidenca dela od doma vs. na podjetju */
type KrajDela = 'pisarna' | 'doma';
type Prisotnost = {
  id: string; datum: string; prihod: string; odhod: string; odmorMin?: number;
  vrsta?: VrstaPrisotnosti; opomba?: string; kraj?: KrajDela;
};

const VRSTA_OZNAKA: Record<VrstaPrisotnosti, string> = {
  redno: 'Redno', sluzbena: 'Službena pot', bolniska: 'Bolniška',
  zasebni: 'Zasebni izhod', dopust: 'Dopust', praznik: 'Praznik',
};
const KRAJ_OZNAKA: Record<KrajDela, string> = { pisarna: 'Na podjetju', doma: 'Delo od doma' };
/* Cel dan brez izracuna ur — v tabeli in mesecnem povzetku se prikaze "—". */
const brezUrVrsta = (v: VrstaPrisotnosti) => v === 'bolniska' || v === 'dopust' || v === 'praznik';
/* stari zapisi (pred to razsiritvijo) nimajo polja vrsta -> stejejo se kot redno delo */
const vrstaZapisa = (p: Prisotnost): VrstaPrisotnosti => p.vrsta || 'redno';

/**
 * Predogled (demo/prazno/začetek): evidenca prisotnosti se napolni z vnaprej
 * pripravljenimi primeri za TEKOČI mesec, da je tabela + povzetek videti
 * polno (kot skica), namesto prazne kartice. Velja SAMO za to kartico —
 * projektni časovni vnosi (štoparica/dnevnik) se v demo načinu NE ponarejajo,
 * to je uveljavljena odločitev (glej lib/predogled.ts).
 */
function demoPrisotnosti(): Prisotnost[] {
  const zdaj = new Date();
  const dan = (n: number) => `${zdaj.getFullYear()}-${String(zdaj.getMonth() + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
  return [
    { id: 'demo-p-1', datum: dan(1), prihod: '08:30', odhod: '16:45', odmorMin: 30, vrsta: 'redno', kraj: 'pisarna' },
    { id: 'demo-p-2', datum: dan(2), prihod: '09:00', odhod: '17:15', odmorMin: 30, vrsta: 'redno', kraj: 'doma' },
    { id: 'demo-p-3', datum: dan(3), prihod: '08:00', odhod: '18:00', odmorMin: 30, vrsta: 'sluzbena', opomba: 'Sestanek s stranko v Mariboru' },
    { id: 'demo-p-4', datum: dan(4), prihod: '08:45', odhod: '16:30', odmorMin: 30, vrsta: 'redno' },
    { id: 'demo-p-5', datum: dan(5), prihod: '', odhod: '', vrsta: 'bolniska' },
    { id: 'demo-p-6', datum: dan(8), prihod: '09:00', odhod: '17:00', odmorMin: 30, vrsta: 'redno' },
    { id: 'demo-p-7', datum: dan(9), prihod: '08:30', odhod: '12:00', odmorMin: 0, vrsta: 'zasebni', opomba: 'Odhod k zdravniku, odobril vodja' },
    { id: 'demo-p-8', datum: dan(10), prihod: '08:30', odhod: '16:45', odmorMin: 30, vrsta: 'redno' },
    { id: 'demo-p-9', datum: dan(11), prihod: '09:15', odhod: '17:30', odmorMin: 30, vrsta: 'redno' },
    { id: 'demo-p-10', datum: dan(12), prihod: '', odhod: '', vrsta: 'dopust' },
  ];
}

/* "6 h 30 min", ali ce ur ni "15 min" — brez odvecne "0 h" pri kratkih razlikah. */
function izpisMinut(minute: number): string {
  const m = Math.abs(Math.round(minute));
  const h = Math.floor(m / 60);
  const preostanek = m % 60;
  if (h && preostanek) return `${h} h ${preostanek} min`;
  if (h) return `${h} h`;
  return `${preostanek} min`;
}

/**
 * Isti projekt na isti dan = ena vrstica, a SAMO v prikazu. Vsako merjenje
 * ostane svoj zapis, sicer bi izgubili posamezne case "od – do", ki jih
 * hoces videti pod skupno uro.
 *
 * Vrne skupine, urejene po zadnjem merjenju, z zaporedjem posameznih merjenj.
 */
function zdruziPoProjektu(dnevni: PrivateTimeEntry[]) {
  const m = new Map<string, PrivateTimeEntry[]>();
  for (const x of dnevni) {
    const kljuc = x.projectName.trim().toLowerCase();
    m.set(kljuc, [...(m.get(kljuc) || []), x]);
  }
  return [...m.entries()].map(([kljuc, vnosi]) => {
    const zaporedje = [...vnosi].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    return {
      kljuc,
      zaporedje,
      zadnji: zaporedje[zaporedje.length - 1],
      minute: zaporedje.reduce((s, x) => s + x.durationMinutes, 0),
      znesek: zaporedje.reduce((s, x) => s + x.amount, 0),
      storitve: [...new Set(zaporedje.map(x => x.serviceName?.trim()).filter(Boolean))] as string[],
      dodatno: zaporedje.some(x => x.scopeStatus === 'extra'),
    };
  }).sort((a, b) => b.zadnji.startedAt.localeCompare(a.zadnji.startedAt));
}

/**
 * `omejeno` = brezplacen paket.
 *
 * Stoparica in vpis danasnjega dela ostaneta odprta: merjenje je vaba, ki
 * pokaze vrednost. Placljivo je sele tisto, kar iz merjenja naredi orodje —
 * zgodovina po dnevih in projektih, sestevki, dejanska urna vrednost.
 * Prej je bila zaklenjena cela stran, stoparico pa se je dalo zagnati z
 * nadzorne plosce — merjenje je teklo, klik nanj pa je pripeljal na cenik.
 */
export default function BusinessPlanWorkspace({ view = 'all', omejeno = false }:
  { view?: 'all' | 'time'; omejeno?: boolean }) {
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);
  const dl = locale === 'en' ? 'en-GB' : 'sl-SI';
  /* Prikazna oznaka vrste/kraja za UI (angleščina); enum ključi in CSV-izvoz za HR ostanejo slovenski. */
  const vrstaLabel = (v: VrstaPrisotnosti) => L(VRSTA_OZNAKA[v],
    ({ redno: 'Regular', sluzbena: 'Business trip', bolniska: 'Sick leave', zasebni: 'Personal leave', dopust: 'Vacation', praznik: 'Holiday' } as Record<VrstaPrisotnosti, string>)[v]);
  const krajLabel = (k: KrajDela) => L(KRAJ_OZNAKA[k], k === 'pisarna' ? 'At the office' : 'Working from home');
  const [plan, setPlan] = useState<BusinessPlan>(DEFAULT_BUSINESS_PLAN);
  const [entries, setEntries] = useState<PrivateTimeEntry[]>([]);
  const [running, setRunning] = useState<PrivateTimeEntry | null>(null);
  const [pending, setPending] = useState<PrivateTimeEntry | null>(null);
  const [pozabljeno, setPozabljeno] = useState<PrivateTimeEntry | null>(null);
  const [predlaganKonec, setPredlaganKonec] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const timerRef = useRef<number | null>(null);

  /* Predogled (demo/prazno/začetek): SAMO evidenca prisotnosti spodaj se v tem
     načinu napolni z izmišljenimi primeri (glej demoPrisotnosti zgoraj). Plan
     in projektni časovni vnosi (spodaj) ostanejo pravi tudi v demo načinu —
     ta zastavica nanje ne vpliva. */
  const [nacinPredogleda] = usePredogled();
  const samoOgled = nacinPredogleda !== 'mine';
  /* prazno = nov uporabnik: ure/vnosi/dnevnik so PRAZNI (brez pravih/demo podatkov,
     kot da si se pravkar registriral). samoOgled ostane za gating pisanja. */
  const prazno = nacinPredogleda === 'empty';

  useEffect(() => {
    if (prazno) {
      /* Nov uporabnik: privzet načrt in prazen dnevnik ur — brez branja prave/oblačne shrambe. */
      setPlan(DEFAULT_BUSINESS_PLAN); setEntries([]); setReady(true);
      return;
    }
    const localPlan = loadLocalPlan();
    const localEntries = loadLocalTimeEntries();
    setPlan(localPlan); setEntries(localEntries);
    void Promise.all([loadCloudBusinessPlan(), loadCloudTimeEntries()]).then(([cloudPlan, cloudEntries]) => {
      if (cloudPlan) { setPlan(cloudPlan); saveLocalPlan(cloudPlan); }
      if (cloudEntries.length) { setEntries(cloudEntries); saveLocalTimeEntries(cloudEntries); }
    }).catch(() => undefined).finally(() => setReady(true));
  }, [prazno]);

  /* Cas bere skupna shramba (lib/tekoceMerjenje), da pavza velja tudi tu in da
     se merjenje ne izgubi ob osvezitvi strani. */
  const { merjenje, sekunde: sekundeShrambe } = useTekoceMerjenje();
  useEffect(() => { if (running) setElapsed(sekundeShrambe); }, [running, sekundeShrambe]);

  /* Po osvezitvi strani je bilo merjenje prej izgubljeno — obnovimo ga iz shrambe.
     Ce je bila ustavitev zahtevana iz bliznjice v glavi, jo izvedemo tukaj, ker
     je treba vnos se potrditi. */
  const obnovljeno = useRef(false);
  useEffect(() => {
    if (!merjenje || running || pending || pozabljeno || obnovljeno.current) return;
    obnovljeno.current = true;
    const obnovljeniVnos: PrivateTimeEntry = {
      id: crypto.randomUUID(), projectName: merjenje.projectName,
      serviceName: merjenje.serviceName || '',
      startedAt: merjenje.zacetekPrvic || merjenje.startedAt,
      durationMinutes: 0, amount: 0, scopeStatus: 'included',
    };
    const zacetek = new Date(obnovljeniVnos.startedAt);
    const zdaj = new Date();
    const predolgo = zdaj.getTime() - zacetek.getTime() > POZABLJEN_CASOVNIK_PRAG_MS;
    const cezPolnoc = localDateKey(zacetek) !== localDateKey(zdaj);
    if (predolgo || cezPolnoc) {
      const osemUrPozneje = new Date(zacetek.getTime() + 8 * 60 * 60 * 1000);
      setPredlaganKonec(localDateTimeValue(osemUrPozneje > zdaj ? zdaj : osemUrPozneje));
      setPozabljeno(obnovljeniVnos);
      return;
    }
    setRunning(obnovljeniVnos);
  }, [merjenje, running, pending, pozabljeno]);

  const potrdiPozabljenKonec = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pozabljeno) return;
    const data = new FormData(event.currentTarget);
    const konec = new Date(String(data.get('actualEnd') || ''));
    const zacetek = new Date(pozabljeno.startedAt);
    if (!Number.isFinite(konec.getTime()) || konec <= zacetek || konec > new Date()) {
      setNotice(L('Konec mora biti po začetku merjenja in ne sme biti v prihodnosti.', 'The end must be after the start and cannot be in the future.'));
      return;
    }
    const minute = Math.max(1, Math.round((konec.getTime() - zacetek.getTime()) / 60_000));
    const finished = { ...pozabljeno, endedAt: konec.toISOString(), durationMinutes: minute };
    pripraviVnos(finished.startedAt.slice(0, 10), Math.floor(minute / 60), minute % 60, finished.amount);
    zapisiMerjenje(null);
    setPozabljeno(null);
    setPending(finished);
    setNotice(L('Preveri popravljeno trajanje, preden ga shraniš.', 'Check the corrected duration before saving it.'));
  };

  const nadaljujPozabljenoMerjenje = () => {
    if (!pozabljeno) return;
    setRunning(pozabljeno);
    setPozabljeno(null);
    setNotice(L('Merjenje se nadaljuje.', 'Timing resumed.'));
  };

  const zavrziPozabljenoMerjenje = () => {
    zapisiMerjenje(null);
    setPozabljeno(null);
    setRunning(null);
    setElapsed(0);
    setNotice(L('Seja ni bila shranjena.', 'The session was not saved.'));
  };

  const result = useMemo(() => calculatePlan(plan), [plan]);
  const completed = entries.filter(item => item.endedAt && item.durationMinutes > 0);
  const trackedMinutes = completed.reduce((sum, item) => sum + item.durationMinutes, 0);

  const update = (key: keyof BusinessPlan, value: string) => setPlan(current => ({
    ...current, [key]: key === 'notes' ? value : Number(value),
  }));

  const savePlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); saveLocalPlan(plan);
    localStorage.setItem('pinart-dashboard-goal', String(result.monthlyRevenueTarget));
    localStorage.setItem('pinart-dashboard-goal-settings', JSON.stringify({ desiredIncome: plan.desiredMonthlyIncome, reservePercent: plan.taxReservePercent + plan.safetyReservePercent }));
    void Promise.all([
      saveCloudBusinessPlan(plan),
      saveCloudSettings({ monthlyGoal: result.monthlyRevenueTarget, desiredIncome: plan.desiredMonthlyIncome, reservePercent: plan.taxReservePercent + plan.safetyReservePercent }),
      saveBusinessGoal(result.monthlyRevenueTarget, 'Cilj iz poslovnega načrta'),
    ]).catch(() => undefined);
    setNotice(L('Poslovni načrt in mesečni cilj sta shranjena.', 'Business plan and monthly goal saved.'));
  };

  const start = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const projectName = String(data.get('project')).trim(); if (!projectName) return;
    setTimerSkrit(false);
    /* skupna shramba: stoparica mora biti vidna tudi na nadzorni plosci */
    zapisiMerjenje({ projectName, serviceName: String(data.get('service')).trim(), startedAt: new Date().toISOString() });
    setRunning({ id: crypto.randomUUID(), projectName, serviceName: String(data.get('service')).trim(), startedAt: new Date().toISOString(), durationMinutes: 0, amount: Number(data.get('amount')) || 0, scopeStatus: data.get('scope') === 'extra' ? 'extra' : 'included' });
    event.currentTarget.reset();
  };

  /* bliznjica v glavi je zahtevala ustavitev: izvedi jo, ko se stran odpre */
  useEffect(() => {
    if (merjenje?.ustavi && running) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merjenje?.ustavi, running]);

  const stop = () => {
    if (!running) return;
    const zacetekCelote = merjenje?.zacetekPrvic || running.startedAt;
    const zacetek = new Date(zacetekCelote);
    const zdaj = new Date();
    const predolgo = zdaj.getTime() - zacetek.getTime() > POZABLJEN_CASOVNIK_PRAG_MS;
    const cezPolnoc = localDateKey(zacetek) !== localDateKey(zdaj);
    if (predolgo || cezPolnoc) {
      const osemUrPozneje = new Date(zacetek.getTime() + 8 * 60 * 60 * 1000);
      setPredlaganKonec(localDateTimeValue(osemUrPozneje > zdaj ? zdaj : osemUrPozneje));
      setPozabljeno({ ...running, startedAt: zacetekCelote });
      setRunning(null);
      return;
    }
    const minute = Math.max(1, Math.round(elapsed / 60));
    const finished = { ...running, endedAt: new Date().toISOString(), durationMinutes: minute };
    /* vrednost dela naj bo ze predlagana, ko se odpre potrditev */
    pripraviVnos(finished.startedAt.slice(0, 10), Math.floor(minute / 60), minute % 60, running.amount);
    zapisiMerjenje(null);
    setPending(finished); setRunning(null); setElapsed(0);
  };

  const confirmTime = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!pending) return;
    const data = new FormData(event.currentTarget);
    const finished: PrivateTimeEntry = {
      ...pending, durationMinutes: vMinute(data.get('ure'), data.get('min')),
      amount: Math.max(0, Number(data.get('amount')) || 0), scopeStatus: data.get('scope') === 'extra' ? 'extra' : 'included',
      overrunReason: String(data.get('reason') || '') || undefined, note: String(data.get('note') || '') || undefined,
    };
    /* Vsako merjenje je svoj zapis (zato se vidi vsak "od – do"); v dnevniku se
       merjenja istega projekta na isti dan prikazejo pod skupno uro.
       Ob "Nadaljuj" je pending podedoval id starega vnosa — nov id, sicer bi ga
       novo merjenje prepisalo. */
    if (nadaljujeId) { finished.id = crypto.randomUUID(); setNadaljujeId(null); }
    const next = [finished, ...entries]; setEntries(next); saveLocalTimeEntries(next); void saveCloudTimeEntry(finished).catch(() => undefined);
    setPending(null); setNotice(L('Časovni vnos je shranjen samo v tvojem računu.', 'The time entry is saved only in your account.'));
  };

  const remove = (id: string) => {
    const next = entries.filter(item => item.id !== id); setEntries(next); saveLocalTimeEntries(next); void deleteCloudTimeEntry(id).catch(() => undefined);
  };

  /* ── Nadaljevanje stetja, rocni vnos za nazaj, urejanje shranjenega ──────────
     Ure si lahko zapisala drugam (na papir) in jih dodas naknadno; dnevnik je po
     dnevih; vnose se sme urejati in brisati; stetje se da nadaljevati naslednji dan. */
  const [nadaljujeId, setNadaljujeId] = useState<string | null>(null);
  const [rocniOdprt, setRocniOdprt] = useState(false);
  const [timerSkrit, setTimerSkrit] = useState(false);

  /* ── Prisotnost: locena kartica + locena shramba (samo localStorage, brez oblaka) ── */
  const [delovnikUre, setDelovnikUre] = useState(8);
  const [prisotnosti, setPrisotnosti] = useState<Prisotnost[]>([]);
  const [prihodCas, setPrihodCas] = useState('');
  const [odhodCas, setOdhodCas] = useState('');
  const [odmorCas, setOdmorCas] = useState('30');
  const [vrstaVnos, setVrstaVnos] = useState<VrstaPrisotnosti>('redno');
  const [krajVnos, setKrajVnos] = useState<KrajDela>('pisarna');
  const [opombaVnos, setOpombaVnos] = useState('');
  /* dan, za katerega trenutno vnasamo prisotnost — privzeto danes, a ga je
     mozno prestaviti (npr. da popravis pretekli dan) */
  const [prisotnostDan, setPrisotnostDan] = useState(() => new Date().toISOString().slice(0, 10));
  /* izbran mesec za mesecno tabelo, oblika "YYYY-MM" */
  const [mesec, setMesec] = useState(() => new Date().toISOString().slice(0, 7));

  /* Odpre vnos za izbran dan: ce dan ze ima zapis, napolni polja z njim
     (nadaljevanje popravka), sicer jih pocisti na privzete vrednosti
     (malica 30 min, vrsta redno). Klice se ob zagonu in ob izbiri datuma. */
  const odpriPrisotnostDan = (dan: string, seznam: Prisotnost[] = prisotnosti) => {
    setPrisotnostDan(dan);
    const obstojeci = seznam.find(x => x.datum === dan);
    if (obstojeci) {
      setPrihodCas(obstojeci.prihod); setOdhodCas(obstojeci.odhod);
      setOdmorCas(obstojeci.odmorMin != null ? String(obstojeci.odmorMin) : '30');
      setVrstaVnos(obstojeci.vrsta || 'redno');
      setKrajVnos(obstojeci.kraj || 'pisarna');
      setOpombaVnos(obstojeci.opomba || '');
    } else {
      setPrihodCas(''); setOdhodCas(''); setOdmorCas('30');
      setVrstaVnos('redno'); setKrajVnos('pisarna'); setOpombaVnos('');
    }
  };

  useEffect(() => {
    if (prazno) {
      /* Nov uporabnik: prazna evidenca prisotnosti — brez demo in brez branja shrambe. */
      setPrisotnosti([]);
      setDelovnikUre(8);
      odpriPrisotnostDan(new Date().toISOString().slice(0, 10), []);
      return;
    }
    if (samoOgled) {
      /* Demo/predogled: evidenca je vnaprej napolnjena in se ne bere niti ne
         zapisuje v shrambo (glej demoPrisotnosti in samoOgled uporabo nizje). */
      const demo = demoPrisotnosti();
      setPrisotnosti(demo);
      setDelovnikUre(8);
      odpriPrisotnostDan(new Date().toISOString().slice(0, 10), demo);
      return;
    }
    const shranjeneUre = Number(localStorage.getItem('pinart-flow-delovnik-ure'));
    if (shranjeneUre > 0) setDelovnikUre(shranjeneUre);
    try {
      const shranjeno = JSON.parse(localStorage.getItem('pinart-flow-prisotnost') || '[]');
      if (Array.isArray(shranjeno)) {
        setPrisotnosti(shranjeno);
        odpriPrisotnostDan(new Date().toISOString().slice(0, 10), shranjeno);
      }
    } catch { /* poskodovana shramba — panel ostane prazen */ }
    /* Oblak: ce je uporabnik prijavljen, potegni evidenco + cilj delovnika,
       zdruzi z lokalnim (isti id = lokalni zapis prevlada) in shrani nazaj.
       Brez prijave/tabele funkcije tiho vrnejo prazno -> ostane samo localStorage. */
    void (async () => {
      try {
        const [oblak, oblakNastavitve] = await Promise.all([loadCloudPresence(), loadCloudSettings()]);
        const lokalno: Prisotnost[] = (() => {
          try { const v = JSON.parse(localStorage.getItem('pinart-flow-prisotnost') || '[]'); return Array.isArray(v) ? v : []; }
          catch { return []; }
        })();
        if (oblak.length || lokalno.length) {
          const zdruzeno = new Map<string, Prisotnost>(oblak.map(x => [x.id, x as Prisotnost]));
          lokalno.forEach(x => zdruzeno.set(x.id, x));
          const seznam = [...zdruzeno.values()];
          setPrisotnosti(seznam);
          localStorage.setItem('pinart-flow-prisotnost', JSON.stringify(seznam));
          odpriPrisotnostDan(new Date().toISOString().slice(0, 10), seznam);
          /* nalozi v oblak lokalne zapise, ki jih tam se ni (prva prijava na tej napravi) */
          const vOblaku = new Set(oblak.map(x => x.id));
          lokalno.filter(x => !vOblaku.has(x.id)).forEach(x => void saveCloudPresence(x).catch(() => undefined));
        }
        if (oblakNastavitve?.workdayHours) setDelovnikUre(oblakNastavitve.workdayHours);
      } catch { /* brez prijave / brez tabele — ostane lokalno */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samoOgled, prazno]);

  /* Ko med merjenjem odscrollaš do dnevnika, štoparica izgine z zaslona.
     Zato jo takrat pokažemo kot plavajoč pas na dnu — čas mora biti ves čas viden. */
  const timerRef2 = useRef<HTMLElement | null>(null);
  const [kartaVidna, setKartaVidna] = useState(true);
  useEffect(() => {
    const el = timerRef2.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const opazovalec = new IntersectionObserver(([v]) => setKartaVidna(v.isIntersecting), { threshold: 0.12 });
    opazovalec.observe(el);
    return () => opazovalec.disconnect();
  }, []);
  const [urejam, setUrejam] = useState<PrivateTimeEntry | null>(null);

  /* Vrednost dela se izracuna sama iz ur in tvoje vzdrzne urne vrednosti.
     Ko znesek popraviš na roko, se nehamo vtikati (zastavica znesekRocno).
     Hkrati je odprt vedno samo en obrazec, zato zadošča eno stanje za oba. */
  const [ureVnos, setUreVnos] = useState('1');
  const [minVnos, setMinVnos] = useState('0');
  const [znesekVnos, setZnesekVnos] = useState('');
  const [znesekRocno, setZnesekRocno] = useState(false);

  const urnaVrednost = result.sustainableHourlyRate;
  const predlaganZnesek = Math.round(((Number(ureVnos) || 0) + (Number(minVnos) || 0) / 60) * urnaVrednost);
  useEffect(() => {
    if (!znesekRocno) setZnesekVnos(predlaganZnesek ? String(predlaganZnesek) : '');
  }, [predlaganZnesek, znesekRocno]);

  const [danVnos, setDanVnos] = useState(() => new Date().toISOString().slice(0, 10));
  const [odVnos, setOdVnos] = useState('');
  const [doVnos, setDoVnos] = useState('');

  /* ko sta vpisana "od" in "do", polji Ure/Minute samo sledita izracunu */
  useEffect(() => {
    const m = minuteMed(odVnos, doVnos);
    if (!m) return;
    setUreVnos(String(Math.floor(m / 60))); setMinVnos(String(m % 60));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odVnos, doVnos]);

  /* obrazec vedno odpremo s cistimi polji, sicer se prenese znesek prejsnjega vnosa */
  const pripraviVnos = (dan: string, ure: number, min: number, znesek: number, od = '', doU = '') => {
    setDanVnos(dan); setUreVnos(String(ure)); setMinVnos(String(min));
    setOdVnos(od); setDoVnos(doU);
    setZnesekRocno(znesek > 0); setZnesekVnos(znesek ? String(znesek) : '');
  };

  /* Polje za dan: ikona koledarja + izpis datuma po slovensko. Zapis v polju
     samem doloca brskalnik/sistem (zato lahko kaze 07/22/2026); izpis pod
     poljem pove, kateri dan si res izbrala. */
  const poljeDan = (ime: string, privzeto: string) => (
    <label className={styles.danPolje}>
      <span>{L('Dan', 'Day')}</span>
      <span className={styles.danVrstica}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <input name={ime} type="date" max={new Date().toISOString().slice(0, 10)}
          value={danVnos || privzeto} onChange={e => setDanVnos(e.target.value)} />
      </span>
      <small>{new Date(`${danVnos || privzeto}T12:00:00`).toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small>
    </label>
  );

  /* odpiranje urejanja na enem mestu — prej je bilo trikrat prepisano */
  const odpriUrejanje = (x: PrivateTimeEntry) => {
    setUrejam(x); setRocniOdprt(false);
    const imaCas = !!x.endedAt && x.endedAt !== x.startedAt;
    pripraviVnos(
      x.startedAt.slice(0, 10), Math.floor(x.durationMinutes / 60), x.durationMinutes % 60, x.amount,
      imaCas ? ura(x.startedAt) : '', imaCas ? ura(x.endedAt!) : '',
    );
  };

  /* Od – do. Trajanje se izracuna samo, tudi cez polnoc (22:00 – 04:00 = 6 h).
     Ce si delala z odmorom, vpisi dva vnosa; v dnevniku se za isti dan in projekt
     prikazeta pod skupno uro. */
  const poljeOdDo = () => {
    const minute = minuteMed(odVnos, doVnos);
    const cezPolnoc = minute > 0 && doVnos.slice(0, 5) <= odVnos.slice(0, 5);
    return <>
      <label><span>{L('Od', 'From')}</span><input name="od" type="time" step="300" value={odVnos} onChange={e => setOdVnos(e.target.value)} /></label>
      <label><span>{L('Do', 'To')}</span><input name="do" type="time" step="300" value={doVnos} onChange={e => setDoVnos(e.target.value)} /></label>
      <p className={styles.trajanje}>
        {minute
          ? <><strong>{duration(minute)}</strong>{cezPolnoc && <span> · {L('konec je naslednji dan', 'ends the next day')}</span>}</>
          : <span>{L('Vpiši uro od in do, pa ti trajanje izračunam. Če ne veš ur, ju pusti prazni in vpiši trajanje spodaj.', 'Enter the from and to times and I will work out the duration. If you do not know the times, leave them empty and enter the duration below.')}</span>}
      </p>
    </>;
  };

  /* Vrednost dela: predlagana iz ur x tvoje urne vrednosti, a jo lahko povoziš. */
  const poljeZnesek = () => (
    <label>
      <span>{L('Vrednost tega dela', 'Value of this work')}</span>
      <input name="amount" type="number" min="0" step="10" placeholder="0"
        value={znesekVnos} onChange={e => { setZnesekRocno(true); setZnesekVnos(e.target.value); }} />
      <small>
        {znesekRocno
          ? <button type="button" className={styles.linkGumb} onClick={() => setZnesekRocno(false)}>{L(`Izračunaj po ${money(urnaVrednost)}/h`, `Calculate at ${money(urnaVrednost)}/h`)}</button>
          : L(`izračunano po tvoji urni vrednosti ${money(urnaVrednost)}/h`, `calculated from your hourly value ${money(urnaVrednost)}/h`)}
      </small>
    </label>
  );
  const danesISO = () => new Date().toISOString().slice(0, 10);
  /* poldne, da premik casovnega pasu ne prestavi vnosa na sosednji dan */
  const obDnevu = (dan: string) => new Date(`${dan}T12:00:00`).toISOString();
  const vMinute = (ure: FormDataEntryValue | null, min: FormDataEntryValue | null) =>
    Math.max(1, Math.round((Number(ure) || 0) * 60) + (Number(min) || 0));

  const nadaljuj = (item: PrivateTimeEntry) => {
    if (running || pending) return;
    setNadaljujeId(item.id);
    zapisiMerjenje({ projectName: item.projectName, serviceName: item.serviceName, startedAt: new Date().toISOString() });
    setRunning({ ...item, startedAt: new Date().toISOString(), durationMinutes: 0 });
    setElapsed(0);
  };

  /* Zacetek: ce je vpisana ura, jo uporabimo (potem se v dnevniku izpise
     "03:00 – 04:30"); brez nje ostane poldne, da premik casovnega pasu vnosa
     ne prestavi na sosednji dan. */
  const jeUra = (v: string) => /^\d{2}:\d{2}/.test(v);
  const zacetek = (dan: string, od: string) =>
    (jeUra(od) ? new Date(`${dan}T${od.slice(0, 5)}:00`).toISOString() : obDnevu(dan));

  /* Konec: iz vpisane ure "do". Ce je "do" manjsi ali enak "od", je delo slo
     cez polnoc — konec je naslednji dan (18:00 -> 04:00 = 10 ur). */
  const konec = (dan: string, od: string, doU: string, zacetekIso: string, minute: number) => {
    if (!jeUra(od) || !jeUra(doU)) {
      return jeUra(od) ? new Date(new Date(zacetekIso).getTime() + minute * 60_000).toISOString() : zacetekIso;
    }
    const k = new Date(`${dan}T${doU.slice(0, 5)}:00`);
    if (k.getTime() <= new Date(zacetekIso).getTime()) k.setDate(k.getDate() + 1);
    return k.toISOString();
  };

  /* minute med "od" in "do", s prehodom cez polnoc; 0, ce nista oba vpisana */
  const minuteMed = (od: string, doU: string) => {
    if (!jeUra(od) || !jeUra(doU)) return 0;
    const [a, b] = [od, doU].map(v => Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5)));
    return b > a ? b - a : b + 24 * 60 - a;
  };

  /* ── Prisotnost: izracun in shranjevanje ─────────────────────────────────
     Isto merjenje "od – do" kot pri stoparici (minuteMed), le da tu meri cel
     delovnik, ne enega projekta. */
  const prisotnostOdmor = Number(odmorCas) || 0;
  const prisotnostMinute = minuteMed(prihodCas, odhodCas);
  const prisotnostOpravljeno = prisotnostMinute ? Math.max(0, prisotnostMinute - prisotnostOdmor) : 0;
  const prisotnostOstane = delovnikUre * 60 - prisotnostOpravljeno;

  const zdajHHMM = () => {
    const zdaj = new Date();
    return `${String(zdaj.getHours()).padStart(2, '0')}:${String(zdaj.getMinutes()).padStart(2, '0')}`;
  };

  const shraniDelovnik = (ure: number) => {
    const varno = ure > 0 ? ure : 8;
    setDelovnikUre(varno);
    /* v predogledu (demo) se cilj ne zapise trajno — samo v stanju za ta ogled */
    if (!samoOgled) {
      localStorage.setItem('pinart-flow-delovnik-ure', String(varno));
      void saveCloudSettings({ workdayHours: varno }).catch(() => undefined);
    }
  };

  /* Isti dan prepise obstojeci vnos (id ostane), sicer nov zapis na vrh dnevnika.
     Bolniska/dopust/praznik so cel dan brez ur, zato prihod/odhod tam nista obvezna. */
  const shraniPrisotnost = () => {
    if (samoOgled) return; /* predogled je samo za ogled, glej demoPrisotnosti */
    if (!brezUrVrsta(vrstaVnos) && (!prihodCas || !odhodCas)) {
      setNotice(L('Vpiši prihod in odhod pred shranjevanjem.', 'Enter arrival and departure before saving.')); return;
    }
    const dan = prisotnostDan;
    const obstojeci = prisotnosti.find(x => x.datum === dan);
    const zapis: Prisotnost = {
      id: obstojeci?.id || crypto.randomUUID(), datum: dan,
      prihod: prihodCas, odhod: odhodCas, odmorMin: prisotnostOdmor || undefined,
      vrsta: vrstaVnos, kraj: brezUrVrsta(vrstaVnos) ? undefined : krajVnos,
      opomba: opombaVnos.trim() || undefined,
    };
    const next = obstojeci ? prisotnosti.map(x => (x.id === zapis.id ? zapis : x)) : [zapis, ...prisotnosti];
    setPrisotnosti(next); localStorage.setItem('pinart-flow-prisotnost', JSON.stringify(next));
    void saveCloudPresence(zapis).catch(() => undefined);
    setNotice(L('Prisotnost je shranjena v dnevnik.', 'Attendance saved to the log.'));
  };

  const izbrisiPrisotnost = (id: string) => {
    if (samoOgled) return;
    const next = prisotnosti.filter(x => x.id !== id);
    setPrisotnosti(next); localStorage.setItem('pinart-flow-prisotnost', JSON.stringify(next));
    void deleteCloudPresence(id).catch(() => undefined);
  };

  /* ── Mesečna evidenca: navigacija po mesecih, tabela in povzetek ──────────
     Cilj meseca = delovnih dni (pon–pet) × cilj delovnika. Natančnejše kot
     pavšalno "×21", ker se meseci razlikujejo po dolžini/razporeditvi
     vikendov; praznikov namenoma NE izločimo iz števila delovnih dni — če je
     nekdo prost, si ta dan vpiše kot "praznik" in cilj ostane fiksen. */
  const mesecOznaka = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString(dl, { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const premikMeseca = (ym: string, delta: number) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const delovnihDniMeseca = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    const steviloDni = new Date(y, m, 0).getDate();
    let stevilo = 0;
    for (let d = 1; d <= steviloDni; d++) {
      const dow = new Date(y, m - 1, d).getDay();
      if (dow !== 0 && dow !== 6) stevilo++;
    }
    return stevilo;
  };
  /* "pon 1. 7." — kratek dan v tednu + datum, kot na skici */
  const kratekDan = (dan: string) => {
    const d = new Date(`${dan}T12:00:00`);
    return `${d.toLocaleDateString(dl, { weekday: 'short' }).replace('.', '')} ${d.getDate()}. ${d.getMonth() + 1}.`;
  };
  /* ure za eno vrstico tabele; null = "brez ur" (bolniska/dopust/praznik) -> prikaz "—" */
  const uraZapisa = (p: Prisotnost) => {
    if (brezUrVrsta(vrstaZapisa(p))) return null;
    const minute = minuteMed(p.prihod, p.odhod);
    return minute ? Math.max(0, minute - (p.odmorMin || 0)) : 0;
  };

  const prisotnostiMeseca = [...prisotnosti]
    .filter(p => p.datum.slice(0, 7) === mesec)
    .sort((a, b) => a.datum.localeCompare(b.datum));

  /* v mesecno vsoto stejemo samo delovni cas (redno + sluzbena pot) */
  const mesecMinute = prisotnostiMeseca.reduce((vsota, p) => {
    const v = vrstaZapisa(p);
    if (v !== 'redno' && v !== 'sluzbena') return vsota;
    const minute = minuteMed(p.prihod, p.odhod);
    return vsota + (minute ? Math.max(0, minute - (p.odmorMin || 0)) : 0);
  }, 0);
  const mesecCiljUre = delovnihDniMeseca(mesec) * delovnikUre;
  const mesecOstaneMinut = Math.round(mesecCiljUre * 60 - mesecMinute);
  const mesecNapredek = mesecCiljUre ? Math.min(100, Math.max(0, (mesecMinute / 60 / mesecCiljUre) * 100)) : 0;

  /* IZVOZ ZA HR: mesečna evidenca kot CSV (; + UTF-8 BOM za SI Excel; ure decimalno). */
  const izvoziHrCsv = () => {
    if (typeof document === 'undefined') return;
    const decUr = (min: number | null) => (min == null ? '' : (min / 60).toFixed(2).replace('.', ','));
    const vrstice: (string | number)[][] = [['Datum', 'Dan', 'Prihod', 'Odhod', 'Malica (min)', 'Ur (opravljeno)', 'Vrsta', 'Kraj', 'Opomba']];
    prisotnostiMeseca.forEach(p => {
      vrstice.push([
        p.datum,
        new Date(`${p.datum}T12:00:00`).toLocaleDateString('sl-SI', { weekday: 'long' }),
        p.prihod || '', p.odhod || '',
        typeof p.odmorMin === 'number' ? p.odmorMin : '',
        decUr(uraZapisa(p)),
        VRSTA_OZNAKA[vrstaZapisa(p)],
        p.kraj ? KRAJ_OZNAKA[p.kraj] : '',
        p.opomba || '',
      ]);
    });
    vrstice.push([]);
    vrstice.push(['Skupaj opravljeno (ur)', '', '', '', '', (mesecMinute / 60).toFixed(2).replace('.', ','), '', '', '']);
    vrstice.push(['Mesečni cilj (ur)', '', '', '', '', String(mesecCiljUre).replace('.', ','), '', '', '']);
    const vsebina = '﻿' + vrstice.map(r => r.map(c => { const s = String(c ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
    const blob = new Blob([vsebina], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Evidenca_delovnega_casa_${mesec}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const dodajRocno = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    const projectName = String(d.get('project')).trim(); if (!projectName) return;
    const dan = String(d.get('dan') || danesISO());
    const od = String(d.get('od') || '');
    const doU = String(d.get('do') || '');
    const minute = minuteMed(od, doU) || vMinute(d.get('ure'), d.get('min'));
    const cas = zacetek(dan, od);
    const zapis: PrivateTimeEntry = {
      id: crypto.randomUUID(), projectName, serviceName: String(d.get('service')).trim(),
      startedAt: cas, endedAt: konec(dan, od, doU, cas, minute), durationMinutes: minute,
      amount: Number(d.get('amount')) || 0,
      note: String(d.get('note') || '').trim() || undefined,
      scopeStatus: d.get('scope') === 'extra' ? 'extra' : 'included',
    };
    const next = [zapis, ...entries]; setEntries(next); saveLocalTimeEntries(next);
    void saveCloudTimeEntry(zapis).catch(() => undefined);
    setRocniOdprt(false); setNotice(L('Ure so dodane v dnevnik.', 'Hours added to the log.'));
  };

  const shraniUrejanje = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!urejam) return;
    const d = new FormData(event.currentTarget);
    const dan = String(d.get('dan') || urejam.startedAt.slice(0, 10));
    const od = String(d.get('od') || '');
    const doU = String(d.get('do') || '');
    const minute = minuteMed(od, doU) || vMinute(d.get('ure'), d.get('min'));
    const cas = zacetek(dan, od);
    const posodobljen: PrivateTimeEntry = {
      ...urejam,
      projectName: String(d.get('project')).trim() || urejam.projectName,
      serviceName: String(d.get('service')).trim(),
      /* prej je urejanje pobrisalo uro zacetka — zdaj se ohrani oz. jo popraviš */
      startedAt: cas, endedAt: konec(dan, od, doU, cas, minute),
      durationMinutes: minute,
      amount: Math.max(0, Number(d.get('amount')) || 0),
      note: String(d.get('note') || '').trim() || undefined,
      scopeStatus: d.get('scope') === 'extra' ? 'extra' : 'included',
    };
    const next = entries.map(x => (x.id === posodobljen.id ? posodobljen : x));
    setEntries(next); saveLocalTimeEntries(next);
    void saveCloudTimeEntry(posodobljen).catch(() => undefined);
    setUrejam(null); setNotice(L('Vnos je posodobljen.', 'Entry updated.'));
  };

  /* ── Dnevnik: dva pogleda ────────────────────────────────────────────────
     "Po dnevih" je za med delom (kaj sem danes delala). "Po projektih" je za
     vprasanje cez pol leta: "koliko ur je slo v ta projekt?" — zato seštevek
     ur, razpon datumov in dejanska urna vrednost na projekt. */
  const [dnevnikPogled, setDnevnikPogled] = useState<'dnevi' | 'projekti'>('dnevi');
  const [iskanje, setIskanje] = useState('');
  const [razprti, setRazprti] = useState<string[]>([]);

  const najdeni = (() => {
    const q = iskanje.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(x =>
      x.projectName.toLowerCase().includes(q) || (x.serviceName || '').toLowerCase().includes(q));
  })();

  /* dnevnik po dnevih, z dnevnim seštevkom */
  const poDnevih = (() => {
    const m = new Map<string, PrivateTimeEntry[]>();
    [...najdeni].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).forEach(x => {
      const k = x.startedAt.slice(0, 10);
      m.set(k, [...(m.get(k) || []), x]);
    });
    return [...m.entries()];
  })();

  /* Brezplacen paket vidi samo danasnji dan — dovolj, da po ustavitvi vidis,
     kaj si vpisala, premalo, da bi bilo to zgodovina. */
  const poDnevihPrikaz = omejeno ? poDnevih.filter(([dan]) => dan === danesISO()) : poDnevih;
  const dnevnaVsota = poDnevihPrikaz.reduce(
    (s, [, dnevni]) => s + dnevni.reduce((v, x) => v + x.durationMinutes, 0), 0);

  /* zdruzeno po IMENU projekta (velike/male crke in presledki se ne stejejo,
     da "Pinart flow " in "Pinart Flow" nista dva projekta) */
  const poProjektih = (() => {
    const m = new Map<string, { ime: string; vnosi: PrivateTimeEntry[] }>();
    najdeni.forEach(x => {
      const k = x.projectName.trim().toLowerCase();
      if (!m.has(k)) m.set(k, { ime: x.projectName.trim(), vnosi: [] });
      m.get(k)!.vnosi.push(x);
    });
    return [...m.entries()].map(([k, s]) => {
      const vnosi = [...s.vnosi].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      const minute = vnosi.reduce((v, x) => v + x.durationMinutes, 0);
      const znesek = vnosi.reduce((v, x) => v + x.amount, 0);
      const datumi = vnosi.map(x => x.startedAt).sort();
      const storitve = [...new Set(vnosi.map(x => x.serviceName?.trim()).filter(Boolean))] as string[];
      return {
        k, ime: s.ime, vnosi, minute, znesek, storitve,
        od: datumi[0], do: datumi[datumi.length - 1],
        urna: minute ? znesek / (minute / 60) : 0,
      };
    }).sort((a, b) => b.minute - a.minute);
  })();

  const kratkiDatum = (iso: string) => new Date(iso).toLocaleDateString(dl, { day: 'numeric', month: 'numeric', year: '2-digit' });
  const ura = (iso: string) => new Date(iso).toLocaleTimeString(dl, { hour: '2-digit', minute: '2-digit' });
  /* "03:00 – 04:30". Ce si stetje nadaljevala, ostane zacetek prvega in konec
     zadnjega merjenja. Rocni vnos brez ure ima zacetek == konec -> ne pisemo nic. */
  const razpon = (x: PrivateTimeEntry) => (x.endedAt && x.endedAt !== x.startedAt ? `${ura(x.startedAt)} – ${ura(x.endedAt)}` : '');

  /* Izvoz dnevnika. CSV, ker ga odpreta Excel in Numbers brez pretvarjanja.
     Podpicje kot locilo (slovenski Excel to pricakuje) in BOM, sicer se
     sumniki v Excelu razsujejo. Izvozi se to, kar je trenutno najdeno. */
  const izvozi = () => {
    const polja = ['Datum', 'Od', 'Do', 'Projekt', 'Storitev', 'Minute', 'Ure', 'Vrednost EUR', 'Urna EUR', 'Obseg', 'Opomba'];
    const ubezi = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const vrstice = [...najdeni].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map(x => [
      new Date(x.startedAt).toLocaleDateString('sl-SI'),
      razpon(x) ? ura(x.startedAt) : '', razpon(x) ? ura(x.endedAt!) : '',
      x.projectName, x.serviceName || '',
      x.durationMinutes, (x.durationMinutes / 60).toFixed(2).replace('.', ','),
      x.amount || 0,
      x.durationMinutes ? Math.round(x.amount / (x.durationMinutes / 60)) : 0,
      x.scopeStatus === 'extra' ? 'Dodatno delo' : 'Vključeno',
      x.note || '',
    ].map(ubezi).join(';'));

    const vsebina = '﻿' + [polja.map(ubezi).join(';'), ...vrstice].join('\r\n');
    const url = URL.createObjectURL(new Blob([vsebina], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `pinart-ure-${danesISO()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) return <p className={styles.loading}>{L('Pripravljam poslovni načrt …', 'Preparing your business plan …')}</p>;

  return <div className={`${styles.page} ${view === 'time' ? styles.casPogled : ''}`}>
    {notice && <div className={styles.notice} role="status">{notice}<button onClick={() => setNotice('')} aria-label={L('Zapri', 'Close')}>×</button></div>}

    <div className={`${styles.layout} ${view === 'time' ? styles.timeOnly : ''}`}>
      {view === 'all' && <form className={styles.plan} onSubmit={savePlan}>
        <header><p>{L('01 · POSLOVNI NAČRT', '01 · BUSINESS PLAN')}</p><h2>{L('Najprej določi, kaj mora podjetje omogočiti.', 'First define what the business has to make possible.')}</h2><span>{L('Načrt postane osnova za mesečne in letne cilje.', 'The plan becomes the basis for monthly and yearly goals.')}</span></header>
        <div className={styles.fields}>
          <label><span>{L('Želeni mesečni dohodek', 'Desired monthly income')}</span><input type="number" min="0" step="100" value={plan.desiredMonthlyIncome} onChange={e => update('desiredMonthlyIncome', e.target.value)} /></label>
          <label><span>{L('Fiksni mesečni stroški', 'Fixed monthly costs')}</span><input type="number" min="0" step="50" value={plan.fixedMonthlyCosts} onChange={e => update('fixedMonthlyCosts', e.target.value)} /></label>
          <label><span>{L('Rezerva za davke', 'Tax reserve')}</span><input type="number" min="0" max="70" value={plan.taxReservePercent} onChange={e => update('taxReservePercent', e.target.value)} /><small>%</small></label>
          <label><span>{L('Varnostna rezerva', 'Safety reserve')}</span><input type="number" min="0" max="40" value={plan.safetyReservePercent} onChange={e => update('safetyReservePercent', e.target.value)} /><small>%</small></label>
          <label><span>{L('Obračunske ure na mesec', 'Billable hours per month')}</span><input type="number" min="1" max="250" value={plan.billableHoursMonthly} onChange={e => update('billableHoursMonthly', e.target.value)} /></label>
          <label><span>{L('Povprečna vrednost projekta', 'Average project value')}</span><input type="number" min="0" step="100" value={plan.averageProjectValue} onChange={e => update('averageProjectValue', e.target.value)} /></label>
        </div>
        <label className={styles.notes}><span>{L('Opombe in poslovne omejitve', 'Notes and business limits')}</span><textarea value={plan.notes} onChange={e => update('notes', e.target.value)} placeholder={L('Kaj želiš delati, česa ne sprejemaš, koliko časa želiš imeti zase …', 'What you want to do, what you will not take on, how much time you want for yourself …')} /></label>
        <button type="submit">{L('Shrani načrt in posodobi cilje', 'Save plan and update goals')}</button>
      </form>}

      <section className={styles.timer} id="timer" ref={timerRef2}>
        <header><p>{view === 'time' ? '01' : '02'} · {L('ČAS', 'TIME')}</p><h2>{L('Ali se ti je delo po tej ceni splačalo?', 'Was the work worth it at this price?')}</h2><span>{L('Timer je zaseben. Ne beleži zaslona, aktivnosti, aplikacij ali lokacije.', 'The timer is private. It does not track your screen, activity, apps or location.')}</span></header>

        {pozabljeno ? <form className={styles.timerForm} onSubmit={potrdiPozabljenKonec}>
          <div className={styles.reviewTitle} role="alert">
            <strong>{L('Je časovnik ostal prižgan?', 'Did the timer stay running?')}</strong>
            <span>{L(`Časovnik je tekel ${izpisMinut(Math.max(1, Math.round(sekundeShrambe / 60)))}. Popravi konec?`, `The timer ran for ${izpisMinut(Math.max(1, Math.round(sekundeShrambe / 60)))}. Fix the end time?`)}</span>
          </div>
          <label>
            <span>{L('Dejanski konec dela', 'Actual end of work')}</span>
            <input name="actualEnd" type="datetime-local" required max={localDateTimeValue(new Date())}
              value={predlaganKonec} onChange={e => setPredlaganKonec(e.target.value)} />
            <small>{L('Predlagali smo največ 8 ur po začetku. Po potrebi čas popravi.', 'We suggested at most 8 hours after the start. Adjust the time if needed.')}</small>
          </label>
          <button type="submit">{L('Shrani', 'Save')}</button>
          <button type="button" className={styles.linkGumb} onClick={zavrziPozabljenoMerjenje}>{L('Zavrzi sejo', 'Discard session')}</button>
          <button type="button" className={styles.linkGumb} onClick={nadaljujPozabljenoMerjenje}>{L('Merjenje še vedno teče', 'Timing is still running')}</button>
        </form> : pending ? <form className={styles.timerForm} onSubmit={confirmTime}>
          <div className={styles.reviewTitle}><strong>{L('Preglej zaključeni vnos', 'Review the completed entry')}</strong><span>{pending.projectName} · {pending.serviceName || L('brez oznake storitve', 'no service label')}</span></div>
          <label><span>{L('Ure', 'Hours')}</span><input name="ure" type="number" min="0" step="1" value={ureVnos} onChange={e => setUreVnos(e.target.value)} /></label>
          <label><span>{L('Minute', 'Minutes')}</span><input name="min" type="number" min="0" max="59" step="1" value={minVnos} onChange={e => setMinVnos(e.target.value)} /></label>
          {poljeZnesek()}
          <label><span>{L('Obseg', 'Scope')}</span><select name="scope" defaultValue={pending.scopeStatus}><option value="included">{L('Vključeno v dogovor', 'Included in the agreement')}</option><option value="extra">{L('Dodatno delo', 'Extra work')}</option></select></label>
          <label><span>{L('Zakaj je delo odstopalo od načrta?', 'Why did the work differ from the plan?')}</span><select name="reason"><option value="">Ni odstopanja</option><option>Zahtevnejše od pričakovanega</option><option>Preveč popravkov</option><option>Nejasen brief</option><option>Dodatne zahteve</option><option>Veliko komunikacije</option><option>Administracija</option><option>Novo področje ali učenje</option><option>Ta vrsta dela mi ne ustreza</option></select></label>
          <label><span>{L('Zasebna opomba', 'Private note')}</span><input name="note" placeholder={L('Kaj boš naslednjič spremenila pri ceni ali obsegu?', 'What will you change next time in price or scope?')} /></label>
          <button type="submit">{L('Potrdi zasebni vnos', 'Confirm private entry')}</button>
        </form> : running && timerSkrit ? <div className={styles.tecePas}>
          {/* skrito: merjenje NE stoji, samo ne zavzema pol zaslona */}
          <span className={styles.tecePika} aria-hidden="true" />
          <strong>{running.projectName}</strong>
          <b>{String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor(elapsed / 60) % 60).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</b>
          <button type="button" className={styles.skrijGumb} onClick={() => setTimerSkrit(false)}>{L('Pokaži', 'Show')}</button>
          <button type="button" className={styles.skrijGumb} data-glavni onClick={stop}>{L('Ustavi', 'Stop')}</button>
        </div> : running ? <div className={styles.running}>
          <TimerValovi className={styles.valovi} />
          <span><small>{L('TEČE ZDAJ', 'RUNNING NOW')}</small><strong>{running.projectName}</strong><em>{running.serviceName || L('Brez oznake storitve', 'No service label')}</em></span>
          {/* ura + "skrij" v isti vrstici: ko delaš, ti velika števka pred očmi moti */}
          <div className={styles.uraVrstica}>
            <b>{String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor(elapsed / 60) % 60).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</b>
            {/* samo oko — merjenje tece naprej, skrije se le prikaz */}
            <button type="button" className={styles.okoGumb} onClick={() => setTimerSkrit(true)}
              aria-label={L('Skrij štoparico', 'Hide timer')} title={L('Skrij prikaz — merjenje teče naprej', 'Hide the display — timing keeps running')}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.6" /><path d="m4 20 16-16" />
              </svg>
            </button>
          </div>
          {/* pavza ob glavnem gumbu, ne ob uri */}
          <div className={styles.glavnaVrsta}>
            <button type="button" onClick={stop}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.4" /></svg>
              {L('Ustavi in shrani', 'Stop and save')}
            </button>
            <button type="button" className={styles.pavzaGumb} onClick={preklopiPavzo}
              aria-label={merjenje?.pavza ? L('Nadaljuj merjenje', 'Resume timing') : L('Pavza', 'Pause')}
              title={merjenje?.pavza ? L('Nadaljuj', 'Resume') : L('Pavza', 'Pause')}>
              {merjenje?.pavza
                ? <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
                : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><rect x="7" y="5.5" width="3.6" height="13" rx="1.1" /><rect x="13.4" y="5.5" width="3.6" height="13" rx="1.1" /></svg>}
            </button>
          </div>
        </div> : <form className={styles.timerForm} onSubmit={start}>
          <label><span>{L('Projekt ali stranka', 'Project or client')}</span><input name="project" required placeholder={L('npr. Nova identiteta', 'e.g. New identity')} /></label>
          <label><span>{L('Storitev', 'Service')}</span><input name="service" placeholder={L('npr. oblikovanje logotipa', 'e.g. logo design')} /></label>
          <label><span>{L('Vrednost tega dela', 'Value of this work')}</span><input name="amount" type="number" min="0" step="10" placeholder={L('Določiš lahko tudi ob zaključku', 'You can also set this when you finish')} /></label>
          <label><span>{L('Obseg', 'Scope')}</span><select name="scope"><option value="included">{L('Vključeno v dogovor', 'Included in the agreement')}</option><option value="extra">{L('Dodatno delo', 'Extra work')}</option></select></label>
          <button type="submit">{L('Začni meriti', 'Start timing')}</button>
          {/* ure, ki si jih zapisala drugam — dodaj jih na poljuben (tudi pretekli) dan.
              Naslov je besedilo, gumb ostane kratek (prej je bil cel stavek na gumbu). */}
          <div className={styles.rocniVrstica}>
            <span>{L('Nisi merila?', 'Did not track it?')}</span>
            <button type="button" className={styles.rocniGumb} onClick={() => { setRocniOdprt(v => !v); pripraviVnos(danesISO(), 1, 0, 0); }}>
              {rocniOdprt ? L('Prekliči', 'Cancel') : L('Vpiši ročno', 'Enter manually')}
            </button>
          </div>
        </form>}

        {rocniOdprt && !running && !pending && (
          <form className={styles.timerForm} onSubmit={dodajRocno}>
            <div className={styles.reviewTitle}><strong>{L('Vpiši ure za nazaj', 'Add hours after the fact')}</strong><span>{L('Za dan, ko si delala, a nisi merila.', 'For a day you worked but did not track.')}</span></div>
            {poljeDan('dan', danesISO())}
            {poljeOdDo()}
            <label><span>{L('Projekt ali stranka', 'Project or client')}</span><input name="project" required placeholder={L('npr. Nova identiteta', 'e.g. New identity')} /></label>
            <label><span>{L('Storitev', 'Service')}</span><input name="service" placeholder={L('npr. oblikovanje logotipa', 'e.g. logo design')} /></label>
            <label><span>{L('Ure', 'Hours')}</span><input name="ure" type="number" min="0" step="1" value={ureVnos} onChange={e => setUreVnos(e.target.value)} /></label>
            <label><span>{L('Minute', 'Minutes')}</span><input name="min" type="number" min="0" max="59" step="5" value={minVnos} onChange={e => setMinVnos(e.target.value)} /></label>
            {poljeZnesek()}
            <label><span>{L('Obseg', 'Scope')}</span><select name="scope"><option value="included">{L('Vključeno v dogovor', 'Included in the agreement')}</option><option value="extra">{L('Dodatno delo', 'Extra work')}</option></select></label>
            <label className={styles.notes}><span>{L('Kaj si delala?', 'What did you work on?')} <small>{L('ni obvezno', 'optional')}</small></span><textarea name="note" rows={2} placeholder={L('npr. tri različice logotipa, sestanek s stranko …', 'e.g. three logo variants, client meeting …')} /></label>
            <button type="submit">{L('Dodaj v dnevnik', 'Add to log')}</button>
          </form>
        )}

        {urejam && (
          <form className={styles.timerForm} onSubmit={shraniUrejanje}>
            <div className={styles.reviewTitle}><strong>{L('Uredi vnos', 'Edit entry')}</strong><span>{urejam.projectName}</span></div>
            {poljeDan('dan', urejam.startedAt.slice(0, 10))}
            {poljeOdDo()}
            <label><span>{L('Projekt ali stranka', 'Project or client')}</span><input name="project" defaultValue={urejam.projectName} /></label>
            <label><span>{L('Storitev', 'Service')}</span><input name="service" defaultValue={urejam.serviceName} /></label>
            <label><span>{L('Ure', 'Hours')}</span><input name="ure" type="number" min="0" step="1" value={ureVnos} onChange={e => setUreVnos(e.target.value)} /></label>
            <label><span>{L('Minute', 'Minutes')}</span><input name="min" type="number" min="0" max="59" step="1" value={minVnos} onChange={e => setMinVnos(e.target.value)} /></label>
            {poljeZnesek()}
            <label><span>{L('Obseg', 'Scope')}</span><select name="scope" defaultValue={urejam.scopeStatus}><option value="included">{L('Vključeno v dogovor', 'Included in the agreement')}</option><option value="extra">{L('Dodatno delo', 'Extra work')}</option></select></label>
            <label className={styles.notes}><span>{L('Kaj si delala?', 'What did you work on?')} <small>{L('ni obvezno', 'optional')}</small></span><textarea name="note" rows={2} defaultValue={urejam.note || ''} placeholder={L('npr. tri različice logotipa, sestanek s stranko …', 'e.g. three logo variants, client meeting …')} /></label>
            <button type="submit">{L('Shrani spremembe', 'Save changes')}</button>
            <button type="button" className={styles.linkGumb} onClick={() => setUrejam(null)}>{L('Prekliči', 'Cancel')}</button>
          </form>
        )}
        <div className={styles.ethics}><strong>{L('Čas meri donosnost projekta, ne tvoje vrednosti.', 'Time measures a project’s profitability, not your worth.')}</strong><span>{L('Vnosi ostanejo v tvojem računu in se ne delijo s strankami ali vodji.', 'Entries stay in your account and are not shared with clients or managers.')}</span></div>
      </section>
    </div>

    {/* Prisotnost/evidenca je LOCENA kartica izven ozkega .layout stolpca (glej
        .casPogled v CSS) — meri cel delovnik po dnevih in ga zbira v mesecno
        tabelo, stoparica meri en projekt. Obe sta vedno vidni. */}
    <section className={`${styles.timer} ${styles.evidenca}`}>
      <header><p>{L('PRISOTNOST', 'ATTENDANCE')}</p><h2>{L('Mesečna evidenca delovnega časa', 'Monthly work-time record')}</h2><span>{L('Prihod, odhod, malica in vrsta dneva — mesečni pregled in napredek proti cilju se izračunata sama.', 'Arrival, departure, break and day type — the monthly overview and progress toward the goal are calculated for you.')}</span></header>

      <div className={styles.prisotnost}>
        <label className={styles.danPolje}>
          <span>{L('Dan vnosa', 'Entry day')}</span>
          <span className={styles.danVrstica}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <input type="date" value={prisotnostDan} onChange={e => odpriPrisotnostDan(e.target.value)} />
          </span>
          <small>{new Date(`${prisotnostDan}T12:00:00`).toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small>
        </label>

        <label className={styles.prisotnostCilj}>
          <span>{L('Cilj delovnika (ur)', 'Workday goal (hours)')}</span>
          <input type="number" min="1" max="24" step="0.5" value={delovnikUre}
            onChange={e => shraniDelovnik(Number(e.target.value))} />
        </label>

        <label>
          <span>{L('Prihod', 'Arrival')}</span>
          <div className={styles.prisotnostVrstica}>
            <input type="time" step="60" value={prihodCas} onChange={e => setPrihodCas(e.target.value)} />
            <button type="button" className={styles.rocniGumb} onClick={() => setPrihodCas(zdajHHMM())}>{L('Prišel/-a', 'Arrived')}</button>
          </div>
        </label>
        <label><span>{L('Malica (min)', 'Break (min)')}</span><input type="number" min="0" step="5" placeholder="30" value={odmorCas} onChange={e => setOdmorCas(e.target.value)} /></label>
        <label>
          <span>{L('Odhod', 'Departure')}</span>
          <div className={styles.prisotnostVrstica}>
            <input type="time" step="60" value={odhodCas} onChange={e => setOdhodCas(e.target.value)} />
            <button type="button" className={styles.rocniGumb} onClick={() => setOdhodCas(zdajHHMM())}>{L('Odšel/-a', 'Left')}</button>
          </div>
        </label>
        <label>
          <span>{L('Vrsta', 'Type')}</span>
          <select value={vrstaVnos} onChange={e => setVrstaVnos(e.target.value as VrstaPrisotnosti)}>
            <option value="redno">{L('Redno', 'Regular')}</option>
            <option value="sluzbena">{L('Službena pot', 'Business trip')}</option>
            <option value="bolniska">{L('Bolniška', 'Sick leave')}</option>
            <option value="zasebni">{L('Zasebni izhod', 'Personal leave')}</option>
            <option value="dopust">{L('Dopust', 'Vacation')}</option>
            <option value="praznik">{L('Praznik', 'Holiday')}</option>
          </select>
        </label>
        {!brezUrVrsta(vrstaVnos) && (
          <label>
            <span>{L('Kraj dela', 'Work location')}</span>
            <select value={krajVnos} onChange={e => setKrajVnos(e.target.value as KrajDela)}>
              <option value="pisarna">{L('Na podjetju', 'At the office')}</option>
              <option value="doma">{L('Delo od doma', 'Working from home')}</option>
            </select>
          </label>
        )}
        <label className={styles.komentarPolje}><span>{L('Komentar', 'Comment')} <small>{L('ni obvezno', 'optional')}</small></span><input type="text" placeholder={L('npr. pri zdravniku, sestanek …', 'e.g. at the doctor, meeting …')} value={opombaVnos} onChange={e => setOpombaVnos(e.target.value)} /></label>

        <p className={styles.prisotnostIzpis}>
          {brezUrVrsta(vrstaVnos)
            ? <span>{vrstaLabel(vrstaVnos)} — {L('cel dan se šteje kot odsotnost, brez izračuna ur.', 'the whole day counts as absence, with no hours calculated.')}</span>
            : !prihodCas || !odhodCas
              ? <span>{L('Vpiši prihod in odhod, pa ti povem, koliko ur ostane do cilja.', 'Enter arrival and departure and I will tell you how many hours are left to the goal.')}</span>
              : <>{L('Opravljeno', 'Done')} <strong>{izpisMinut(prisotnostOpravljeno)}</strong> · {prisotnostOstane >= 0
                  ? <>{L('ostane', 'remaining')} <strong>{izpisMinut(prisotnostOstane)}</strong></>
                  : <>+{izpisMinut(-prisotnostOstane)} {L('viška', 'over')}</>}</>}
        </p>
        <button type="button" onClick={shraniPrisotnost} disabled={samoOgled}>{L('Shrani v dnevnik', 'Save to log')}</button>
        {samoOgled && <small className={styles.opomba}>{L('Urejanje ni na voljo v predogledu (demo). Prijavi se v svoj račun.', 'Editing is not available in the preview (demo). Sign in to your account.')}</small>}
      </div>

      <div className={styles.mesecNav}>
        <button type="button" onClick={() => setMesec(premikMeseca(mesec, -1))} aria-label={L('Prejšnji mesec', 'Previous month')}>‹</button>
        <strong>{mesecOznaka(mesec)}</strong>
        <button type="button" onClick={() => setMesec(premikMeseca(mesec, 1))} aria-label={L('Naslednji mesec', 'Next month')}>›</button>
      </div>

      {prisotnostiMeseca.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-.2rem 0 .55rem' }}>
          <button type="button" onClick={izvoziHrCsv}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', border: '1px solid oklch(86% .012 87)', background: '#fff', borderRadius: 999, padding: '.4rem .9rem', fontSize: '.76rem', fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}
            title={L('Prenesi mesečno evidenco kot CSV za kadrovsko / plače', 'Download the monthly record as CSV for HR / payroll')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12M8 11l4 4 4-4M5 21h14" /></svg>
            {L('Izvozi za HR (CSV)', 'Export for HR (CSV)')}
          </button>
        </div>
      )}

      <div className={styles.mesecTabelaOvoj}>
        <table className={styles.mesecTabela}>
          <thead><tr><th>{L('Dan', 'Day')}</th><th>{L('Prihod', 'Arrival')}</th><th>{L('Malica', 'Break')}</th><th>{L('Odhod', 'Departure')}</th><th>{L('Vrsta', 'Type')}</th><th>{L('Ure', 'Hours')}</th><th aria-hidden="true" /></tr></thead>
          <tbody>
            {!prisotnostiMeseca.length && <tr><td colSpan={7} className={styles.mesecPrazno}>{L('V tem mesecu še ni vnosov.', 'No entries this month yet.')}</td></tr>}
            {prisotnostiMeseca.map(p => {
              const v = vrstaZapisa(p);
              const ure = uraZapisa(p);
              return (
                <tr key={p.id} data-odsoten={brezUrVrsta(v)}>
                  <td>{kratekDan(p.datum)}{p.opomba && <small className={styles.mesecOpomba}>{p.opomba}</small>}</td>
                  <td>{p.prihod || '—'}</td>
                  <td>{p.odmorMin ? `${p.odmorMin} min` : '—'}</td>
                  <td>{p.odhod || '—'}</td>
                  <td><span className={styles.vrstaPilula} data-vrsta={v}>{vrstaLabel(v)}</span>{!brezUrVrsta(v) && p.kraj && <span className={styles.krajPilula} data-kraj={p.kraj} title={krajLabel(p.kraj)}>{p.kraj === 'doma' ? L('Doma', 'Home') : L('Podjetje', 'Office')}</span>}</td>
                  <td className={styles.mesecUre}>{ure == null ? '—' : izpisMinut(ure)}</td>
                  <td>
                    {!samoOgled && <button type="button"
                      onClick={() => { if (confirm(L(`Izbrišem vnos za ${kratekDan(p.datum)}?`, `Delete the entry for ${kratekDan(p.datum)}?`))) izbrisiPrisotnost(p.id); }}
                      aria-label={L(`Izbriši vnos prisotnosti za ${p.datum}`, `Delete attendance entry for ${p.datum}`)}>×</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.mesecPovzetek}>
        <div className={styles.mesecPovzetekStevec}>
          <span>{L(`opravljeno v ${mesecOznaka(mesec).toLowerCase()}`, `done in ${mesecOznaka(mesec).toLowerCase()}`)}</span>
          <strong>{izpisMinut(mesecMinute)}</strong>
        </div>
        <div className={styles.mesecTrak}><div className={styles.mesecTrakZapolnjeno} style={{ width: `${mesecNapredek}%` }} /></div>
        <span className={styles.mesecCiljIzpis}>
          {L('cilj', 'goal')} {Math.round(mesecCiljUre)} h · {mesecOstaneMinut >= 0
            ? L(`ostane ${izpisMinut(mesecOstaneMinut)}`, `${izpisMinut(mesecOstaneMinut)} remaining`)
            : L(`+${izpisMinut(-mesecOstaneMinut)} viška`, `+${izpisMinut(-mesecOstaneMinut)} over`)}
        </span>
      </div>
    </section>

    <section className={styles.history}>
      {omejeno
        ? <header><div><p>{L('03 · DANES', '03 · TODAY')}</p><h2>{L('Kaj si danes izmerila.', 'What you tracked today.')}</h2></div><span>{duration(dnevnaVsota)} {L('danes', 'today')}</span></header>
        : <header><div><p>{L('03 · ZASEBNI DNEVNIK', '03 · PRIVATE LOG')}</p><h2>{L('Izkušnje, ki izboljšajo naslednjo ceno.', 'Lessons that improve your next price.')}</h2></div><span>{duration(trackedMinutes)} {L('skupaj', 'total')}</span></header>}

      {/* iskanje + preklop pogleda: "po dnevih" med delom, "po projektih" ko te
          nekdo cez pol leta vpraša, koliko ur je šlo v dolocen projekt */}
      {!omejeno && !!entries.length && <div className={styles.dnevnikVrh}>
        <span className={styles.isciOvoj}>
          <svg className={styles.isciIkona} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="search" value={iskanje} onChange={e => setIskanje(e.target.value)}
            placeholder={L('Išči projekt ali storitev…', 'Search project or service…')} aria-label={L('Išči po dnevniku', 'Search the log')} className={styles.isci} />
        </span>
        <div className={styles.preklop} role="group" aria-label={L('Pogled dnevnika', 'Log view')}>
          <button type="button" data-izbran={dnevnikPogled === 'dnevi'} onClick={() => setDnevnikPogled('dnevi')}>{L('Po dnevih', 'By day')}</button>
          <button type="button" data-izbran={dnevnikPogled === 'projekti'} onClick={() => setDnevnikPogled('projekti')}>{L('Po projektih', 'By project')}</button>
        </div>
        {/* na telefonu samo ikona — besedilo bi vrstico prelomilo */}
        <button type="button" className={styles.izvozGumb} onClick={izvozi} aria-label={L('Izvozi dnevnik', 'Export log')} title={L('Prenesi kot CSV za Excel ali Numbers', 'Download as CSV for Excel or Numbers')}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          <span>{L('Izvozi', 'Export')}</span>
        </button>
      </div>}

      {!!entries.length && !najdeni.length && <div className={styles.empty}>{L(`Za »${iskanje}« ni vnosov.`, `No entries for “${iskanje}”.`)}</div>}

      {!omejeno && dnevnikPogled === 'projekti' && poProjektih.map(p => {
        const odprt = razprti.includes(p.k);
        return <div key={p.k} className={styles.dan}>
          <div className={styles.projektGlava}>
            <button type="button" className={styles.projektIme} aria-expanded={odprt}
              onClick={() => setRazprti(v => odprt ? v.filter(x => x !== p.k) : [...v, p.k])}>
              <span className={styles.puscica} data-odprt={odprt} aria-hidden="true">›</span>
              <span>
                <strong>{p.ime}</strong>
                <small>{p.storitve.join(', ') || L('brez storitve', 'no service')} · {p.vnosi.length} {L(vnosiSklon(p.vnosi.length), p.vnosi.length === 1 ? 'entry' : 'entries')} ·{kratkiDatum(p.od)}{p.od.slice(0, 10) !== p.do.slice(0, 10) ? ` – ${kratkiDatum(p.do)}` : ''}</small>
              </span>
            </button>
            <span className={styles.projektUre}>
              <strong>{duration(p.minute)}</strong>
              <small>{p.urna ? `${money(p.urna)}/h` : L('brez vrednosti', 'no value')}</small>
            </span>
          </div>
          {/* razprto: po dnevih, vsak dan s svojo vsoto, znotraj posamezna merjenja */}
          {odprt && [...new Set(p.vnosi.map(x => x.startedAt.slice(0, 10)))].map(dan => {
            const dnevni = p.vnosi.filter(x => x.startedAt.slice(0, 10) === dan)
              .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
            return <div key={dan} className={styles.projektDan}>
              <div className={styles.projektDanGlava}>
                <span>{new Date(`${dan}T12:00:00`).toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                <b>{duration(dnevni.reduce((s, x) => s + x.durationMinutes, 0))}</b>
              </div>
              <ul className={styles.merjenja}>
                {dnevni.map(x => (
                  <li key={x.id}>
                    <span>{razpon(x) || L('brez ure', 'no time')}</span>
                    <b>{duration(x.durationMinutes)}</b>
                    <button type="button" onClick={() => odpriUrejanje(x)}>{L('Uredi', 'Edit')}</button>
                    <button type="button" onClick={() => { if (confirm(L(`Izbrišem merjenje ${razpon(x) || duration(x.durationMinutes)}?`, `Delete the entry ${razpon(x) || duration(x.durationMinutes)}?`))) remove(x.id); }} aria-label={L('Izbriši merjenje', 'Delete entry')}>×</button>
                  </li>
                ))}
              </ul>
            </div>;
          })}
        </div>;
      })}

      {(omejeno || dnevnikPogled === 'dnevi') && (!poDnevihPrikaz.length ? <div className={styles.empty}>{omejeno ? L('Danes še ni vnosov. Zaženi štoparico ali vpiši ure ročno.', 'No entries today yet. Start the timer or enter hours manually.') : L('Po prvem zaključenem merjenju boš tukaj videla dejansko urno vrednost projekta.', 'After your first completed entry you will see the project’s actual hourly value here.')}</div> : poDnevihPrikaz.map(([dan, dnevni]) => (
        <div key={dan} className={styles.dan}>
          {/* dnevni naslov s sestevkom — pregled po dnevih */}
          <div className={styles.danGlava}>
            <strong>{new Date(`${dan}T12:00:00`).toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
            <span>{duration(dnevni.reduce((s, x) => s + x.durationMinutes, 0))}</span>
          </div>
          {zdruziPoProjektu(dnevni).map(g => {
            const urna = g.minute ? g.znesek / (g.minute / 60) : 0;
            const zadnji = g.zaporedje[g.zaporedje.length - 1];
            const prvi = g.zaporedje[0];
            const dnevniRazpon = razpon(prvi) || razpon(zadnji)
              ? `${ura(prvi.startedAt)} – ${ura(zadnji.endedAt || zadnji.startedAt)}` : '';
            return <article key={g.kljuc}>
              <div>
                <strong>{g.zadnji.projectName}</strong>
                <span>{g.storitve.join(', ') || L('Brez storitve', 'No service')}{dnevniRazpon && ` · ${dnevniRazpon}`}</span>
                {/* vsako merjenje posebej — ce si ta dan merila veckrat */}
                {g.zaporedje.length > 1 && <ul className={styles.merjenja}>
                  {g.zaporedje.map(x => (
                    <li key={x.id}>
                      <span>{razpon(x) || L('brez ure', 'no time')}</span>
                      <b>{duration(x.durationMinutes)}</b>
                      <button type="button" onClick={() => odpriUrejanje(x)}>{L('Uredi', 'Edit')}</button>
                      <button type="button" onClick={() => { if (confirm(L(`Izbrišem merjenje ${razpon(x) || duration(x.durationMinutes)}?`, `Delete the entry ${razpon(x) || duration(x.durationMinutes)}?`))) remove(x.id); }} aria-label={L('Izbriši merjenje', 'Delete entry')}>×</button>
                    </li>
                  ))}
                </ul>}
                {g.zaporedje.map(x => x.note).filter(Boolean).map((n, i) => <small key={i} className={styles.opomba}>{n}</small>)}
              </div>
              <b>{duration(g.minute)}</b>
              <b>{urna ? `${money(urna)}/h` : L('brez vrednosti', 'no value')}</b>
              <em data-extra={g.dodatno}>{g.dodatno ? L('Dodatno delo', 'Extra work') : L('Vključeno', 'Included')}</em>
              <div className={styles.akcije}>
                <button type="button" className={styles.vrsticaGumb} data-glavni onClick={() => nadaljuj(g.zadnji)} disabled={!!running || !!pending} title={running || pending ? L('Najprej zaključi tekoče merjenje', 'Finish the current entry first') : L('Začni novo merjenje na tem projektu', 'Start a new entry on this project')}>{L('Nadaljuj', 'Continue')}</button>
                {g.zaporedje.length === 1 && <>
                  <button type="button" className={styles.vrsticaGumb} onClick={() => odpriUrejanje(g.zadnji)}>{L('Uredi', 'Edit')}</button>
                  <button type="button" className={styles.izbrisi} onClick={() => { if (confirm(L(`Izbrišem vnos »${g.zadnji.projectName}«?`, `Delete the entry “${g.zadnji.projectName}”?`))) remove(g.zadnji.id); }} aria-label={L(`Izbriši ${g.zadnji.projectName}`, `Delete ${g.zadnji.projectName}`)} title={L('Izbriši vnos', 'Delete entry')}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 4h4M9 7v12M15 7v12M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg></button>
                </>}
              </div>
            </article>;
          })}
        </div>
      )))}
    </section>

    {/* Plavajoča štoparica — v portal na <body>, ker se position:fixed sicer meri
        glede na prednika s transformom in bi pas pristal sredi strani. */}
    {running && !kartaVidna && createPortal(
      <div className={`${styles.tecePas} ${styles.tecePasPlava}`}>
        <span className={styles.tecePika} aria-hidden="true" />
        <strong>{running.projectName}</strong>
        <b>{String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor(elapsed / 60) % 60).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</b>
        <button type="button" className={styles.skrijGumb} onClick={() => document.getElementById('timer')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>{L('Na vrh', 'To top')}</button>
        <button type="button" className={styles.skrijGumb} data-glavni onClick={stop}>{L('Ustavi', 'Stop')}</button>
      </div>,
      document.body,
    )}
  </div>;
}
