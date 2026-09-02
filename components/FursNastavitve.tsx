'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { CheckCircle, CreditCard, FileArrowUp, ShieldCheck } from '@phosphor-icons/react';
import Toast from '@/components/Toast';
import { FURS_OMOGOCEN } from '@/lib/fursVklop';
import styles from './FursNastavitve.module.css';

type Nacin = 'samo_nakazilo' | 'gotovinsko';
type Nastavitve = {
  okolje: 'test' | 'produkcija';
  davcna_stevilka: string;
  davcna_stevilka_operaterja?: string | null;
  poslovni_prostor: string;
  elektronska_naprava: string;
  struktura_stevilcenja: 'B' | 'C';
  naslednja_stevilka: number;
  prostor_prijavljen_at?: string | null;
};

type Odgovor = { nastavljeno?: boolean; nastavitve?: Nastavitve | null; napaka?: string; veljavenDo?: string };

async function preberiDatoteko(datoteka?: File): Promise<string> {
  if (!datoteka) return '';
  return datoteka.text();
}

export default function FursNastavitve() {
  const jeEn = useLocale() === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [nalagam, setNalagam] = useState(true);
  const [dovoljeno, setDovoljeno] = useState(true);
  const [nacin, setNacin] = useState<Nacin | null>(null);
  const [obstojece, setObstojece] = useState<Nastavitve | null>(null);
  const [okolje, setOkolje] = useState<'test' | 'produkcija'>('test');
  const [davcna, setDavcna] = useState('');
  const [davcnaOperaterja, setDavcnaOperaterja] = useState('');
  const [prostor, setProstor] = useState('MOBILNI');
  const [naprava, setNaprava] = useState('NAPRAVA1');
  const [certifikat, setCertifikat] = useState<File>();
  const [zasebniKljuc, setZasebniKljuc] = useState<File>();
  const [geslo, setGeslo] = useState('');
  const [shranjujem, setShranjujem] = useState(false);
  const [prijavljam, setPrijavljam] = useState(false);
  const [potrdiProstor, setPotrdiProstor] = useState(false);
  const [toast, setToast] = useState<{ sporocilo: string; ton: 'info' | 'uspeh' | 'napaka' } | null>(null);
  const certRef = useRef<HTMLInputElement>(null);
  const kljucRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ziv = true;
    /* Ugasnjeno: streznik vrne 503 in uporabnik bi videl rdeco napako, ceprav
       je vse v redu — funkcija samo se ni vklopljena. */
    if (!FURS_OMOGOCEN) { setNalagam(false); return () => { ziv = false; }; }
    fetch('/api/furs/nastavitve', { cache: 'no-store' }).then(async odgovor => {
      const telo = await odgovor.json().catch(() => ({})) as Odgovor;
      if (!ziv) return;
      if (odgovor.status === 403) { setDovoljeno(false); return; }
      if (!odgovor.ok) throw new Error(telo.napaka || L('Nastavitev ni bilo mogoče prebrati.', 'Settings could not be loaded.'));
      if (telo.nastavitve) {
        setObstojece(telo.nastavitve);
        setNacin('gotovinsko');
        setOkolje(telo.nastavitve.okolje);
        setDavcna(telo.nastavitve.davcna_stevilka);
        setDavcnaOperaterja(telo.nastavitve.davcna_stevilka_operaterja || '');
        setProstor(telo.nastavitve.poslovni_prostor);
        setNaprava(telo.nastavitve.elektronska_naprava);
      }
    }).catch(napaka => {
      if (ziv) setToast({ sporocilo: napaka instanceof Error ? napaka.message : L('Nastavitev ni bilo mogoče prebrati.', 'Settings could not be loaded.'), ton: 'napaka' });
    }).finally(() => { if (ziv) setNalagam(false); });
    return () => { ziv = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shrani = async () => {
    if (!certifikat || !zasebniKljuc) {
      setToast({ sporocilo: L('Dodaj certifikat in zasebni ključ v obliki PEM.', 'Add the certificate and private key in PEM format.'), ton: 'napaka' });
      return;
    }
    setShranjujem(true);
    try {
      const [certifikatPem, zasebniKljucPem] = await Promise.all([preberiDatoteko(certifikat), preberiDatoteko(zasebniKljuc)]);
      const odgovor = await fetch('/api/furs/nastavitve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ okolje, davcnaStevilka: davcna.replace(/\D/g, ''), davcnaStevilkaOperaterja: davcnaOperaterja.replace(/\D/g, '') || undefined, poslovniProstor: prostor, elektronskaNaprava: naprava, strukturaStevilcenja: 'B', naslednjaStevilka: 1, certifikatPem, zasebniKljucPem, gesloKljuca: geslo || undefined }),
      });
      const telo = await odgovor.json().catch(() => ({})) as Odgovor;
      if (!odgovor.ok) throw new Error(telo.napaka || L('Shranjevanje ni uspelo.', 'Saving failed.'));
      setObstojece({ okolje, davcna_stevilka: davcna.replace(/\D/g, ''), davcna_stevilka_operaterja: davcnaOperaterja.replace(/\D/g, '') || null, poslovni_prostor: prostor, elektronska_naprava: naprava, struktura_stevilcenja: 'B', naslednja_stevilka: 1, prostor_prijavljen_at: null });
      setPotrdiProstor(false);
      setToast({ sporocilo: L('FURS povezava je shranjena. Poslovni prostor še ni prijavljen.', 'FURS connection saved. The business premise is not registered yet.'), ton: 'uspeh' });
    } catch (napaka) {
      setToast({ sporocilo: napaka instanceof Error ? napaka.message : L('Shranjevanje ni uspelo.', 'Saving failed.'), ton: 'napaka' });
    } finally { setShranjujem(false); }
  };

  const prijaviProstor = async () => {
    if (!potrdiProstor) return;
    setPrijavljam(true);
    try {
      const odgovor = await fetch('/api/furs/prostor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vrsta: 'premicni', tip: 'C', datumVeljavnosti: new Date().toISOString().slice(0, 10), opomba: 'Pinart Flow', potrdiPrijavo: true }),
      });
      const telo = await odgovor.json().catch(() => ({})) as { napaka?: string };
      if (!odgovor.ok) throw new Error(telo.napaka || L('Prijava ni uspela.', 'Registration failed.'));
      const zdaj = new Date().toISOString();
      setObstojece(prejsnje => prejsnje ? { ...prejsnje, prostor_prijavljen_at: zdaj } : prejsnje);
      setToast({ sporocilo: L('Elektronska naprava je prijavljena pri FURS.', 'The electronic device is registered with FURS.'), ton: 'uspeh' });
    } catch (napaka) {
      setToast({ sporocilo: napaka instanceof Error ? napaka.message : L('Prijava ni uspela.', 'Registration failed.'), ton: 'napaka' });
    } finally { setPrijavljam(false); }
  };

  if (nalagam) return <section className={styles.card} aria-busy="true"><div className={styles.skelet} /></section>;
  if (!dovoljeno) return <section className={styles.card}><h2><ShieldCheck size={20} /> {L('Davčno potrjevanje računov', 'Fiscal invoice verification')}</h2><p>{L('FURS povezavo lahko ureja lastnik ali skrbnik podjetja.', 'Only the company owner or an administrator can manage the FURS connection.')}</p></section>;

  const prijavljeno = Boolean(obstojece?.prostor_prijavljen_at);
  const aktivniKorak = !nacin ? 1 : nacin === 'samo_nakazilo' ? 1 : !obstojece ? 2 : 3;
  const korakKoncan = (korak: number) => nacin === 'samo_nakazilo'
    ? korak === 1
    : korak === 1 ? nacin === 'gotovinsko' : korak === 2 ? Boolean(obstojece) : prijavljeno;
  return <>
    <section className={styles.card}>
      {!FURS_OMOGOCEN && <p className={styles.vpripravi}>
        <ShieldCheck size={17} />
        {L('V pripravi. Povezava s FURS je zgrajena in preverjena; vklopimo jo, ko bosta urejena digitalno potrdilo in prijava poslovnega prostora. Do takrat je tu vse ugasnjeno.',
           'Being prepared. The FURS connection is built and tested; we will switch it on once the digital certificate and business premise registration are in place. Until then everything here is switched off.')}
      </p>}
      <fieldset className={styles.ugasnjeno} disabled={!FURS_OMOGOCEN}>
      <div className={styles.glava}>
        <div><h2><ShieldCheck size={20} /> {L('Davčno potrjevanje računov', 'Fiscal invoice verification')}</h2><p>{L('Potrebuješ ga, če sprejemaš kartice, gotovino ali druga gotovinska plačila.', 'You need this if you accept cards, cash or other cash-equivalent payments.')}</p></div>
        {prijavljeno && <span className={styles.status}><CheckCircle weight="fill" /> {L('Pripravljeno', 'Ready')}</span>}
      </div>

      <ol className={styles.napredek} aria-label={L('Koraki nastavitve davčnega potrjevanja', 'Fiscal verification setup steps')}>
        {[
          L('Način plačila', 'Payment method'),
          L('Digitalno potrdilo', 'Digital certificate'),
          L('Prijava naprave', 'Device registration'),
        ].map((oznaka, indeks) => {
          const korak = indeks + 1;
          const koncan = korakKoncan(korak);
          const niPotreben = nacin === 'samo_nakazilo' && korak > 1;
          return <li key={oznaka} data-active={aktivniKorak === korak && !niPotreben} data-complete={koncan} data-muted={niPotreben}>
            <span>{koncan ? <CheckCircle size={18} weight="fill" /> : korak}</span>
            <div><strong>{oznaka}</strong>{niPotreben && <small>{L('Ni potrebno', 'Not required')}</small>}</div>
          </li>;
        })}
      </ol>

      <fieldset className={styles.izbira}>
        <legend>{L('Kako ti stranke plačujejo?', 'How do clients pay you?')}</legend>
        <button type="button" className={nacin === 'samo_nakazilo' ? styles.izbrano : ''} onClick={() => setNacin('samo_nakazilo')}><span>{L('Samo z nakazilom na TRR', 'Bank transfer only')}</span><small>{L('Davčna potrditev ni potrebna.', 'Fiscal verification is not required.')}</small></button>
        <button type="button" className={nacin === 'gotovinsko' ? styles.izbrano : ''} onClick={() => setNacin('gotovinsko')}><CreditCard size={20} /><span>{L('Tudi s kartico ali gotovino', 'Also by card or cash')}</span><small>{L('Nastavi povezavo s FURS.', 'Set up the FURS connection.')}</small></button>
      </fieldset>

      {nacin === 'samo_nakazilo' && <p className={styles.mirno}>{L('Pri računih bo privzeto izbrano nakazilo na TRR. Če pozneje sprejmeš kartico ali gotovino, tukaj vključi FURS povezavo.', 'Invoices will default to bank transfer. If you later accept card or cash, enable the FURS connection here.')}</p>}

      {nacin === 'gotovinsko' && <div className={styles.koraki}>
        <div className={styles.korak}><span>1</span><div><strong>{L('Poveži digitalno potrdilo', 'Connect the digital certificate')}</strong><small>{L('Datoteki se preneseta šifrirano in nista dostopni drugim članom ekipe.', 'The files are transferred encrypted and are not accessible to other team members.')}</small></div></div>
        <div className={styles.mreza}>
          <label>{L('Okolje', 'Environment')}<select value={okolje} onChange={e => setOkolje(e.target.value as 'test' | 'produkcija')}><option value="test">{L('Testno', 'Test')}</option><option value="produkcija">{L('Produkcijsko', 'Production')}</option></select></label>
          <label>{L('Davčna številka podjetja', 'Company tax number')}<input inputMode="numeric" value={davcna} onChange={e => setDavcna(e.target.value)} placeholder="12345678" /></label>
          <label>{L('Davčna številka izdajatelja', 'Issuer tax number')} <small>{L('Neobvezno', 'Optional')}</small><input inputMode="numeric" value={davcnaOperaterja} onChange={e => setDavcnaOperaterja(e.target.value)} placeholder="12345678" /></label>
          <label>{L('Oznaka prostora', 'Premise code')}<input value={prostor} onChange={e => setProstor(e.target.value.toUpperCase())} /></label>
          <label>{L('Oznaka naprave', 'Device code')}<input value={naprava} onChange={e => setNaprava(e.target.value.toUpperCase())} /></label>
        </div>
        <div className={styles.datoteke}>
          <button type="button" onClick={() => certRef.current?.click()}><FileArrowUp size={19} /><span>{certifikat?.name || L('Izberi certifikat .pem', 'Choose certificate .pem')}</span></button>
          <input ref={certRef} hidden type="file" accept=".pem,.crt,.cer" onChange={e => setCertifikat(e.target.files?.[0])} />
          <button type="button" onClick={() => kljucRef.current?.click()}><FileArrowUp size={19} /><span>{zasebniKljuc?.name || L('Izberi zasebni ključ .pem', 'Choose private key .pem')}</span></button>
          <input ref={kljucRef} hidden type="file" accept=".pem,.key" onChange={e => setZasebniKljuc(e.target.files?.[0])} />
          <label>{L('Geslo zasebnega ključa', 'Private key password')} <small>{L('Če ga ima', 'If applicable')}</small><input type="password" autoComplete="new-password" value={geslo} onChange={e => setGeslo(e.target.value)} /></label>
        </div>
        <button type="button" className={styles.glavni} onClick={shrani} disabled={shranjujem}>{shranjujem ? L('Preverjam …', 'Checking …') : L('Preveri in shrani povezavo', 'Verify and save connection')}</button>

        {obstojece && !prijavljeno && <div className={styles.prijava}>
          <div className={styles.korak}><span>2</span><div><strong>{L('Prijavi napravo pri FURS', 'Register the device with FURS')}</strong><small>{L('Za račune, izdane na telefonu ali računalniku, se prijavi premični poslovni prostor vrste C.', 'For invoices issued on a phone or computer, a mobile type C business premise is registered.')}</small></div></div>
          <label className={styles.potrditev}><input type="checkbox" checked={potrdiProstor} onChange={e => setPotrdiProstor(e.target.checked)} /><span>{L(`Potrjujem prijavo naprave »${naprava}« v prostoru »${prostor}«. Po uspešni prijavi oznak ni mogoče preprosto zamenjati.`, `I confirm registration of device “${naprava}” in premise “${prostor}”. After successful registration, the codes cannot be changed casually.`)}</span></label>
          <button type="button" className={styles.glavni} disabled={!potrdiProstor || prijavljam} onClick={prijaviProstor}>{prijavljam ? L('Prijavljam …', 'Registering …') : L('Prijavi pri FURS', 'Register with FURS')}</button>
        </div>}
      </div>}
      </fieldset>
    </section>
    {toast && <Toast sporocilo={toast.sporocilo} ton={toast.ton} onClose={() => setToast(null)} trajanje={toast.ton === 'napaka' ? 0 : 4500} />}
  </>;
}
