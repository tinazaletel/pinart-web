'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './FlowV2Shell.module.css';

export type FlowV2Section = 'pregled' | 'delo' | 'podatki' | 'denar';

type Kartica = {
  naslov: string;
  opis: string;
  href: string;
  stevilka: string;
  ton: 'vijola' | 'zelena' | 'marelica' | 'modra';
};

const navigacija: { id: FlowV2Section; sl: string; en: string }[] = [
  { id: 'pregled', sl: 'Pregled', en: 'Overview' },
  { id: 'delo', sl: 'Delo', en: 'Work' },
  { id: 'podatki', sl: 'Podatki', en: 'Data' },
  { id: 'denar', sl: 'Denar', en: 'Money' },
];

export default function FlowV2Shell({
  base,
  active,
  eyebrow,
  naslov,
  opis,
  kartice,
  children,
}: {
  base: string;
  active: FlowV2Section;
  eyebrow: string;
  naslov: string;
  opis: string;
  kartice?: Kartica[];
  children?: ReactNode;
}) {
  const jeEn = base === '/en';

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar} aria-label={jeEn ? 'Main navigation' : 'Glavna navigacija'}>
        <Link className={styles.znamka} href={`${base}/kalkulator/v2/pregled`}>
          <span className={styles.logo} aria-hidden />
          <span>Pinart <b>FLOW</b></span>
        </Link>

        <nav className={styles.nav}>
          {navigacija.map((postavka, indeks) => (
            <Link
              key={postavka.id}
              href={`${base}/kalkulator/v2/${postavka.id}`}
              className={active === postavka.id ? styles.aktivna : undefined}
              aria-current={active === postavka.id ? 'page' : undefined}
            >
              <span>{String(indeks + 1).padStart(2, '0')}</span>
              {jeEn ? postavka.en : postavka.sl}
            </Link>
          ))}
        </nav>

        <p className={styles.namig}>{jeEn ? 'Everything your business needs, grouped by intent.' : 'Vse, kar potrebuje tvoj posel, razvrščeno po namenu.'}</p>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.mobileNav}>
          <Link className={styles.mobileBrand} href={`${base}/kalkulator/v2/pregled`}><span className={styles.logo} aria-hidden /> Flow</Link>
          <nav aria-label={jeEn ? 'Sections' : 'Področja'}>
            {navigacija.map(postavka => (
              <Link key={postavka.id} href={`${base}/kalkulator/v2/${postavka.id}`} aria-current={active === postavka.id ? 'page' : undefined}>
                {jeEn ? postavka.en : postavka.sl}
              </Link>
            ))}
          </nav>
        </header>

        <div className={styles.vsebina}>
          <header className={styles.uvod}>
            <p>{eyebrow}</p>
            <h1>{naslov}</h1>
            <span>{opis}</span>
          </header>

          {children}

          {kartice && (
            <div className={styles.mreza}>
              {kartice.map(kartica => (
                <Link key={kartica.href} href={`${base}${kartica.href}`} className={`${styles.kartica} ${styles[kartica.ton]}`}>
                  <span className={styles.stevilka}>{kartica.stevilka}</span>
                  <span className={styles.puscica} aria-hidden>↗</span>
                  <h2>{kartica.naslov}</h2>
                  <p>{kartica.opis}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
