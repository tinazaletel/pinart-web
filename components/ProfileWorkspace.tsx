'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { loadOrganizationProfile, saveOrganizationProfile } from '@/lib/pinartFlowCloud';
import { createClient } from '@/utils/supabase/client';
import styles from './ProfileWorkspace.module.css';

const AREAS = [['graficno', 'Grafika in branding', 'Graphics and branding'], ['splet', 'Splet in digitalni produkti', 'Web and digital products'], ['marketing', 'Marketing in oglasi', 'Marketing and advertising'], ['foto', 'Foto, video in motion', 'Photo, video and motion'], ['direkcija', 'Kreativna direkcija in strategija', 'Creative direction and strategy'], ['prostor', 'Prostor in arhitektura', 'Spatial design and architecture']] as const;

/* Kljuci za izbris vseh podatkov orodja (preneseno iz Nastavitev/Dizajn). */
const K_NAST = 'pinart-kalkulator-v2';
const K_LOGO = 'pinart-kalkulator-logo';
const K_PROFILI = 'pinart-kalkulator-profili';
const K_ARHIV = 'pinart-kalkulator-arhiv';
const K_PODJETJA = 'pinart-kalkulator-podjetja';
const K_LEAD = 'pinart-kalkulator-kontakt';
type FormState = { fullName: string; experience: string; country: string; areas: string[]; company: string; tax: string; email: string; phone: string; address: string; bankAccount: string };
const empty: FormState = { fullName: '', experience: 'samostojen', country: '', areas: [], company: '', tax: '', email: '', phone: '', address: '', bankAccount: '' };

export default function ProfileWorkspace({ base }: { base: string }) {
  const jeEn = useLocale() === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [form, setForm] = useState<FormState>(empty);
  const [notice, setNotice] = useState('');
  /* Gumb za shranjevanje je ziv samo, ce je kaj spremenjeno: sicer vabi h
     kliku, ki ne naredi nicesar, in ne loci "shranjeno" od "ni bilo treba"
     (Tina, 30. 8. 2026). */
  const [shranjeno, setShranjeno] = useState<FormState | null>(null);
  const spremenjeno = shranjeno !== null && JSON.stringify(shranjeno) !== JSON.stringify(form);
  useEffect(() => {
    let local: Record<string, any> = {};
    try { local = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}'); } catch { /* prazen profil */ }
    const provider = local.ponudnik || {};
    setForm({ fullName: local.imeUporabnika || '', experience: local.izkusnje || 'samostojen', country: local.custDrzavaMoj || '', areas: Array.isArray(local.obIzbor) ? local.obIzbor : [], company: provider.ime || '', tax: provider.davcna || '', email: provider.email || '', phone: provider.telefon || '', address: provider.naslov || '', bankAccount: provider.trr || '' });
    void Promise.all([loadOrganizationProfile(), createClient().auth.getUser()]).then(([organization, auth]) => setForm(current => {
      const naloženo = { ...current, fullName: current.fullName || String(auth.data.user?.user_metadata?.full_name || ''), company: organization?.name || current.company, tax: organization?.tax || current.tax, email: organization?.email || current.email, phone: organization?.phone || current.phone, address: organization?.address || current.address, bankAccount: organization?.bankAccount || current.bankAccount };
      setShranjeno(naloženo);
      return naloženo;
    })).catch(() => undefined);
  }, []);
  const field = (key: keyof FormState, value: string) => setForm(current => ({ ...current, [key]: value }));
  const toggleArea = (id: string) => setForm(current => ({ ...current, areas: current.areas.includes(id) ? current.areas.filter(item => item !== id) : [...current.areas, id] }));
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); let current: Record<string, any> = {};
    try { current = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}'); } catch { /* nov profil */ }
    localStorage.setItem('pinart-kalkulator-v2', JSON.stringify({ ...current, imeUporabnika: form.fullName, izkusnje: form.experience, custDrzavaMoj: form.country, obIzbor: form.areas, ponudnik: { ...(current.ponudnik || {}), ime: form.company, davcna: form.tax, email: form.email, telefon: form.phone, naslov: form.address, trr: form.bankAccount } }));
    const supabase = createClient();
    void Promise.all([saveOrganizationProfile({ name: form.company || 'Moje podjetje', tax: form.tax, email: form.email, phone: form.phone, address: form.address, bankAccount: form.bankAccount }), supabase.auth.updateUser({ data: { full_name: form.fullName } }), supabase.auth.getUser().then(({ data }) => data.user ? supabase.from('profiles').update({ full_name: form.fullName, phone: form.phone, updated_at: new Date().toISOString() }).eq('id', data.user.id) : undefined)]).catch(() => undefined);
    setShranjeno(form);
    setNotice(L('Profil je shranjen in povezan s kalkulatorjem.', 'Your profile has been saved and linked to the calculator.'));
  };
  /* UKINITEV RACUNA — druga stvar kot izbris podatkov: prvo pocisti orodja,
     drugo odstrani osebo (Tina, 30. 8. 2026). Ker je nepovratno, je treba
     prepisati svoj e-naslov; strežnik zavrne lastnika ekipe z drugimi člani,
     dokler lastnistva ne prenese. */
  const [ukinjam, setUkinjam] = useState(false);
  const [ukinPotrditev, setUkinPotrditev] = useState('');
  const [ukinTece, setUkinTece] = useState(false);
  const ukiniRacun = async () => {
    setUkinTece(true);
    try {
      const odgovor = await fetch('/api/racun/ukini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ potrditev: ukinPotrditev }),
      });
      const j = await odgovor.json().catch(() => null);
      if (!odgovor.ok) { setNotice(j?.error || L('Računa ni bilo mogoče ukiniti.', 'The account could not be closed.')); return; }
      window.location.href = `${base}/kalkulator/prijava`;
    } catch {
      setNotice(L('Ni povezave.', 'No connection.'));
    } finally {
      setUkinTece(false);
    }
  };

  /* Enak izbris kot v kalkulatorju (ponastaviVse): odstrani vse podatke orodja
     iz localStorage tega brskalnika. Racun (Supabase) ostane nedotaknjen. */
  const izbrisiVse = () => {
    if (!window.confirm(L('Izbrišem vse podatke tega orodja (cene, podjetja, zgodovino ponudb, profile)? Tega ni mogoče razveljaviti.', 'Delete all data from this tool (prices, companies, proposal history and profiles)? This cannot be undone.'))) return;
    try {
      [K_NAST, K_PROFILI, K_ARHIV, K_PODJETJA, K_LEAD, K_LOGO, 'pinart-kalk-pogoji-ok'].forEach(k => localStorage.removeItem(k));
    } catch { /* ignoriraj */ }
    window.location.reload();
  };
  /* IZVOZ VSEH PODATKOV — pravica do prenosljivosti. Zaledje je obstajalo od
     11. 8., gumba pa ni bilo: edina pot je bila mail Tini, kar je za tak
     korak nenavaden UX (Tina, 4. 9. 2026). Prenos kot datoteka JSON. */
  const [izvozTece, setIzvozTece] = useState(false);
  const izvoziPodatke = async () => {
    setIzvozTece(true);
    try {
      const odgovor = await fetch('/api/uporabnik/izvoz', { cache: 'no-store' });
      if (!odgovor.ok) {
        const j = await odgovor.json().catch(() => null);
        setNotice(j?.error || L('Izvoz ni uspel.', 'Export failed.'));
        return;
      }
      const blob = await odgovor.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `pinart-flow-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setNotice(L('Izvoz je prenesen (datoteka JSON).', 'Your export has been downloaded (JSON file).'));
    } catch {
      setNotice(L('Ni povezave.', 'No connection.'));
    } finally {
      setIzvozTece(false);
    }
  };
  return <div className={styles.page}>{notice && <div className={styles.notice} role="status">{notice}</div>}<form onSubmit={save}>
    <section className={styles.card}><header><p>{L('01 · MOJI PODATKI', '01 · MY DETAILS')}</p><h2>{L('Kdo ustvarja?', 'Who is creating?')}</h2><span>{L('Izkušnje in trg vplivajo na predlagane cene v kalkulatorju.', 'Your experience and market affect the prices suggested by the calculator.')}</span></header><div className={styles.grid}><label>{L('Ime ali vzdevek', 'Name or nickname')}<input value={form.fullName} onChange={e => field('fullName', e.target.value)} /></label><label>{L('Izkušnje', 'Experience')}<select value={form.experience} onChange={e => field('experience', e.target.value)}><option value="student">{L('Študent', 'Student')}</option><option value="zacetnik">{L('Začetnik · do 3 leta', 'Beginner · up to 3 years')}</option><option value="samostojen">{L('Samostojen · 3–8 let', 'Independent · 3–8 years')}</option><option value="strokovnjak">{L('Strokovnjak · 8+ let', 'Professional · 8+ years')}</option><option value="ekspert">{L('Ekspert · prepoznano ime', 'Expert · recognised name')}</option></select></label><label>{L('Država oziroma trg', 'Country or market')}<input value={form.country} onChange={e => field('country', e.target.value)} placeholder={L('npr. Slovenija', 'e.g. United Kingdom')} /></label></div><div className={styles.areas}><strong>{L('Področja dela', 'Areas of work')}</strong><div>{AREAS.map(([id, sl, en]) => <button type="button" key={id} data-active={form.areas.includes(id)} onClick={() => toggleArea(id)}>{form.areas.includes(id) ? '✓ ' : '+ '}{L(sl, en)}</button>)}</div></div></section>
    <section className={styles.card}><header><p>{L('02 · MOJE PODJETJE', '02 · MY BUSINESS')}</p><h2>{L('Podatki na dokumentih.', 'Details shown on documents.')}</h2><span>{L('Uporabijo se v ponudbah, pogodbah in računih.', 'These details are used in proposals, contracts and invoices.')}</span></header><div className={styles.grid}><label>{L('Ime podjetja', 'Business name')}<input value={form.company} onChange={e => field('company', e.target.value)} /></label><label>{L('Davčna številka', 'Tax number')}<input value={form.tax} onChange={e => field('tax', e.target.value)} /></label><label>{L('E-pošta', 'Email')}<input type="email" value={form.email} onChange={e => field('email', e.target.value)} /></label><label>{L('Telefon', 'Phone')}<input value={form.phone} onChange={e => field('phone', e.target.value)} /></label><label>{L('Naslov', 'Address')}<input value={form.address} onChange={e => field('address', e.target.value)} /></label><label>{L('TRR', 'Bank account')}<input value={form.bankAccount} onChange={e => field('bankAccount', e.target.value)} /></label></div></section>
    {/* Odjava je odsla v racun v meniju, kjer ze je. V vrstici ob »Shrani
        profil« je stala kot enakovredno dejanje — konec seje poleg shranjevanja
        (Tina, 30. 8. 2026). */}
    {/* Samo shranjevanje. »Moji ceniki« in »Moji stroski« sta imela svojo
        postavko v meniju — tu sta bila druga pot do iste strani in sta v vrstici
        z gumbom za shranjevanje izgledala kot dejanji obrazca (Tina, 30. 8.). */}
    <div className={styles.actions}><button type="submit" disabled={!spremenjeno} title={spremenjeno ? undefined : L('Ni sprememb za shraniti', 'Nothing to save')}>{L('Shrani profil', 'Save profile')}</button></div>
  </form>
    {/* Kartic »Videz dokumentov« in »Delovna prisotnost« tu NI vec: obe stvari
        imata svojo postavko v meniju (Nastavitve, Prisotnost), kartici pa sta
        bili le kazalec nanju. Dve poti do iste strani nista dve moznosti,
        ampak dvojna pot — profil naj pove, kdo si in kaksno je tvoje podjetje
        (Tina, 30. 8. 2026). */}
    <section className={styles.card}><header><p>{L('03 · MOJI PODATKI', '03 · MY DATA')}</p><h2>{L('Vzemi jih s sabo.', 'Take them with you.')}</h2><span>{L('Vse, kar je vezano na tvoj račun — ponudbe, pogodbe, računi, stranke, projekti, evidenca — v eni datoteki JSON.', 'Everything tied to your account — proposals, contracts, invoices, clients, projects, records — in one JSON file.')}</span></header>
      <button type="button" className={styles.gumbMiren} disabled={izvozTece} onClick={() => void izvoziPodatke()}>{izvozTece ? L('Pripravljam …', 'Preparing …') : L('Izvozi vse podatke', 'Export all data')}</button>
    </section>
    {/* Nevarno obmocje — preneseno iz Nastavitev (Dizajn). Na dnu profila. */}
    <section className={`${styles.card} ${styles.nevarno}`}>
      <h2>{L('Izbriši vse podatke', 'Delete all data')}</h2>
      <p className={styles.nevarnoOpis}>{L('Odstrani cene, podjetja, stranke, zgodovino ponudb in profile iz tega brskalnika. Tvoj račun ostane — izbrišejo se samo podatki orodja. Tega ni mogoče razveljaviti.', 'Remove prices, companies, clients, proposal history and profiles from this browser. Your account remains — only tool data is deleted. This cannot be undone.')}</p>
      <button type="button" className={styles.gumbNevaren} onClick={izbrisiVse}>{L('Izbriši vse podatke', 'Delete all data')}</button>

      <hr style={{ border: 0, borderTop: '1px solid rgba(17,17,17,.12)', margin: '1.4rem 0 1.1rem' }} />

      <h2>{L('Ukini račun', 'Close your account')}</h2>
      <p className={styles.nevarnoOpis}>{L('Odstrani tvoj račun v Pinart Flow in vse, kar je vezano nanj — ponudbe, pogodbe, račune, stranke in evidenco. Tega ni mogoče razveljaviti in podatkov ne moremo obnoviti.', 'Removes your Pinart Flow account and everything tied to it — proposals, contracts, invoices, clients and records. This cannot be undone and the data cannot be recovered.')}</p>
      {!ukinjam ? (
        <button type="button" className={styles.gumbNevaren} onClick={() => setUkinjam(true)}>{L('Ukini račun', 'Close account')}</button>
      ) : (
        <div style={{ display: 'grid', gap: '.6rem', maxWidth: '26rem' }}>
          {/* Pred ukinitvijo najprej ponudimo prenos: po ukinitvi podatkov ni vec
             (Tina, 4. 9. 2026). */}
          <div className={styles.opozorilo} role="note">
            <strong>{L('Preden ukineš račun, si prenesi kopijo svojih podatkov.', 'Before closing your account, download a copy of your data.')}</strong>
            <span>{L('Po ukinitvi jih ne moremo obnoviti.', 'After closing, they cannot be recovered.')}</span>
            <button type="button" className={styles.gumbMiren} disabled={izvozTece} onClick={() => void izvoziPodatke()}>{izvozTece ? L('Pripravljam …', 'Preparing …') : L('Izvozi vse podatke', 'Export all data')}</button>
          </div>
          <label style={{ display: 'grid', gap: '.3rem', fontSize: '.84rem', fontWeight: 700 }}>
            {L('Za potrditev prepiši svoj e-naslov', 'Type your email to confirm')}
            <input type="email" autoComplete="off" value={ukinPotrditev} onChange={e => setUkinPotrditev(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button type="button" className={styles.gumbNevaren} disabled={ukinTece || !ukinPotrditev.trim()} onClick={() => void ukiniRacun()}>
              {ukinTece ? L('Ukinjam …', 'Closing …') : L('Dokončno ukini račun', 'Close account for good')}
            </button>
            <button type="button" onClick={() => { setUkinjam(false); setUkinPotrditev(''); }}>{L('Prekliči', 'Cancel')}</button>
          </div>
        </div>
      )}
    </section>
  </div>;
}
