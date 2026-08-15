'use client';

/* Login izložba KROŽI skozi cel Flow — testerji pridejo naravnost na prijavo
   (ne scrollajo landinga), zato mora tu videti vse, kar Flow zna, ne le kalkulator.
   3 sklopi se menjajo; flowLine številka označi aktivnega. */
import { useEffect, useState } from 'react';
import styles from '@/app/[locale]/kalkulator/prijava/prijava.module.css';

const SKLOPI_SL = [
  ['Ve, koliko je vredno tvoje delo — poštena cena z avtorskimi pravicami', 'Pupa, AI asistentka, ki pozna trg in ceno', 'Vse teče iz istih podatkov: ponudba v račun z enim klikom'],
  ['Ponudbe, pogodbe in računi v tvojem slogu', 'Stranke, projekti in arhiv — vse na enem mestu', 'Stroški, ceniki in cilji: vedno veš, kje si'],
  ['Komunikacija s strankami kar v projektu', 'Sef avtorstva — dokaži, da je delo tvoje', 'Naloge in koledar, da nič ne pade skozi'],
];
const SKLOPI_EN = [
  ['Know what your work is worth — a fair price that includes copyright', 'Pupa, the AI assistant who knows the market and pricing', 'Everything flows from the same data: proposal to invoice in one click'],
  ['Proposals, contracts and invoices in your style', 'Clients, projects and archive — all in one place', 'Expenses, price lists and goals: always know where you stand'],
  ['Communicate with clients right inside the project', 'Authorship vault — prove the work is yours', 'Tasks and calendar, so nothing slips through'],
];

export default function PrijavaIzlozba({ jeEn }: { jeEn: boolean }) {
  const sklopi = jeEn ? SKLOPI_EN : SKLOPI_SL;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % sklopi.length), 4800);
    return () => clearInterval(t);
  }, [sklopi.length]);

  return (
    <>
      <div className={styles.flowLine} aria-hidden="true">
        {sklopi.map((_, k) => <span key={k} data-on={k === i ? 'true' : undefined}>{String(k + 1).padStart(2, '0')}</span>)}
      </div>
      <ul key={i} className={styles.izlozbaRotira} aria-live="polite">
        {sklopi[i].map((t, k) => <li key={k}>{t}</li>)}
      </ul>
    </>
  );
}
