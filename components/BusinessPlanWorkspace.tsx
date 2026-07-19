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
    const finished = { ...running, endedAt: new Date().toISOString(), durationMinutes: Math.max(1, Math.round(elapsed / 60)) };
    setPending(finished); setRunning(null); setElapsed(0);
  };

  const confirmTime = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!pending) return;
    const data = new FormData(event.currentTarget);
    const finished: PrivateTimeEntry = {
      ...pending, durationMinutes: Math.max(1, Number(data.get('minutes')) || pending.durationMinutes),
      amount: Math.max(0, Number(data.get('amount')) || 0), scopeStatus: data.get('scope') === 'extra' ? 'extra' : 'included',
      overrunReason: String(data.get('reason') || '') || undefined, note: String(data.get('note') || '') || undefined,
    };
    const next = [finished, ...entries]; setEntries(next); saveLocalTimeEntries(next); void saveCloudTimeEntry(finished).catch(() => undefined);
    setPending(null); setNotice('Časovni vnos je shranjen samo v tvojem računu.');
  };

  const remove = (id: string) => {
    const next = entries.filter(item => item.id !== id); setEntries(next); saveLocalTimeEntries(next); void deleteCloudTimeEntry(id).catch(() => undefined);
  };

  if (!ready) return <p className={styles.loading}>Pripravljam poslovni načrt …</p>;

  return <div className={styles.page}>
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
          <label><span>Dejansko porabljen čas v minutah</span><input name="minutes" type="number" min="1" defaultValue={pending.durationMinutes} /></label>
          <label><span>Vrednost, ki jo pripišeš temu delu</span><input name="amount" type="number" min="0" step="10" defaultValue={pending.amount || ''} placeholder="0" /></label>
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
        </form>}
        <div className={styles.ethics}><strong>Čas meri donosnost projekta, ne tvoje vrednosti.</strong><span>Vnosi ostanejo v tvojem računu in se ne delijo s strankami ali vodji.</span></div>
      </section>
    </div>

    <section className={styles.history}>
      <header><div><p>03 · ZASEBNI DNEVNIK</p><h2>Izkušnje, ki izboljšajo naslednjo ceno.</h2></div><span>{duration(trackedMinutes)} skupaj</span></header>
      {!entries.length ? <div className={styles.empty}>Po prvem zaključenem merjenju boš tukaj videla dejansko urno vrednost projekta.</div> : entries.map(item => {
        const rate = item.durationMinutes ? item.amount / (item.durationMinutes / 60) : 0;
        return <article key={item.id}><div><strong>{item.projectName}</strong><span>{item.serviceName || 'Brez storitve'} · {new Date(item.startedAt).toLocaleDateString('sl-SI')}</span></div><b>{duration(item.durationMinutes)}</b><b>{rate ? `${money(rate)}/h` : 'brez vrednosti'}</b><em data-extra={item.scopeStatus === 'extra'}>{item.scopeStatus === 'extra' ? 'Dodatno delo' : 'Vključeno'}</em><button onClick={() => remove(item.id)} aria-label={`Izbriši ${item.projectName}`}>×</button></article>;
      })}
    </section>
  </div>;
}
