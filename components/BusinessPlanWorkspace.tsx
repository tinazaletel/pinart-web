'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  calculatePlan, DEFAULT_BUSINESS_PLAN, deleteCloudTimeEntry, loadCloudBusinessPlan,
  loadCloudTimeEntries, loadLocalPlan, loadLocalTimeEntries, type BusinessPlan,
  type PrivateTimeEntry, saveCloudBusinessPlan, saveCloudTimeEntry, saveLocalPlan,
  saveLocalTimeEntries,
} from '@/lib/pinartPlanning';
import { saveBusinessGoal, saveCloudSettings } from '@/lib/pinartFlowCloud';
import styles from './BusinessPlanWorkspace.module.css';

const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 0 })} €`;
const duration = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
/* slovenska dvojina: 1 vnos, 2 vnosa, 3-4 vnosi, 5+ vnosov (velja tudi za 101, 102 ...) */
const vnosiSklon = (n: number) => { const d = n % 100; return d === 1 ? 'vnos' : d === 2 ? 'vnosa' : d === 3 || d === 4 ? 'vnosi' : 'vnosov'; };

/**
 * Isti projekt na isti dan = ena vrstica. Različni projekti na isti dan ostanejo
 * ločeni. Brez tega ima en projekt dva gumba "Nadaljuj" na istem datumu in ni
 * jasno, kateremu se ure prištejejo.
 *
 * Ure, vrednost in opombe se seštejejo, začetek je najzgodnejši, konec najpoznejši.
 * Nič se ne izgubi.
 */
function poenotiDvojnike(list: PrivateTimeEntry[]): PrivateTimeEntry[] {
  const m = new Map<string, PrivateTimeEntry>();
  for (const x of list) {
    const kljuc = `${x.startedAt.slice(0, 10)}|${x.projectName.trim().toLowerCase()}`;
    const prej = m.get(kljuc);
    if (!prej) { m.set(kljuc, { ...x }); continue; }
    const storitve = [...new Set([prej.serviceName, x.serviceName].map(s => s?.trim()).filter(Boolean))];
    m.set(kljuc, {
      ...prej,
      startedAt: prej.startedAt <= x.startedAt ? prej.startedAt : x.startedAt,
      endedAt: [prej.endedAt, x.endedAt].filter(Boolean).sort().pop() || prej.endedAt,
      durationMinutes: prej.durationMinutes + x.durationMinutes,
      amount: prej.amount + x.amount,
      serviceName: storitve.join(', '),
      note: [prej.note, x.note].filter(Boolean).join(' · ') || undefined,
      /* "dodatno delo" prevlada: če je bil del dela izven dogovora, to velja za vrstico */
      scopeStatus: prej.scopeStatus === 'extra' || x.scopeStatus === 'extra' ? 'extra' : 'included',
    });
  }
  return [...m.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
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
    setPlan(localPlan); setEntries(poenotiDvojnike(localEntries));
    void Promise.all([loadCloudBusinessPlan(), loadCloudTimeEntries()]).then(([cloudPlan, cloudEntries]) => {
      if (cloudPlan) { setPlan(cloudPlan); saveLocalPlan(cloudPlan); }
      if (!cloudEntries.length) return;
      /* stari podvojeni vnosi (isti projekt, isti dan) se zlijejo v enega —
         ena vrstica, en gumb "Nadaljuj". Zapisemo nazaj, da se ne ponavlja. */
      const poenoteni = poenotiDvojnike(cloudEntries);
      setEntries(poenoteni); saveLocalTimeEntries(poenoteni);
      if (poenoteni.length < cloudEntries.length) {
        setNotice(`Združila sem ${cloudEntries.length - poenoteni.length} podvojenih vnosov istega projekta na isti dan.`);
        poenoteni.forEach(x => void saveCloudTimeEntry(x).catch(() => undefined));
        cloudEntries.filter(x => !poenoteni.some(p => p.id === x.id))
          .forEach(x => void deleteCloudTimeEntry(x.id).catch(() => undefined));
      }
    }).catch(() => undefined).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(running.startedAt).getTime()) / 1000)));
    tick(); timerRef.current = window.setInterval(tick, 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [running]);

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
    setRunning({ id: crypto.randomUUID(), projectName, serviceName: String(data.get('service')).trim(), startedAt: new Date().toISOString(), durationMinutes: 0, amount: Number(data.get('amount')) || 0, scopeStatus: data.get('scope') === 'extra' ? 'extra' : 'included' });
    event.currentTarget.reset();
  };

  const stop = () => {
    if (!running) return;
    const minute = Math.max(1, Math.round(elapsed / 60));
    const finished = { ...running, endedAt: new Date().toISOString(), durationMinutes: minute };
    /* vrednost dela naj bo ze predlagana, ko se odpre potrditev */
    pripraviVnos(finished.startedAt.slice(0, 10), Math.floor(minute / 60), minute % 60, running.amount);
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
    /* Minute se PRISTEJEJO obstojecemu vnosu (ne nov zapis), ce si stetje
       nadaljevala — ali ce si isti projekt danes ze merila. Trikrat pritisnjen
       "Začni meriti" tako da eno vrstico: 03:00 – 04:30, 1 h 30 min. */
    const danes = new Date().toISOString().slice(0, 10);
    const istiDanes = entries.find(x =>
      x.startedAt.slice(0, 10) === danes
      && x.projectName.trim().toLowerCase() === finished.projectName.trim().toLowerCase());
    const ciljId = nadaljujeId || istiDanes?.id;
    if (ciljId) {
      const next = entries.map(x => (x.id === ciljId
        ? {
          ...x,
          durationMinutes: x.durationMinutes + finished.durationMinutes,
          amount: x.amount + finished.amount,
          endedAt: finished.endedAt,
          note: [x.note, finished.note].filter(Boolean).join(' · ') || undefined,
        }
        : x));
      setEntries(next); saveLocalTimeEntries(next);
      const posodobljen = next.find(x => x.id === ciljId);
      if (posodobljen) void saveCloudTimeEntry(posodobljen).catch(() => undefined);
      setNadaljujeId(null); setPending(null);
      setNotice(`Prišteto ${duration(finished.durationMinutes)} k vnosu »${finished.projectName}« — skupaj ${duration(posodobljen?.durationMinutes || 0)}.`);
      return;
    }
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

  /* obrazec vedno odpremo s cistimi polji, sicer se prenese znesek prejsnjega vnosa */
  const pripraviVnos = (dan: string, ure: number, min: number, znesek: number) => {
    setDanVnos(dan); setUreVnos(String(ure)); setMinVnos(String(min));
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
    setRunning({ ...item, startedAt: new Date().toISOString(), durationMinutes: 0 });
    setElapsed(0);
  };

  /* Zacetek: ce je vpisana ura, jo uporabimo (potem se v dnevniku izpise
     "03:00 – 04:30"); brez nje ostane poldne, da premik casovnega pasu vnosa
     ne prestavi na sosednji dan. */
  const zacetek = (dan: string, od: string) =>
    (/^\d{2}:\d{2}$/.test(od) ? new Date(`${dan}T${od}:00`).toISOString() : obDnevu(dan));
  const konec = (zacetekIso: string, minute: number, imaUro: boolean) =>
    (imaUro ? new Date(new Date(zacetekIso).getTime() + minute * 60_000).toISOString() : zacetekIso);

  const dodajRocno = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    const projectName = String(d.get('project')).trim(); if (!projectName) return;
    const dan = String(d.get('dan') || danesISO());
    const od = String(d.get('od') || '');
    const minute = vMinute(d.get('ure'), d.get('min'));
    const cas = zacetek(dan, od);
    const zapis: PrivateTimeEntry = {
      id: crypto.randomUUID(), projectName, serviceName: String(d.get('service')).trim(),
      startedAt: cas, endedAt: konec(cas, minute, !!od), durationMinutes: minute,
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
    const minute = vMinute(d.get('ure'), d.get('min'));
    const cas = zacetek(dan, od);
    const posodobljen: PrivateTimeEntry = {
      ...urejam,
      projectName: String(d.get('project')).trim() || urejam.projectName,
      serviceName: String(d.get('service')).trim(),
      /* prej je urejanje pobrisalo uro zacetka — zdaj se ohrani oz. jo popraviš */
      startedAt: cas, endedAt: konec(cas, minute, !!od),
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

  /* ena vrstica dnevnika — deljena med obema pogledoma, da se gumbi in
     oblika ne razideta, ko se kaj popravi samo na enem mestu */
  const vrstica = (item: PrivateTimeEntry) => {
    const rate = item.durationMinutes ? item.amount / (item.durationMinutes / 60) : 0;
    return <article key={item.id}><div><strong>{item.projectName}</strong><span>{item.serviceName || 'Brez storitve'} · {new Date(item.startedAt).toLocaleDateString('sl-SI')}{razpon(item) && ` · ${razpon(item)}`}</span>{item.note && <small className={styles.opomba}>{item.note}</small>}</div><b>{duration(item.durationMinutes)}</b><b>{rate ? `${money(rate)}/h` : 'brez vrednosti'}</b><em data-extra={item.scopeStatus === 'extra'}>{item.scopeStatus === 'extra' ? 'Dodatno delo' : 'Vključeno'}</em>
      {/* gumbi v SVOJI celici — prej so vsi trije padli v isto celico mreze in se prekrivali,
          zaradi cesar je tap na "Nadaljuj" zadel brisanje pod njim */}
      <div className={styles.akcije}>
        <button type="button" className={styles.vrsticaGumb} data-glavni onClick={() => nadaljuj(item)} disabled={!!running || !!pending} title={running || pending ? 'Najprej zaključi tekoče merjenje' : 'Nadaljuj štetje na tem vnosu'}>Nadaljuj</button>
        <button type="button" className={styles.vrsticaGumb} onClick={() => { setUrejam(item); setRocniOdprt(false); pripraviVnos(item.startedAt.slice(0, 10), Math.floor(item.durationMinutes / 60), item.durationMinutes % 60, item.amount); }}>Uredi</button>
        <button type="button" className={styles.izbrisi} onClick={() => { if (confirm(`Izbrišem vnos »${item.projectName}«?`)) remove(item.id); }} aria-label={`Izbriši ${item.projectName}`} title="Izbriši vnos"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 4h4M9 7v12M15 7v12M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg></button>
      </div></article>;
  };

  if (!ready) return <p className={styles.loading}>Pripravljam poslovni načrt …</p>;

  return <div className={`${styles.page} ${view === 'time' ? styles.casPogled : ''}`}>
    {notice && <div className={styles.notice} role="status">{notice}<button onClick={() => setNotice('')} aria-label="Zapri">×</button></div>}

    <section className={styles.summary}>
      <article><small>Mesečni cilj</small><strong>{money(result.monthlyRevenueTarget)}</strong><span>iz poslovnega načrta</span></article>
      <article><small>Vzdržna urna vrednost</small><strong>{money(result.sustainableHourlyRate)}</strong><span>pri {plan.billableHoursMonthly} obračunskih urah</span></article>
      <article><small>Potrebni projekti</small><strong>{result.projectsNeeded}</strong><span>pri povprečju {money(plan.averageProjectValue)}</span></article>
      <article><small>Dejanska urna vrednost</small><strong>{effectiveRate ? money(effectiveRate) : '—'}</strong><span>iz zaključenih časovnih vnosov</span></article>
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

      <section className={styles.timer} id="timer">
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
        </form> : running ? <div className={styles.running}>
          <span><small>TEČE ZDAJ</small><strong>{running.projectName}</strong><em>{running.serviceName || 'Brez oznake storitve'}</em></span>
          <b>{String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor(elapsed / 60) % 60).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</b>
          <button onClick={stop}>Ustavi in shrani</button>
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
            <label><span>Ura začetka <small>ni obvezno</small></span><input name="od" type="time" step="300" /></label>
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
            <label><span>Ura začetka <small>ni obvezno</small></span><input name="od" type="time" step="300" defaultValue={razpon(urejam) ? ura(urejam.startedAt) : ''} /></label>
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
          {odprt && p.vnosi.map(item => vrstica(item))}
        </div>;
      })}

      {dnevnikPogled === 'dnevi' && (!entries.length ? <div className={styles.empty}>Po prvem zaključenem merjenju boš tukaj videla dejansko urno vrednost projekta.</div> : poDnevih.map(([dan, dnevni]) => (
        <div key={dan} className={styles.dan}>
          {/* dnevni naslov s sestevkom — pregled po dnevih */}
          <div className={styles.danGlava}>
            <strong>{new Date(`${dan}T12:00:00`).toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
            <span>{duration(dnevni.reduce((s, x) => s + x.durationMinutes, 0))}</span>
          </div>
          {dnevni.map(item => vrstica(item))}
        </div>
      )))}
    </section>
  </div>;
}
