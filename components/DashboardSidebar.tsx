import Link from 'next/link';
import FlowCloudBridge from '@/components/FlowCloudBridge';
import ZabeleziObisk from '@/components/ZabeleziObisk';
import SidebarUserMenu from '@/components/SidebarUserMenu';
import AmbientBubbles from '@/components/AmbientBubbles';
import FlowTopBar from './FlowTopBar';
import SidebarToggle from './SidebarToggle';
import NavIkona, { type NavIkonaVrsta } from './NavIkona';
import MeniOrodja from './MeniOrodja';
import Dostopnost from './Dostopnost';
import MeniSkupina from './MeniSkupina';
import DeliAplikacijo from './DeliAplikacijo';
import MeniProfil from './MeniProfil';
import KomZnacka from './KomZnacka';
import PaketZnak from './PaketZnak';
import PogledPreklop from './PogledPreklop';
import { naroceniPaket, paketUporabnika } from '@/lib/pravice';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

type Section = 'dom' | 'overview' | 'offer' | 'retainer' | 'projects' | 'contracts' | 'invoices' | 'expenses' | 'clients' | 'goals' | 'plan' | 'time' | 'evidenca' | 'naloge' | 'koledar' | 'prices' | 'accounting' | 'profile' | 'settings' | 'ekipa' | 'novprojekt' | 'ideje' | 'marketing' | 'komunikacija' | 'sef';

/* Meni je razdeljen po tem, KAJ UPORABNIK POCNE, ne kaj stvar je:
   Delo = ustvarjas dokument za stranko · Podatki = vzdrzujes vnose · Nacrt = racunas/ciljas.
   Prej je bil en sam predal "Orodja", zaradi cesar so bili ceniki hkrati orodje IN
   samostojna postavka (podvojena povezava), meja med orodjem in podatkom pa nejasna. */
export default async function DashboardSidebar({ base, active }: { base: string; active: Section }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const paketZaPupo = await naroceniPaket();
  const imaPupo = paketZaPupo === 'pro' || paketZaPupo === 'premium';
  const aktivenPreklop: 'dom' | 'plosca' | 'none' = active === 'dom' ? 'dom' : active === 'overview' ? 'plosca' : 'none';
  const item = (section: Section, href: string, number: string, label: string, ikona: NavIkonaVrsta, zaklenjeno?: string) =>
    <Link className={`${styles.navItem} ${active === section ? styles.active : ''}`} href={href} title={label}
      data-zaklenjeno={zaklenjeno}>
      <span className={styles.navIkona}><NavIkona vrsta={ikona} /></span>
      <span className={styles.navStevilka}>{number}</span>
      <span className={styles.navNapis}>{label}</span>
      <span className={styles.navKljuc} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>
      </span>
    </Link>;
  const skupina = (naslov: string) => <p className={styles.navGroup}>{naslov}</p>;
  const povezava = (href: string, number: string, label: string, ikona: NavIkonaVrsta, zaklenjeno?: string) =>
    <Link className={styles.navItem} href={href} title={label} data-zaklenjeno={zaklenjeno}>
      <span className={styles.navIkona}><NavIkona vrsta={ikona} /></span>
      <span className={styles.navStevilka}>{number}</span>
      <span className={styles.navNapis}>{label}</span>
      <span className={styles.navKljuc} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>
      </span>
    </Link>;
  const menuVsebina = () => <>
    {/* Vrh menija: preklop Pupa ⇄ Home (nadzorna plošča) namesto samostojne postavke.
        Pupa zaklenjena brez Pupe v paketu (klik = alert za nadgradnjo). */}
    <div className={styles.pogledOvoj}>
      <PogledPreklop base={base} aktiven={aktivenPreklop} jeEn={jeEn} imaPupo={imaPupo} />
    </div>
    {/* Na telefonu so skupine zaprte: 13 postavk hkrati ne gre v en zaslon,
        ce naj bo vsaka tapna tarca vsaj 44 px. Na namizju so odprte kot prej. */}
    <MeniSkupina naslov={L('Orodja', 'Tools')} aktivna={active === 'offer' || active === 'retainer' || active === 'contracts' || active === 'invoices' || active === 'novprojekt'}>
      {/* ?od=pregled -> kalkulator in retainer pokazeta puscico nazaj na nadzorno plosco */}
      {item('offer', `${base}/kalkulator/orodje?od=pregled`, '01', L('Ponudba', 'Proposal'), 'ponudba')}
      {item('retainer', `${base}/kalkulator/dolgorocno?od=pregled`, '02', L('Dolgoročno', 'Retainer'), 'retainer')}
      {item('contracts', `${base}/kalkulator/pogodbe`, '03', L('Pogodba', 'Contract'), 'pogodba', 'contracts')}
      {item('invoices', `${base}/kalkulator/racuni`, '04', L('Računi', 'Invoices'), 'racuni')}
      {/* Ustvari projekt = polnostranski chat vprasalnik (lastna stran, kot pogodbe/racuni). */}
      {item('novprojekt', `${base}/kalkulator/nov-projekt`, '05', L('Ustvari projekt', 'New project'), 'projekti')}
    </MeniSkupina>
    {/* Arhiv (prej "Zgodovina") = kjer NAJDEŠ shranjeno; sodi pod Podatki, ne Drugo.
        Delo = ustvarjaš, Podatki = iščeš. */}
    <MeniSkupina naslov={L('Podatki', 'Data')} aktivna={active === 'clients' || active === 'prices' || active === 'expenses' || active === 'projects' || active === 'accounting' || active === 'komunikacija' || active === 'sef'}>
      {item('projects', `${base}/kalkulator/projekti`, '01', L('Projekti & arhiv', 'Projects & archive'), 'zgodovina')}
      <Link className={`${styles.navItem} ${active === 'komunikacija' ? styles.active : ''}`} href={`${base}/kalkulator/komunikacija`} title={L('Komunikacija', 'Communication')}>
        <span className={styles.navIkona} style={{ position: 'relative' }}><NavIkona vrsta="komunikacije" /><KomZnacka /></span>
        <span className={styles.navStevilka}>02</span>
        <span className={styles.navNapis}>{L('Komunikacija', 'Communication')}</span>
        <span className={styles.navKljuc} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>
        </span>
      </Link>
      {item('clients', `${base}/kalkulator/stranke`, '03', L('Stranke', 'Clients'), 'stranke')}
      {item('prices', `${base}/kalkulator/ceniki`, '04', L('Moji ceniki', 'Price lists'), 'ceniki')}
      {item('expenses', `${base}/kalkulator/stroski`, '05', L('Stroški', 'Expenses'), 'stroski', 'expenses')}
      {item('accounting', `${base}/kalkulator/racunovodstvo`, '06', L('Računovodstvo', 'Accounting'), 'racunovodstvo')}
      {item('sef', `${base}/kalkulator/sef`, '07', L('Sef avtorstva', 'Authorship vault'), 'sef')}
    </MeniSkupina>
    <MeniSkupina naslov={L('Načrt', 'Plan')} aktivna={active === 'goals' || active === 'time' || active === 'evidenca' || active === 'plan' || active === 'naloge' || active === 'ideje' || active === 'koledar' || active === 'marketing'}>
      {/* Vrstni red po tem, kako pogosto se odpre, ne po pomenu pojma (Tina,
          26. 8. 2026: »naloge se mi zdijo nizko … pa koledar tudi«). Dnevno:
          naloge, koledar, stoparica, prisotnost. Obcasno: cilji, okvir,
          marketing — ta je po dogovoru vedno zadnji. */}
      {item('naloge', `${base}/kalkulator/naloge`, '01', L('Naloge', 'Tasks'), 'naloge')}
      {item('koledar', `${base}/kalkulator/koledar`, '02', L('Koledar', 'Calendar'), 'koledar')}
      {item('time', `${base}/kalkulator/cas`, '03', L('Štoparica', 'Stopwatch'), 'cas', 'businessInsights')}
      {/* Prisotnost je SVOJA postavka, ne del Stoparice (Tina, 25. 8.: "imela sem
          v meniju posebej stoparico in posebej prisotnost"). Stoparica meri ure
          NA PROJEKTU, prisotnost belezi prihod in odhod OSEBE po ZEPDSV — dve
          razlicni stvari, zato tudi razlicni ikoni. Ostane dosegljiva tudi iz
          profila. */}
      {/* BREZ kljucavnice: evidenca delovnega casa je zakonska obveznost po
          ZEPDSV, ne premijska analitika. Ne sme biti za placilnim zidom. */}
      {item('evidenca', `${base}/kalkulator/evidenca-casa`, '04', L('Prisotnost', 'Attendance'), 'evidenca')}
      {item('goals', `${base}/kalkulator/cilji`, '05', L('Cilji', 'Goals'), 'cilji', 'businessInsights')}
      {item('plan', `${base}/kalkulator/poslovni-nacrt`, '06', L('Poslovni okvir', 'Business framework'), 'okvir', 'businessInsights')}
      {item('marketing', `${base}/kalkulator/marketing`, '07', 'Marketing', 'marketing')}
    </MeniSkupina>
    {/* Pomoč odstranjena iz menija — podvaja se z »?« v headerju in AI asistentko (Pupa).
        Dizajn (videz dokumentov) je pod Moj profil. */}
  </>;
  return <><AmbientBubbles /><PaketZnak /><FlowTopBar paket={paketZaPupo === 'pro' ? 'PRO' : paketZaPupo === 'premium' ? 'PREMIUM' : ''} /><SidebarToggle vrsta="odpri" /><aside className={styles.sidebar} aria-label={L('Glavna navigacija', 'Main navigation')}><SidebarToggle vrsta="zapri" />
    <FlowCloudBridge />
    <ZabeleziObisk />
    {/* logo in "zapri" sta zdaj v zgornji vrstici (FlowTopBar) — tu sta bila dvakrat */}
    <SidebarToggle vrsta="zapri" />
    {/* ikona lojtrice namesto napisa "Meni" */}
    <details className={styles.mobileMenu}>
      {/* NE postavljaj display:flex/grid na <summary> — Safari s tem zlomi odpiranje <details>.
          Obliko nosi notranji <span>, summary ostane privzet. */}
      <summary aria-label={L('Meni', 'Menu')} title={L('Meni', 'Menu')}>
        <span className={styles.meniIkona}>
          <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            {/* tri locene crte, da se ob odprtju zavrtijo v X */}
            <path d="M3.5 5.5h13" /><path d="M3.5 10h13" /><path d="M3.5 14.5h13" />
          </svg>
        </span>
      </summary>
      <div>
        <MeniOrodja />
        {menuVsebina()}
        {/* profil: v stranski vrstici je na telefonu skrit, zato tudi tukaj */}
        <MeniProfil base={base} />
        <div className={styles.meniNoga}>
          <a className={styles.meniNogaGumb} href="mailto:tina@pinart.si?subject=Pinart%20Flow%20%E2%80%94%20povratna%20informacija">Feedback</a>
          <Link className={styles.meniNogaGumb} href={`${base}/kalkulator/pogoji`}>{L('Pogoji', 'Terms')}</Link>
          <DeliAplikacijo />
        </div>
        {/* pot nazaj na Flow landing — v zgornji vrstici je na telefonu skrita */}
        <Link className={styles.meniZapriFlow} href={`${base}/flow`}>{L('× Zapri Flow', '× Close Flow')}</Link>
      </div>
    </details>
    <nav className={styles.nav}>{menuVsebina()}</nav>
    <SidebarUserMenu base={base} />
    {/* Eno okno za vse strani aplikacije; gumba tu ni, ker je postavka v meniju. */}
    <Dostopnost jeEn={base === '/en'} base={base} />
  </aside>
</>;
}
