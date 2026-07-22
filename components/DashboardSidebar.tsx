import Link from 'next/link';
import FlowCloudBridge from '@/components/FlowCloudBridge';
import SidebarUserMenu from '@/components/SidebarUserMenu';
import AmbientBubbles from '@/components/AmbientBubbles';
import SidebarToggle from './SidebarToggle';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

type Section = 'overview' | 'projects' | 'contracts' | 'invoices' | 'expenses' | 'clients' | 'goals' | 'plan' | 'time' | 'prices' | 'accounting' | 'profile' | 'settings';

/* Meni je razdeljen po tem, KAJ UPORABNIK POCNE, ne kaj stvar je:
   Delo = ustvarjas dokument za stranko · Podatki = vzdrzujes vnose · Nacrt = racunas/ciljas.
   Prej je bil en sam predal "Orodja", zaradi cesar so bili ceniki hkrati orodje IN
   samostojna postavka (podvojena povezava), meja med orodjem in podatkom pa nejasna. */
export default function DashboardSidebar({ base, active }: { base: string; active: Section }) {
  const item = (section: Section, href: string, number: string, label: string) => <Link className={`${styles.navItem} ${active === section ? styles.active : ''}`} href={href}><span>{number}</span>{label}</Link>;
  const skupina = (naslov: string) => <p className={styles.navGroup}>{naslov}</p>;
  const povezava = (href: string, number: string, label: string) => <Link className={styles.navItem} href={href}><span>{number}</span>{label}</Link>;

  const menuVsebina = () => <>
    {item('overview', `${base}/kalkulator/pregled`, '01', 'Nadzorna plošča')}
    {skupina('Delo')}
    {/* ?od=pregled -> kalkulator in retainer pokazeta puscico nazaj na nadzorno plosco */}
    {povezava(`${base}/kalkulator/orodje?od=pregled`, '01', 'Ponudba')}
    {povezava(`${base}/kalkulator/dolgorocno?od=pregled`, '02', 'Dolgoročno sodelovanje')}
    {item('contracts', `${base}/kalkulator/pogodbe`, '03', 'Pogodba')}
    {item('invoices', `${base}/kalkulator/racuni`, '04', 'Računi')}
    {skupina('Podatki')}
    {item('clients', `${base}/kalkulator/stranke`, '01', 'Stranke')}
    {item('prices', `${base}/kalkulator/ceniki`, '02', 'Moji ceniki')}
    {item('expenses', `${base}/kalkulator/stroski`, '03', 'Stroški')}
    {skupina('Načrt')}
    {item('goals', `${base}/kalkulator/cilji`, '01', 'Cilji')}
    {item('time', `${base}/kalkulator/cas`, '02', 'Cena & čas')}
    {item('plan', `${base}/kalkulator/poslovni-nacrt`, '03', 'Poslovni okvir')}
    {skupina('Drugo')}
    {item('projects', `${base}/kalkulator/projekti`, '01', 'Zgodovina')}
    {item('settings', `${base}/kalkulator/nastavitve`, '02', 'Nastavitve')}
  </>;
  return <><AmbientBubbles /><SidebarToggle vrsta="odpri" /><aside className={styles.sidebar} aria-label="Glavna navigacija"><SidebarToggle vrsta="zapri" />
    <FlowCloudBridge />
    {/* BREZ back gumba: nazaj sodi na podstrani, ne v glavno navigacijo —
        tu je celoten meni ves cas viden in puscica je bila samo nered. */}
    <div className={styles.brandRow}><Link className={styles.brand} href={`${base}/kalkulator/pregled`} aria-label="Pinart Flow pregled"><span className={styles.brandMark} /><strong>Pinart</strong><span>FLOW</span><small>BETA</small></Link><Link className={styles.closeApp} href={`${base}/kalkulator`}>× zapri</Link></div>
    {/* ikona lojtrice namesto napisa "Meni" */}
    <details className={styles.mobileMenu}>
      {/* NE postavljaj display:flex/grid na <summary> — Safari s tem zlomi odpiranje <details>.
          Obliko nosi notranji <span>, summary ostane privzet. */}
      <summary aria-label="Meni" title="Meni">
        <span className={styles.meniIkona}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </span>
      </summary>
      <div>{menuVsebina()}</div>
    </details>
    <nav className={styles.nav}>{menuVsebina()}</nav>
    <SidebarUserMenu base={base} />
  </aside></>;
}
