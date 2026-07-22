'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  calculatePlan, DEFAULT_BUSINESS_PLAN, deleteCloudTimeEntry, loadCloudBusinessPlan,
  loadCloudTimeEntries, loadLocalPlan, loadLocalTimeEntries, type BusinessPlan,
  type PrivateTimeEntry, saveCloudBusinessPlan, saveCloudTimeEntry, saveLocalPlan,
  saveLocalTimeEntries,
} from '@/lib/pinartPlanning';
import { saveBusinessGoal, saveCloudSettings } from '@/lib/pinartFlowCloud';
import { preklopiPavzo, useTekoceMerjenje, zapisiMerjenje } from '@/lib/tekoceMerjenje';
import MetricIcon from './MetricIcon';
import TimerValovi from './TimerValovi';
import styles from './BusinessPlanWorkspace.module.css';

const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 0 })} €`;
const duration = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
/* slovenska dvojina: 1 vnos, 2 vnosa, 3-4 vnosi, 5+ vnosov (velja tudi za 101, 102 ...) */
const vnosiSklon = (n: number) => { const d = n % 100; return d === 1 ? 'vnos' : d === 2 ? 'vnosa' : d === 3 || d === 4 ? 'vnosi' : 'vnosov'; };

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

export default function BusinessPlanWorkspace({ view = 'all' }: { view?: 'all' | 'time' }) {
  const [plan, setPlan] = useState<BusinessPlan>(DEFAULT_BUSINESS_PLAN);
  const [entries, setEntries] = useState<PrivateTimeEntry[]>([]);
  const [running, setRunning] = useState<PrivateTimeEntry | null>(null);
  const [pending, setPending] = useState<PrivateTimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const localPlan = loadLocalPlan();
    const localEntries = loadLocalTimeEntries();
    setPlan(localPlan); setEntries(localEntries);
    void Promise.all([loadCloudBusinessPlan(), loadCloudTimeEntries()]).then(([cloudPlan, cloudEntries]) => {
      if (cloudPlan) { setPlan(cloudPlan); saveLocalPlan(cloudPlan); }
      if (cloudEntries.length) { setEntries(cloudEntries); saveLocalTimeEntries(cloudEntries); }
    }).catch(() => undefined).finally(() => setReady(true));
  }, []);

  /* Cas bere skupna shramba (lib/tekoceMerjenje), da pavza velja tudi tu in da
     se merjenje ne izgubi ob osvezitvi strani. */
  const { merjenje, sekunde: sekundeShrambe } = useTekoceMerjenje();
  useEffect(() => { if (running) setElapsed(sekundeShrambe); }, [running, sekundeShrambe]);

  /* Po osvezitvi strani je bilo merjenje prej izgubljeno — obnovimo ga iz shrambe.
     Ce je bila ustavitev zahtevana iz bliznjice v glavi, jo izvedemo tukaj, ker
     je treba vnos se potrditi. */
  const obnovljeno = useRef(false);
  useEffect(() => {
    if (!merjenje || running || pending || obnovljeno.current) return;
    obnovljeno.current = true;
    setRunning({
      id: crypto.randomUUID(), projectName: merjenje.projectName,
      serviceName: merjenje.serviceName || '',
      startedAt: merjenje.zacetekPrvic || merjenje.startedAt,
      durationMinutes: 0, amount: 0, scopeStatus: 'included',
    });
  }, [merjenje, running, pending]);

  const result = useMemo(() => calculatePlan(plan), [plan]);
  const completed = entries.filter(item => item.endedAt && item.durationMinutes > 0);
  const trackedMinutes = completed.reduce((sum, item) => sum + item.durationMinutes, 0);
  const trackedRevenue = completed.reduce((sum, item) => sum + item.amount, 0);
  const effectiveRate = trackedMinutes ? trackedRevenue / (trackedMinutes / 60) : 0;

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
    setNotice('Poslovni načrt in mesečni cilj sta shranjena.');
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
    setPending(null); setNotice('Časovni vnos je shranjen samo v tvojem računu.');
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
      <span>Dan</span>
      <span className={styles.danVrstica}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <input name={ime} type="date" max={new Date().toISOString().slice(0, 10)}
          value={danVnos || privzeto} onChange={e => setDanVnos(e.target.value)} />
      </span>
      <small>{new Date(`${danVnos || privzeto}T12:00:00`).toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small>
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
      <label><span>Od</span><input name="od" type="time" step="300" value={odVnos} onChange={e => setOdVnos(e.target.value)} /></label>
      <label><span>Do</span><input name="do" type="time" step="300" value={doVnos} onChange={e => setDoVnos(e.target.value)} /></label>
      <p className={styles.trajanje}>
        {minute
          ? <><strong>{duration(minute)}</strong>{cezPolnoc && <span> · konec je naslednji dan</span>}</>
          : <span>Vpiši uro od in do, pa ti trajanje izračunam. Če ne veš ur, ju pusti prazni in vpiši trajanje spodaj.</span>}
      </p>
    </>;
  };

  /* Vrednost dela: predlagana iz ur x tvoje urne vrednosti, a jo lahko povoziš. */
  const poljeZnesek = () => (
    <label>
      <span>Vrednost tega dela</span>
      <input name="amount" type="number" min="0" step="10" placeholder="0"
        value={znesekVnos} onChange={e => { setZnesekRocno(true); setZnesekVnos(e.target.value); }} />
      <small>
        {znesekRocno
          ? <button type="button" className={styles.linkGumb} onClick={() => setZnesekRocno(false)}>Izračunaj po {money(urnaVrednost)}/h</button>
          : `izračunano po tvoji urni vrednosti ${money(urnaVrednost)}/h`}
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
    setRocniOdprt(false); setNotice('Ure so dodane v dnevnik.');
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
    setUrejam(null); setNotice('Vnos je posodobljen.');
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

  const kratkiDatum = (iso: string) => new Date(iso).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric', year: '2-digit' });
  const ura = (iso: string) => new Date(iso).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
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

  if (!ready) return <p className={styles.loading}>Pripravljam poslovni načrt …</p>;

  return <div className={`${styles.page} ${view === 'time' ? styles.casPogled : ''}`}>
    {notice && <div className={styles.notice} role="status">{notice}<button onClick={() => setNotice('')} aria-label="Zapri">×</button></div>}

    <section className={styles.summary}>
      {/* ikone v istem slogu kot na Stroških in Računih: velika mehka ikona v kotu */}
      <article><small>Mesečni cilj</small><strong>{money(result.monthlyRevenueTarget)}</strong><span>iz poslovnega načrta</span><b className={styles.metricIkona}><MetricIcon type="cilj" /></b></article>
      <article><small>Vzdržna urna vrednost</small><strong>{money(result.sustainableHourlyRate)}</strong><span>pri {plan.billableHoursMonthly} obračunskih urah</span><b className={styles.metricIkona}><MetricIcon type="ura" /></b></article>
      <article><small>Potrebni projekti</small><strong>{result.projectsNeeded}</strong><span>pri povprečju {money(plan.averageProjectValue)}</span><b className={styles.metricIkona}><MetricIcon type="projekti" /></b></article>
      <article><small>Dejanska urna vrednost</small><strong>{effectiveRate ? money(effectiveRate) : '—'}</strong><span>iz zaključenih časovnih vnosov</span><b className={styles.metricIkona}><MetricIcon type="graf" /></b></article>
    </section>

    <div className={`${styles.layout} ${view === 'time' ? styles.timeOnly : ''}`}>
      {view === 'all' && <form className={styles.plan} onSubmit={savePlan}>
        <header><p>01 · POSLOVNI NAČRT</p><h2>Najprej določi, kaj mora podjetje omogočiti.</h2><span>Načrt postane osnova za mesečne in letne cilje.</span></header>
        <div className={styles.fields}>
          <label><span>Želeni mesečni dohodek</span><input type="number" min="0" step="100" value={plan.desiredMonthlyIncome} onChange={e => update('desiredMonthlyIncome', e.target.value)} /></label>
          <label><span>Fiksni mesečni stroški</span><input type="number" min="0" step="50" value={plan.fixedMonthlyCosts} onChange={e => update('fixedMonthlyCosts', e.target.value)} /></label>
          <label><span>Rezerva za davke</span><input type="number" min="0" max="70" value={plan.taxReservePercent} onChange={e => update('taxReservePercent', e.target.value)} /><small>%</small></label>
          <label><span>Varnostna rezerva</span><input type="number" min="0" max="40" value={plan.safetyReservePercent} onChange={e => update('safetyReservePercent', e.target.value)} /><small>%</small></label>
          <label><span>Obračunske ure na mesec</span><input type="number" min="1" max="250" value={plan.billableHoursMonthly} onChange={e => update('billableHoursMonthly', e.target.value)} /></label>
          <label><span>Povprečna vrednost projekta</span><input type="number" min="0" step="100" value={plan.averageProjectValue} onChange={e => update('averageProjectValue', e.target.value)} /></label>
        </div>
        <label className={styles.notes}><span>Opombe in poslovne omejitve</span><textarea value={plan.notes} onChange={e => update('notes', e.target.value)} placeholder="Kaj želiš delati, česa ne sprejemaš, koliko časa želiš imeti zase …" /></label>
        <button type="submit">Shrani načrt in posodobi cilje</button>
      </form>}

      <section className={styles.timer} id="timer" ref={timerRef2}>
        <header><p>{view === 'time' ? '01' : '02'} · CENA & ČAS</p><h2>Ali se ti je delo po tej ceni splačalo?</h2><span>Timer je zaseben. Ne beleži zaslona, aktivnosti, aplikacij ali lokacije.</span></header>
        {pending ? <form className={styles.timerForm} onSubmit={confirmTime}>
          <div className={styles.reviewTitle}><strong>Preglej zaključeni vnos</strong><span>{pending.projectName} · {pending.serviceName || 'brez oznake storitve'}</span></div>
          <label><span>Ure</span><input name="ure" type="number" min="0" step="1" value={ureVnos} onChange={e => setUreVnos(e.target.value)} /></label>
          <label><span>Minute</span><input name="min" type="number" min="0" max="59" step="1" value={minVnos} onChange={e => setMinVnos(e.target.value)} /></label>
          {poljeZnesek()}
          <label><span>Obseg</span><select name="scope" defaultValue={pending.scopeStatus}><option value="included">Vključeno v dogovor</option><option value="extra">Dodatno delo</option></select></label>
          <label><span>Zakaj je delo odstopalo od načrta?</span><select name="reason"><option value="">Ni odstopanja</option><option>Zahtevnejše od pričakovanega</option><option>Preveč popravkov</option><option>Nejasen brief</option><option>Dodatne zahteve</option><option>Veliko komunikacije</option><option>Administracija</option><option>Novo področje ali učenje</option><option>Ta vrsta dela mi ne ustreza</option></select></label>
          <label><span>Zasebna opomba</span><input name="note" placeholder="Kaj boš naslednjič spremenila pri ceni ali obsegu?" /></label>
          <button type="submit">Potrdi zasebni vnos</button>
        </form> : running && timerSkrit ? <div className={styles.tecePas}>
          {/* skrito: merjenje NE stoji, samo ne zavzema pol zaslona */}
          <span className={styles.tecePika} aria-hidden="true" />
          <strong>{running.projectName}</strong>
          <b>{String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor(elapsed / 60) % 60).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</b>
          <button type="button" className={styles.skrijGumb} onClick={() => setTimerSkrit(false)}>Pokaži</button>
          <button type="button" className={styles.skrijGumb} data-glavni onClick={stop}>Ustavi</button>
        </div> : running ? <div className={styles.running}>
          <TimerValovi className={styles.valovi} />
          <span><small>TEČE ZDAJ</small><strong>{running.projectName}</strong><em>{running.serviceName || 'Brez oznake storitve'}</em></span>
          {/* ura + "skrij" v isti vrstici: ko delaš, ti velika števka pred očmi moti */}
          <div className={styles.uraVrstica}>
            <b>{String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor(elapsed / 60) % 60).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</b>
            {/* samo oko — merjenje tece naprej, skrije se le prikaz */}
            <button type="button" className={styles.okoGumb} onClick={() => setTimerSkrit(true)}
              aria-label="Skrij štoparico" title="Skrij prikaz — merjenje teče naprej">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.6" /><path d="m4 20 16-16" />
              </svg>
            </button>
          </div>
          {/* pavza ob glavnem gumbu, ne ob uri */}
          <div className={styles.glavnaVrsta}>
            <button type="button" onClick={stop}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.4" /></svg>
              Ustavi in shrani
            </button>
            <button type="button" className={styles.pavzaGumb} onClick={preklopiPavzo}
              aria-label={merjenje?.pavza ? 'Nadaljuj merjenje' : 'Pavza'}
              title={merjenje?.pavza ? 'Nadaljuj' : 'Pavza'}>
              {merjenje?.pavza
                ? <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
                : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><rect x="7" y="5.5" width="3.6" height="13" rx="1.1" /><rect x="13.4" y="5.5" width="3.6" height="13" rx="1.1" /></svg>}
            </button>
          </div>
        </div> : <form className={styles.timerForm} onSubmit={start}>
          <label><span>Projekt ali stranka</span><input name="project" required placeholder="npr. Nova identiteta" /></label>
          <label><span>Storitev</span><input name="service" placeholder="npr. oblikovanje logotipa" /></label>
          <label><span>Vrednost tega dela</span><input name="amount" type="number" min="0" step="10" placeholder="Določiš lahko tudi ob zaključku" /></label>
          <label><span>Obseg</span><select name="scope"><option value="included">Vključeno v dogovor</option><option value="extra">Dodatno delo</option></select></label>
          <button type="submit">Začni meriti</button>
          {/* ure, ki si jih zapisala drugam — dodaj jih na poljuben (tudi pretekli) dan.
              Naslov je besedilo, gumb ostane kratek (prej je bil cel stavek na gumbu). */}
          <div className={styles.rocniVrstica}>
            <span>Nisi merila?</span>
            <button type="button" className={styles.rocniGumb} onClick={() => { setRocniOdprt(v => !v); pripraviVnos(danesISO(), 1, 0, 0); }}>
              {rocniOdprt ? 'Prekliči' : 'Vpiši ročno'}
            </button>
          </div>
        </form>}

        {rocniOdprt && !running && !pending && (
          <form className={styles.timerForm} onSubmit={dodajRocno}>
            <div className={styles.reviewTitle}><strong>Vpiši ure za nazaj</strong><span>Za dan, ko si delala, a nisi merila.</span></div>
            {poljeDan('dan', danesISO())}
            {poljeOdDo()}
            <label><span>Projekt ali stranka</span><input name="project" required placeholder="npr. Nova identiteta" /></label>
            <label><span>Storitev</span><input name="service" placeholder="npr. oblikovanje logotipa" /></label>
            <label><span>Ure</span><input name="ure" type="number" min="0" step="1" value={ureVnos} onChange={e => setUreVnos(e.target.value)} /></label>
            <label><span>Minute</span><input name="min" type="number" min="0" max="59" step="5" value={minVnos} onChange={e => setMinVnos(e.target.value)} /></label>
            {poljeZnesek()}
            <label><span>Obseg</span><select name="scope"><option value="included">Vključeno v dogovor</option><option value="extra">Dodatno delo</option></select></label>
            <label className={styles.notes}><span>Kaj si delala? <small>ni obvezno</small></span><textarea name="note" rows={2} placeholder="npr. tri različice logotipa, sestanek s stranko …" /></label>
            <button type="submit">Dodaj v dnevnik</button>
          </form>
        )}

        {urejam && (
          <form className={styles.timerForm} onSubmit={shraniUrejanje}>
            <div className={styles.reviewTitle}><strong>Uredi vnos</strong><span>{urejam.projectName}</span></div>
            {poljeDan('dan', urejam.startedAt.slice(0, 10))}
            {poljeOdDo()}
            <label><span>Projekt ali stranka</span><input name="project" defaultValue={urejam.projectName} /></label>
            <label><span>Storitev</span><input name="service" defaultValue={urejam.serviceName} /></label>
            <label><span>Ure</span><input name="ure" type="number" min="0" step="1" value={ureVnos} onChange={e => setUreVnos(e.target.value)} /></label>
            <label><span>Minute</span><input name="min" type="number" min="0" max="59" step="1" value={minVnos} onChange={e => setMinVnos(e.target.value)} /></label>
            {poljeZnesek()}
            <label><span>Obseg</span><select name="scope" defaultValue={urejam.scopeStatus}><option value="included">Vključeno v dogovor</option><option value="extra">Dodatno delo</option></select></label>
            <label className={styles.notes}><span>Kaj si delala? <small>ni obvezno</small></span><textarea name="note" rows={2} defaultValue={urejam.note || ''} placeholder="npr. tri različice logotipa, sestanek s stranko …" /></label>
            <button type="submit">Shrani spremembe</button>
            <button type="button" className={styles.linkGumb} onClick={() => setUrejam(null)}>Prekliči</button>
          </form>
        )}
        <div className={styles.ethics}><strong>Čas meri donosnost projekta, ne tvoje vrednosti.</strong><span>Vnosi ostanejo v tvojem računu in se ne delijo s strankami ali vodji.</span></div>
      </section>
    </div>

    <section className={styles.history}>
      <header><div><p>03 · ZASEBNI DNEVNIK</p><h2>Izkušnje, ki izboljšajo naslednjo ceno.</h2></div><span>{duration(trackedMinutes)} skupaj</span></header>

      {/* iskanje + preklop pogleda: "po dnevih" med delom, "po projektih" ko te
          nekdo cez pol leta vpraša, koliko ur je šlo v dolocen projekt */}
      {!!entries.length && <div className={styles.dnevnikVrh}>
        <input type="search" value={iskanje} onChange={e => setIskanje(e.target.value)}
          placeholder="Išči projekt ali storitev…" aria-label="Išči po dnevniku" className={styles.isci} />
        <div className={styles.preklop} role="group" aria-label="Pogled dnevnika">
          <button type="button" data-izbran={dnevnikPogled === 'dnevi'} onClick={() => setDnevnikPogled('dnevi')}>Po dnevih</button>
          <button type="button" data-izbran={dnevnikPogled === 'projekti'} onClick={() => setDnevnikPogled('projekti')}>Po projektih</button>
        </div>
        {/* na telefonu samo ikona — besedilo bi vrstico prelomilo */}
        <button type="button" className={styles.izvozGumb} onClick={izvozi} aria-label="Izvozi dnevnik" title="Prenesi kot CSV za Excel ali Numbers">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          <span>Izvozi</span>
        </button>
      </div>}

      {!!entries.length && !najdeni.length && <div className={styles.empty}>Za »{iskanje}« ni vnosov.</div>}

      {dnevnikPogled === 'projekti' && poProjektih.map(p => {
        const odprt = razprti.includes(p.k);
        return <div key={p.k} className={styles.dan}>
          <div className={styles.projektGlava}>
            <button type="button" className={styles.projektIme} aria-expanded={odprt}
              onClick={() => setRazprti(v => odprt ? v.filter(x => x !== p.k) : [...v, p.k])}>
              <span className={styles.puscica} data-odprt={odprt} aria-hidden="true">›</span>
              <span>
                <strong>{p.ime}</strong>
                <small>{p.storitve.join(', ') || 'brez storitve'} · {p.vnosi.length} {vnosiSklon(p.vnosi.length)} ·{kratkiDatum(p.od)}{p.od.slice(0, 10) !== p.do.slice(0, 10) ? ` – ${kratkiDatum(p.do)}` : ''}</small>
              </span>
            </button>
            <span className={styles.projektUre}>
              <strong>{duration(p.minute)}</strong>
              <small>{p.urna ? `${money(p.urna)}/h` : 'brez vrednosti'}</small>
            </span>
          </div>
          {/* razprto: po dnevih, vsak dan s svojo vsoto, znotraj posamezna merjenja */}
          {odprt && [...new Set(p.vnosi.map(x => x.startedAt.slice(0, 10)))].map(dan => {
            const dnevni = p.vnosi.filter(x => x.startedAt.slice(0, 10) === dan)
              .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
            return <div key={dan} className={styles.projektDan}>
              <div className={styles.projektDanGlava}>
                <span>{new Date(`${dan}T12:00:00`).toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                <b>{duration(dnevni.reduce((s, x) => s + x.durationMinutes, 0))}</b>
              </div>
              <ul className={styles.merjenja}>
                {dnevni.map(x => (
                  <li key={x.id}>
                    <span>{razpon(x) || 'brez ure'}</span>
                    <b>{duration(x.durationMinutes)}</b>
                    <button type="button" onClick={() => odpriUrejanje(x)}>Uredi</button>
                    <button type="button" onClick={() => { if (confirm(`Izbrišem merjenje ${razpon(x) || duration(x.durationMinutes)}?`)) remove(x.id); }} aria-label="Izbriši merjenje">×</button>
                  </li>
                ))}
              </ul>
            </div>;
          })}
        </div>;
      })}

      {dnevnikPogled === 'dnevi' && (!entries.length ? <div className={styles.empty}>Po prvem zaključenem merjenju boš tukaj videla dejansko urno vrednost projekta.</div> : poDnevih.map(([dan, dnevni]) => (
        <div key={dan} className={styles.dan}>
          {/* dnevni naslov s sestevkom — pregled po dnevih */}
          <div className={styles.danGlava}>
            <strong>{new Date(`${dan}T12:00:00`).toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
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
                <span>{g.storitve.join(', ') || 'Brez storitve'}{dnevniRazpon && ` · ${dnevniRazpon}`}</span>
                {/* vsako merjenje posebej — ce si ta dan merila veckrat */}
                {g.zaporedje.length > 1 && <ul className={styles.merjenja}>
                  {g.zaporedje.map(x => (
                    <li key={x.id}>
                      <span>{razpon(x) || 'brez ure'}</span>
                      <b>{duration(x.durationMinutes)}</b>
                      <button type="button" onClick={() => odpriUrejanje(x)}>Uredi</button>
                      <button type="button" onClick={() => { if (confirm(`Izbrišem merjenje ${razpon(x) || duration(x.durationMinutes)}?`)) remove(x.id); }} aria-label="Izbriši merjenje">×</button>
                    </li>
                  ))}
                </ul>}
                {g.zaporedje.map(x => x.note).filter(Boolean).map((n, i) => <small key={i} className={styles.opomba}>{n}</small>)}
              </div>
              <b>{duration(g.minute)}</b>
              <b>{urna ? `${money(urna)}/h` : 'brez vrednosti'}</b>
              <em data-extra={g.dodatno}>{g.dodatno ? 'Dodatno delo' : 'Vključeno'}</em>
              <div className={styles.akcije}>
                <button type="button" className={styles.vrsticaGumb} data-glavni onClick={() => nadaljuj(g.zadnji)} disabled={!!running || !!pending} title={running || pending ? 'Najprej zaključi tekoče merjenje' : 'Začni novo merjenje na tem projektu'}>Nadaljuj</button>
                {g.zaporedje.length === 1 && <>
                  <button type="button" className={styles.vrsticaGumb} onClick={() => odpriUrejanje(g.zadnji)}>Uredi</button>
                  <button type="button" className={styles.izbrisi} onClick={() => { if (confirm(`Izbrišem vnos »${g.zadnji.projectName}«?`)) remove(g.zadnji.id); }} aria-label={`Izbriši ${g.zadnji.projectName}`} title="Izbriši vnos"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 4h4M9 7v12M15 7v12M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg></button>
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
        <button type="button" className={styles.skrijGumb} onClick={() => document.getElementById('timer')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Na vrh</button>
        <button type="button" className={styles.skrijGumb} data-glavni onClick={stop}>Ustavi</button>
      </div>,
      document.body,
    )}
  </div>;
}
