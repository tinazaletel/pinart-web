'use client';

import { useEffect, useMemo, useState } from 'react';
import { strToU8, zipSync } from 'fflate';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData } from '@/lib/pinartFlowStore';
import { getBusinessDocumentUrl, listAccountingExports, loadCloudSettings, recordAccountingExport, saveCloudSettings, uploadBusinessDocument, type AccountingExportRecord } from '@/lib/pinartFlowCloud';

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const csv = (rows: unknown[][]) => '\uFEFF' + rows.map(row => row.map(quote).join(';')).join('\r\n');

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
  const flow = useMemo(() => loadFlowData(), []);
  const inPeriod = (date: string) => date.slice(0, 10) >= period.start && date.slice(0, 10) <= period.end;
  const invoices = flow.invoices.filter(item => inPeriod(item.date));
  const expenses = flow.expenses.filter(item => inPeriod(item.date));

  useEffect(() => {
    void Promise.all([loadCloudSettings(), listAccountingExports()]).then(([settings, records]) => {
      if (settings) { setFrequency(settings.accountingFrequency); setPeriod(defaultPeriod(settings.accountingFrequency)); setEmail(settings.accountingEmail || ''); }
      setHistory(records);
    }).catch(() => setNotice('Evidenca paketov trenutno ni dosegljiva.'));
  }, []);

  const changeFrequency = (value: 'monthly' | 'quarterly') => {
    setFrequency(value); setPeriod(defaultPeriod(value)); void saveCloudSettings({ accountingFrequency: value });
  };

  async function prepare() {
    setWorking(true); setNotice('');
    try {
      await saveCloudSettings({ accountingEmail: email, accountingFrequency: frequency });
      const invoiceRows = [['Številka', 'Datum', 'Stranka', 'Opis', 'Znesek EUR', 'Status', 'Ponudba'], ...invoices.map(item => [item.number || '', item.date, item.client, item.title || 'Račun', item.amount, item.paid ? 'Plačan' : 'Odprt', item.sourceOfferId || ''])];
      const expenseRows = [['Datum', 'Dobavitelj / stranka', 'Opis', 'Kategorija', 'Znesek EUR', 'Projekt'], ...expenses.map(item => [item.date, item.company || item.client || '', item.title, item.category || '', item.amount, item.sourceOfferId || ''])];
      const files: Record<string, Uint8Array> = {
        '00-PREBERI.txt': strToU8(`PINART FLOW · RAČUNOVODSKI PAKET\nObdobje: ${period.start} do ${period.end}\nIzdani računi: ${invoices.length}\nStroški: ${expenses.length}\nBančni izpiski: ${statements.length}\nPripravljeno: ${new Date().toLocaleString('sl-SI')}\n`),
        '01-izdani-racuni.csv': strToU8(csv(invoiceRows)),
        '02-stroski.csv': strToU8(csv(expenseRows)),
      };
      const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');
      for (const invoice of invoices.filter(item => item.filePath)) {
        try {
          const response = await fetch(await getBusinessDocumentUrl(invoice.filePath!, 60 * 10));
          if (response.ok) files[`01-izdani-racuni/${safeName(invoice.fileName || `racun-${invoice.number || invoice.id}.pdf`)}`] = new Uint8Array(await response.arrayBuffer());
        } catch { /* CSV še vedno vsebuje račun */ }
      }
      for (const expense of expenses.filter(item => item.filePath)) {
        try {
          const response = await fetch(await getBusinessDocumentUrl(expense.filePath!, 60 * 10));
          if (response.ok) files[`02-stroskovni-racuni/${safeName(expense.fileName || `strosek-${expense.id}`)}`] = new Uint8Array(await response.arrayBuffer());
        } catch { /* CSV še vedno vsebuje strošek */ }
      }
      for (const file of statements) files[`03-bancni-izpiski/${file.name}`] = new Uint8Array(await file.arrayBuffer());
      const archive = new File([zipSync(files, { level: 6 })], `pinart-racunovodstvo-${period.start}-${period.end}.zip`, { type: 'application/zip' });
      let archivePath: string | undefined;
      try { archivePath = await uploadBusinessDocument(archive, 'accounting', `${period.start}-${period.end}`); } catch { /* prenos še vedno deluje */ }
      let sent = false;
      if (email && archivePath) {
        const downloadUrl = await getBusinessDocumentUrl(archivePath, 60 * 60 * 24 * 7);
        const response = await fetch('/api/racunovodstvo/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: email, downloadUrl, periodStart: period.start, periodEnd: period.end }) });
        sent = response.ok;
      }
      if (!sent) {
        const url = URL.createObjectURL(archive); const link = document.createElement('a'); link.href = url; link.download = archive.name; link.click(); URL.revokeObjectURL(url);
      }
      await recordAccountingExport({ periodStart: period.start, periodEnd: period.end, recipientEmail: email || undefined, archivePath, invoiceCount: invoices.length, expenseCount: expenses.length, bankStatementCount: statements.length, sent });
      setHistory(await listAccountingExports());
      setNotice(sent ? 'Paket je bil poslan računovodstvu in zabeležen.' : 'ZIP paket je prenesen in zabeležen. Za samodejno e-pošiljanje je treba dodati poštnega ponudnika.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') setNotice('Pošiljanje je bilo preklicano.');
      else setNotice('Paketa ni bilo mogoče pripraviti. Poskusi znova.');
    } finally { setWorking(false); }
  }

  return <div className={styles.accountingPage}>
    {notice && <div className={styles.goalSaved} role="status">{notice}</div>}
    <section className={styles.accountingSetup}>
      <div><p className={styles.eyebrow}>OBDOBJE</p><h2>Pripravi vse naenkrat.</h2><p>ZIP vsebuje pregled izdanih računov, stroškov in dodane bančne izpiske. Vsak paket ostane v evidenci.</p></div>
      <div className={styles.accountingForm}>
        <div className={styles.periodSwitch}><button className={frequency === 'monthly' ? styles.periodActive : ''} onClick={() => changeFrequency('monthly')}>Vsak mesec</button><button className={frequency === 'quarterly' ? styles.periodActive : ''} onClick={() => changeFrequency('quarterly')}>Na 3 mesece</button></div>
        <div className={styles.accountingDates}><label>Od<input type="date" value={period.start} onChange={event => setPeriod(value => ({ ...value, start: event.target.value }))} /></label><label>Do<input type="date" value={period.end} onChange={event => setPeriod(value => ({ ...value, end: event.target.value }))} /></label></div>
        <label>E-pošta računovodstva<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="racunovodstvo@…" /></label>
        <label>Bančni izpiski<input type="file" multiple accept=".pdf,.csv,.xml,.xlsx" onChange={event => setStatements(Array.from(event.target.files || []))} /></label>
        <button className={styles.primaryAction} type="button" disabled={working || period.start > period.end} onClick={prepare}>{working ? 'Pripravljam paket …' : 'Pripravi in posreduj ZIP'}</button>
      </div>
    </section>
    <section className={styles.accountingContents}><article><small>Izdani računi</small><strong>{invoices.length}</strong><span>{invoices.filter(item => item.paid).length} plačanih</span></article><article><small>Stroški</small><strong>{expenses.length}</strong><span>v izbranem obdobju</span></article><article><small>Bančni izpiski</small><strong>{statements.length}</strong><span>{statements.length ? statements.map(file => file.name).join(', ') : 'dodaj zgoraj'}</span></article></section>
    <section className={styles.accountingHistory}><header><div><p className={styles.eyebrow}>EVIDENCA</p><h2>Kaj je bilo pripravljeno in kdaj.</h2></div></header>{history.length ? history.map(item => <article key={item.id}><div><strong>{new Date(item.periodStart).toLocaleDateString('sl-SI')}–{new Date(item.periodEnd).toLocaleDateString('sl-SI')}</strong><small>{item.recipientEmail || 'Brez prejemnika'}</small></div><span>{item.invoiceCount} računov</span><span>{item.expenseCount} stroškov</span><span>{item.bankStatementCount} izpiskov</span><b>{item.sentAt ? `Poslano ${new Date(item.sentAt).toLocaleDateString('sl-SI')}` : `Pripravljeno ${new Date(item.createdAt).toLocaleDateString('sl-SI')}`}</b></article>) : <p>Prvi pripravljeni paket se bo prikazal tukaj.</p>}</section>
  </div>;
}
