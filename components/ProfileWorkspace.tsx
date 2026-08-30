'use client';

import Link from 'next/link';
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
    setNotice(L('Profil je shranjen in povezan s kalkulatorjem.', 'Your profile has been saved and linked to the calculator.'));
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
  return <div className={styles.page}>{notice && <div className={styles.notice} role="status">{notice}</div>}<form onSubmit={save}>
    <section className={styles.card}><header><p>{L('01 · MOJI PODATKI', '01 · MY DETAILS')}</p><h2>{L('Kdo ustvarja?', 'Who is creating?')}</h2><span>{L('Izkušnje in trg vplivajo na predlagane cene v kalkulatorju.', 'Your experience and market affect the prices suggested by the calculator.')}</span></header><div className={styles.grid}><label>{L('Ime ali vzdevek', 'Name or nickname')}<input value={form.fullName} onChange={e => field('fullName', e.target.value)} /></label><label>{L('Izkušnje', 'Experience')}<select value={form.experience} onChange={e => field('experience', e.target.value)}><option value="student">{L('Študent', 'Student')}</option><option value="zacetnik">{L('Začetnik · do 3 leta', 'Beginner · up to 3 years')}</option><option value="samostojen">{L('Samostojen · 3–8 let', 'Independent · 3–8 years')}</option><option value="strokovnjak">{L('Strokovnjak · 8+ let', 'Professional · 8+ years')}</option><option value="ekspert">{L('Ekspert · prepoznano ime', 'Expert · recognised name')}</option></select></label><label>{L('Država oziroma trg', 'Country or market')}<input value={form.country} onChange={e => field('country', e.target.value)} placeholder={L('npr. Slovenija', 'e.g. United Kingdom')} /></label></div><div className={styles.areas}><strong>{L('Področja dela', 'Areas of work')}</strong><div>{AREAS.map(([id, sl, en]) => <button type="button" key={id} data-active={form.areas.includes(id)} onClick={() => toggleArea(id)}>{form.areas.includes(id) ? '✓ ' : '+ '}{L(sl, en)}</button>)}</div></div></section>
    <section className={styles.card}><header><p>{L('02 · MOJE PODJETJE', '02 · MY BUSINESS')}</p><h2>{L('Podatki na dokumentih.', 'Details shown on documents.')}</h2><span>{L('Uporabijo se v ponudbah, pogodbah in računih.', 'These details are used in proposals, contracts and invoices.')}</span></header><div className={styles.grid}><label>{L('Ime podjetja', 'Business name')}<input value={form.company} onChange={e => field('company', e.target.value)} /></label><label>{L('Davčna številka', 'Tax number')}<input value={form.tax} onChange={e => field('tax', e.target.value)} /></label><label>{L('E-pošta', 'Email')}<input type="email" value={form.email} onChange={e => field('email', e.target.value)} /></label><label>{L('Telefon', 'Phone')}<input value={form.phone} onChange={e => field('phone', e.target.value)} /></label><label>{L('Naslov', 'Address')}<input value={form.address} onChange={e => field('address', e.target.value)} /></label><label>{L('TRR', 'Bank account')}<input value={form.bankAccount} onChange={e => field('bankAccount', e.target.value)} /></label></div></section>
    <div className={styles.actions}><button type="submit">{L('Shrani profil', 'Save profile')}</button><Link href={`${base}/kalkulator/ceniki`}>{L('Moji ceniki', 'My price lists')}</Link><Link href={`${base}/kalkulator/stroski`}>{L('Moji stroški', 'My expenses')}</Link><button className={styles.logout} type="button" onClick={() => void createClient().auth.signOut().then(() => { window.location.href = `${base}/kalkulator/prijava`; })}>{L('Odjava', 'Log out')}</button></div>
  </form>
    {/* Videz dokumentov (prej samostojna postavka "Dizajn" v meniju) je zdaj tu, pod profilom. */}
    <section className={styles.card}>
      <header><p>{L('03 · VIDEZ DOKUMENTOV', '03 · DOCUMENT APPEARANCE')}</p><h2>{L('Barva in pisava dokumentov.', 'Document colour and typeface.')}</h2><span>{L('Skupni videz vseh dokumentov — ponudb, pogodb in računov. Enako lahko urediš tudi ob generiranem dokumentu.', 'A shared appearance for proposals, contracts and invoices. You can also adjust it when viewing a generated document.')}</span></header>
      <div className={styles.actions}><Link href={`${base}/kalkulator/nastavitve`}>{L('Uredi videz dokumentov', 'Edit document appearance')}</Link></div>
    </section>
    {/* Delovna prisotnost je zapis o OSEBI (kdaj je bila na delu), ne o projektu,
        zato zivi pri profilu in ne v meniju Nacrt. Isti vzorec kot Videz
        dokumentov zgoraj: kartica pojasni, urejanje pa je na svoji strani. */}
    <section className={styles.card}>
      <header><p>{L('04 · DELOVNA PRISOTNOST', '04 · WORK ATTENDANCE')}</p><h2>{L('Kdaj je delo potekalo.', 'When the work took place.')}</h2><span>{L('Prihod, odmor in odhod po ZEPDSV. Zapis je vezan nate, ne na projekt — koliko je delo na projektu stalo, meri Štoparica.', 'Record arrival, breaks and departure. The record is tied to you, not a project — use the Timer to measure the cost of project work.')}</span></header>
      <div className={styles.actions}><Link href={`${base}/kalkulator/evidenca-casa?nazaj=1`}>{L('Odpri delovno prisotnost', 'Open work attendance')}</Link></div>
    </section>
    {/* Nevarno obmocje — preneseno iz Nastavitev (Dizajn). Na dnu profila. */}
    <section className={`${styles.card} ${styles.nevarno}`}>
      <h2>{L('Izbriši vse podatke', 'Delete all data')}</h2>
      <p className={styles.nevarnoOpis}>{L('Odstrani cene, podjetja, stranke, zgodovino ponudb in profile iz tega brskalnika. Tvoj račun ostane — izbrišejo se samo podatki orodja. Tega ni mogoče razveljaviti.', 'Remove prices, companies, clients, proposal history and profiles from this browser. Your account remains — only tool data is deleted. This cannot be undone.')}</p>
      <button type="button" className={styles.gumbNevaren} onClick={izbrisiVse}>{L('Izbriši vse podatke', 'Delete all data')}</button>
    </section>
  </div>;
}
