import { PAKETI, type PaketId } from '@/lib/paketi';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Paketi v aplikaciji: kateri je tvoj in kaj lahko narediš.
 *
 * Placilnega ponudnika se ni, zato dejanja NE obljubljajo samodejne nadgradnje.
 * Bolje odkrit "piši mi" kot gumb, ki se vrti in nic ne naredi — prvo je
 * zamuda, drugo je izguba zaupanja.
 *
 * Baza pozna `free` in `pro`; Premium se prikaze kot ponudba, dokler ne dodamo
 * tretje stopnje. Zato je `trenutni` samo 'free' | 'pro'.
 */

const POSTA = (zadeva: string) =>
  `mailto:tina@pinart.si?subject=${encodeURIComponent(`Pinart Flow — ${zadeva}`)}`;

export default function PaketiSeznam({ trenutni }: { trenutni: 'free' | 'pro' }) {
  /* Natancno ujemanje. Prej je 'pro' oznacil Premium IN Pro kot "tvoj paket",
     ker Premium v bazi se ni obstajal — na ceniku sta bili tako dve kartici
     hkrati oznaceni kot moja. Raje eno pravilno kot dve priblizni. */
  const jeTrenutni = (id: PaketId) => id === trenutni;

  return (
    <>
      <div className={styles.paketiMreza}>
        {PAKETI.map(p => {
          const moj = jeTrenutni(p.id);
          return (
            <article key={p.id} className={styles.paketKartica} data-moj={moj || undefined}>
              {moj && <span className={styles.paketZnackaMoj}>Tvoj paket</span>}
              {!moj && p.znacka && <span className={styles.paketZnackaDruga}>{p.znacka}</span>}

              <h2>{p.ime}</h2>
              <p className={styles.paketZa}>{p.za}</p>

              <p className={styles.paketCena}>
                <strong>{p.cena}</strong><span>{p.enota}</span>
                {p.redna && <s>{p.redna} €</s>}
              </p>
              {p.ustanovna && <p className={styles.paketUstanovna}>{p.ustanovna}</p>}

              <ul className={styles.paketSeznam}>
                {p.vkljuceno.map(v => <li key={v}>{v}</li>)}
              </ul>

              <div className={styles.paketDejanje}>
                {moj && p.id === 'free' && (
                  <a className={styles.paketGlavni} href={POSTA('nadgradnja na Premium')}>Nadgradi na Premium</a>
                )}
                {moj && p.id !== 'free' && (
                  <a className={styles.paketDrugi} href={POSTA('odpoved ali znižanje paketa')}>Odpovej ali znižaj</a>
                )}
                {!moj && p.kmalu && <span className={styles.paketKmalu}>Kmalu</span>}
                {!moj && !p.kmalu && p.id !== 'free' && (
                  <a className={styles.paketGlavni} href={POSTA(`nadgradnja na ${p.ime}`)}>Izberi {p.ime}</a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className={styles.paketOpomba}>
        Plačilni sistem še ni postavljen, zato nadgradnjo in odpoved zaenkrat uredim osebno —
        napiši mi in ti paket odklenem isti dan. Cene ne vključujejo DDV.
      </p>
    </>
  );
}
