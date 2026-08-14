import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import PupaPogovor from '@/components/PupaPogovor';
import styles from '../../pregled/pregled.module.css';

/* Faza 2a: pogovor s Pupo LEVO, živ osnutek ponudbe DESNO. Nova stran; obstoječe
   nedotaknjene. Vstop iz PupaDom (»Začni«) z ?namig=... Glej memory: project_pupa_prvi_vmesnik. */

export const metadata: Metadata = {
  title: 'Pupa — pogovor | Pinart Flow',
  description: 'Povej, kaj želiš — Pupa sproti pripravlja osnutek ponudbe.',
  robots: { index: false, follow: false },
};

export default async function PupaPogovorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="dom" />
      <section className={styles.workspace}>
        <PupaPogovor base={base} />
      </section>
    </main>
  );
}
