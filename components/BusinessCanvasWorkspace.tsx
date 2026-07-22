'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  canvasToPlan, EMPTY_BUSINESS_CANVAS, loadCloudCanvas, loadLocalCanvas,
  saveCloudCanvas, saveLocalCanvas, type BusinessCanvas,
} from '@/lib/pinartCanvas';
import styles from './BusinessCanvasWorkspace.module.css';

const BLOCKS: Array<{ key: keyof BusinessCanvas; number: string; title: string; hint: string; example: string }> = [
  { key: 'partners', number: '01', title: 'Ključni partnerji', hint: 'Kdo ti pomaga ustvariti ali dostaviti vrednost?', example: 'zunanji sodelavci, računovodstvo, tiskarne …' },
  { key: 'activities', number: '02', title: 'Ključne aktivnosti', hint: 'Kaj moraš redno delati, da posel deluje?', example: 'oblikovanje, prodaja, vodenje projektov …' },
  { key: 'resources', number: '03', title: 'Ključni viri', hint: 'Kaj potrebuješ za izvedbo?', example: 'znanje, oprema, programska oprema, čas …' },
  { key: 'value', number: '04', title: 'Vrednost za stranko', hint: 'Zakaj bi stranka izbrala prav tebe?', example: 'problem, rezultat in razlika od drugih …' },
  { key: 'relationships', number: '05', title: 'Odnosi s strankami', hint: 'Kako jih pridobiš, vodiš in obdržiš?', example: 'osebno svetovanje, retainer, priporočila …' },
  { key: 'channels', number: '06', title: 'Kanali', hint: 'Kje te stranke odkrijejo in kupijo?', example: 'spletna stran, priporočila, LinkedIn, partnerji …' },
  { key: 'segments', number: '07', title: 'Ciljne stranke', hint: 'Komu ustvarjaš največ vrednosti?', example: 'panoga, velikost podjetja, trg, tip naročnika …' },
  { key: 'costs', number: '08', title: 'Stroški', hint: 'Kateri stroški nastajajo, tudi ko ne prodajaš?', example: 'prispevki, najemnina, naročnine, izvajalci …' },
  { key: 'revenue', number: '09', title: 'Prihodki', hint: 'Kaj in kako zaračunavaš?', example: 'projekti, urne postavke, mesečni paketi …' },
];

function CanvasIcon({ type }: { type: keyof BusinessCanvas }) {
  const paths: Record<keyof BusinessCanvas, ReactNode> = {
    partners: <><circle cx="7" cy="8" r="3" /><circle cx="17" cy="7" r="2.5" /><path d="M2.5 20c.6-4 2.1-6 4.5-6s3.9 2 4.5 6M13 19c.4-3 1.7-4.5 4-4.5s3.6 1.5 4 4.5" /></>,
    activities: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /><circle cx="12" cy="12" r="4" /></>,
    resources: <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /><path d="M3 7H1v13h14v-2" /></>,
    value: <><path d="m12 3 2.2 5.2L20 10l-4.4 3.7L17 19l-5-2.8L7 19l1.4-5.3L4 10l5.8-1.8z" /></>,
    relationships: <><path d="M3 12.5 7.5 8l3 2.5 3.5-3.5 7 6" /><path d="m5 14 4 4a2 2 0 0 0 3 0l6-6M2 9l4-4 3 3M22 9l-4-4-3 3" /></>,
    channels: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 12h5" /></>,
    segments: <><circle cx="12" cy="8" r="3" /><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6M4 7a2.5 2.5 0 1 0 0 5M20 7a2.5 2.5 0 1 1 0 5M1 19c.3-2.5 1.5-4 3.5-4M23 19c-.3-2.5-1.5-4-3.5-4" /></>,
    costs: <><ellipse cx="9" cy="7" rx="5" ry="2.5" /><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7M4 11v4c0 1.4 2.2 2.5 5 2.5 1.2 0 2.4-.2 3.2-.6" /><ellipse cx="17" cy="16" rx="4" ry="2" /><path d="M13 16v3c0 1.1 1.8 2 4 2s4-.9 4-2v-3" /></>,
    revenue: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /><path d="m3 8 6-5 6 4 7-5" /></>,
  };
  return <span className={styles.icon} aria-hidden="true"><svg viewBox="0 0 24 24">{paths[type]}</svg></span>;
}

export default function BusinessCanvasWorkspace() {
  const [canvas, setCanvas] = useState<BusinessCanvas>(EMPTY_BUSINESS_CANVAS);
  const [notice, setNotice] = useState('');
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    const local = loadLocalCanvas(); setCanvas(local);
    void loadCloudCanvas().then(cloud => { if (cloud) { setCanvas(cloud); saveLocalCanvas(cloud); } }).catch(() => undefined);
  }, []);

  const completed = useMemo(() => BLOCKS.filter(block => canvas[block.key].trim()).length, [canvas]);
  const plan = useMemo(() => canvasToPlan(canvas), [canvas]);
  const update = (key: keyof BusinessCanvas, value: string) => setCanvas(current => ({ ...current, [key]: value }));
  const save = () => {
    saveLocalCanvas(canvas); void saveCloudCanvas(canvas).catch(() => undefined);
    setNotice('Business Canvas je shranjen.');
  };
  const copyPlan = async () => { await navigator.clipboard.writeText(plan); setNotice('Osnovni poslovni načrt je kopiran.'); };

  return <div className={styles.page}>
    {notice && <div className={styles.notice} role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Zapri obvestilo">×</button></div>}
    <section className={styles.intro}>
      <div><p>BUSINESS MODEL CANVAS</p><h2>Najprej razumi, kako tvoj posel ustvarja vrednost.</h2><span>Odgovori s kratkimi alinejami. Canvas ni izpit — je živ zemljevid poslovanja.</span></div>
      <div
        className={styles.progress}
        style={{ background: `conic-gradient(var(--purple) ${(completed / 9) * 100}%, oklch(92% .035 300) 0)` }}
        aria-label={`${completed} od 9 področij izpolnjenih`}
      ><strong>{completed}<small>/ 9</small></strong><span>izpolnjenih področij</span></div>
    </section>

    <section className={styles.canvas} aria-label="Business Model Canvas">
      {BLOCKS.map(block => <article key={block.key} data-block={block.key}>
        <header><span>{block.number}</span><CanvasIcon type={block.key} /><h3>{block.title}</h3></header>
        <p>{block.hint}</p>
        <textarea aria-label={block.title} value={canvas[block.key]} onChange={event => update(block.key, event.target.value)} placeholder={block.example} />
      </article>)}
    </section>

    <section className={styles.actions}>
      <div><p>NASLEDNJI KORAK</p><h2>Iz Canvasa do uporabnega načrta.</h2><span>Pinart pripravi osnovno strukturo. AI asistent bo nato postavljal dodatna vprašanja o trgu, konkurenci, prodaji, tveganjih in financah.</span></div>
      <div><button type="button" className={styles.secondary} onClick={save}>Shrani Canvas</button><button type="button" onClick={() => { save(); setPlanOpen(true); }}>Pripravi osnovni načrt</button></div>
    </section>

    {planOpen && <section className={styles.plan} aria-labelledby="plan-title">
      <header><div><p>OSNUTEK</p><h2 id="plan-title">Osnovni poslovni načrt</h2></div><button type="button" onClick={() => setPlanOpen(false)} aria-label="Zapri osnutek">×</button></header>
      <pre>{plan}</pre>
      <footer><button type="button" className={styles.secondary} onClick={copyPlan}>Kopiraj osnutek</button><button type="button" disabled title="Na voljo po povezavi Mistral AI">Nadaljuj z AI asistentom</button></footer>
      <small>AI nadaljevanje se aktivira, ko povežemo Mistral. Canvas in osnovni osnutek že delujeta brez AI-ja.</small>
    </section>}
  </div>;
}
