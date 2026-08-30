import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import BusinessPlanWorkspace from '@/components/BusinessPlanWorkspace';
import NazajLink from '@/components/NazajLink';
import styles from '../pregled/pregled.module.css';

export const metadata: Metadata = { title: 'Evidenca delovnega časa | Pinart Flow', robots: { index: false, follow: false } };

/* Evidenca po ZEPDSV je ZAKONSKA obveznost, ne poslovna analitika, zato NI za
   ključavnico (za razliko od Cilji/Čas/Poslovni okvir, ki so businessInsights).
   Kdor mora voditi evidenco, jo mora voditi tudi na brezplačnem paketu. */
export default async function EvidencaCasaPage(
  { params, searchParams }: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ nazaj?: string }>;
  },
) {
  const { locale } = await params;
  /* »Nazaj« se pokaže SAMO, če si prišla od nekod (npr. s Profila), ne pa, če
     si stran odprla iz levega menija — tam nazaj ni kam (Tina, 30. 8. 2026).
     Kdo te je poslal, pove povezava sama (?nazaj=1); brskalnikova zgodovina
     tega ne loči, ker je tudi klik v meniju navigacija. */
  const { nazaj } = await searchParams;
  setRequestLocale(locale);
  const base = locale === 'sl' ? '' : `/${locale}`;
  const jeEn = locale === 'en';

  return (
    <main className={styles.shell}>
      <DashboardSidebar base={base} active="evidenca" />
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            {/* Povezava sodi V glavo, ne nadnjo: zunaj nje je stala ob levem robu
                delovne povrsine in ni bila poravnana z naslovom (Tina, 25. 8.). */}
            {nazaj && <NazajLink rezerva="/kalkulator/profil" label={jeEn ? 'Back' : 'Nazaj'} />}
            <p className={styles.eyebrow}>{jeEn ? 'WORKING TIME RECORDS' : 'EVIDENCA DELOVNEGA ČASA'}</p>
            <h1>{jeEn ? 'When the work actually happened.' : 'Kdaj je delo res potekalo.'}</h1>
          </div>
        </header>
        {/* Vpis prihoda in odhoda je bil doslej na strani Stoparice; sodi sem,
            k Prisotnosti. Kartica ze vsebuje mesecno tabelo z barvnimi znackami
            in izvoz za HR, zato EvidencaCasa (druga, suhoparna tabela istega
            meseca) tu odpade — podvajali sta se. */}
        <BusinessPlanWorkspace view="prisotnost" />
      </section>
    </main>
  );
}
