import Link from 'next/link';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Zaslon namesto zaklenjene funkcije.
 *
 * Namenoma NI prazna stran z opozorilom: kdor pride sem, je ravno pokazal
 * zanimanje za to funkcijo, zato mu pokazemo, kaj dela in kaj mu prihrani.
 * To je najmocnejsa prodajna tocka v aplikaciji — in edina, ki je ne
 * kaze nikomur, ki je ni sam poiskal.
 */

export type ZaklenjenaFunkcija = 'contracts' | 'expenses' | 'businessInsights' | 'accountingExport' | 'aiConnector';

const VSEBINA: Record<ZaklenjenaFunkcija, { naslov: string; uvod: string; tocke: string[] }> = {
  contracts: {
    naslov: 'Pogodbe',
    uvod: 'Iz sprejete ponudbe nastane pogodba, ki jo lahko pošlješ v podpis — brez prepisovanja in brez iskanja starih predlog.',
    tocke: [
      'Pogodba se izpolni iz ponudbe: obseg, cena, roki, avtorske pravice',
      'Prenos pravic je zapisan po zakonu, ne po občutku',
      'Vsaka pogodba je povezana s projektom in računom',
    ],
  },
  expenses: {
    naslov: 'Stroški',
    uvod: 'Šele ko so stroški zraven, veš, koliko ti je projekt res prinesel.',
    tocke: [
      'Projektni in poslovni stroški ločeno',
      'Redni mesečni stroški postanejo osnova za tvojo urno vrednost',
      'Dobiček po projektu in po stranki, ne samo promet',
    ],
  },
  businessInsights: {
    naslov: 'Cilji, čas in poslovni okvir',
    uvod: 'Koliko moraš zaslužiti, koliko ur imaš, in ali se ti je delo po tej ceni res splačalo.',
    tocke: [
      'Mesečni cilj iz želenega dohodka, stroškov in rezerv',
      'Vzdržna urna vrednost — koliko mora biti vredna tvoja ura',
      'Merjenje časa in dejanska urna vrednost po projektu',
    ],
  },
  accountingExport: {
    naslov: 'Izvoz za računovodstvo',
    uvod: 'Enkrat na mesec ali četrtletje gre vse računovodkinji samo, brez tvojega brskanja po mapah.',
    tocke: [
      'Računi in stroški v enem paketu',
      'Samodejno pošiljanje po urniku',
      'Vsak dokument s prilogo, kot ga potrebuje računovodstvo',
    ],
  },
  aiConnector: {
    naslov: 'AI asistent',
    uvod: 'Pomoč pri besedilu ponudbe in pri odgovoru stranki, ki se pogaja o ceni.',
    tocke: [
      'Predlog besedila ponudbe iz tvojih vnosov',
      'Odgovor na ugovor o ceni, v tvojem tonu',
      'Povzetek projekta za pogodbo',
    ],
  },
};

export default function Zaklenjeno({ funkcija, base }: { funkcija: ZaklenjenaFunkcija; base: string }) {
  const v = VSEBINA[funkcija];

  return (
    <div className={styles.zaklenjeno}>
      <p className={styles.eyebrow}>V PLAČLJIVEM PAKETU</p>
      <h2>{v.naslov}</h2>
      <p className={styles.zaklenjenoUvod}>{v.uvod}</p>

      <ul className={styles.zaklenjenoSeznam}>
        {v.tocke.map(t => <li key={t}>{t}</li>)}
      </ul>

      <div className={styles.zaklenjenoGumbi}>
        <Link className={styles.zaklenjenoGlavni} href={`${base}/kalkulator/paket`}>Poglej cenik</Link>
        <Link className={styles.zaklenjenoDrugi} href={`${base}/kalkulator/pregled`}>Nazaj na nadzorno ploščo</Link>
      </div>

      <p className={styles.zaklenjenoOpomba}>
        Kalkulator cene, ponudbe in stranke ostanejo brezplačni. Plačaš šele, ko rabiš tudi to.
      </p>
    </div>
  );
}
