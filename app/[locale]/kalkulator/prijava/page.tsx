import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import AuthForm from '@/components/AuthForm';
import PrijavaIzlozba from '@/components/PrijavaIzlozba';
import styles from './prijava.module.css';

export const metadata: Metadata = {
  title: 'Prijava | Pinart Flow',
  description: 'Prijava v poslovni pregled Pinart Flow.',
  robots: { index: false, follow: false },
};

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  const jeEn = locale === 'en';

  return (
    <main className={styles.page}>
      <a className={styles.brand} href={`${base}/kalkulator`} aria-label="Pinart Flow">
        <i aria-hidden="true" />
        <strong>Pinart</strong>
        <span>FLOW</span>
        <small>BETA</small>
      </a>
      <section className={styles.intro}>
        <p>PINART FLOW</p>
        <h2>{jeEn ? <>One workspace<br />instead of four.</> : <>En program<br />namesto štirih.</>}</h2>
        <p className={styles.lead}>{jeEn ? 'Proposals, contracts, invoices, expenses, price lists and tasks — all in one place. No more jumping between Excel, Canva, ChatGPT and Gmail.' : 'Ponudbe, pogodbe, računi, stroški, ceniki in naloge — vse na enem mestu. Nič več skakanja med Excelom, Canvo, ChatGPT in Gmailom.'}</p>
        <PrijavaIzlozba jeEn={jeEn} />
      </section>
      <AuthForm base={base} />
    </main>
  );
}
