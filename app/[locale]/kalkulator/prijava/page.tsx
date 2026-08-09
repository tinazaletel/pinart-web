import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import AuthForm from '@/components/AuthForm';
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
        <div className={styles.flowLine} aria-hidden="true"><span>01</span><span>02</span><span>03</span><span>04</span></div>
        <ul>
          <li>{jeEn ? 'Know what your work is worth — a fair price that includes copyright' : 'Ve, koliko je vredno tvoje delo — poštena cena z avtorskimi pravicami'}</li>
          <li>{jeEn ? 'Pupa, the AI assistant who knows the market and pricing' : 'Pupa, AI asistentka, ki pozna trg in ceno'}</li>
          <li>{jeEn ? 'Everything flows from the same data: proposal to invoice in one click' : 'Vse teče iz istih podatkov: ponudba v račun z enim klikom'}</li>
        </ul>
      </section>
      <AuthForm base={base} />
    </main>
  );
}
