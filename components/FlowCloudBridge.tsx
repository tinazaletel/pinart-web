'use client';

import { useEffect } from 'react';
import { loadFlowData, writeFlowDataLocally } from '@/lib/pinartFlowStore';
import { loadCloudSettings, loadOrganizationProfile, mergeFlowData, pullFlowData, pushFlowData, saveCloudSettings, saveOrganizationProfile } from '@/lib/pinartFlowCloud';

const SESSION_KEY = 'pinart-flow-cloud-bridge-v1';

export default function FlowCloudBridge() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'done') return;
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

    void synchronize();
    return () => { cancelled = true; };
  }, []);

  return null;
}
