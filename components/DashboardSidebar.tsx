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
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

type Section = 'overview' | 'projects' | 'contracts' | 'invoices' | 'expenses' | 'clients' | 'goals' | 'plan' | 'time' | 'prices' | 'accounting' | 'profile' | 'settings';

/* Meni je razdeljen po tem, KAJ UPORABNIK POCNE, ne kaj stvar je:
   Delo = ustvarjas dokument za stranko · Podatki = vzdrzujes vnose · Nacrt = racunas/ciljas.
   Prej je bil en sam predal "Orodja", zaradi cesar so bili ceniki hkrati orodje IN
   samostojna postavka (podvojena povezava), meja med orodjem in podatkom pa nejasna. */
export default function DashboardSidebar({ base, active }: { base: string; active: Section }) {
  const item = (section: Section, href: string, number: string, label: string, ikona: NavIkonaVrsta) =>
    <Link className={`${styles.navItem} ${active === section ? styles.active : ''}`} href={href} title={label}>
      <span className={styles.navIkona}><NavIkona vrsta={ikona} /></span>
      <span className={styles.navStevilka}>{number}</span>
      <span className={styles.navNapis}>{label}</span>
    </Link>;
  const skupina = (naslov: string) => <p className={styles.navGroup}>{naslov}</p>;
  const povezava = (href: string, number: string, label: string, ikona: NavIkonaVrsta) =>
    <Link className={styles.navItem} href={href} title={label}>
      <span className={styles.navIkona}><NavIkona vrsta={ikona} /></span>
      <span className={styles.navStevilka}>{number}</span>
      <span className={styles.navNapis}>{label}</span>
    </Link>;
  const menuVsebina = () => <>
    {item('overview', `${base}/kalkulator/pregled`, '01', 'Nadzorna plošča', 'pregled')}
    {/* Na telefonu so skupine zaprte: 13 postavk hkrati ne gre v en zaslon,
        ce naj bo vsaka tapna tarca vsaj 44 px. Na namizju so odprte kot prej. */}
    <MeniSkupina naslov="Delo" aktivna={active === 'contracts' || active === 'invoices'}>
      {/* ?od=pregled -> kalkulator in retainer pokazeta puscico nazaj na nadzorno plosco */}
      {povezava(`${base}/kalkulator/orodje?od=pregled`, '01', 'Ponudba', 'ponudba')}
      {povezava(`${base}/kalkulator/dolgorocno?od=pregled`, '02', 'Dolgoročno sodelovanje', 'retainer')}
      {item('contracts', `${base}/kalkulator/pogodbe`, '03', 'Pogodba', 'pogodba')}
      {item('invoices', `${base}/kalkulator/racuni`, '04', 'Računi', 'racuni')}
    </MeniSkupina>
    <MeniSkupina naslov="Podatki" aktivna={active === 'clients' || active === 'prices' || active === 'expenses'}>
      {item('clients', `${base}/kalkulator/stranke`, '01', 'Stranke', 'stranke')}
      {item('prices', `${base}/kalkulator/ceniki`, '02', 'Moji ceniki', 'ceniki')}
      {item('expenses', `${base}/kalkulator/stroski`, '03', 'Stroški', 'stroski')}
    </MeniSkupina>
    <MeniSkupina naslov="Načrt" aktivna={active === 'goals' || active === 'time' || active === 'plan'}>
      {item('goals', `${base}/kalkulator/cilji`, '01', 'Cilji', 'cilji')}
      {item('time', `${base}/kalkulator/cas`, '02', 'Cena & čas', 'cas')}
      {item('plan', `${base}/kalkulator/poslovni-nacrt`, '03', 'Poslovni okvir', 'okvir')}
    </MeniSkupina>
    <MeniSkupina naslov="Drugo" vednoVidna aktivna={active === 'projects' || active === 'settings'}>
      {item('projects', `${base}/kalkulator/projekti`, '01', 'Zgodovina', 'zgodovina')}
      {item('settings', `${base}/kalkulator/nastavitve`, '02', 'Nastavitve', 'nastavitve')}
      {povezava(`${base}/kalkulator/pomoc`, '03', 'Pomoč', 'pomoc')}
    </MeniSkupina>
  </>;
  return <><AmbientBubbles /><FlowTopBar /><SidebarToggle vrsta="odpri" /><aside className={styles.sidebar} aria-label="Glavna navigacija"><SidebarToggle vrsta="zapri" />
    <FlowCloudBridge />
    {/* logo in "zapri" sta zdaj v zgornji vrstici (FlowTopBar) — tu sta bila dvakrat */}
    <SidebarToggle vrsta="zapri" />
    {/* ikona lojtrice namesto napisa "Meni" */}
    <details className={styles.mobileMenu}>
      {/* NE postavljaj display:flex/grid na <summary> — Safari s tem zlomi odpiranje <details>.
          Obliko nosi notranji <span>, summary ostane privzet. */}
      <summary aria-label="Meni" title="Meni">
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
        <Link className={styles.meniZapriFlow} href={`${base}/kalkulator`}>× Zapri Flow</Link>
      </div>
    </details>
    <nav className={styles.nav}>{menuVsebina()}</nav>
    <SidebarUserMenu base={base} />
  </aside></>;
}
