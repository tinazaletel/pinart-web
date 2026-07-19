'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, type FlowExpense, type FlowInvoice } from '@/lib/pinartFlowStore';
import { saveBusinessGoal, saveCloudSettings } from '@/lib/pinartFlowCloud';

type GoalSettings = { desiredIncome: number; reservePercent: number };
type RecurringCost = { ime: string; znesek: string };
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 0 })} €`;

export default function GoalsWorkspace({ base }: { base: string }) {
  const [goal, setGoal] = useState(5000);
  const [desiredIncome, setDesiredIncome] = useState(2000);
  const [reservePercent, setReservePercent] = useState(20);
  const [invoices, setInvoices] = useState<FlowInvoice[]>([]);
  const [expenses, setExpenses] = useState<FlowExpense[]>([]);
  const [recurring, setRecurring] = useState<RecurringCost[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const flow = loadFlowData();
    const settings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}');
    const goalSettings = JSON.parse(localStorage.getItem('pinart-dashboard-goal-settings') || '{}') as Partial<GoalSettings>;
    setGoal(Number(localStorage.getItem('pinart-dashboard-goal')) || 5000);
    setDesiredIncome(Number(goalSettings.desiredIncome) || 2000);
    setReservePercent(Number(goalSettings.reservePercent) || 20);
    setInvoices(flow.invoices);
    setExpenses(flow.expenses);
    setRecurring(Array.isArray(settings.stroski) ? settings.stroski : []);
  }, []);

  const now = new Date();
  const currentMonth = (date: string) => { const value = new Date(`${date}T00:00:00`); return value.getMonth() === now.getMonth() && value.getFullYear() === now.getFullYear(); };
  const paid = invoices.filter(item => item.paid && currentMonth(item.date)).reduce((sum, item) => sum + item.amount, 0);
  const enteredCosts = expenses.filter(item => currentMonth(item.date)).reduce((sum, item) => sum + item.amount, 0);
  const recurringCosts = recurring.reduce((sum, item) => sum + (Number(item.znesek) || 0), 0);
  const costBase = enteredCosts + recurringCosts;
  const recommended = Math.ceil((costBase + desiredIncome) / Math.max(.05, 1 - reservePercent / 100) / 100) * 100;
  const progress = goal ? Math.min(100, Math.round(paid / goal * 100)) : 0;
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
    {saved && <div className={styles.goalSaved} role="status">Cilj je shranjen.</div>}
    <section className={styles.goalOverview}>
      <div><p className={styles.eyebrow}>TA MESEC</p><h2>{money(goal)}</h2><p>Cilj temelji na stroških, tvojem želenem dohodku in rezervi.</p></div>
      <div className={styles.goalOverviewStats}><span><small>Potrjena plačila</small><strong>{money(paid)}</strong></span><span><small>Do cilja manjka</small><strong>{money(remaining)}</strong></span></div>
      <div className={styles.goalLargeDial} style={{ '--goal-progress': `${progress}%` } as React.CSSProperties}><div><strong>{progress}%</strong><small>doseženo</small></div></div>
    </section>

    <div className={styles.goalsLayout}>
      <form className={styles.goalBuilder} onSubmit={save}>
        <header><p className={styles.eyebrow}>NAČRT CILJA</p><h2>Koliko mora podjetje ustvariti?</h2><p>Najprej pokrij stroške, nato želeni dohodek in varnostno rezervo.</p></header>
        <div className={styles.goalEquation}>
          <span><small>Redni stroški</small><strong>{money(recurringCosts)}</strong></span><b>+</b><span><small>Drugi stroški ta mesec</small><strong>{money(enteredCosts)}</strong></span><b>+</b><label><small>Želeni osebni dohodek</small><input min="0" step="100" type="number" value={desiredIncome} onChange={event => setDesiredIncome(Number(event.target.value))} /></label>
        </div>
        <label className={styles.reserveControl}><span><strong>Rezerva</strong><small>Za davke in nepredvidene stroške</small></span><span><input min="0" max="90" type="range" value={reservePercent} onChange={event => setReservePercent(Number(event.target.value))} /><b>{reservePercent}%</b></span></label>
        <div className={styles.goalRecommended}><span><small>Priporočeni mesečni cilj</small><strong>{money(recommended)}</strong></span><button type="submit">Uporabi ta cilj</button></div>
      </form>

      <aside className={styles.goalChecklist}>
        <div><p className={styles.eyebrow}>POSLOVNI NAČRT</p><h2>Je osnova popolna?</h2><p>Cilj je uporaben šele, ko temelji na tvojem dohodku, stroških, rezervi in realnem številu obračunskih ur.</p></div>
        <ul><li>Prispevki za socialno varnost</li><li>Obvezno zdravstveno zavarovanje</li><li>Davki in druge dajatve</li><li>Najemnina in obratovalni stroški</li><li>Računovodstvo in programska oprema</li></ul>
        <Link href={`${base}/kalkulator/poslovni-nacrt`}>Odpri poslovni načrt →</Link>
        <Link href={`${base}/kalkulator/stroski`}>Preglej stroške →</Link>
        <small>Zneske dajatev preveri pri računovodstvu, saj so odvisni od oblike podjetja in statusa.</small>
      </aside>
    </div>

    <section className={styles.goalHistory}><header><div><p className={styles.eyebrow}>ZADNJIH 6 MESECEV</p><h2>Napredek skozi čas</h2></div><span>Črta predstavlja trenutni cilj {money(goal)}</span></header><div>{months.map(item => <article key={item.label}><div><i style={{ height: `${Math.max(3, item.value / chartMax * 100)}%` }} /><b style={{ bottom: `${goal / chartMax * 100}%` }} /></div><strong>{item.value ? money(item.value) : '0 €'}</strong><small>{item.label}</small></article>)}</div></section>
  </div>;
}
