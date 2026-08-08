import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import NazajLink from '@/components/NazajLink';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Politika rabe vsebine za AI | Pinart',
  description: 'Pridržek pravic do besedilnega in podatkovnega rudarjenja (TDM) ter prepoved uporabe vsebin za učenje umetne inteligence brez licence.',
};

/* Kratka, strojno-preverljiva politika: nanjo kaze <meta name="tdm-policy"> v
   layoutu; skupaj z 'tdm-reservation=1' izrazi EU (DSM cl. 4) opt-out iz AI-treninga.
   Namerno INDEKSABILNA (robots ne skrivamo) — pridrzek mora biti javno berljiv. */
export default async function AiPolitikaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const en = locale === 'en';

  const S: React.CSSProperties = { marginTop: '2.6rem' };
  const H: React.CSSProperties = { fontSize: '.78rem', fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: '.7rem' };
  const P: React.CSSProperties = { fontSize: '.95rem', lineHeight: 1.75, color: 'rgba(17,17,17,.8)', margin: '0 0 .8rem' };

  return (
    <main style={{ minHeight: '100dvh' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '8rem 1.4rem 6rem', color: 'var(--ink)', fontWeight: 300 }}>
        <NazajLink rezerva="/" label={en ? 'Back' : 'Nazaj'} />
        <p style={{ marginTop: '1.4rem', fontSize: '.72rem', fontWeight: 600, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(17,17,17,.72)' }}>
          Pinart
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif), Didot, serif', fontWeight: 500, fontSize: 'clamp(2rem, 6vw, 3.2rem)', lineHeight: 1.02, letterSpacing: '-.01em', margin: '.6rem 0 1rem' }}>
          {en ? 'Content use policy for AI' : 'Politika rabe vsebine za AI'}
        </h1>
        <p style={P}>
          {en
            ? 'This page sets out the reservation of rights for text and data mining (TDM) and the use of our content for training artificial intelligence. It is the human-readable counterpart to the machine-readable signals on our pages (tdm-reservation, noai).'
            : 'Ta stran določa pridržek pravic do besedilnega in podatkovnega rudarjenja (TDM) ter uporabe naših vsebin za učenje umetne inteligence. Je človeku berljiva različica strojnih signalov na naših straneh (tdm-reservation, noai).'}
        </p>

        <section style={S}>
          <h2 style={H}>{en ? '1. Reservation of TDM rights' : '1. Pridržek pravic (TDM)'}</h2>
          <p style={P}>
            {en
              ? 'Under Article 4 of Directive (EU) 2019/790 (DSM), Pinart d.o.o. expressly reserves the right to text and data mining of the content on pinart.si and Pinart Flow. This reservation is expressed in a machine-readable form via the "tdm-reservation" signal and this policy.'
              : 'V skladu s 4. členom Direktive (EU) 2019/790 (DSM) si Pinart d.o.o. izrecno pridržuje pravico do besedilnega in podatkovnega rudarjenja vsebin na pinart.si in Pinart Flow. Pridržek je izražen strojno berljivo prek signala »tdm-reservation« in te politike.'}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '2. Prohibited use' : '2. Prepovedana uporaba'}</h2>
          <p style={P}>
            {en
              ? 'Without our prior written permission it is prohibited to scrape, harvest or otherwise use the content of these pages and portfolio (text, images, illustrations, source files and code) to train, fine-tune or evaluate AI models, or to build datasets for such purposes.'
              : 'Brez našega predhodnega pisnega dovoljenja je prepovedano zajemanje (scraping), luščenje ali kakršna koli uporaba vsebin teh strani in portfelja (besedila, slik, ilustracij, izvornih datotek in kode) za učenje, fino uravnavanje ali vrednotenje AI modelov oziroma za gradnjo podatkovnih zbirk v te namene.'}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '3. What is allowed' : '3. Kaj je dovoljeno'}</h2>
          <p style={P}>
            {en
              ? 'Ordinary indexing by search engines, and use by AI search/answer services that cite the source with a link back, is allowed. The reservation above concerns use for AI training, not discovery.'
              : 'Navadno indeksiranje za iskalnike ter uporaba v AI‑iskalnih/odgovornih storitvah, ki navedejo vir s povezavo nazaj, je dovoljena. Zgornji pridržek zadeva uporabo za učenje AI, ne najdljivosti.'}
          </p>
        </section>

        <section style={S}>
          <h2 style={H}>{en ? '4. Licensing' : '4. Licenciranje'}</h2>
          <p style={P}>
            {en
              ? 'For licensed use of our content, including for AI training, please contact tina@pinart.si.'
              : 'Za licenčno uporabo naših vsebin, tudi za učenje AI, piši na tina@pinart.si.'}
          </p>
          <p style={{ ...P, color: 'rgba(17,17,17,.6)', fontSize: '.85rem' }}>
            © Pinart d.o.o. · {en ? 'Contact' : 'Kontakt'}: tina@pinart.si
          </p>
        </section>
      </div>
    </main>
  );
}
