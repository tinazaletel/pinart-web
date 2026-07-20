import Link from 'next/link';
import FlowCloudBridge from '@/components/FlowCloudBridge';
import AmbientBubbles from '@/components/AmbientBubbles';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

type Section = 'overview' | 'projects' | 'contracts' | 'invoices' | 'expenses' | 'clients' | 'goals' | 'plan' | 'time' | 'prices' | 'accounting' | 'profile';

export default function DashboardSidebar({ base, active }: { base: string; active: Section }) {
  const item = (section: Section, href: string, number: string, label: string) => <Link className={`${styles.navItem} ${active === section ? styles.active : ''}`} href={href}><span>{number}</span>{label}</Link>;
  const toolSections: Section[] = ['contracts', 'invoices', 'expenses', 'prices', 'time', 'plan'];
  const toolsMenu = (mobile = false) => <details className={`${styles.toolsMenu} ${mobile ? styles.toolsMenuMobile : ''}`} open={!mobile && toolSections.includes(active)}>
    <summary className={toolSections.includes(active) ? styles.active : ''}><span>02</span><strong>Orodja</strong><svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5.5 7.5 4.5 4.5 4.5-4.5" /></svg></summary>
    <div className={styles.toolsMenuList}>
      <Link href={`${base}/kalkulator/orodje`}><span>01</span>Ponudba</Link>
      <Link href={`${base}/kalkulator/dolgorocno`}><span>02</span>Dolgoročno sodelovanje</Link>
      {item('contracts', `${base}/kalkulator/pogodbe`, '03', 'Pogodba')}
      {item('invoices', `${base}/kalkulator/racuni`, '04', 'Računi')}
      {item('expenses', `${base}/kalkulator/stroski`, '05', 'Stroški')}
      {item('prices', `${base}/kalkulator/ceniki`, '06', 'Moji ceniki')}
      {item('time', `${base}/kalkulator/cas`, '07', 'Cena & čas')}
      {item('plan', `${base}/kalkulator/poslovni-nacrt`, '08', 'Poslovni okvir')}
    </div>
  </details>;
  return <><AmbientBubbles /><aside className={styles.sidebar} aria-label="Glavna navigacija">
    <FlowCloudBridge />
    <div className={styles.brandRow}><Link className={styles.brand} href={`${base}/kalkulator/pregled`} aria-label="Pinart Flow pregled"><span className={styles.brandMark} /><strong>Pinart</strong><span>FLOW</span><small>BETA</small></Link><Link className={styles.closeApp} href={`${base}/kalkulator`}>× zapri</Link></div>
    <details className={styles.mobileMenu}><summary>Meni</summary><div>{item('overview', `${base}/kalkulator/pregled`, '01', 'Pregled')}{toolsMenu(true)}{item('prices', `${base}/kalkulator/ceniki`, '03', 'Moji ceniki')}{item('clients', `${base}/kalkulator/stranke`, '04', 'Stranke')}{item('goals', `${base}/kalkulator/cilji`, '05', 'Cilji')}{item('projects', `${base}/kalkulator/projekti`, '06', 'Zgodovina')}</div></details>
    <nav className={styles.nav}>
      {item('overview', `${base}/kalkulator/pregled`, '01', 'Pregled')}
      {toolsMenu()}
      {item('prices', `${base}/kalkulator/ceniki`, '03', 'Moji ceniki')}
      {item('clients', `${base}/kalkulator/stranke`, '04', 'Stranke')}
      {item('goals', `${base}/kalkulator/cilji`, '05', 'Cilji')}
      {item('projects', `${base}/kalkulator/projekti`, '06', 'Zgodovina')}
    </nav>
    <Link className={styles.profile} href={`${base}/kalkulator/profil`}><span className={styles.avatar}>T</span><span><strong>Tvoj studio</strong><small>Nastavitve podjetja</small></span></Link>
  </aside></>;
}
