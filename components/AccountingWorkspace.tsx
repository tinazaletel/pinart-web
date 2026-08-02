'use client';

import { useEffect, useMemo, useState } from 'react';
import { strToU8, zipSync } from 'fflate';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData } from '@/lib/pinartFlowStore';
import { getBusinessDocumentUrl, listAccountingExports, loadCloudSettings, recordAccountingExport, saveCloudSettings, uploadBusinessDocument, type AccountingExportRecord } from '@/lib/pinartFlowCloud';

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const csv = (rows: unknown[][]) => '﻿' + rows.map(row => row.map(quote).join(';')).join('\r\n');
const evr = (n: number) => Math.round(n).toLocaleString('sl-SI') + ' €';
const datSlo = (d: string) => { const x = new Date(d); return isNaN(x.getTime()) ? d : x.toLocaleDateString('sl-SI'); };

function defaultPeriod(frequency: 'monthly' | 'quarterly') {
  const now = new Date();
  if (frequency === 'monthly') return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  const quarter = Math.floor(now.getMonth() / 3) * 3;
  return { start: iso(new Date(now.getFullYear(), quarter, 1)), end: iso(new Date(now.getFullYear(), quarter + 3, 0)) };
}

export default function AccountingWorkspace() {
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly'>('quarterly');
  const [period, setPeriod] = useState(() => defaultPeriod('quarterly'));
  const [email, setEmail] = useState('');
  const [statements, setStatements] = useState<File[]>([]);
  const [history, setHistory] = useState<AccountingExportRecord[]>([]);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  /* KAJ gre v paket — vidiš in nadzoruješ (privzeto vse iz obdobja). To je razlika
     od navadnega maila: Flow sam pobere prave dokumente, ti pa vidiš, kateri so. */
  const [izbraniRac, setIzbraniRac] = useState<Set<string>>(new Set());
  const [izbraniStr, setIzbraniStr] = useState<Set<string>>(new Set());

  const flow = useMemo(() => loadFlowData(), []);
  const inPeriod = (date: string) => date.slice(0, 10) >= period.start && date.slice(0, 10) <= period.end;
  const invoices = useMemo(() => flow.invoices.filter(i => i.date.slice(0, 10) >= period.start && i.date.slice(0, 10) <= period.end), [flow, period.start, period.end]);
  const expenses = useMemo(() => flow.expenses.filter(e => e.date.slice(0, 10) >= period.start && e.date.slice(0, 10) <= period.end), [flow, period.start, period.end]);

  /* ob spremembi obdobja: privzeto označi VSE iz novega obdobja */
  useEffect(() => {
    setIzbraniRac(new Set(invoices.map(i => i.id)));
    setIzbraniStr(new Set(expenses.map(e => e.id)));
  }, [invoices, expenses]);

  useEffect(() => {
    void Promise.all([loadCloudSettings(), listAccountingExports()]).then(([settings, records]) => {
      if (settings) { setFrequency(settings.accountingFrequency); setPeriod(defaultPeriod(settings.accountingFrequency)); setEmail(settings.accountingEmail || ''); }
      setHistory(records);
    }).catch(() => setNotice('Evidenca paketov trenutno ni dosegljiva.'));
  }, []);

  const changeFrequency = (value: 'monthly' | 'quarterly') => {
    setFrequency(value); setPeriod(defaultPeriod(value)); void saveCloudSettings({ accountingFrequency: value });
  };

  const preklopi = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); setSet(next);
  };
  const vsiOznaceni = (seznam: { id: string }[], set: Set<string>) => seznam.length > 0 && seznam.every(x => set.has(x.id));
  const preklopiVse = (seznam: { id: string }[], set: Set<string>, setSet: (s: Set<string>) => void) => {
    setSet(vsiOznaceni(seznam, set) ? new Set() : new Set(seznam.map(x => x.id)));
  };

  const racSel = invoices.filter(i => izbraniRac.has(i.id));
  const strSel = expenses.filter(e => izbraniStr.has(e.id));
  const obdobjeVeljavno = Boolean(period.start && period.end && period.start <= period.end);
  const nicIzbrano = racSel.length === 0 && strSel.length === 0 && statements.length === 0;

  /* nacin: 'prenos' = prenesi ZIP; 'poslji' = pošlji računovodkinji (rabi e-pošto) */
  async function pripravi(nacin: 'prenos' | 'poslji') {
    if (!obdobjeVeljavno) { setNotice('Datum »Od« mora biti pred datumom »Do«.'); return; }
    if (nicIzbrano) { setNotice('Izberi vsaj en račun, strošek ali bančni izpisek.'); return; }
    setWorking(true); setNotice('');
    try {
      await saveCloudSettings({ accountingEmail: email, accountingFrequency: frequency });
      const invoiceRows = [['Številka', 'Datum', 'Stranka', 'Opis', 'Znesek EUR', 'Status', 'Ponudba'], ...racSel.map(item => [item.number || '', item.date, item.client, item.title || 'Račun', item.amount, item.paid ? 'Plačan' : 'Odprt', item.sourceOfferId || ''])];
      const expenseRows = [['Datum', 'Dobavitelj / stranka', 'Opis', 'Kategorija', 'Znesek EUR', 'Projekt'], ...strSel.map(item => [item.date, item.company || item.client || '', item.title, item.category || '', item.amount, item.sourceOfferId || ''])];
      const files: Record<string, Uint8Array> = {
        '00-PREBERI.txt': strToU8(`PINART FLOW · RAČUNOVODSKI PAKET\nObdobje: ${period.start} do ${period.end}\nIzdani računi: ${racSel.length}\nStroški: ${strSel.length}\nBančni izpiski: ${statements.length}\nPripravljeno: ${new Date().toLocaleString('sl-SI')}\n`),
        '01-izdani-racuni.csv': strToU8(csv(invoiceRows)),
        '02-stroski.csv': strToU8(csv(expenseRows)),
      };
      const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');
      for (const invoice of racSel.filter(item => item.filePath)) {
        try {
          const response = await fetch(await getBusinessDocumentUrl(invoice.filePath!, 60 * 10));
          if (response.ok) files[`01-izdani-racuni/${safeName(invoice.fileName || `racun-${invoice.number || invoice.id}.pdf`)}`] = new Uint8Array(await response.arrayBuffer());
        } catch { /* CSV še vedno vsebuje račun */ }
      }
      for (const expense of strSel.filter(item => item.filePath)) {
        try {
          const response = await fetch(await getBusinessDocumentUrl(expense.filePath!, 60 * 10));
          if (response.ok) files[`02-stroskovni-racuni/${safeName(expense.fileName || `strosek-${expense.id}`)}`] = new Uint8Array(await response.arrayBuffer());
        } catch { /* CSV še vedno vsebuje strošek */ }
      }
      for (const file of statements) files[`03-bancni-izpiski/${safeName(file.name)}`] = new Uint8Array(await file.arrayBuffer());
      const archive = new File([zipSync(files, { level: 6 })], `pinart-racunovodstvo-${period.start}-${period.end}.zip`, { type: 'application/zip' });
      let archivePath: string | undefined;
      try { archivePath = await uploadBusinessDocument(archive, 'accounting', `${period.start}-${period.end}`); }
      catch { if (nacin === 'poslji') throw new Error('Paketa ni bilo mogoče varno naložiti za pošiljanje.'); }
      let sent = false;
      if (nacin === 'poslji' && email && archivePath) {
        const downloadUrl = await getBusinessDocumentUrl(archivePath, 60 * 60 * 24 * 7);
        const response = await fetch('/api/racunovodstvo/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: email, downloadUrl, periodStart: period.start, periodEnd: period.end }) });
        if (!response.ok) throw new Error('Pošiljanje ni uspelo.');
        sent = true;
      }
      if (!sent) {
        const url = URL.createObjectURL(archive); const link = document.createElement('a'); link.href = url; link.download = archive.name; link.click(); URL.revokeObjectURL(url);
      }
      await recordAccountingExport({ periodStart: period.start, periodEnd: period.end, recipientEmail: sent ? email : undefined, archivePath, invoiceCount: racSel.length, expenseCount: strSel.length, bankStatementCount: statements.length, sent });
      setHistory(await listAccountingExports());
      setNotice(sent ? 'Paket je bil poslan računovodkinji in zabeležen.' : nacin === 'poslji' ? 'ZIP prenesen (za samodejno pošiljanje dodaj e-pošto računovodstva).' : 'ZIP paket je prenesen in zabeležen.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') setNotice('Priprava je bila preklicana.');
      else setNotice('Paketa ni bilo mogoče pripraviti. Poskusi znova.');
    } finally { setWorking(false); }
  }

  /* stil vrstice seznama (inline, da ne uvajam novih CSS razredov na slepo) */
  const vrstica: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.5rem .7rem', borderRadius: '.6rem', border: '1px solid oklch(93% .006 82 / .6)', background: 'oklch(100% 0 0 / .5)' };
  const seznamStil: React.CSSProperties = { listStyle: 'none', margin: '.6rem 0 0', padding: 0, display: 'grid', gap: '.35rem', maxHeight: '16rem', overflowY: 'auto' };
  const glavaStil: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '.6rem' };
  const izberiGumb: React.CSSProperties = { border: 0, background: 'none', color: 'var(--ink)', font: '700 .66rem var(--font-sans), sans-serif', textDecoration: 'underline', cursor: 'pointer', padding: 0 };

  return <div className={styles.accountingPage}>
    {notice && <div className={styles.goalSaved} role="status">{notice}</div>}
    <section className={styles.accountingSetup}>
      <div><p className={styles.eyebrow}>OBDOBJE</p><h2>Za računovodkinjo.</h2><p>Izberi obdobje — Flow sam pobere račune, stroške in priloge. Vidiš, kaj pošiljaš, in odkljukaš, kar nočeš. Vsak paket ostane v evidenci spodaj.</p></div>
      <div className={styles.accountingForm}>
        <div className={styles.periodSwitch}><button className={frequency === 'monthly' ? styles.periodActive : ''} onClick={() => changeFrequency('monthly')}>Vsak mesec</button><button className={frequency === 'quarterly' ? styles.periodActive : ''} onClick={() => changeFrequency('quarterly')}>Na 3 mesece</button></div>
        <div className={styles.accountingDates}><label>Od<input type="date" max={period.end || undefined} value={period.start} onChange={event => setPeriod(value => ({ ...value, start: event.target.value }))} /></label><label>Do<input type="date" min={period.start || undefined} value={period.end} onChange={event => setPeriod(value => ({ ...value, end: event.target.value }))} /></label></div>
        {!obdobjeVeljavno && <small role="alert" style={{ color: '#a12323' }}>Datum »Od« mora biti pred datumom »Do«.</small>}
        <label>E-pošta računovodstva<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="racunovodstvo@…" /></label>
        <label>Bančni izpiski (neobvezno)<input type="file" multiple accept=".pdf,.csv,.xml,.xlsx" onChange={event => setStatements(Array.from(event.target.files || []))} /></label>
      </div>
    </section>

    {/* KAJ je v paketu — dejanska seznama, s kljukicami */}
    <section className={styles.accountingContents} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.4rem' }}>
      <div>
        <div style={glavaStil}>
          <p className={styles.eyebrow} style={{ margin: 0 }}>IZDANI RAČUNI · {racSel.length}/{invoices.length}</p>
          {invoices.length > 0 && <button type="button" style={izberiGumb} onClick={() => preklopiVse(invoices, izbraniRac, setIzbraniRac)}>{vsiOznaceni(invoices, izbraniRac) ? 'Odznači vse' : 'Izberi vse'}</button>}
        </div>
        {invoices.length ? <ul className="accounting-scroll-list" style={seznamStil}>{invoices.map(r => <li key={r.id} style={vrstica}>
          <input type="checkbox" checked={izbraniRac.has(r.id)} onChange={() => preklopi(izbraniRac, setIzbraniRac, r.id)} aria-label={`Vključi račun ${r.number || ''}`} />
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: '.8rem' }}>{r.number || 'Račun'}</b> <small style={{ color: 'var(--muted)' }}>· {r.client} · {datSlo(r.date)}</small></span>
          <b style={{ fontSize: '.82rem', flex: 'none' }}>{evr(r.amount)}</b>
        </li>)}</ul> : <p style={{ color: 'var(--muted)', fontSize: '.8rem', margin: '.5rem 0 0' }}>V tem obdobju ni izdanih računov.</p>}
      </div>
      <div>
        <div style={glavaStil}>
          <p className={styles.eyebrow} style={{ margin: 0 }}>STROŠKI · {strSel.length}/{expenses.length}</p>
          {expenses.length > 0 && <button type="button" style={izberiGumb} onClick={() => preklopiVse(expenses, izbraniStr, setIzbraniStr)}>{vsiOznaceni(expenses, izbraniStr) ? 'Odznači vse' : 'Izberi vse'}</button>}
        </div>
        {expenses.length ? <ul className="accounting-scroll-list" style={seznamStil}>{expenses.map(e => <li key={e.id} style={vrstica}>
          <input type="checkbox" checked={izbraniStr.has(e.id)} onChange={() => preklopi(izbraniStr, setIzbraniStr, e.id)} aria-label={`Vključi strošek ${e.title || ''}`} />
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: '.8rem' }}>{e.title || 'Strošek'}</b> <small style={{ color: 'var(--muted)' }}>· {e.company || e.client || ''} · {datSlo(e.date)}</small></span>
          <b style={{ fontSize: '.82rem', flex: 'none' }}>{evr(e.amount)}</b>
        </li>)}</ul> : <p style={{ color: 'var(--muted)', fontSize: '.8rem', margin: '.5rem 0 0' }}>V tem obdobju ni stroškov.</p>}
      </div>
      {/* akciji: prenesi ali pošlji */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.7rem', alignItems: 'center', marginTop: '.2rem' }}>
        <button className={styles.primaryAction} type="button" disabled={working || nicIzbrano || !email || !obdobjeVeljavno} onClick={() => pripravi('poslji')}>{working ? 'Pripravljam …' : 'Pošlji računovodkinji'}</button>
        <button type="button" disabled={working || nicIzbrano || !obdobjeVeljavno} onClick={() => pripravi('prenos')} style={{ border: '1px solid var(--ink)', background: 'none', color: 'var(--ink)', borderRadius: '999px', padding: '.55rem 1.1rem', font: '700 .8rem var(--font-sans), sans-serif', cursor: 'pointer' }}>Prenesi ZIP</button>
        {!email && <small style={{ color: 'var(--muted)' }}>Za pošiljanje dodaj e-pošto računovodstva zgoraj.</small>}
      </div>
    </section>

    <section className={styles.accountingHistory}><header><div><p className={styles.eyebrow}>EVIDENCA</p><h2>Kaj je bilo poslano in kdaj.</h2></div></header>{history.length ? history.map(item => <article key={item.id}><div><strong>{new Date(item.periodStart).toLocaleDateString('sl-SI')}–{new Date(item.periodEnd).toLocaleDateString('sl-SI')}</strong><small>{item.recipientEmail || 'Prenos (brez pošiljanja)'}</small></div><span>{item.invoiceCount} računov</span><span>{item.expenseCount} stroškov</span><span>{item.bankStatementCount} izpiskov</span><b>{item.sentAt ? `Poslano ${new Date(item.sentAt).toLocaleDateString('sl-SI')}` : `Pripravljeno ${new Date(item.createdAt).toLocaleDateString('sl-SI')}`}</b></article>) : <p>Prvi paket se bo prikazal tukaj.</p>}</section>
    <style jsx>{`
      .accounting-scroll-list {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .accounting-scroll-list::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
    `}</style>
  </div>;
}
