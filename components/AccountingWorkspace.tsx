'use client';

import { useEffect, useMemo, useState } from 'react';
import { strToU8, zipSync } from 'fflate';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData } from '@/lib/pinartFlowStore';
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

  const flow = useMemo(() => podatkiZaPredogled(predogledNacin, loadFlowData()), [predogledNacin]);
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
    }).catch(() => setNotice('Evidenca paketov trenutno ni dosegljiva.'));
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
    if (samoOgled) { setNotice('V predogledu (demo) priprava paketa ni na voljo — vklopi »Moji podatki«.'); return; }
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

  async function odpriArhiv(item: AccountingExportRecord) {
    if (!item.archivePath) {
      setSporociloPaketa({ id: item.id, text: 'Za ta starejši zapis ZIP paket ni bil shranjen.', error: true });
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
      setSporociloPaketa({ id: item.id, text: novoOkno ? 'ZIP se je odprl v novem zavihku.' : 'Prenos ZIP paketa se je začel.' });
    } catch {
      novoOkno?.close();
      setSporociloPaketa({ id: item.id, text: 'Shranjene priponke trenutno ni mogoče odpreti. Poskusi znova.', error: true });
    } finally { setOdpiranjePaketa(null); }
  }

  return <div className={styles.accountingPage}>
    {notice && <div className={styles.goalSaved} role="status">{notice}</div>}
    <section className={styles.accountingSetup}>
      <div><p className={styles.eyebrow}>OBDOBJE</p><h2>Za računovodkinjo.</h2><p>Izberi obdobje — Flow sam pobere račune, stroške in priloge. Vidiš, kaj pošiljaš, in odkljukaš, kar nočeš. Vsak paket ostane v evidenci spodaj.</p></div>
      <div className={styles.accountingForm}>
        <div className={styles.periodSwitch} aria-label="Način izbire obdobja"><button className={periodMode === 'monthly' ? styles.periodActive : ''} onClick={() => changeFrequency('monthly')}>Vsak mesec</button><button className={periodMode === 'quarterly' ? styles.periodActive : ''} onClick={() => changeFrequency('quarterly')}>Na 3 mesece</button><button className={periodMode === 'custom' ? styles.periodActive : ''} onClick={() => setPeriodMode('custom')}>Po meri</button></div>
        <div className={styles.accountingDates}><label>Od<input type="date" max={period.end || undefined} value={period.start} onChange={event => { setPeriodMode('custom'); setPeriod(value => ({ ...value, start: event.target.value })); }} /></label><label>Do<input type="date" min={period.start || undefined} value={period.end} onChange={event => { setPeriodMode('custom'); setPeriod(value => ({ ...value, end: event.target.value })); }} /></label></div>
        {!obdobjeVeljavno && <small role="alert" style={{ color: '#a12323' }}>Datum »Od« mora biti pred datumom »Do«.</small>}
        <label>E-pošta računovodstva<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="racunovodstvo@…" /></label>
        <label>Bančni izpiski (neobvezno)<input type="file" multiple accept=".pdf,.csv,.xml,.xlsx" onChange={event => setStatements(Array.from(event.target.files || []))} /></label>
        <div className={styles.accountingPdfNotice} role="note">
          <strong>Računovodkinja potrebuje PDF-je.</strong>
          <span>Vsi izdani računi, stroškovni računi in bančni izpiski naj bodo priloženi v obliki PDF. ZIP je samo paket, ki te datoteke združi.</span>
        </div>
      </div>
    </section>

    <section className="dokumenti" aria-label="Dokumenti v računovodskem paketu">
      <details className="skupina" open>
        <summary className="skupina-gumb">
          <span><b>Izdani računi</b><small>{racSel.length} od {invoices.length} izbranih</small></span><span className="indikator" aria-hidden="true" />
        </summary>
        <div className="skupina-vsebina">
          {invoices.length > 0 && <button type="button" className="izberi-vse" onClick={() => preklopiVse(invoices, izbraniRac, setIzbraniRac)}>{vsiOznaceni(invoices, izbraniRac) ? 'Odznači vse' : 'Izberi vse'}</button>}
          {invoices.length ? <><ul>{prikazaniRacuni.map(r => <li key={r.id}>
            <input type="checkbox" checked={izbraniRac.has(r.id)} onChange={() => preklopi(izbraniRac, setIzbraniRac, r.id)} aria-label={`Vključi račun ${r.number || ''}`} />
            <span><b>{r.number || 'Račun'}</b><small>{r.client} · {datSlo(r.date)}</small></span><strong>{evr(r.amount)}</strong>
          </li>)}</ul><Paginacija stran={stranRacunov} strani={straniRacunov} naStran={setStranRacunov} /></> : <p className="prazno">V tem obdobju ni izdanih računov.</p>}
        </div>
      </details>

      <details className="skupina">
        <summary className="skupina-gumb">
          <span><b>Stroški</b><small>{strSel.length} od {expenses.length} izbranih</small></span><span className="indikator" aria-hidden="true" />
        </summary>
        <div className="skupina-vsebina">
          {expenses.length > 0 && <button type="button" className="izberi-vse" onClick={() => preklopiVse(expenses, izbraniStr, setIzbraniStr)}>{vsiOznaceni(expenses, izbraniStr) ? 'Odznači vse' : 'Izberi vse'}</button>}
          {expenses.length ? <><ul>{prikazaniStroski.map(e => <li key={e.id}>
            <input type="checkbox" checked={izbraniStr.has(e.id)} onChange={() => preklopi(izbraniStr, setIzbraniStr, e.id)} aria-label={`Vključi strošek ${e.title || ''}`} />
            <span><b>{e.title || 'Strošek'}</b><small>{e.company || e.client || 'Brez dobavitelja'} · {datSlo(e.date)}{!e.filePath ? ' · manjka priloga' : ''}</small></span><strong>{evr(e.amount)}</strong>
          </li>)}</ul><Paginacija stran={stranStroskov} strani={straniStroskov} naStran={setStranStroskov} /></> : <p className="prazno">V tem obdobju ni stroškov.</p>}
        </div>
      </details>

      <details className="skupina">
        <summary className="skupina-gumb">
          <span><b>Bančni izpiski</b><small>{statements.length ? `${statements.length} priloženih` : 'Ni priloženih datotek'}</small></span><span className="indikator" aria-hidden="true" />
        </summary>
        <div className="skupina-vsebina"><ul>{statements.map(file => <li key={`${file.name}-${file.lastModified}`}><span className="brez-checkbox"><b>{file.name}</b><small>{Math.ceil(file.size / 1024)} KB</small></span></li>)}</ul>{!statements.length && <p className="prazno">Izpiske dodaš v nastavitvah obdobja zgoraj.</p>}</div>
      </details>

      <details className={`skupina ${manjkajoPriloge.length ? 'skupina-opozorilo' : ''}`}>
        <summary className="skupina-gumb">
          <span><b>Manjkajoči dokumenti</b><small>{manjkajoPriloge.length ? `${manjkajoPriloge.length} stroškov potrebuje prilogo` : 'Vsi stroški imajo prilogo'}</small></span><span className="indikator" aria-hidden="true" />
        </summary>
        <div className="skupina-vsebina">{manjkajoPriloge.length ? <ul>{manjkajoPriloge.map(e => <li key={e.id}><span className="brez-checkbox"><b>{e.title || 'Strošek'}</b><small>{e.company || e.client || 'Brez dobavitelja'} · {datSlo(e.date)}</small></span><strong>{evr(e.amount)}</strong></li>)}</ul> : <p className="prazno">Paket je glede prilog pripravljen.</p>}</div>
      </details>
    </section>

    <section className={`zakljucek ${pregledOdprt ? 'zakljucek-odprt' : ''}`}>
      <button type="button" className="preglej-gumb" onClick={() => setPregledOdprt(value => !value)} aria-expanded={pregledOdprt}>
        <span><b>{pregledOdprt ? 'Priprava za računovodstvo' : 'Zaključi paket'}</b><small>{steviloDokumentov} dokumentov{izbraniBrezPriloge.length ? ` · ${izbraniBrezPriloge.length} brez priloge` : ' · pripravljeno za pošiljanje'}</small></span>
        <span>{pregledOdprt ? 'Skrij pripravo' : 'Nadaljuj na pošiljanje'}<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{pregledOdprt ? <path d="M18 15l-6-6-6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}</svg></span>
      </button>
      {pregledOdprt && <div className="pregled-paketa">
        <div><span>Obdobje</span><b>{datSlo(period.start)}–{datSlo(period.end)}</b></div>
        <div><span>Prejemnik</span><b>{email || 'Ni vpisan'}</b></div>
        <div><span>Vsebina</span><b>{racSel.length} računov · {strSel.length} stroškov · {statements.length} izpiskov</b></div>
        {izbraniBrezPriloge.length > 0 && <p role="alert">{izbraniBrezPriloge.length} izbranih stroškov nima priponke. Paket lahko preneseš, pred pošiljanjem pa jih je smiselno dopolniti.</p>}
        <div className="akcije">
          <button className={styles.primaryAction} type="button" disabled={working || nicIzbrano || !email || !obdobjeVeljavno} onClick={() => pripravi('poslji')}>{working ? 'Pripravljam …' : 'Pošlji računovodkinji'}</button>
          <button className="sekundarni-gumb" type="button" disabled={working || nicIzbrano || !obdobjeVeljavno} onClick={() => pripravi('prenos')}>Prenesi ZIP</button>
        </div>
        {!email && <small className="pomoc">Za pošiljanje dodaj e-pošto računovodstva zgoraj.</small>}
      </div>}
    </section>

    <section className={styles.accountingHistory}>
      <header><div><p className={styles.eyebrow}>EVIDENCA</p><h2>Kaj je bilo poslano in kdaj.</h2><p>Klikni zapis za pregled vsebine in shranjenega paketa.</p></div></header>
      {prikazanaEvidenca.length ? prikazanaEvidenca.map(item => <details className={styles.accountingHistoryItem} key={item.id}>
        <summary>
          <div className={styles.accountingHistoryIdentity}><strong>{new Date(item.periodStart).toLocaleDateString('sl-SI')}–{new Date(item.periodEnd).toLocaleDateString('sl-SI')}</strong><small>{item.recipientEmail || 'Prenos (brez pošiljanja)'}</small></div>
          <div className={styles.accountingHistoryCounts} aria-label="Vsebina paketa">
            <span><strong>{item.invoiceCount}</strong><small>računov</small></span>
            <span><strong>{item.expenseCount}</strong><small>stroškov</small></span>
            <span><strong>{item.bankStatementCount}</strong><small>izpiskov</small></span>
          </div>
          <div className={styles.accountingHistoryState}>
            <b>{item.sentAt ? `Poslano ${new Date(item.sentAt).toLocaleDateString('sl-SI')}` : `Pripravljeno ${new Date(item.createdAt).toLocaleDateString('sl-SI')}`}</b>
            <i aria-hidden="true" />
          </div>
        </summary>
        <div className={styles.accountingHistoryDetail}>
          <div><strong>Vsebina paketa</strong><p>{item.invoiceCount} izdanih računov, {item.expenseCount} stroškovnih dokumentov in {item.bankStatementCount} bančnih izpiskov.</p></div>
          <div><strong>Priponka</strong><p>{item.archivePath ? `ZIP paket · ${item.periodStart}–${item.periodEnd}` : 'Pri tem zapisu ZIP paket ni bil shranjen.'}</p></div>
          {item.archivePath && <div className={styles.accountingArchiveAction}>
            {predogledNacin === 'demo' ? demoArhivi[item.id] ? <a
              className="sekundarni-gumb"
              href={demoArhivi[item.id]}
              download={`pinart-demo-racunovodstvo-${item.periodStart}-${item.periodEnd}.zip`}
              onClick={() => setSporociloPaketa({ id: item.id, text: 'Predstavitveni ZIP je prenesen. Odpri ga v mapi Prenosi.' })}
            >Prenesi predstavitveni ZIP</a> : <button type="button" className="sekundarni-gumb" disabled>Nalaganje paketa …</button> : <button type="button" className="sekundarni-gumb" disabled={odpiranjePaketa === item.id} onClick={() => void odpriArhiv(item)}>{odpiranjePaketa === item.id ? 'Odpiram …' : 'Odpri / prenesi ZIP'}</button>}
            {sporociloPaketa?.id === item.id && <small role={sporociloPaketa.error ? 'alert' : 'status'} data-error={sporociloPaketa.error || undefined}>{sporociloPaketa.text}</small>}
          </div>}
        </div>
      </details>) : <p>Prvi paket se bo prikazal tukaj.</p>}
      {evidenca.length > 0 && <div className={styles.accountingHistoryFooter}>
        {vsaEvidencaOdprta && straniEvidence > 1 && <Paginacija stran={stranEvidence} strani={straniEvidence} naStran={setStranEvidence} />}
        <button
          className="sekundarni-gumb"
          type="button"
          onClick={() => setVsaEvidencaOdprta(odprta => !odprta)}
        >{vsaEvidencaOdprta ? 'Prikaži zadnjih 5' : 'Odpri vso evidenco'}</button>
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
