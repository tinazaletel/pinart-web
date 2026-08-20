import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import NazajLink from '@/components/NazajLink';
import Footer from '@/components/sections/Footer';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const sl = {
  title: 'Izjava o dostopnosti',
  updated: 'Zadnja posodobitev: 20. avgust 2026',
  sections: [
    {
      heading: '1. Naša zaveza',
      text: `Pinart Flow (pinartflow.com) si prizadeva, da je njegova spletna aplikacija in predstavitvena stran dostopna čim širšemu krogu uporabnikov, ne glede na tehnologijo ali sposobnosti. Prizadevamo si slediti smernicam za dostopnost spletnih vsebin (WCAG) 2.1, raven AA.`,
    },
    {
      heading: '2. Stanje skladnosti',
      text: `Ta stran in aplikacija sta DELNO skladni s standardom WCAG 2.1 raven AA. »Delno skladni« pomeni, da nekateri deli vsebine morda še niso povsem skladni s standardom, na izboljšavah pa aktivno delamo.`,
    },
    {
      heading: '3. Ukrepi za dostopnost',
      text: `Med drugim izvajamo:\n– enotno vidno oznako fokusa pri navigaciji s tipkovnico\n– povezavo »Preskoči na vsebino«\n– spoštovanje nastavitve »reduciraj gibanje« pri animacijah\n– prilagodljive velikosti besedila (relativne enote)`,
    },
    {
      heading: '4. Znane omejitve',
      text: `Nekateri interaktivni deli (kalkulator, urejevalnik dokumentov, modalna okna in animacije na predstavitveni strani) še niso povsem dostopni z bralnikom zaslona ali izključno s tipkovnico. Na posameznih mestih kontrast drobnega pomožnega besedila še ne dosega 4,5 : 1, vse slike in ikone pa še niso ročno preverjene. Te dele postopno izboljšujemo. Če naletite na oviro, nas obvestite in poiskali bomo rešitev.`,
    },
    {
      heading: '5. Povratne informacije in stik',
      text: `Če pri uporabi naletite na oviro dostopnosti ali potrebujete vsebino v dostopnejši obliki, nam pišite:\n\nPinart d.o.o.\nE-pošta: tina@pinart.si\n\nOdzvali se bomo v razumnem roku in poskušali zagotoviti ustrezno rešitev.`,
    },
    {
      heading: '6. Metoda ocene',
      text: `Ta izjava temelji na samooceni (interni pregled), izvedeni avgusta 2026, s pregledom barvnega kontrasta, strukture in navigacije s tipkovnico. Izjavo bomo posodabljali ob večjih spremembah aplikacije.`,
    },
  ],
};

const en = {
  title: 'Accessibility Statement',
  updated: 'Last updated: 20 August 2026',
  sections: [
    {
      heading: '1. Our Commitment',
      text: `Pinart Flow (pinartflow.com) is committed to making its web application and marketing site accessible to as many users as possible, regardless of technology or ability. We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA.`,
    },
    {
      heading: '2. Conformance Status',
      text: `This site and application are PARTIALLY conformant with WCAG 2.1 Level AA. "Partially conformant" means that some parts of the content may not yet fully conform to the standard; we are actively working on improvements.`,
    },
    {
      heading: '3. Accessibility Measures',
      text: `Among other things, we apply:\n– a consistent visible focus indicator for keyboard navigation\n– a “Skip to content” link\n– honouring the “reduce motion” preference for animations\n– scalable text sizes (relative units)`,
    },
    {
      heading: '4. Known Limitations',
      text: `Some interactive parts (the calculator, document editor, modal dialogs, and animations on the marketing site) are not yet fully accessible with a screen reader or by keyboard alone. Some small secondary text still falls below the 4.5 : 1 contrast threshold, and not every image and icon has been manually verified. We are improving these areas progressively. If you encounter a barrier, please let us know and we will look for a solution.`,
    },
    {
      heading: '5. Feedback and Contact',
      text: `If you encounter an accessibility barrier or need content in a more accessible format, please contact us:\n\nPinart d.o.o.\nEmail: tina@pinart.si\n\nWe will respond within a reasonable time and try to provide a suitable solution.`,
    },
    {
      heading: '6. Assessment Method',
      text: `This statement is based on a self-assessment (internal review) carried out in August 2026, covering colour contrast, structure, and keyboard navigation. We will update this statement as the application changes significantly.`,
    },
  ],
};

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const content = locale === 'sl' ? sl : en;

  return (
    <>
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
        <NazajLink rezerva="/" label="Nazaj" />

        <h1
          style={{
            fontFamily: 'var(--font-serif-flow)',
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
            color: 'rgba(17,17,17,0.55)',
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
    <Footer />
    </>
  );
}
