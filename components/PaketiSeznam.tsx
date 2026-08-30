import { PAKETI, type PaketId } from '@/lib/paketi';
import GumbNarocnina from '@/components/GumbNarocnina';
import GumbPortal from '@/components/GumbPortal';
import { CENIK, CENIK_USD, UVODNA_DO, USTANOVNIH_MEST, ZNAK_VALUTE, type Ponudba, type Valuta } from '@/lib/cenaNarocnine';
import DodatkiSeznam from '@/components/DodatkiSeznam';
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

export default function PaketiSeznam({ trenutni, locale = 'sl', valuta = 'EUR', ponudba = 'uvodna' }: { trenutni: 'free' | 'premium' | 'pro'; locale?: string; valuta?: Valuta; ponudba?: Ponudba }) {
  /* Ameriski obiskovalec vidi dolarski cenik (lokacijo prebere stran). */
  const zn = ZNAK_VALUTE[valuta];
  const jeUsd = valuta === 'USD';
  const jeEn = locale === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  /* Natancno ujemanje. Prej je 'pro' oznacil Premium IN Pro kot "tvoj paket",
     ker Premium v bazi se ni obstajal — na ceniku sta bili tako dve kartici
     hkrati oznaceni kot moja. Raje eno pravilno kot dve priblizni. */
  const jeTrenutni = (id: PaketId) => id === trenutni;
  /* Ena kartica, ena cena — enako kot na landingu (Tina, 29. 8. 2026). Cena je
     tista, ki velja ZDAJ; redna gre v tiho poved pod njo. Ustanovne ponudbe za
     Pro ni, zato Pro ostane pri uvodni. */
  const C = jeUsd ? CENIK_USD : CENIK;
  const uvDo = jeEn
    ? new Date(UVODNA_DO + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : (() => { const [l, mm, d] = UVODNA_DO.split('-'); return `${Number(d)}. ${Number(mm)}. ${l}`; })();
  /* Dan PO izteku uvodne ponudbe — »od 1. 11. 2026«. */
  const poUvodniD = new Date(UVODNA_DO + 'T00:00:00Z'); poUvodniD.setUTCDate(poUvodniD.getUTCDate() + 1);
  const poUvodni = jeEn
    ? poUvodniD.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : `${poUvodniD.getUTCDate()}. ${poUvodniD.getUTCMonth() + 1}. ${poUvodniD.getUTCFullYear()}`;
  const ponudbaZa = (id: PaketId): Ponudba => (id === 'pro' && ponudba === 'ustanovna' ? 'uvodna' : ponudba);
  const cenaZdaj = (id: PaketId) => (jePlacljiv(id) ? String(C[ponudbaZa(id)][id].mesec) : '0');
  /* Brezplačni paket nima ne ponudbe ne redne cene — CENIK.redna pozna samo
     premium in pro. Brez te varovalke je stran padla na C.redna['free']. */
  const jePlacljiv = (id: PaketId): id is 'premium' | 'pro' => id === 'premium' || id === 'pro';
  const oznaka = (id: PaketId) => {
    if (!jePlacljiv(id)) return '';
    const p = ponudbaZa(id);
    return p === 'ustanovna' ? L('Ustanovna cena', 'Founding price') : p === 'uvodna' ? L('Uvodna cena', 'Introductory price') : '';
  };
  const pripis = (id: PaketId) => {
    if (!jePlacljiv(id)) return '';
    const p = ponudbaZa(id), redna = C.redna[id].mesec;
    if (p === 'ustanovna') return L(`Velja za prvih ${USTANOVNIH_MEST} članov. Cena ostane enaka, dokler naročnine ne prekineš.`, `For the first ${USTANOVNIH_MEST} members. Your price stays the same for as long as you keep the subscription.`);
    if (p === 'uvodna') return L(`Velja ves čas neprekinjene naročnine, če se naročiš do ${uvDo}. Za nove naročnike je redna cena od ${poUvodni} ${redna} ${zn}.`, `Locked for as long as your subscription runs, if you subscribe by ${uvDo}. For new subscribers the regular price from ${poUvodni} is ${zn}${redna}.`);
    return '';
  };
  const pripisRedne = (id: PaketId) => (jePlacljiv(id) && ponudbaZa(id) === 'ustanovna'
    ? L(`Za nove naročnike bo redna cena ${C.redna[id].mesec} ${zn}/mesec od ${poUvodni}.`, `For new subscribers the regular price will be ${zn}${C.redna[id].mesec}/month from ${poUvodni}.`)
    : '');

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
                <strong>{cenaZdaj(p.id)}</strong>
                <span>{(jeEn && p.enotaEn ? p.enotaEn : p.enota).replace('€', zn)}</span>
              </p>
              {p.id !== 'free' && !jeUsd && <p className={styles.paketOpomba} style={{ marginTop: '-.35rem' }}>{L('DDV vključen', 'VAT included')}</p>}
              {oznaka(p.id) && <p className={styles.paketUstanovna}>{oznaka(p.id)}</p>}
              {pripis(p.id) && <p className={styles.paketOpomba}>{pripis(p.id)}</p>}
              {pripisRedne(p.id) && <p className={styles.paketOpomba} style={{ marginTop: '-.35rem', opacity: .68 }}>{pripisRedne(p.id)}</p>}

              <ul className={styles.paketSeznam}>
                {(jeEn && p.vkljucenoEn ? p.vkljucenoEn : p.vkljuceno).map(v => <li key={v}>{v}</li>)}
              </ul>

              <div className={styles.paketDejanje}>
                {moj && p.id === 'free' && (
                  <GumbNarocnina paket="premium" razred={styles.paketGlavni} jeEn={jeEn} napis={L('Nadgradi na Premium', 'Upgrade to Premium')} />
                )}
                {moj && p.id !== 'free' && (
                  <GumbPortal razred={styles.paketDrugi} jeEn={jeEn} napis={L('Uredi naročnino', 'Manage subscription')} />
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

      {!jeUsd && (
        <section aria-labelledby="dodatki-naslov" style={{ marginTop: '2rem', maxWidth: '60rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '.8rem' }}>
            <h2 id="dodatki-naslov" style={{ margin: 0, font: '500 1.55rem/1.1 var(--font-serif), Georgia, serif' }}>{L('Dodatki', 'Add-ons')}</h2>
            <span className={styles.paketOpomba} style={{ margin: 0 }}>{L('Za vse plačljive pakete · Končne cene z DDV', 'For all paid plans · Final prices, VAT included')}</span>
          </div>
          <DodatkiSeznam jeEn={jeEn} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '.85rem' }}>
            <a
              style={{ color: 'var(--accent)', fontSize: '.82rem', fontWeight: 650, textUnderlineOffset: '.22rem' }}
              href={POSTA(L('Dodatne storitve', 'Add-on services'))}
            >
              {L('Naroči dodatek', 'Order an add-on')}
            </a>
          </div>
        </section>
      )}

      <p className={styles.paketOpomba}>
        {L('Plačilo teče prek Stripa, ki je tudi prodajalec na računu — davek se doda na blagajni glede na tvojo državo. Naročnino odpoveš, spremeniš ali prekličeš sama prek gumba »Uredi naročnino«; tam so tudi vsi računi.',
           'Payments run through Stripe, which is also the merchant of record — tax is added at checkout based on your country. You can change or cancel the subscription yourself via »Manage subscription«, where your invoices live too.')}
      </p>
    </>
  );
}
