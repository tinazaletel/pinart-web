import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import BackButton from '@/components/BackButton';
import { Link } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const sl = {
  title: 'Politika zasebnosti',
  updated: 'Zadnja posodobitev: junij 2025',
  sections: [
    {
      heading: '1. Upravljavec osebnih podatkov',
      text: `Pinart d.o.o., Mladinska ulica 63, 1000 Ljubljana, Slovenija\nE-pošta: tina@pinart.si`,
    },
    {
      heading: '2. Kateri podatki se zbirajo',
      text: `Prek kontaktnega obrazca na spletni strani zbiramo:\n– ime in priimek\n– e-poštni naslov\n– vsebino sporočila\n\nPodatki se zbirajo izključno na vašo pobudo, ko nam pišete.`,
    },
    {
      heading: '3. Namen in pravna podlaga obdelave',
      text: `Podatke obdelujemo z namenom odgovora na vaše povpraševanje in morebitne nadaljnje poslovne komunikacije. Pravna podlaga je vaše soglasje (člen 6(1)(a) GDPR) oz. zakoniti interes (člen 6(1)(f) GDPR).`,
    },
    {
      heading: '4. Hramba podatkov',
      text: `Podatke hranimo le toliko časa, kot je potrebno za uresničitev namena, za katerega so bili zbrani, oz. dokler ne zahtevate izbrisa.`,
    },
    {
      heading: '5. Posredovanje tretjim osebam',
      text: `Vaših podatkov ne prodajamo, ne dajemo v najem in jih ne posredujemo tretjim osebam, razen kadar to zahteva zakon ali kadar je to nujno za izvedbo storitve (npr. e-poštni ponudnik).`,
    },
    {
      heading: '6. Google Analytics',
      text: `Spletna stran uporablja Google Analytics za analizo obiskanosti. Google Analytics zbira anonimne podatke o obisku (tip naprave, država, strani). Podatki se ne povežejo z vašo osebno identiteto. Zbiranje podatkov lahko onemogočite z namestitvijo Google Analytics Opt-out Browser Add-on ali s prilagoditev nastavitev piškotkov v vašem brskalniku.`,
    },
    {
      heading: '7. Vaše pravice',
      text: `V skladu z GDPR imate pravico do:\n– dostopa do svojih podatkov\n– popravka netočnih podatkov\n– izbrisa podatkov\n– omejitve obdelave\n– prenosljivosti podatkov\n– ugovora obdelavi\n\nZahtevo pošljite na tina@pinart.si. Pravico imate tudi do pritožbe pri Informacijskem pooblaščencu RS (ip-rs.si).`,
    },
    {
      heading: '8. Piškotki',
      text: `Spletna stran uporablja funkcionalne piškotke za delovanje in analitične piškotke (Google Analytics). Ob prvem obisku imate možnost upravljanja s piškotki.`,
    },
    {
      heading: '9. Spremembe politike',
      text: `Politiko zasebnosti lahko kadar koli posodobimo. Datum zadnje posodobitve je naveden na vrhu te strani.`,
    },
  ],
};

const en = {
  title: 'Privacy Policy',
  updated: 'Last updated: June 2025',
  sections: [
    {
      heading: '1. Data Controller',
      text: `Pinart d.o.o., Mladinska ulica 63, 1000 Ljubljana, Slovenia\nEmail: tina@pinart.si`,
    },
    {
      heading: '2. Data We Collect',
      text: `Through the contact form on this website we collect:\n– first and last name\n– email address\n– message content\n\nData is collected only at your initiative when you reach out to us.`,
    },
    {
      heading: '3. Purpose and Legal Basis',
      text: `We process your data for the purpose of responding to your inquiry and any subsequent business communication. The legal basis is your consent (Art. 6(1)(a) GDPR) or legitimate interest (Art. 6(1)(f) GDPR).`,
    },
    {
      heading: '4. Data Retention',
      text: `We retain your data only for as long as necessary to fulfil the purpose for which it was collected, or until you request deletion.`,
    },
    {
      heading: '5. Third-Party Sharing',
      text: `We do not sell, rent, or share your data with third parties, except where required by law or strictly necessary for service delivery (e.g. email provider).`,
    },
    {
      heading: '6. Google Analytics',
      text: `This website uses Google Analytics to analyse site traffic. Google Analytics collects anonymous data (device type, country, pages visited). This data is not linked to your personal identity. You may opt out by installing the Google Analytics Opt-out Browser Add-on or by adjusting your browser's cookie settings.`,
    },
    {
      heading: '7. Your Rights',
      text: `Under GDPR you have the right to:\n– access your personal data\n– rectify inaccurate data\n– erasure of your data\n– restriction of processing\n– data portability\n– object to processing\n\nSend your request to tina@pinart.si. You also have the right to lodge a complaint with the Slovenian Information Commissioner (ip-rs.si).`,
    },
    {
      heading: '8. Cookies',
      text: `This website uses functional cookies for operation and analytical cookies (Google Analytics). On your first visit you may manage your cookie preferences.`,
    },
    {
      heading: '9. Changes to This Policy',
      text: `We may update this Privacy Policy at any time. The date of the last update is shown at the top of this page.`,
    },
  ],
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const content = locale === 'sl' ? sl : en;

  return (
    <main
      style={{
        background: 'var(--paper)',
        minHeight: '100vh',
        paddingTop: 'clamp(6rem, 12vw, 10rem)',
        paddingBottom: 'clamp(4rem, 8vw, 7rem)',
        paddingInline: 'clamp(1.5rem, 8vw, 12rem)',
      }}
    >
      <div style={{ maxWidth: '720px' }}>
        <BackButton fallbackHref="/" >← Nazaj</BackButton>

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.4rem, 5vw, 4rem)',
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            marginTop: '2rem',
            marginBottom: '0.5rem',
          }}
        >
          {content.title}
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.78rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft, rgba(17,17,17,0.45))',
            marginBottom: '3.5rem',
          }}
        >
          {content.updated}
        </p>

        {content.sections.map((s, i) => (
          <section key={i} style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.78rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ink)',
                marginBottom: '0.75rem',
              }}
            >
              {s.heading}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(0.92rem, 1.2vw, 1rem)',
                lineHeight: 1.75,
                color: 'rgba(17,17,17,0.72)',
                whiteSpace: 'pre-line',
                margin: 0,
              }}
            >
              {s.text}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
