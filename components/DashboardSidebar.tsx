import Link from 'next/link';
import FlowCloudBridge from '@/components/FlowCloudBridge';
import SidebarUserMenu from '@/components/SidebarUserMenu';
import AmbientBubbles from '@/components/AmbientBubbles';
import FlowTopBar from './FlowTopBar';
import SidebarToggle from './SidebarToggle';
import NavIkona, { type NavIkonaVrsta } from './NavIkona';
import MeniOrodja from './MeniOrodja';
import MeniSkupina from './MeniSkupina';
import DeliAplikacijo from './DeliAplikacijo';
import MeniProfil from './MeniProfil';
import PaketZnak from './PaketZnak';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

type Section = 'overview' | 'offer' | 'retainer' | 'projects' | 'contracts' | 'invoices' | 'expenses' | 'clients' | 'goals' | 'plan' | 'time' | 'naloge' | 'koledar' | 'prices' | 'accounting' | 'profile' | 'settings' | 'ekipa' | 'novprojekt' | 'ideje' | 'marketing' | 'komunikacija';

/* Meni je razdeljen po tem, KAJ UPORABNIK POCNE, ne kaj stvar je:
   Delo = ustvarjas dokument za stranko · Podatki = vzdrzujes vnose · Nacrt = racunas/ciljas.
   Prej je bil en sam predal "Orodja", zaradi cesar so bili ceniki hkrati orodje IN
   samostojna postavka (podvojena povezava), meja med orodjem in podatkom pa nejasna. */
export default function DashboardSidebar({ base, active }: { base: string; active: Section }) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
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
    {item('overview', `${base}/kalkulator/pregled`, '01', L('Nadzorna plošča', 'Dashboard'), 'pregled')}
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
    <MeniSkupina naslov={L('Podatki', 'Data')} aktivna={active === 'clients' || active === 'prices' || active === 'expenses' || active === 'projects' || active === 'accounting' || active === 'komunikacija'}>
      {item('projects', `${base}/kalkulator/projekti`, '01', L('Projekti & arhiv', 'Projects & archive'), 'zgodovina')}
      {item('komunikacija', `${base}/kalkulator/komunikacija`, '02', L('Komunikacija', 'Communication'), 'komunikacije')}
      {item('clients', `${base}/kalkulator/stranke`, '03', L('Stranke', 'Clients'), 'stranke')}
      {item('prices', `${base}/kalkulator/ceniki`, '04', L('Moji ceniki', 'Price lists'), 'ceniki')}
      {item('expenses', `${base}/kalkulator/stroski`, '05', L('Stroški', 'Expenses'), 'stroski', 'expenses')}
      {item('accounting', `${base}/kalkulator/racunovodstvo`, '06', L('Računovodstvo', 'Accounting'), 'racunovodstvo')}
    </MeniSkupina>
    <MeniSkupina naslov={L('Načrt', 'Plan')} aktivna={active === 'goals' || active === 'time' || active === 'plan' || active === 'naloge' || active === 'ideje' || active === 'koledar' || active === 'marketing'}>
      {item('goals', `${base}/kalkulator/cilji`, '01', L('Cilji', 'Goals'), 'cilji', 'businessInsights')}
      {item('time', `${base}/kalkulator/cas`, '02', L('Čas', 'Time'), 'cas', 'businessInsights')}
      {item('plan', `${base}/kalkulator/poslovni-nacrt`, '03', L('Poslovni okvir', 'Business framework'), 'okvir', 'businessInsights')}
      {item('naloge', `${base}/kalkulator/naloge`, '04', L('Naloge', 'Tasks'), 'naloge')}
      {item('koledar', `${base}/kalkulator/koledar`, '05', L('Koledar', 'Calendar'), 'koledar')}
      {item('marketing', `${base}/kalkulator/marketing`, '06', 'Marketing', 'marketing')}
    </MeniSkupina>
    {/* Pomoč odstranjena iz menija — podvaja se z »?« v headerju in AI asistentko (Pupa).
        Dizajn (videz dokumentov) je pod Moj profil. */}
  </>;
  return <><AmbientBubbles /><PaketZnak /><FlowTopBar /><SidebarToggle vrsta="odpri" /><aside className={styles.sidebar} aria-label={L('Glavna navigacija', 'Main navigation')}><SidebarToggle vrsta="zapri" />
    <FlowCloudBridge />
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
          <DeliAplikacijo />
        </div>
        {/* pot nazaj na Flow landing — v zgornji vrstici je na telefonu skrita */}
        <Link className={styles.meniZapriFlow} href={`${base}/flow`}>{L('× Zapri Flow', '× Close Flow')}</Link>
      </div>
    </details>
    <nav className={styles.nav}>{menuVsebina()}</nav>
    <SidebarUserMenu base={base} />
  </aside></>;
}
