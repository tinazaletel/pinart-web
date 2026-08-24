'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadFlowData, writeFlowDataLocally } from '@/lib/pinartFlowStore';
import { loadCloudSettings, loadOrganizationProfile, mergeFlowData, pullFlowData, pushFlowData, saveCloudSettings, saveOrganizationProfile } from '@/lib/pinartFlowCloud';
import { pushProjekti, sinhronizirajProjekte } from '@/lib/projektiOblak';
import { pushEvidencaCasa, sinhronizirajEvidencoCasa } from '@/lib/evidencaCasaOblak';
import { pushDokVidez, sinhronizirajDokVidez } from '@/lib/dokVidezOblak';
import { pushNaloge, sinhronizirajNaloge } from '@/lib/nalogeOblak';
import { pushSestanki, sinhronizirajSestanke } from '@/lib/sestankiOblak';
import { pushDnevnik, sinhronizirajDnevnik } from '@/lib/dnevnikOblak';
import { pushKataloge, sinhronizirajKataloge } from '@/lib/katalogiOblak';
import {
  pushKlepet, pushMarketing, pushKomObvestila, pushPostaDnevnik, pushPupaNastavitve,
  sinhronizirajKlepet, sinhronizirajMarketing, sinhronizirajKomObvestila,
  sinhronizirajPostaDnevnik, sinhronizirajPupaNastavitve,
} from '@/lib/preostaleShrambeOblak';
import { createClient } from '@/utils/supabase/client';
import { nastaviPredogled } from '@/lib/predogled';

const SESSION_KEY = 'pinart-flow-cloud-bridge-v1';
/* ločen ključ: sinhronizacija projektov teče ob vsakem nalaganju, omejena je le
   osvežitev strani (največ ena na sejo) */
const SESSION_KEY_PROJEKTI = 'pinart-flow-projekti-reload-v1';
const MARKER_UPORABNIK = 'pinart-zadnji-uporabnik';

/* Nov ali DRUG racun na tem brskalniku NE sme podedovati prejsnjega stanja:
   - predogled ("Demo"/"Zacetek") je globalen v localStorage -> nov uporabnik bi
     sicer videl izmisljeno ekipo/stranke/stroske (prijavil bi se in mislil, da so
     to tuji podatki). Zato ga ob novem/drugem racunu ponastavimo na 'mine'.
   - ob PREKLOPU racuna (druga oseba na istem brskalniku) pocistimo lokalne
     'pinart-*' podatke PRED sinhronizacijo, da se ne prenesejo (bleed) v nov racun.
   Prvi vpis na tem brskalniku (stored=null) NE brise -> ohrani migracijo iz
   brezplacnega kalkulatorja (localStorage -> oblak). */
async function poravnajRacun(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const stored = localStorage.getItem(MARKER_UPORABNIK);
    if (stored === user.id) return; // isti racun -> nic
    if (stored && stored !== user.id) {
      /* PREKLOP racuna: pobrisi vse lokalne flow kljuce (razen markerja/piskotkov).
         POZOR na dve predponi: vecina kljucev je "pinart-", shrambe projektov,
         nalog in sestankov pa so "pinflow_". Ko je pravilo lovilo samo prvo, so
         projekti in naloge prejsnjega racuna ostali v brskalniku in jih je videl
         naslednji prijavljeni — najdeno 19. 8. 2026 na telefonu. Novih kljucev
         zato NE poimenuj mimo teh dveh predpon. */
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || k === MARKER_UPORABNIK || k === 'pinart_cookie_consent') continue;
        if (k.startsWith('pinart-') || k.startsWith('pinflow')) localStorage.removeItem(k);
      }
    }
    nastaviPredogled('mine');                  // vedno pokazi PRAVE (prazne) podatke
    localStorage.setItem(MARKER_UPORABNIK, user.id);
  } catch { /* poravnava racuna ni kriticna za delovanje */ }
}

export default function FlowCloudBridge() {
  /* Prva sinhronizacija v seji lahko konca z window.location.reload() (spodaj), ker
     komponente berejo localStorage ob montazi in dogodka o spremembi NIHCE ne poslusa.
     Brez prekrivala uporabnik to vidi kot utrip: stran se pokaze -> izgine -> pokaze.
     Zato med prvo sinhronizacijo pokrijemo vsebino z mirnim zaslonom. */
  const [sinhronizira, setSinhronizira] = useState(false);
  /* Prekrivalo prizgemo PRED prvim izrisom (useLayoutEffect tece pred risanjem),
     sicer uporabnica vidi vsebino -> prekrivalo -> po osvezitvi spet vsebino,
     kar izgleda kot dvojno nalaganje. Zdaj vidi le prekrivalo in nato vsebino. */
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) !== 'done') setSinhronizira(true);
    } catch { /* zasebno okno */ }
  }, []);
  useEffect(() => {
    let cancelled = false;

    async function synchronize(): Promise<boolean> {
      try {
        const local = loadFlowData();
        const cloud = await pullFlowData();
        if (!cloud || cancelled) return false;
        const cloudSettings = await loadCloudSettings();
        const isLegacyMigrationComplete = Boolean(cloudSettings?.legacyMigrationCompletedAt);
        const merged = isLegacyMigrationComplete ? cloud : mergeFlowData(cloud, local);
        const before = JSON.stringify(local);
        writeFlowDataLocally(merged);
        if (!isLegacyMigrationComplete) await pushFlowData(merged);

        const localSettings = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}');
        const localGoalSettings = JSON.parse(localStorage.getItem('pinart-dashboard-goal-settings') || '{}');
        const localPriceProfiles = JSON.parse(localStorage.getItem('pinart-kalkulator-profili') || '{}');
        const cloudOrganization = await loadOrganizationProfile();
        const localOrganization = localSettings.ponudnik || {};
        let synchronizedSettings = localSettings;
        if (isLegacyMigrationComplete && cloudOrganization) {
          synchronizedSettings = { ...localSettings, ponudnik: { ...localOrganization, ime: cloudOrganization.name, davcna: cloudOrganization.tax || '', naslov: cloudOrganization.address || '', email: cloudOrganization.email || '', telefon: cloudOrganization.phone || '', trr: cloudOrganization.bankAccount || '' } };
          localStorage.setItem('pinart-kalkulator-v2', JSON.stringify(synchronizedSettings));
        } else if (localOrganization.ime) {
          await saveOrganizationProfile({ name: localOrganization.ime, tax: localOrganization.davcna, address: localOrganization.naslov, email: localOrganization.email, phone: localOrganization.telefon, bankAccount: localOrganization.trr });
        }
        if (cloudSettings) {
          if (isLegacyMigrationComplete) {
            localStorage.setItem('pinart-dashboard-goal', String(cloudSettings.monthlyGoal));
            localStorage.setItem('pinart-dashboard-goal-settings', JSON.stringify({ desiredIncome: cloudSettings.desiredIncome, reservePercent: cloudSettings.reservePercent }));
            localStorage.setItem('pinart-kalkulator-v2', JSON.stringify({ ...synchronizedSettings, stroski: cloudSettings.recurringCosts, aktivniCenik: cloudSettings.activePriceProfile || synchronizedSettings.aktivniCenik }));
            localStorage.setItem('pinart-kalkulator-profili', JSON.stringify(cloudSettings.priceProfiles));
          } else {
            await saveCloudSettings({
              monthlyGoal: Number(localStorage.getItem('pinart-dashboard-goal')) || cloudSettings.monthlyGoal,
              desiredIncome: Number(localGoalSettings.desiredIncome) || cloudSettings.desiredIncome,
              reservePercent: Number(localGoalSettings.reservePercent) || cloudSettings.reservePercent,
              recurringCosts: Array.isArray(localSettings.stroski) ? localSettings.stroski : cloudSettings.recurringCosts,
              priceProfiles: Object.keys(localPriceProfiles).length ? localPriceProfiles : cloudSettings.priceProfiles,
              activePriceProfile: localSettings.aktivniCenik || cloudSettings.activePriceProfile,
              legacyMigrationCompletedAt: new Date().toISOString(),
            });
          }
        } else {
          await saveCloudSettings({
            monthlyGoal: Number(localStorage.getItem('pinart-dashboard-goal')) || 5000,
            desiredIncome: Number(localGoalSettings.desiredIncome) || 2000,
            reservePercent: Number(localGoalSettings.reservePercent) || 20,
            recurringCosts: Array.isArray(localSettings.stroski) ? localSettings.stroski : [],
            priceProfiles: localPriceProfiles,
            activePriceProfile: localSettings.aktivniCenik,
            legacyMigrationCompletedAt: new Date().toISOString(),
          });
        }
        sessionStorage.setItem(SESSION_KEY, 'done');
        window.dispatchEvent(new CustomEvent('pinart-flow-change', { detail: { key: 'all' } }));
        return before !== JSON.stringify(merged);
        return false;
      } catch (error) {
        console.error('Pinart Flow initial cloud sync:', error);
        window.dispatchEvent(new CustomEvent('pinart-flow-sync-error'));
        return false;
      }
    }

    (async () => {
      await poravnajRacun();                 // VEDNO: nov/drug racun ne podeduje stanja
      if (cancelled) return;

      /* Podatki se sinhronizirajo enkrat na sejo, projekti (lahka poizvedba) ob
         vsakem nalaganju. Oboje tece POD prekrivalom in konca z NAJVEC ENO
         osvezitvijo — locena ucinka sta stran nalozila dvakrat in to se je
         videlo kot dvojni skok po prijavi. */
      /* Prekrivalo SAMO ob prvi sinhronizaciji v seji (po prijavi), ko je zaslon
         itak prazen in se konca s ponovnim nalozenjem. Ob navadnem osvezevanju
         strani sinhronizacija tece TIHO v ozadju — sicer vsak F5 pokrije zaslon,
         cetudi ni kaj pokazati. */
      const prvaVSeji = sessionStorage.getItem(SESSION_KEY) !== 'done';
      if (!cancelled && prvaVSeji) setSinhronizira(true);   /* ze prizgano v useLayoutEffect; tu le za varnost */

      let osveziti = false;
      if (prvaVSeji) osveziti = await synchronize();

      /* Vse lahke shrambe (projekti, naloge, sestanki, dnevnik, katalogi, videz
         dokumentov) tecejo ob VSAKEM nalaganju — vsaka je ena poizvedba. Vzporedno,
         ker so med sabo neodvisne; ce ena pade, ostale to prezrejo. */
      const izidi = await Promise.allSettled([
        sinhronizirajProjekte(),
        sinhronizirajEvidencoCasa(),
        sinhronizirajNaloge(),
        sinhronizirajSestanke(),
        sinhronizirajDnevnik(),
        sinhronizirajKataloge(),
        sinhronizirajDokVidez(),
        /* zadnjih pet shramb (Codex, 20. 8.): klepet, marketing, obvestila,
           poštni dnevnik, Pupine nastavitve — s tem ni več ničesar samo v brskalniku */
        sinhronizirajKlepet(),
        sinhronizirajMarketing(),
        sinhronizirajKomObvestila(),
        sinhronizirajPostaDnevnik(),
        sinhronizirajPupaNastavitve(),
      ]);
      izidi.forEach(i => { if (i.status === 'rejected') console.error('Sinhronizacija shrambe ni uspela:', i.reason); });
      const projektiSpremenjeni = izidi.some(i => i.status === 'fulfilled' && i.value === true);
      if (projektiSpremenjeni && sessionStorage.getItem(SESSION_KEY_PROJEKTI) !== 'done') {
        sessionStorage.setItem(SESSION_KEY_PROJEKTI, 'done');
        osveziti = true;
      }

      if (cancelled) return;
      if (osveziti) { window.location.reload(); return; }   // prekrivalo ostane do naklada
      setSinhronizira(false);
    })();
    return () => { cancelled = true; };
  }, []);

  /* Sproten prenos v oblak: vsaka shramba ob zapisu odda svoj dogodek, mi pa
     z zamikom posljemo SAMO njo — zamik zato, da hitro zaporedje urejanj
     (tipkanje v briefu) ne sprozi klica ob vsakem pritisku tipke. */
  useEffect(() => {
    const poDogodku: Record<string, () => Promise<unknown>> = {
      'pinart-projekti-change': pushProjekti,
      'pinart-evidenca-casa-change': pushEvidencaCasa,
      'pinart-naloge-change': pushNaloge,
      'pinart-sestanki-change': pushSestanki,
      'pinart-dnevnik-change': pushDnevnik,
      'pinart-katalogi-change': pushKataloge,
      'pinart-dokvidez-change': pushDokVidez,
      'pinart-klepet-local-change': pushKlepet,
      'pinart-marketing-change': pushMarketing,
      'pinart-kom-obvestila-change': pushKomObvestila,
      'pinart-posta-dnevnik-change': pushPostaDnevnik,
      'pupa:stanje': pushPupaNastavitve,
    };
    const cakalci = new Map<string, ReturnType<typeof setTimeout>>();
    const posluhi = Object.keys(poDogodku).map(ime => {
      const h = () => {
        const prej = cakalci.get(ime);
        if (prej) clearTimeout(prej);
        cakalci.set(ime, setTimeout(() => { poDogodku[ime]().catch(() => { }); }, 1500));
      };
      window.addEventListener(ime, h);
      return [ime, h] as const;
    });
    return () => {
      posluhi.forEach(([ime, h]) => window.removeEventListener(ime, h));
      cakalci.forEach(c => clearTimeout(c));
    };
  }, []);

  if (!sinhronizira || typeof document === 'undefined') return null;
  /* PORTAL na <body>: bridge zivi v stranskem meniju, ki s svojim slogom
     ujame position: fixed — prekrivalo je zato pokrilo SAMO meni, vsebina
     desno pa je bila vidna in je nato ob osvezitvi izginila in prisla nazaj
     (Tina, 24. 8.: "izpade kot napaka in vzbuja nezaupanje"). Isti vzorec
     kot DokPanel: fixed rabi portal. */
  return createPortal(
    <div aria-live="polite" style={{
      position: 'fixed', inset: 0, zIndex: 2147483647,
      display: 'flex', flexDirection: 'column', gap: '1.1rem',
      alignItems: 'center', justifyContent: 'center',
      background: '#F5F2EA', color: '#6f675e',
      font: '500 .95rem/1.5 system-ui, -apple-system, sans-serif', letterSpacing: '.02em',
    }}>
      <style>{`@keyframes pwPripravaUtrip { 0%, 100% { transform: scale(1); opacity: .85; } 50% { transform: scale(1.12); opacity: 1; } }`}</style>
      <span aria-hidden style={{
        width: '2.6rem', height: '2.6rem', borderRadius: '50%',
        background: 'conic-gradient(from 210deg, #f6b73c, #ef6553, #c65e8f, #7c6bd6, #4fa5c9, #64b98c, #f6b73c)',
        filter: 'saturate(1.15)', animation: 'pwPripravaUtrip 1.6s ease-in-out infinite',
      }} />
      Pripravljam tvoje podatke …
    </div>,
    document.body,
  );
}
