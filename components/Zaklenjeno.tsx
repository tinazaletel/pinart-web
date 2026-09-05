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

const VSEBINA: Record<ZaklenjenaFunkcija, { naslov: string; naslovEn: string; uvod: string; uvodEn: string; tocke: string[]; tockeEn: string[] }> = {
  contracts: {
    naslov: 'Pogodbe',
    naslovEn: 'Contracts',
    uvod: 'Iz sprejete ponudbe nastane pogodba, ki jo lahko pošlješ v podpis — brez prepisovanja in brez iskanja starih predlog.',
    uvodEn: 'An accepted quote becomes a contract you can send for signing — no retyping, no digging for old templates.',
    tocke: [
      'Pogodba se izpolni iz ponudbe: obseg, cena, roki, avtorske pravice',
      'Prenos pravic je zapisan po zakonu, ne po občutku',
      'Vsaka pogodba je povezana s projektom in računom',
    ],
    tockeEn: [
      'The contract fills itself from the quote: scope, price, deadlines, rights',
      'Transfer of rights written by law, not by feel',
      'Every contract linked to its project and invoice',
    ],
  },
  expenses: {
    naslov: 'Stroški',
    naslovEn: 'Costs',
    uvod: 'Šele ko so stroški zraven, veš, koliko ti je projekt res prinesel.',
    uvodEn: 'Only with costs included do you know what a project actually earned you.',
    tocke: [
      'Projektni in poslovni stroški ločeno',
      'Redni mesečni stroški postanejo osnova za tvojo urno vrednost',
      'Dobiček po projektu in po stranki, ne samo promet',
    ],
    tockeEn: [
      'Project and business costs kept apart',
      'Recurring monthly costs become the basis of your hourly value',
      'Profit per project and per client, not just turnover',
    ],
  },
  businessInsights: {
    naslov: 'Cilji, čas in poslovni okvir',
    naslovEn: 'Goals, time and the business picture',
    uvod: 'Koliko moraš zaslužiti, koliko ur imaš, in ali se ti je delo po tej ceni res splačalo.',
    uvodEn: 'How much you need to earn, how many hours you have, and whether the work paid off at that price.',
    tocke: [
      'Mesečni cilj iz želenega dohodka, stroškov in rezerv',
      'Vzdržna urna vrednost — koliko mora biti vredna tvoja ura',
      /* merjenje samo je brezplacno — placljiva je zgodovina, ki iz njega nastane */
      'Zgodovina ur po dnevih in projektih, tudi leta nazaj',
      'Dejanska urna vrednost po projektu in izvoz v CSV',
    ],
    tockeEn: [
      'A monthly goal from your desired income, costs and reserves',
      'A sustainable hourly value — what your hour has to be worth',
      'History of hours by day and project, years back',
      'Actual hourly value per project and CSV export',
    ],
  },
  accountingExport: {
    naslov: 'Izvoz za računovodstvo',
    naslovEn: 'Export for accounting',
    uvod: 'Enkrat na mesec ali četrtletje gre vse računovodstvu samo, brez tvojega brskanja po mapah.',
    uvodEn: 'Once a month or quarter everything goes to your accountant on its own, without you digging through folders.',
    tocke: [
      'Računi in stroški v enem paketu',
      'Samodejno pošiljanje po urniku',
      'Vsak dokument s prilogo, kot ga potrebuje računovodstvo',
    ],
    tockeEn: [
      'Invoices and costs in one package',
      'Sent automatically on a schedule',
      'Every document with its attachment, as accounting needs it',
    ],
  },
  aiConnector: {
    naslov: 'AI asistent',
    naslovEn: 'AI assistant',
    uvod: 'Pomoč pri besedilu ponudbe in pri odgovoru stranki, ki se pogaja o ceni.',
    uvodEn: 'Help with the wording of a quote and with answering a client who is negotiating on price.',
    tocke: [
      'Predlog besedila ponudbe iz tvojih vnosov',
      'Odgovor na ugovor o ceni, v tvojem tonu',
      'Povzetek projekta za pogodbo',
    ],
    tockeEn: [
      'A draft of the quote text from your entries',
      'An answer to a price objection, in your tone',
      'A project summary for the contract',
    ],
  },
};

export default function Zaklenjeno({ funkcija, base, jeEn = false }: { funkcija: ZaklenjenaFunkcija; base: string; jeEn?: boolean }) {
  const v = VSEBINA[funkcija];
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  return (
    <div className={styles.zaklenjeno}>
      <p className={styles.eyebrow}>{L('V PLAČLJIVEM PAKETU', 'IN A PAID PLAN')}</p>
      <h2>{jeEn ? v.naslovEn : v.naslov}</h2>
      <p className={styles.zaklenjenoUvod}>{jeEn ? v.uvodEn : v.uvod}</p>

      <ul className={styles.zaklenjenoSeznam}>
        {(jeEn ? v.tockeEn : v.tocke).map(t => <li key={t}>{t}</li>)}
      </ul>

      <div className={styles.zaklenjenoGumbi}>
        <Link className={styles.zaklenjenoGlavni} href={`${base}/kalkulator/paket`}>{L('Poglej cenik', 'See plans')}</Link>
        <Link className={styles.zaklenjenoDrugi} href={`${base}/kalkulator/pregled`}>{L('Nazaj na nadzorno ploščo', 'Back to the dashboard')}</Link>
      </div>

      <p className={styles.zaklenjenoOpomba}>
        {L('Kalkulator cene, ponudbe in stranke ostanejo brezplačni. Plačaš šele, ko rabiš tudi to.',
           'The price calculator, quotes and clients stay free. You pay only when you need this too.')}
      </p>
    </div>
  );
}
