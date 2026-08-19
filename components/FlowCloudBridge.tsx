'use client';

import { useEffect, useState } from 'react';
import { loadFlowData, writeFlowDataLocally } from '@/lib/pinartFlowStore';
import { loadCloudSettings, loadOrganizationProfile, mergeFlowData, pullFlowData, pushFlowData, saveCloudSettings, saveOrganizationProfile } from '@/lib/pinartFlowCloud';
import { pushProjekti, sinhronizirajProjekte } from '@/lib/projektiOblak';
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
  useEffect(() => {
    let cancelled = false;

    async function synchronize() {
      try {
        const local = loadFlowData();
        const cloud = await pullFlowData();
        if (!cloud || cancelled) return;
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
        if (before !== JSON.stringify(merged) && !cancelled) window.location.reload();
      } catch (error) {
        console.error('Pinart Flow initial cloud sync:', error);
        window.dispatchEvent(new CustomEvent('pinart-flow-sync-error'));
      }
    }

    (async () => {
      await poravnajRacun();                 // VEDNO: nov/drug racun ne podeduje stanja
      if (cancelled) return;
      if (sessionStorage.getItem(SESSION_KEY) === 'done') return;  // sync le enkrat na sejo
      if (!cancelled) setSinhronizira(true);
      await synchronize();
      if (!cancelled) setSinhronizira(false);
    })();
    return () => { cancelled = true; };
  }, []);

  /* Projekti imajo lastno, lahko shrambo (lib/projekti), zato njihova
     sinhronizacija NI vezana na enkratno sejno sinhronizacijo zgoraj — teče ob
     vsakem odprtju strani. Ena poizvedba, zato je to poceni, in projekt,
     ustvarjen na drugi napravi, se pokaže brez ponovne prijave. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const spremenjeno = await sinhronizirajProjekte();
      if (cancelled || !spremenjeno) return;
      /* Prišlo je nekaj novega iz oblaka. Stran osvežimo NAJVEČ enkrat na sejo,
         sicer bi se ob vsakem nalaganju vrtela v krogu. */
      if (sessionStorage.getItem(SESSION_KEY_PROJEKTI) === 'done') return;
      sessionStorage.setItem(SESSION_KEY_PROJEKTI, 'done');
      window.location.reload();
    })();
    return () => { cancelled = true; };
  }, []);

  /* Sproten prenos projektov v oblak: shramba javi spremembo (lib/projekti),
     mi pa jo z zamikom pošljemo — zamik zato, da hitro zaporedje urejanj
     (tipkanje v briefu) ne sproži klica ob vsakem pritisku tipke. */
  useEffect(() => {
    let cakalec: ReturnType<typeof setTimeout> | undefined;
    const naSpremembo = () => {
      if (cakalec) clearTimeout(cakalec);
      cakalec = setTimeout(() => { pushProjekti().catch(() => { }); }, 1500);
    };
    window.addEventListener('pinart-projekti-change', naSpremembo);
    return () => {
      window.removeEventListener('pinart-projekti-change', naSpremembo);
      if (cakalec) clearTimeout(cakalec);
    };
  }, []);

  if (!sinhronizira) return null;
  return (
    <div aria-live="polite" style={{
      /* Najvisji mozni sloj: cez prekrivalo je gledala Pupina ikona iz
         glave, ki ima svoj z-index. Med pripravo podatkov ne sme biti
         vidno nic — zaslon je takrat se prazen. */
      position: 'fixed', inset: 0, zIndex: 2147483647,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F2EA', color: '#8a8177',
      font: '500 .9rem/1.5 system-ui, -apple-system, sans-serif', letterSpacing: '.02em',
    }}>
      Pripravljam tvoje podatke …
    </div>
  );
}
