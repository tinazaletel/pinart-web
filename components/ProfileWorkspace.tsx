'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { loadOrganizationProfile, saveOrganizationProfile } from '@/lib/pinartFlowCloud';
import { createClient } from '@/utils/supabase/client';
import styles from './ProfileWorkspace.module.css';

const AREAS = [['graficno', 'Grafika in branding'], ['splet', 'Splet in digitalni produkti'], ['marketing', 'Marketing in oglasi'], ['foto', 'Foto, video in motion'], ['direkcija', 'Kreativna direkcija in strategija'], ['prostor', 'Prostor in arhitektura']] as const;

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
  const [form, setForm] = useState<FormState>(empty);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let local: Record<string, any> = {};
    try { local = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}'); } catch { /* prazen profil */ }
    const provider = local.ponudnik || {};
    setForm({ fullName: local.imeUporabnika || '', experience: local.izkusnje || 'samostojen', country: local.custDrzavaMoj || '', areas: Array.isArray(local.obIzbor) ? local.obIzbor : [], company: provider.ime || '', tax: provider.davcna || '', email: provider.email || '', phone: provider.telefon || '', address: provider.naslov || '', bankAccount: provider.trr || '' });
    void Promise.all([loadOrganizationProfile(), createClient().auth.getUser()]).then(([organization, auth]) => setForm(current => ({ ...current, fullName: current.fullName || String(auth.data.user?.user_metadata?.full_name || ''), company: organization?.name || current.company, tax: organization?.tax || current.tax, email: organization?.email || current.email, phone: organization?.phone || current.phone, address: organization?.address || current.address, bankAccount: organization?.bankAccount || current.bankAccount }))).catch(() => undefined);
  }, []);
  const field = (key: keyof FormState, value: string) => setForm(current => ({ ...current, [key]: value }));
  const toggleArea = (id: string) => setForm(current => ({ ...current, areas: current.areas.includes(id) ? current.areas.filter(item => item !== id) : [...current.areas, id] }));
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); let current: Record<string, any> = {};
    try { current = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}'); } catch { /* nov profil */ }
    localStorage.setItem('pinart-kalkulator-v2', JSON.stringify({ ...current, imeUporabnika: form.fullName, izkusnje: form.experience, custDrzavaMoj: form.country, obIzbor: form.areas, ponudnik: { ...(current.ponudnik || {}), ime: form.company, davcna: form.tax, email: form.email, telefon: form.phone, naslov: form.address, trr: form.bankAccount } }));
    const supabase = createClient();
    void Promise.all([saveOrganizationProfile({ name: form.company || 'Moje podjetje', tax: form.tax, email: form.email, phone: form.phone, address: form.address, bankAccount: form.bankAccount }), supabase.auth.updateUser({ data: { full_name: form.fullName } }), supabase.auth.getUser().then(({ data }) => data.user ? supabase.from('profiles').update({ full_name: form.fullName, phone: form.phone, updated_at: new Date().toISOString() }).eq('id', data.user.id) : undefined)]).catch(() => undefined);
    setNotice('Profil je shranjen in povezan s kalkulatorjem.');
  };
  /* Enak izbris kot v kalkulatorju (ponastaviVse): odstrani vse podatke orodja
     iz localStorage tega brskalnika. Racun (Supabase) ostane nedotaknjen. */
  const izbrisiVse = () => {
    if (!window.confirm('Izbrišem vse podatke tega orodja (cene, podjetja, zgodovino ponudb, profile)? Tega ni mogoče razveljaviti.')) return;
    try {
      [K_NAST, K_PROFILI, K_ARHIV, K_PODJETJA, K_LEAD, K_LOGO, 'pinart-kalk-pogoji-ok'].forEach(k => localStorage.removeItem(k));
    } catch { /* ignoriraj */ }
    window.location.reload();
  };
  return <div className={styles.page}>{notice && <div className={styles.notice} role="status">{notice}</div>}<form onSubmit={save}>
    <section className={styles.card}><header><p>01 · MOJI PODATKI</p><h2>Kdo ustvarja?</h2><span>Izkušnje in trg vplivajo na predlagane cene v kalkulatorju.</span></header><div className={styles.grid}><label>Ime ali vzdevek<input value={form.fullName} onChange={e => field('fullName', e.target.value)} /></label><label>Izkušnje<select value={form.experience} onChange={e => field('experience', e.target.value)}><option value="student">Študent</option><option value="zacetnik">Začetnik · do 3 leta</option><option value="samostojen">Samostojen · 3–8 let</option><option value="strokovnjak">Strokovnjak · 8+ let</option><option value="ekspert">Ekspert · prepoznano ime</option></select></label><label>Država oziroma trg<input value={form.country} onChange={e => field('country', e.target.value)} placeholder="npr. Slovenija" /></label></div><div className={styles.areas}><strong>Področja dela</strong><div>{AREAS.map(([id, label]) => <button type="button" key={id} data-active={form.areas.includes(id)} onClick={() => toggleArea(id)}>{form.areas.includes(id) ? '✓ ' : '+ '}{label}</button>)}</div></div></section>
    <section className={styles.card}><header><p>02 · MOJE PODJETJE</p><h2>Podatki na dokumentih.</h2><span>Uporabijo se v ponudbah, pogodbah in računih.</span></header><div className={styles.grid}><label>Ime podjetja<input value={form.company} onChange={e => field('company', e.target.value)} /></label><label>Davčna številka<input value={form.tax} onChange={e => field('tax', e.target.value)} /></label><label>E-pošta<input type="email" value={form.email} onChange={e => field('email', e.target.value)} /></label><label>Telefon<input value={form.phone} onChange={e => field('phone', e.target.value)} /></label><label>Naslov<input value={form.address} onChange={e => field('address', e.target.value)} /></label><label>TRR<input value={form.bankAccount} onChange={e => field('bankAccount', e.target.value)} /></label></div></section>
    <div className={styles.actions}><button type="submit">Shrani profil</button><Link href={`${base}/kalkulator/ceniki`}>Moji ceniki</Link><Link href={`${base}/kalkulator/stroski`}>Moji stroški</Link><button className={styles.logout} type="button" onClick={() => void createClient().auth.signOut().then(() => { window.location.href = `${base}/kalkulator/prijava`; })}>Odjava</button></div>
  </form>
    {/* Videz dokumentov (prej samostojna postavka "Dizajn" v meniju) je zdaj tu, pod profilom. */}
    <section className={styles.card}>
      <header><p>03 · VIDEZ DOKUMENTOV</p><h2>Barva in pisava dokumentov.</h2><span>Skupni videz vseh dokumentov — ponudb, pogodb in računov. Enako lahko urediš tudi ob generiranem dokumentu.</span></header>
      <div className={styles.actions}><Link href={`${base}/kalkulator/nastavitve`}>Uredi videz dokumentov</Link></div>
    </section>
    {/* Delovna prisotnost je zapis o OSEBI (kdaj je bila na delu), ne o projektu,
        zato zivi pri profilu in ne v meniju Nacrt. Isti vzorec kot Videz
        dokumentov zgoraj: kartica pojasni, urejanje pa je na svoji strani. */}
    <section className={styles.card}>
      <header><p>04 · DELOVNA PRISOTNOST</p><h2>Kdaj je delo potekalo.</h2><span>Prihod, odmor in odhod po ZEPDSV. Zapis je vezan nate, ne na projekt — koliko je delo na projektu stalo, meri Štoparica.</span></header>
      <div className={styles.actions}><Link href={`${base}/kalkulator/evidenca-casa`}>Odpri delovno prisotnost</Link></div>
    </section>
    {/* Nevarno obmocje — preneseno iz Nastavitev (Dizajn). Na dnu profila. */}
    <section className={`${styles.card} ${styles.nevarno}`}>
      <h2>Izbriši vse podatke</h2>
      <p className={styles.nevarnoOpis}>Odstrani cene, podjetja, stranke, zgodovino ponudb in profile iz tega brskalnika. Tvoj račun ostane — izbrišejo se samo podatki orodja. Tega ni mogoče razveljaviti.</p>
      <button type="button" className={styles.gumbNevaren} onClick={izbrisiVse}>Izbriši vse podatke</button>
    </section>
  </div>;
}
