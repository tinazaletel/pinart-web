import { PAKETI, type PaketId } from '@/lib/paketi';
import GumbNarocnina from '@/components/GumbNarocnina';
import { ZNAK_VALUTE, type Valuta } from '@/lib/cenaNarocnine';
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

export default function PaketiSeznam({ trenutni, locale = 'sl', valuta = 'EUR' }: { trenutni: 'free' | 'premium' | 'pro'; locale?: string; valuta?: Valuta }) {
  /* Ameriski obiskovalec vidi dolarski cenik (lokacijo prebere stran). */
  const zn = ZNAK_VALUTE[valuta];
  const jeUsd = valuta === 'USD';
  const jeEn = locale === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  /* Natancno ujemanje. Prej je 'pro' oznacil Premium IN Pro kot "tvoj paket",
     ker Premium v bazi se ni obstajal — na ceniku sta bili tako dve kartici
     hkrati oznaceni kot moja. Raje eno pravilno kot dve priblizni. */
  const jeTrenutni = (id: PaketId) => id === trenutni;

  return (
    <>
      <div className={styles.paketiMreza}>
        {PAKETI.map(p => {
          const moj = jeTrenutni(p.id);
          const ime = jeEn && p.imeEn ? p.imeEn : p.ime;
          return (
            <article key={p.id} className={styles.paketKartica} data-moj={moj || undefined}>
              {moj && <span className={styles.paketZnackaMoj}>{L('Tvoj paket', 'Your plan')}</span>}
              {!moj && p.znacka && <span className={styles.paketZnackaDruga}>{jeEn && p.znackaEn ? p.znackaEn : p.znacka}</span>}

              <h2>{ime}</h2>
              <p className={styles.paketZa}>{jeEn && p.zaEn ? p.zaEn : p.za}</p>

              <p className={styles.paketCena}>
                <strong>{jeUsd && p.cenaUsd ? p.cenaUsd : p.cena}</strong>
                <span>{(jeEn && p.enotaEn ? p.enotaEn : p.enota).replace('€', zn)}</span>
                {(jeUsd ? p.rednaUsd : p.redna) && <s>{(jeUsd ? p.rednaUsd : p.redna)} {zn}</s>}
              </p>
              {p.ustanovna && <p className={styles.paketUstanovna}>{jeEn && p.ustanovnaEn ? p.ustanovnaEn : p.ustanovna}</p>}
              {p.opomba && <p className={styles.paketOpomba}>{jeEn && p.opombaEn ? p.opombaEn : p.opomba}</p>}

              <ul className={styles.paketSeznam}>
                {(jeEn && p.vkljucenoEn ? p.vkljucenoEn : p.vkljuceno).map(v => <li key={v}>{v}</li>)}
              </ul>

              <div className={styles.paketDejanje}>
                {moj && p.id === 'free' && (
                  <GumbNarocnina paket="premium" razred={styles.paketGlavni} jeEn={jeEn} napis={L('Nadgradi na Premium', 'Upgrade to Premium')} />
                )}
                {moj && p.id !== 'free' && (
                  <a className={styles.paketDrugi} href={POSTA('odpoved ali znižanje paketa')}>{L('Odpovej ali znižaj', 'Cancel or downgrade')}</a>
                )}
                {!moj && p.kmalu && <span className={styles.paketKmalu}>{L('Kmalu', 'Coming soon')}</span>}
                {!moj && !p.kmalu && p.id !== 'free' && (
                  <GumbNarocnina paket={p.id === 'pro' ? 'pro' : 'premium'} razred={styles.paketGlavni} jeEn={jeEn} napis={L('Izberi ', 'Choose ') + ime} />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className={styles.paketOpomba}>
        {L('Plačilo teče prek Stripa, ki je tudi prodajalec na računu — davek se doda na blagajni glede na tvojo državo. Odpoved zaenkrat uredim osebno; napiši mi.',
           'Payments run through Stripe, which is also the merchant of record — tax is added at checkout based on your country. Cancellations are still handled personally for now; write to me.')}
      </p>
    </>
  );
}
