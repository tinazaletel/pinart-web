'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { strToU8, zipSync } from 'fflate';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, type FlowData } from '@/lib/pinartFlowStore';

/* Enako, kot vrne loadFlowData na strezniku — glej zaporo montaze spodaj. */
const PRAZEN_FLOW: FlowData = { version: 1, offers: [], invoices: [], expenses: [], contracts: [], clients: [] };
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { getBusinessDocumentUrl, listAccountingExports, loadCloudSettings, recordAccountingExport, saveCloudSettings, uploadBusinessDocument, type AccountingExportRecord } from '@/lib/pinartFlowCloud';
import Paginacija from '@/components/Paginacija';

const ZAPISOV_NA_STRAN = 10;

const DEMO_EVIDENCA: AccountingExportRecord[] = [
  {
    id: 'demo-accounting-2026-q2',
    periodStart: '2026-04-01',
    periodEnd: '2026-06-30',
    recipientEmail: 'racunovodstvo@primer.si',
    sentAt: '2026-07-05T08:42:00.000Z',
    archivePath: 'demo/racunovodstvo/2026-Q2.zip',
    invoiceCount: 9,
    expenseCount: 18,
    bankStatementCount: 3,
    createdAt: '2026-07-05T08:39:00.000Z',
  },
  {
    id: 'demo-accounting-2026-03',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    recipientEmail: 'racunovodstvo@primer.si',
    sentAt: '2026-04-04T09:18:00.000Z',
    archivePath: 'demo/racunovodstvo/2026-03.zip',
    invoiceCount: 4,
    expenseCount: 7,
    bankStatementCount: 1,
    createdAt: '2026-04-04T09:15:00.000Z',
  },
  {
    id: 'demo-accounting-2026-02',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
    archivePath: 'demo/racunovodstvo/2026-02.zip',
    invoiceCount: 3,
    expenseCount: 6,
    bankStatementCount: 1,
    createdAt: '2026-03-03T15:30:00.000Z',
  },
];

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

function demoAccountingArchive(item: AccountingExportRecord) {
  const files = {
    '00-PREBERI.txt': strToU8(`PINART FLOW · PREDSTAVITVENI RAČUNOVODSKI PAKET\nObdobje: ${item.periodStart} do ${item.periodEnd}\nIzdani računi: ${item.invoiceCount}\nStroški: ${item.expenseCount}\nBančni izpiski: ${item.bankStatementCount}\n`),
    '01-izdani-racuni.csv': strToU8(csv([['Številka', 'Datum', 'Stranka', 'Znesek EUR'], ['R-DEMO-001', item.periodEnd, 'Primer stranke', '850']])),
    '02-stroski.csv': strToU8(csv([['Datum', 'Dobavitelj', 'Opis', 'Znesek EUR'], [item.periodEnd, 'Primer dobavitelja', 'Programska oprema', '89']])),
    '03-bancni-izpiski/README.txt': strToU8('V pravem paketu so v tej mapi naloženi bančni izpiski.'),
  };
  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
}

export default function AccountingWorkspace() {
  const jeEn = useLocale() === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly'>('quarterly');
  const [periodMode, setPeriodMode] = useState<'monthly' | 'quarterly' | 'custom'>('quarterly');
  const [period, setPeriod] = useState(() => defaultPeriod('quarterly'));
  const [email, setEmail] = useState('');
  const [statements, setStatements] = useState<File[]>([]);
  const [history, setHistory] = useState<AccountingExportRecord[]>([]);
  const [odpiranjePaketa, setOdpiranjePaketa] = useState<string | null>(null);
  const [sporociloPaketa, setSporociloPaketa] = useState<{ id: string; text: string; error?: boolean } | null>(null);
  const [demoArhivi, setDemoArhivi] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [pregledOdprt, setPregledOdprt] = useState(false);
  /* KAJ gre v paket — vidiš in nadzoruješ (privzeto vse iz obdobja). To je razlika
     od navadnega maila: Flow sam pobere prave dokumente, ti pa vidiš, kateri so. */
  const [izbraniRac, setIzbraniRac] = useState<Set<string>>(new Set());
  const [izbraniStr, setIzbraniStr] = useState<Set<string>>(new Set());
  const [stranRacunov, setStranRacunov] = useState(1);
  const [stranStroskov, setStranStroskov] = useState(1);
  const [vsaEvidencaOdprta, setVsaEvidencaOdprta] = useState(false);
  const [stranEvidence, setStranEvidence] = useState(1);
  /* Demo/Prazno velja za VSE strani (lib/predogled.ts) — prej je Računovodstvo
     BRALO surove prave podatke (mimo predogleda), zato je v demo »polno poslovanje«
     kazalo le prave podatke uporabnice, obrezane na tekoče obdobje (npr. 2/0). */
  const [predogledNacin] = usePredogled();
  const samoOgled = predogledNacin !== 'mine';

  /* HIDRACIJA: loadFlowData bere localStorage, streznik ga nima — brez zapore
     se prvi izris na odjemalcu razlikuje od streznikovega HTML (»Server: 0,
     Client: 1«) in React javi Unhandled Runtime Error. Do montaze zato beremo
     prazne podatke, takoj po njej prave (Tina, 31. 8. 2026). */
  const [montirano, setMontirano] = useState(false);
  useEffect(() => { setMontirano(true); }, []);
  const flow = useMemo(
    () => podatkiZaPredogled(predogledNacin, montirano ? loadFlowData() : PRAZEN_FLOW),
    [predogledNacin, montirano],
  );
  const inPeriod = (date: string) => date.slice(0, 10) >= period.start && date.slice(0, 10) <= period.end;
  const invoices = useMemo(() => flow.invoices.filter(i => i.date.slice(0, 10) >= period.start && i.date.slice(0, 10) <= period.end), [flow, period.start, period.end]);
  const expenses = useMemo(() => flow.expenses.filter(e => e.date.slice(0, 10) >= period.start && e.date.slice(0, 10) <= period.end), [flow, period.start, period.end]);
  const straniRacunov = Math.max(1, Math.ceil(invoices.length / ZAPISOV_NA_STRAN));
  const straniStroskov = Math.max(1, Math.ceil(expenses.length / ZAPISOV_NA_STRAN));
  const prikazaniRacuni = invoices.slice((stranRacunov - 1) * ZAPISOV_NA_STRAN, stranRacunov * ZAPISOV_NA_STRAN);
  const prikazaniStroski = expenses.slice((stranStroskov - 1) * ZAPISOV_NA_STRAN, stranStroskov * ZAPISOV_NA_STRAN);
  const evidenca = predogledNacin === 'demo' ? DEMO_EVIDENCA : predogledNacin === 'mine' ? history : [];
  const straniEvidence = Math.max(1, Math.ceil(evidenca.length / ZAPISOV_NA_STRAN));
  const prikazanaEvidenca = vsaEvidencaOdprta
    ? evidenca.slice((stranEvidence - 1) * ZAPISOV_NA_STRAN, stranEvidence * ZAPISOV_NA_STRAN)
    : evidenca.slice(0, 5);

  /* ob spremembi obdobja: privzeto označi VSE iz novega obdobja */
  useEffect(() => {
    setIzbraniRac(new Set(invoices.map(i => i.id)));
    setIzbraniStr(new Set(expenses.map(e => e.id)));
  }, [invoices, expenses]);

  useEffect(() => { setStranRacunov(1); setStranStroskov(1); }, [period.start, period.end]);
  useEffect(() => { setStranEvidence(1); }, [vsaEvidencaOdprta, predogledNacin]);
  useEffect(() => { if (stranRacunov > straniRacunov) setStranRacunov(straniRacunov); }, [stranRacunov, straniRacunov]);
  useEffect(() => { if (stranStroskov > straniStroskov) setStranStroskov(straniStroskov); }, [stranStroskov, straniStroskov]);

  useEffect(() => {
    void Promise.all([loadCloudSettings(), listAccountingExports()]).then(([settings, records]) => {
      if (settings) { setFrequency(settings.accountingFrequency); setPeriodMode(settings.accountingFrequency); setPeriod(defaultPeriod(settings.accountingFrequency)); setEmail(settings.accountingEmail || ''); }
      setHistory(records);
    }).catch(() => setNotice(L('Evidenca paketov trenutno ni dosegljiva.', 'The package log is currently unavailable.')));
  }, []);

  useEffect(() => {
    if (predogledNacin !== 'demo') {
      setDemoArhivi({});
      return;
    }
    const urls = Object.fromEntries(DEMO_EVIDENCA.map(item => [item.id, URL.createObjectURL(demoAccountingArchive(item))]));
    setDemoArhivi(urls);
    return () => Object.values(urls).forEach(url => URL.revokeObjectURL(url));
  }, [predogledNacin]);

  const changeFrequency = (value: 'monthly' | 'quarterly') => {
    setFrequency(value); setPeriodMode(value); setPeriod(defaultPeriod(value)); void saveCloudSettings({ accountingFrequency: value });
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
  const manjkajoPriloge = expenses.filter(item => !item.filePath);
  const izbraniBrezPriloge = strSel.filter(item => !item.filePath);
  const steviloDokumentov = racSel.length + strSel.length + statements.length;

  /* nacin: 'prenos' = prenesi ZIP; 'poslji' = pošlji računovodkinji (rabi e-pošto) */
  async function pripravi(nacin: 'prenos' | 'poslji') {
    if (samoOgled) { setNotice(L('V predogledu (demo) priprava paketa ni na voljo — vklopi »Moji podatki«.', 'Preparing a package is not available in preview (demo) — switch to “My data”.')); return; }
    if (!obdobjeVeljavno) { setNotice(L('Datum »Od« mora biti pred datumom »Do«.', 'The “From” date must come before the “To” date.')); return; }
    if (nicIzbrano) { setNotice(L('Izberi vsaj en račun, strošek ali bančni izpisek.', 'Select at least one invoice, expense or bank statement.')); return; }
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
      setNotice(sent ? L('Paket je bil poslan računovodstvu in zabeležen.', 'The package was sent to your accountant and logged.') : nacin === 'poslji' ? L('ZIP prenesen (za samodejno pošiljanje dodaj e-pošto računovodstva).', 'ZIP downloaded (add the accountant’s e-mail to send it automatically).') : L('ZIP paket je prenesen in zabeležen.', 'The ZIP package was downloaded and logged.'));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') setNotice(L('Priprava je bila preklicana.', 'Preparation was cancelled.'));
      else setNotice(L('Paketa ni bilo mogoče pripraviti. Poskusi znova.', 'The package could not be prepared. Try again.'));
    } finally { setWorking(false); }
  }

  async function odpriArhiv(item: AccountingExportRecord) {
    if (!item.archivePath) {
      setSporociloPaketa({ id: item.id, text: L('Za ta starejši zapis ZIP paket ni bil shranjen.', 'No ZIP package was stored for this older record.'), error: true });
      return;
    }

    const novoOkno = window.open('about:blank', '_blank');
    setOdpiranjePaketa(item.id); setSporociloPaketa(null); setNotice('');
    try {
      const url = await getBusinessDocumentUrl(item.archivePath, 60 * 10);
      if (novoOkno) novoOkno.location.replace(url);
      else {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setSporociloPaketa({ id: item.id, text: novoOkno ? L('ZIP se je odprl v novem zavihku.', 'The ZIP opened in a new tab.') : L('Prenos ZIP paketa se je začel.', 'The ZIP download has started.') });
    } catch {
      novoOkno?.close();
      setSporociloPaketa({ id: item.id, text: L('Shranjene priponke trenutno ni mogoče odpreti. Poskusi znova.', 'The stored attachment cannot be opened right now. Try again.'), error: true });
    } finally { setOdpiranjePaketa(null); }
  }

  return <div className={styles.accountingPage}>
    {notice && <div className={styles.goalSaved} role="status">{notice}</div>}
    <section className={styles.accountingSetup}>
      <div><p className={styles.eyebrow}>{L('OBDOBJE', 'PERIOD')}</p><h2>{L('Za računovodstvo.', 'For your accountant.')}</h2><p>{L('Izberi obdobje — Flow sam pobere račune, stroške in priloge. Vidiš, kaj pošiljaš, in odkljukaš, kar nočeš. Vsak paket ostane v evidenci spodaj.', 'Pick a period — Flow gathers the invoices, expenses and attachments itself. You see what you are sending and untick anything you don’t want. Every package stays in the log below.')}</p>
        <Image className={styles.accountingPupa} src="/flow-pupa-racuni.png" alt="" width={622} height={662} sizes="280px" priority={false} /></div>
      <div className={styles.accountingForm}>
        <div className={styles.periodSwitch} aria-label={L('Način izbire obdobja', 'Period selection mode')}><button className={periodMode === 'monthly' ? styles.periodActive : ''} onClick={() => changeFrequency('monthly')}>{L('Vsak mesec', 'Every month')}</button><button className={periodMode === 'quarterly' ? styles.periodActive : ''} onClick={() => changeFrequency('quarterly')}>{L('Na 3 mesece', 'Every 3 months')}</button><button className={periodMode === 'custom' ? styles.periodActive : ''} onClick={() => setPeriodMode('custom')}>{L('Po meri', 'Custom')}</button></div>
        <div className={styles.accountingDates}><label>{L('Od', 'From')}<input type="date" max={period.end || undefined} value={period.start} onChange={event => { setPeriodMode('custom'); setPeriod(value => ({ ...value, start: event.target.value })); }} /></label><label>{L('Do', 'To')}<input type="date" min={period.start || undefined} value={period.end} onChange={event => { setPeriodMode('custom'); setPeriod(value => ({ ...value, end: event.target.value })); }} /></label></div>
        {!obdobjeVeljavno && <small role="alert" style={{ color: '#a12323' }}>{L('Datum »Od« mora biti pred datumom »Do«.', 'The “From” date must come before the “To” date.')}</small>}
        <label>{L('E-pošta računovodstva', 'Accountant’s e-mail')}<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="racunovodstvo@…" /></label>
        <label>{L('Bančni izpiski (neobvezno)', 'Bank statements (optional)')}<input type="file" multiple accept=".pdf,.csv,.xml,.xlsx" onChange={event => setStatements(Array.from(event.target.files || []))} /></label>
        <div className={styles.accountingPdfNotice} role="note">
          <strong>{L('Računovodkinja potrebuje PDF-je.', 'Your accountant needs PDFs.')}</strong>
          <span>{L('Vsi izdani računi, stroškovni računi in bančni izpiski naj bodo priloženi v obliki PDF. ZIP je samo paket, ki te datoteke združi.', 'All issued invoices, expense invoices and bank statements should be attached as PDFs. The ZIP is only the wrapper that puts those files together.')}</span>
        </div>
      </div>
    </section>

    <section className="dokumenti" aria-label={L('Dokumenti v računovodskem paketu', 'Documents in the accounting package')}>
      <details className="skupina" open>
        <summary className="skupina-gumb">
          <span><b>{L('Izdani računi', 'Issued invoices')}</b><small>{racSel.length} {L('od', 'of')} {invoices.length} {L('izbranih', 'selected')}</small></span><span className="indikator" aria-hidden="true" />
        </summary>
        <div className="skupina-vsebina">
          {invoices.length > 0 && <button type="button" className="izberi-vse" onClick={() => preklopiVse(invoices, izbraniRac, setIzbraniRac)}>{vsiOznaceni(invoices, izbraniRac) ? L('Odznači vse', 'Deselect all') : L('Izberi vse', 'Select all')}</button>}
          {invoices.length ? <><ul>{prikazaniRacuni.map(r => <li key={r.id}>
            <input type="checkbox" checked={izbraniRac.has(r.id)} onChange={() => preklopi(izbraniRac, setIzbraniRac, r.id)} aria-label={`${L('Vključi račun', 'Include invoice')} ${r.number || ''}`} />
            <span><b>{r.number || L('Račun', 'Invoice')}</b><small>{r.client} · {datSlo(r.date)}</small></span><strong>{evr(r.amount)}</strong>
          </li>)}</ul><Paginacija stran={stranRacunov} strani={straniRacunov} naStran={setStranRacunov} /></> : <p className="prazno">{L('V tem obdobju ni izdanih računov.', 'No invoices were issued in this period.')}</p>}
        </div>
      </details>

      <details className="skupina">
        <summary className="skupina-gumb">
          <span><b>{L('Stroški', 'Expenses')}</b><small>{strSel.length} {L('od', 'of')} {expenses.length} {L('izbranih', 'selected')}</small></span><span className="indikator" aria-hidden="true" />
        </summary>
        <div className="skupina-vsebina">
          {expenses.length > 0 && <button type="button" className="izberi-vse" onClick={() => preklopiVse(expenses, izbraniStr, setIzbraniStr)}>{vsiOznaceni(expenses, izbraniStr) ? L('Odznači vse', 'Deselect all') : L('Izberi vse', 'Select all')}</button>}
          {expenses.length ? <><ul>{prikazaniStroski.map(e => <li key={e.id}>
            <input type="checkbox" checked={izbraniStr.has(e.id)} onChange={() => preklopi(izbraniStr, setIzbraniStr, e.id)} aria-label={`${L('Vključi strošek', 'Include expense')} ${e.title || ''}`} />
            <span><b>{e.title || 'Strošek'}</b><small>{e.company || e.client || 'Brez dobavitelja'} · {datSlo(e.date)}{!e.filePath ? L(' · manjka priloga', ' · attachment missing') : ''}</small></span><strong>{evr(e.amount)}</strong>
          </li>)}</ul><Paginacija stran={stranStroskov} strani={straniStroskov} naStran={setStranStroskov} /></> : <p className="prazno">{L('V tem obdobju ni stroškov.', 'No expenses in this period.')}</p>}
        </div>
      </details>

      <details className="skupina">
        <summary className="skupina-gumb">
          <span><b>{L('Bančni izpiski', 'Bank statements')}</b><small>{statements.length ? `${statements.length} ${L('priloženih', 'attached')}` : L('Ni priloženih datotek', 'No files attached')}</small></span><span className="indikator" aria-hidden="true" />
        </summary>
        <div className="skupina-vsebina"><ul>{statements.map(file => <li key={`${file.name}-${file.lastModified}`}><span className="brez-checkbox"><b>{file.name}</b><small>{Math.ceil(file.size / 1024)} KB</small></span></li>)}</ul>{!statements.length && <p className="prazno">{L('Izpiske dodaš v nastavitvah obdobja zgoraj.', 'Add statements in the period settings above.')}</p>}</div>
      </details>

      <details className={`skupina ${manjkajoPriloge.length ? 'skupina-opozorilo' : ''}`}>
        <summary className="skupina-gumb">
          <span><b>{L('Manjkajoči dokumenti', 'Missing documents')}</b><small>{manjkajoPriloge.length ? `${manjkajoPriloge.length} ${L('stroškov potrebuje prilogo', 'expenses need an attachment')}` : L('Vsi stroški imajo prilogo', 'Every expense has an attachment')}</small></span><span className="indikator" aria-hidden="true" />
        </summary>
        <div className="skupina-vsebina">{manjkajoPriloge.length ? <ul>{manjkajoPriloge.map(e => <li key={e.id}><span className="brez-checkbox"><b>{e.title || 'Strošek'}</b><small>{e.company || e.client || 'Brez dobavitelja'} · {datSlo(e.date)}</small></span><strong>{evr(e.amount)}</strong></li>)}</ul> : <p className="prazno">{L('Paket je glede prilog pripravljen.', 'Attachment-wise, the package is ready.')}</p>}</div>
      </details>
    </section>

    <section className={`zakljucek ${pregledOdprt ? 'zakljucek-odprt' : ''}`}>
      <button type="button" className="preglej-gumb" onClick={() => setPregledOdprt(value => !value)} aria-expanded={pregledOdprt}>
        <span><b>{pregledOdprt ? L('Priprava za računovodstvo', 'Preparing for accounting') : L('Zaključi paket', 'Finish the package')}</b><small>{steviloDokumentov} {L('dokumentov', 'documents')}{izbraniBrezPriloge.length ? ` · ${izbraniBrezPriloge.length} ${L('brez priloge', 'without attachment')}` : L(' · pripravljeno za pošiljanje', ' · ready to send')}</small></span>
        <span>{pregledOdprt ? L('Skrij pripravo', 'Hide preparation') : L('Nadaljuj na pošiljanje', 'Continue to sending')}<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{pregledOdprt ? <path d="M18 15l-6-6-6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}</svg></span>
      </button>
      {pregledOdprt && <div className="pregled-paketa">
        <div><span>{L('Obdobje', 'Period')}</span><b>{datSlo(period.start)}–{datSlo(period.end)}</b></div>
        <div><span>{L('Prejemnik', 'Recipient')}</span><b>{email || L('Ni vpisan', 'Not entered')}</b></div>
        <div><span>{L('Vsebina', 'Contents')}</span><b>{racSel.length} {L('računov', 'invoices')} · {strSel.length} {L('stroškov', 'expenses')} · {statements.length} {L('izpiskov', 'statements')}</b></div>
        {izbraniBrezPriloge.length > 0 && <p role="alert">{izbraniBrezPriloge.length} {L('izbranih stroškov nima priponke. Paket lahko preneseš, pred pošiljanjem pa jih je smiselno dopolniti.', 'selected expenses have no attachment. You can still download the package, but it is worth completing them before sending.')}</p>}
        <div className="akcije">
          <button className={styles.primaryAction} type="button" disabled={working || nicIzbrano || !email || !obdobjeVeljavno} onClick={() => pripravi('poslji')}>{working ? L('Pripravljam …', 'Preparing …') : L('Pošlji računovodstvu', 'Send to accountant')}</button>
          <button className="sekundarni-gumb" type="button" disabled={working || nicIzbrano || !obdobjeVeljavno} onClick={() => pripravi('prenos')}>{L('Prenesi ZIP', 'Download ZIP')}</button>
        </div>
        {!email && <small className="pomoc">{L('Za pošiljanje dodaj e-pošto računovodstva zgoraj.', 'Add the accountant’s e-mail above to send it.')}</small>}
      </div>}
    </section>

    <section className={styles.accountingHistory}>
      <header><div><p className={styles.eyebrow}>{L('EVIDENCA', 'LOG')}</p><h2>{L('Kaj je bilo poslano in kdaj.', 'What was sent, and when.')}</h2><p>{L('Klikni zapis za pregled vsebine in shranjenega paketa.', 'Click a record to see its contents and the stored package.')}</p></div></header>
      {prikazanaEvidenca.length ? prikazanaEvidenca.map(item => <details className={styles.accountingHistoryItem} key={item.id}>
        <summary>
          <div className={styles.accountingHistoryIdentity}><strong>{new Date(item.periodStart).toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI')}–{new Date(item.periodEnd).toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI')}</strong><small>{item.recipientEmail || L('Prenos (brez pošiljanja)', 'Download (not sent)')}</small></div>
          <div className={styles.accountingHistoryCounts} aria-label={L('Vsebina paketa', 'Package contents')}>
            <span><strong>{item.invoiceCount}</strong><small>{L('računov', 'invoices')}</small></span>
            <span><strong>{item.expenseCount}</strong><small>{L('stroškov', 'expenses')}</small></span>
            <span><strong>{item.bankStatementCount}</strong><small>{L('izpiskov', 'statements')}</small></span>
          </div>
          <div className={styles.accountingHistoryState}>
            <b>{item.sentAt ? `${L('Poslano', 'Sent')} ${new Date(item.sentAt).toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI')}` : `${L('Pripravljeno', 'Prepared')} ${new Date(item.createdAt).toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI')}`}</b>
            <i aria-hidden="true" />
          </div>
        </summary>
        <div className={styles.accountingHistoryDetail}>
          <div><strong>{L('Vsebina paketa', 'Package contents')}</strong><p>{item.invoiceCount} {L('izdanih računov', 'issued invoices')}, {item.expenseCount} {L('stroškovnih dokumentov in', 'expense documents and')} {item.bankStatementCount} {L('bančnih izpiskov.', 'bank statements.')}</p></div>
          <div><strong>{L('Priponka', 'Attachment')}</strong><p>{item.archivePath ? `${L('ZIP paket', 'ZIP package')} · ${item.periodStart}–${item.periodEnd}` : L('Pri tem zapisu ZIP paket ni bil shranjen.', 'No ZIP package was stored for this record.')}</p></div>
          {item.archivePath && <div className={styles.accountingArchiveAction}>
            {predogledNacin === 'demo' ? demoArhivi[item.id] ? <a
              className="sekundarni-gumb"
              href={demoArhivi[item.id]}
              download={`pinart-demo-racunovodstvo-${item.periodStart}-${item.periodEnd}.zip`}
              onClick={() => setSporociloPaketa({ id: item.id, text: L('Predstavitveni ZIP je prenesen. Odpri ga v mapi Prenosi.', 'The demo ZIP was downloaded. Open it in your Downloads folder.') })}
            >{L('Prenesi predstavitveni ZIP', 'Download demo ZIP')}</a> : <button type="button" className="sekundarni-gumb" disabled>{L('Nalaganje paketa …', 'Loading package …')}</button> : <button type="button" className="sekundarni-gumb" disabled={odpiranjePaketa === item.id} onClick={() => void odpriArhiv(item)}>{odpiranjePaketa === item.id ? L('Odpiram …', 'Opening …') : L('Odpri / prenesi ZIP', 'Open / download ZIP')}</button>}
            {sporociloPaketa?.id === item.id && <small role={sporociloPaketa.error ? 'alert' : 'status'} data-error={sporociloPaketa.error || undefined}>{sporociloPaketa.text}</small>}
          </div>}
        </div>
      </details>) : <p>{L('Prvi paket se bo prikazal tukaj.', 'Your first package will appear here.')}</p>}
      {evidenca.length > 0 && <div className={styles.accountingHistoryFooter}>
        {vsaEvidencaOdprta && straniEvidence > 1 && <Paginacija stran={stranEvidence} strani={straniEvidence} naStran={setStranEvidence} />}
        <button
          className="sekundarni-gumb"
          type="button"
          onClick={() => setVsaEvidencaOdprta(odprta => !odprta)}
        >{vsaEvidencaOdprta ? L('Prikaži zadnjih 5', 'Show last 5') : L('Odpri vso evidenco', 'Open the full log')}</button>
      </div>}
    </section>
    <style jsx>{`
      .pripravljenost { display:grid; grid-template-columns:minmax(12rem,.65fr) minmax(0,1.35fr); gap:1.5rem; align-items:end; padding:1.25rem 1.4rem; margin:1rem 0; border:1px solid oklch(90% .009 75); border-radius:1.25rem; background:oklch(99.2% .004 75); }
      .pripravljenost h2 { margin:.2rem 0 0; font-family:var(--font-serif),serif; font-size:1.65rem; }
      .pripravljenost dl { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.55rem; margin:0; }
      .pripravljenost dl div { min-width:0; padding:.8rem .9rem; border-radius:.85rem; background:oklch(97.5% .008 75); }
      .pripravljenost dt { font-size:.72rem; color:oklch(38% .012 60); }
      .pripravljenost dd { margin:.25rem 0 0; font-size:1.15rem; font-weight:750; }
      .pripravljenost .opozorilo { background:oklch(95% .035 70); color:oklch(35% .08 40); }
      .dokumenti { display:grid; gap:.55rem; }
      .skupina { overflow:hidden; border:1px solid oklch(90% .009 75); border-radius:1rem; background:oklch(99.6% .003 75); }
      .skupina-opozorilo { border-color:oklch(91% .008 75); }
      .skupina-gumb { width:100%; min-height:4.1rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.8rem 1rem; border:0; background:transparent; color:var(--ink); text-align:left; cursor:pointer; }
      .skupina-gumb::-webkit-details-marker { display:none; }
      .skupina-gumb::marker { content:''; }
      .skupina-gumb:hover { background:oklch(97% .012 75); }
      .skupina-gumb > span:first-child { display:grid; gap:.15rem; }
      .skupina-gumb b { font-size:.92rem; }
      .skupina-gumb small,.prazno,.pomoc { color:oklch(43% .012 60); font-size:.75rem; }
      .indikator { width:2.75rem; height:2.75rem; flex:0 0 2.75rem; display:grid; place-items:center; border-radius:999px; }
      .indikator::before { content:'⌄'; display:block; font-size:1.35rem; line-height:1; transform:translateY(-.15rem); transition:transform .2s ease; }
      .skupina[open] .indikator::before { transform:translateY(.1rem) rotate(180deg); }
      .skupina-vsebina { position:relative; padding:0 1rem 1rem; border-top:1px solid oklch(92% .008 75); }
      .skupina-vsebina ul { list-style:none; display:grid; gap:.35rem; margin:.75rem 0 0; padding:0; }
      .skupina-vsebina li { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.75rem; min-height:3.45rem; padding:.55rem .7rem; border-radius:.75rem; background:oklch(98.5% .006 75); }
      .skupina-vsebina li:hover { background:oklch(96.5% .014 75); }
      .skupina-vsebina li > span { min-width:0; display:grid; gap:.08rem; }
      .skupina-vsebina li b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.82rem; }
      .skupina-vsebina li small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:oklch(43% .012 60); font-size:.73rem; }
      .skupina-vsebina li strong { font-size:.82rem; white-space:nowrap; }
      .brez-checkbox { grid-column:1 / 3; }
      .izberi-vse { display:block; margin:.7rem 0 0 auto; border:0; background:transparent; color:var(--ink); font:700 .72rem var(--font-sans),sans-serif; text-decoration:underline; cursor:pointer; }
      .prazno { margin:.85rem 0 0; }
      .zakljucek { position:sticky; bottom:.55rem; z-index:5; margin:1rem 0 1.4rem; border:1px solid oklch(86% .012 75); border-radius:1rem; background:oklch(99% .006 75 / .97); box-shadow:0 .75rem 2rem oklch(25% .02 60 / .11); }
      .preglej-gumb { width:100%; min-height:4.25rem; display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:.75rem 1rem; border:0; background:transparent; color:var(--ink); text-align:left; cursor:pointer; }
      .preglej-gumb > span:first-child { display:grid; gap:.1rem; }
      .preglej-gumb small { color:oklch(43% .012 60); }
      .preglej-gumb > span:last-child { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; flex:none; white-space:nowrap; padding:.7rem 1.2rem; border-radius:999px; background:var(--ink); color:oklch(99% .003 75); font-weight:600; font-size:.8rem; letter-spacing:.1em; text-transform:uppercase; }
      .pregled-paketa { display:grid; gap:.7rem; padding:0 1rem 1rem; }
      .pregled-paketa > div:not(.akcije) { display:grid; grid-template-columns:7rem minmax(0,1fr); gap:.75rem; padding-top:.65rem; border-top:1px solid oklch(91% .008 75); font-size:.8rem; }
      .pregled-paketa > div span { color:oklch(43% .012 60); }
      .pregled-paketa p { margin:0; padding:.75rem; border-radius:.65rem; background:oklch(95% .035 70); color:oklch(35% .08 40); font-size:.78rem; }
      .akcije { display:flex; flex-wrap:wrap; gap:.65rem; padding-top:.25rem; }
      .sekundarni-gumb { min-height:2.75rem; display:inline-flex; align-items:center; justify-content:center; padding:.55rem 1.1rem; border:1px solid var(--ink); border-radius:999px; background:transparent; color:var(--ink); font:700 .8rem var(--font-sans),sans-serif; text-decoration:none; cursor:pointer; }
      .sekundarni-gumb:disabled { opacity:.45; cursor:not-allowed; }
      @media(max-width:760px){
        .pripravljenost { grid-template-columns:1fr; padding:1rem; }
        .pripravljenost dl { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .zakljucek { bottom:.4rem; margin-inline:0; }
        .preglej-gumb > span:last-child { padding:.6rem .8rem; font-size:.76rem; }
        .skupina-vsebina { padding-inline:.7rem; }
        .skupina-vsebina li { gap:.55rem; padding-inline:.6rem; }
      }
      @media(max-width:420px){
        .pregled-paketa > div:not(.akcije) { grid-template-columns:1fr; gap:.15rem; }
        .akcije > :global(button) { width:100%; justify-content:center; }
      }
    `}</style>
  </div>;
}
