'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, type FlowExpense, type FlowInvoice } from '@/lib/pinartFlowStore';
import { saveBusinessGoal, saveCloudSettings } from '@/lib/pinartFlowCloud';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import {
  calculatePlan, DEFAULT_BUSINESS_PLAN, loadCloudBusinessPlan, loadCloudTimeEntries,
  loadLocalPlan, loadLocalTimeEntries, saveLocalPlan, saveLocalTimeEntries,
  type BusinessPlan, type PrivateTimeEntry,
} from '@/lib/pinartPlanning';
import MetricIcon from './MetricIcon';

type GoalSettings = { desiredIncome: number; reservePercent: number };
type RecurringCost = { ime: string; znesek: string };
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 0 })} €`;

export default function GoalsWorkspace({ base }: { base: string }) {
  const locale = useLocale();
  const L = (sl: string, en: string) => (locale === 'en' ? en : sl);
  const [goal, setGoal] = useState(5000);
  const [desiredIncome, setDesiredIncome] = useState(2000);
  const [reservePercent, setReservePercent] = useState(20);
  const [invoices, setInvoices] = useState<FlowInvoice[]>([]);
  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljenega zapisa pisal v pravo bazo. */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';

  const [expenses, setExpenses] = useState<FlowExpense[]>([]);
  const [recurring, setRecurring] = useState<RecurringCost[]>([]);
  const [saved, setSaved] = useState(false);

  /* Poslovni načrt + zasebni časovni vnosi — ista osnova kot na strani ČAS
     (BusinessPlanWorkspace), da sta »Mesečni cilj«, »Vzdržna urna vrednost«,
     »Potrebni projekti« in »Dejanska urna vrednost« IDENTIČNI na obeh straneh.
     Dnevnik ur je zaseben in NE gre skozi podatkiZaPredogled (glej lib/predogled.ts):
     demo/prazno ne sme izmišljati ur. */
  const [plan, setPlan] = useState<BusinessPlan>(DEFAULT_BUSINESS_PLAN);
  const [timeEntries, setTimeEntries] = useState<PrivateTimeEntry[]>([]);

  useEffect(() => {
    if (nacin === 'empty') {
      /* Nov uporabnik: brez pravih ciljev/stroskov iz localStorage — same privzete
         vrednosti in prazni seznami (kot da si se pravkar registriral). */
      setGoal(5000); setDesiredIncome(2000); setReservePercent(20);
      setInvoices([]); setExpenses([]); setRecurring([]);
      return;
    }
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    const settings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}');
    const goalSettings = JSON.parse(localStorage.getItem('pinart-dashboard-goal-settings') || '{}') as Partial<GoalSettings>;
    setGoal(Number(localStorage.getItem('pinart-dashboard-goal')) || 5000);
    setDesiredIncome(Number(goalSettings.desiredIncome) || 2000);
    setReservePercent(Number(goalSettings.reservePercent) || 20);
    setInvoices(flow.invoices);
    setExpenses(flow.expenses);
    setRecurring(Array.isArray(settings.stroski) ? settings.stroski : []);
  }, [nacin]);

  useEffect(() => {
    const localPlan = loadLocalPlan();
    const localEntries = loadLocalTimeEntries();
    setPlan(localPlan); setTimeEntries(localEntries);
    void Promise.all([loadCloudBusinessPlan(), loadCloudTimeEntries()]).then(([cloudPlan, cloudEntries]) => {
      if (cloudPlan) { setPlan(cloudPlan); saveLocalPlan(cloudPlan); }
      if (cloudEntries.length) { setTimeEntries(cloudEntries); saveLocalTimeEntries(cloudEntries); }
    }).catch(() => undefined);
  }, []);

  const plannedResult = useMemo(() => calculatePlan(plan), [plan]);
  const completedTime = timeEntries.filter(item => item.endedAt && item.durationMinutes > 0);
  const trackedTimeMinutes = completedTime.reduce((sum, item) => sum + item.durationMinutes, 0);
  const trackedTimeRevenue = completedTime.reduce((sum, item) => sum + item.amount, 0);
  const effectiveRate = trackedTimeMinutes ? trackedTimeRevenue / (trackedTimeMinutes / 60) : 0;

  const now = new Date();
  const currentMonth = (date: string) => { const value = new Date(`${date}T00:00:00`); return value.getMonth() === now.getMonth() && value.getFullYear() === now.getFullYear(); };
  const paid = invoices.filter(item => item.paid && currentMonth(item.date)).reduce((sum, item) => sum + item.amount, 0);
  const enteredCosts = expenses.filter(item => currentMonth(item.date)).reduce((sum, item) => sum + item.amount, 0);
  const recurringCosts = recurring.reduce((sum, item) => sum + (Number(item.znesek) || 0), 0);
  const costBase = enteredCosts + recurringCosts;
  const recommended = Math.ceil((costBase + desiredIncome) / Math.max(.05, 1 - reservePercent / 100) / 100) * 100;
  const progress = goal ? Math.min(100, Math.round(paid / goal * 100)) : 0;

  /* Krog se ob odprtju napolni, stevilka pa steje do konca. Brez animacije je
     100 % samo podatek; z njo je dosezek (Tina, 31. 8. 2026). Kdor ima izklopljeno
     gibanje, dobi koncno vrednost takoj. */
  const [prikazanProgress, setPrikazanProgress] = useState(0);
  const [prikazanZnesek, setPrikazanZnesek] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mirno = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (mirno || progress === 0) { setPrikazanProgress(progress); return; }
    const trajanje = 1100;
    let zacetek = 0;
    let zahteva = 0;
    const korak = (cas: number) => {
      if (!zacetek) zacetek = cas;
      const t = Math.min(1, (cas - zacetek) / trajanje);
      /* mehko iztekanje (easeOutCubic): hitro stece, nato se umiri */
      const e = 1 - Math.pow(1 - t, 3);
      setPrikazanProgress(Math.round(progress * e));
      if (t < 1) zahteva = window.requestAnimationFrame(korak);
    };
    zahteva = window.requestAnimationFrame(korak);
    return () => window.cancelAnimationFrame(zahteva);
  }, [progress]);

  /* Isto steje tudi glavni znesek: cifra zraste do cilja in se ustavi. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mirno = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (mirno || !goal) { setPrikazanZnesek(goal); return; }
    const trajanje = 1100;
    let zacetek = 0;
    let zahteva = 0;
    const korak = (cas: number) => {
      if (!zacetek) zacetek = cas;
      const t = Math.min(1, (cas - zacetek) / trajanje);
      const e = 1 - Math.pow(1 - t, 3);
      /* zaokrozeno na 10 €, da se stevilka ne trese po enicah */
      setPrikazanZnesek(Math.round(goal * e / 10) * 10);
      if (t < 1) zahteva = window.requestAnimationFrame(korak);
      else setPrikazanZnesek(goal);
    };
    zahteva = window.requestAnimationFrame(korak);
    return () => window.cancelAnimationFrame(zahteva);
  }, [goal]);
  const remaining = Math.max(0, goal - paid);

  const months = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const value = invoices.filter(item => { const itemDate = new Date(`${item.date}T00:00:00`); return item.paid && itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear(); }).reduce((sum, item) => sum + item.amount, 0);
    return { label: date.toLocaleDateString('sl-SI', { month: 'short' }), value };
  }), [invoices]);
  const chartMax = Math.max(goal, ...months.map(item => item.value), 1);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    localStorage.setItem('pinart-dashboard-goal', String(recommended));
    localStorage.setItem('pinart-dashboard-goal-settings', JSON.stringify({ desiredIncome, reservePercent }));
    void Promise.all([
      saveCloudSettings({ monthlyGoal: recommended, desiredIncome, reservePercent }),
      saveBusinessGoal(recommended, `Želeni dohodek ${desiredIncome} €, rezerva ${reservePercent}%`),
    ]);
    setGoal(recommended); setSaved(true); window.setTimeout(() => setSaved(false), 2500);
  };

  return <div className={styles.goalsPage}>
    {saved && <div className={styles.goalSaved} role="status">{L('Cilj je shranjen.', 'Goal saved.')}</div>}
    <section className={styles.goalOverview}>
      <div><p className={styles.eyebrow}>{L('TA MESEC', 'THIS MONTH')}</p><h2>{money(prikazanZnesek)}</h2><p>{L('Cilj temelji na stroških, tvojem želenem dohodku in rezervi — znesek je ', 'The goal is based on costs, your desired income and reserve — the amount is ')}<strong>{L('bruto promet', 'gross revenue')}</strong>{L(', ki ga zaračunaš.', ' you invoice.')}</p></div>
      {/* Pike povedo stanje, kot drugod v Flowu: zelena je priliv, vijolicna
          preostanek. Ko preostanka ni, je to DOSEZEK in ne prazna nicla
          (Tina, 31. 8. 2026). */}
      <div className={styles.goalOverviewStats}>
        <span>
          <small><i className={styles.statPika} data-tone="prihod" aria-hidden />{L('Potrjena plačila', 'Confirmed payments')}</small>
          <strong>{money(paid)}</strong>
        </span>
        <span>
          <small><i className={styles.statPika} data-tone={remaining > 0 ? 'ostanek' : 'dosezeno'} aria-hidden />{L('Do cilja manjka', 'Left to goal')}</small>
          {remaining > 0
            ? <strong>{money(remaining)}</strong>
            : <strong className={styles.statDosezeno}>{L('cilj dosežen', 'goal reached')}</strong>}
        </span>
      </div>
      {/* Pupa kaze na tablo s podatki (Tinina zamisel): karton v rokah je bil
          nelogicen — ce vidimo graf, ga mora kazati nam
          (Tina, 31. 8. 2026). */}
      <Image className={styles.goalPupa} src="/flow-pupa-tabla-2.png" alt="" width={1230} height={810} sizes="420px" priority={false} />
      <div className={styles.goalLargeDial} style={{ '--goal-progress': `${prikazanProgress}%` } as React.CSSProperties}><div><strong>{prikazanProgress}%</strong><small>{L('doseženo', 'reached')}</small></div></div>
    </section>

    {/* Iste štiri analizne kartice kot prej na strani ČAS — od tam preseljene,
        ker so analiza poslovnega načrta in časa, ne merjenje samo. */}
    <section className={styles.summary}>
      <article><small>{L('Priporočeni cilj', 'Recommended goal')}</small><strong>{money(recommended)}</strong><span>{L('iz tvojega načrta spodaj', 'from your plan below')}</span><b className={styles.metricIkona}><MetricIcon type="cilj" /></b></article>
      <article><small>{L('Vzdržna urna vrednost', 'Sustainable hourly rate')}</small><strong>{money(plannedResult.sustainableHourlyRate)}</strong><span>{L(`pri ${plan.billableHoursMonthly} obračunskih urah`, `at ${plan.billableHoursMonthly} billable hours`)}</span><b className={styles.metricIkona}><MetricIcon type="ura" /></b></article>
      <article><small>{L('Potrebni projekti', 'Projects needed')}</small><strong>{plannedResult.projectsNeeded}</strong><span>{L(`pri povprečju ${money(plan.averageProjectValue)}`, `at an average of ${money(plan.averageProjectValue)}`)}</span><b className={styles.metricIkona}><MetricIcon type="projekti" /></b></article>
      <article><small>{L('Dejanska urna vrednost', 'Actual hourly rate')}</small><strong>{effectiveRate ? money(effectiveRate) : '—'}</strong><span>{L('iz zaključenih časovnih vnosov', 'from completed time entries')}</span><b className={styles.metricIkona}><MetricIcon type="graf" /></b></article>
    </section>

    <div className={styles.goalsLayout}>
      <form className={styles.goalBuilder} onSubmit={save}>
        <header><p className={styles.eyebrow}>{L('NAČRT CILJA', 'GOAL PLAN')}</p><h2>{L('Koliko mora podjetje ustvariti?', 'How much does the business need to earn?')}</h2><p>{L('Najprej pokrij stroške, nato želeni dohodek in varnostno rezervo.', 'First cover costs, then your desired income and a safety reserve.')}</p></header>
        <div className={styles.goalEquation}>
          <span><small>{L('Redni stroški', 'Recurring costs')}</small><strong>{money(recurringCosts)}</strong></span><b>+</b><span><small>{L('Drugi stroški ta mesec', 'Other costs this month')}</small><strong>{money(enteredCosts)}</strong></span><b>+</b><label><small>{L('Želeni osebni dohodek', 'Desired personal income')}</small><input min="0" step="100" type="number" value={desiredIncome} onChange={event => setDesiredIncome(Number(event.target.value))} /></label>
        </div>
        <label className={styles.reserveControl}><span><strong>{L('Rezerva', 'Reserve')}</strong><small>{L('Za davke in nepredvidene stroške', 'For taxes and unexpected costs')}</small></span><span><input min="0" max="90" type="range" value={reservePercent} onChange={event => setReservePercent(Number(event.target.value))} style={{ ['--val' as string]: `${(reservePercent / 90) * 100}%` }} /><b>{reservePercent}%</b></span></label>
        <div className={styles.goalRecommended}><span><small>{L('Priporočeni mesečni cilj', 'Recommended monthly goal')}</small><strong>{money(recommended)}</strong></span><button type="submit">{L('Uporabi ta cilj', 'Use this goal')}</button></div>
      </form>

      <aside className={styles.goalChecklist}>
        <div><p className={styles.eyebrow}>{L('POSLOVNI NAČRT', 'BUSINESS PLAN')}</p><h2>{L('Je osnova popolna?', 'Is the foundation complete?')}</h2><p>{L('Cilj je uporaben šele, ko temelji na tvojem dohodku, stroških, rezervi in realnem številu obračunskih ur.', 'A goal is only useful once it is based on your income, costs, reserve and a realistic number of billable hours.')}</p></div>
        <ul><li>{L('Prispevki za socialno varnost', 'Social security contributions')}</li><li>{L('Obvezno zdravstveno zavarovanje', 'Mandatory health insurance')}</li><li>{L('Davki in druge dajatve', 'Taxes and other levies')}</li><li>{L('Najemnina in obratovalni stroški', 'Rent and operating costs')}</li><li>{L('Računovodstvo in programska oprema', 'Accounting and software')}</li></ul>
        <Link href={`${base}/kalkulator/poslovni-nacrt`}>{L('Odpri poslovni načrt →', 'Open business plan →')}</Link>
        <Link href={`${base}/kalkulator/stroski`}>{L('Preglej stroške →', 'Review costs →')}</Link>
        <small>{L('Zneske dajatev preveri pri računovodstvu, saj so odvisni od oblike podjetja in statusa.', 'Check levy amounts with your accountant, as they depend on your company form and status.')}</small>
      </aside>
    </div>

    <section className={styles.goalHistory}><header><div><p className={styles.eyebrow}>{L('ZADNJIH 6 MESECEV', 'LAST 6 MONTHS')}</p><h2>{L('Napredek skozi čas', 'Progress over time')}</h2></div><span>{L(`Črta predstavlja trenutni cilj ${money(goal)}`, `The line marks the current goal ${money(goal)}`)}</span></header><div>{months.map(item => <article key={item.label}><div><i style={{ height: `${Math.max(3, item.value / chartMax * 100)}%` }} /><b style={{ bottom: `${goal / chartMax * 100}%` }} /></div><strong>{item.value ? money(item.value) : '0 €'}</strong><small>{item.label}</small></article>)}</div></section>
  </div>;
}
