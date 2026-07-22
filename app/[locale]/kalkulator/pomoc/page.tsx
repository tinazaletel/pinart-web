import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Pomoč | Pinart Flow', robots: { index: false, follow: false } };

/**
 * Zaenkrat razdelilnik, ne baza znanja: pot do odgovora in do mene.
 * Ko bo bot pripravljen, pride sem — do takrat naj nihce ne obtici.
 */
export default async function PomocPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;

  const kartice = [
    { naslov: 'Kako Flow deluje', opis: 'Pregled orodij in kaj katero naredi.', href: `${base}/flow`, zunanja: false },
    { naslov: 'Kako nastaviš ceno', opis: 'Odpri kalkulator in pojdi skozi vprašanja.', href: `${base}/kalkulator/orodje`, zunanja: false },
    { naslov: 'Pogoji in zasebnost', opis: 'Kaj hranimo in česa ne.', href: `${base}/kalkulator/pogoji`, zunanja: false },
  ];

  return <main className={styles.shell}>
    <DashboardSidebar base={base} active="settings" />
    <section className={styles.workspace}>
      <header className={styles.topbar}>
        <div><p className={styles.eyebrow}>POMOČ</p><h1>Kje si obtičala?</h1></div>
      </header>

      <div className={styles.pomocMreza}>
        {kartice.map(k => (
          <Link key={k.naslov} href={k.href} className={styles.pomocKartica}>
            <strong>{k.naslov}</strong>
            <span>{k.opis}</span>
          </Link>
        ))}
      </div>

      <div className={styles.pomocPisi}>
        <strong>Kontakt</strong>
        <p>Nisi našla odgovora? Piši mi — odgovarjam osebno, ne prek podpore.</p>
        <a href="mailto:tina@pinart.si?subject=Pinart%20Flow%20%E2%80%94%20pomo%C4%8D">tina@pinart.si</a>
      </div>
    </section>
  </main>;
}
