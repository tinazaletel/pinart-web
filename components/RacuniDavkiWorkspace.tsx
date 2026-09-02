'use client';

import { useLocale } from 'next-intl';
import FursNastavitve from '@/components/FursNastavitve';
import StevilcenjeNastavitve from '@/components/StevilcenjeNastavitve';
import styles from './SettingsWorkspace.module.css';

export default function RacuniDavkiWorkspace() {
  const jeEn = useLocale() === 'en';
  return <div className={`${styles.wrap} ${styles.racuniDavki}`}>
    <StevilcenjeNastavitve jeEn={jeEn} />
    <FursNastavitve />
  </div>;
}
