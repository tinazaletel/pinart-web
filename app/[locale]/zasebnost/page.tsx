import { setRequestLocale } from 'next-intl/server';
import { POGOJI_RAZLICICA } from '@/lib/pogojiRazlicica';
import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';
import NazajLink from '@/components/NazajLink';
import { Link } from '@/i18n/routing';
import Footer from '@/components/sections/Footer';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return locale === 'en'
    ? { title: 'Privacy Policy | Pinart Flow', description: 'Privacy Policy for Pinart Flow.' }
    : { title: 'Politika zasebnosti | Pinart Flow', description: 'Politika zasebnosti za Pinart Flow.' };
}

const sl = {
  title: 'Politika zasebnosti',
  updated: `Različica ${POGOJI_RAZLICICA} · Zadnja posodobitev: 23. avgust 2026`,
  sections: [
    {
      heading: '1. Upravljavec osebnih podatkov',
      text: `Pinart d.o.o., Mladinska ulica 63, 1000 Ljubljana, Slovenija\nE-pošta: tina@pinart.si`,
    },
    {
      heading: '2. Kateri podatki se zbirajo',
      text: `Glede na to, kako uporabljate storitev, obdelujemo:\n\n– Kontaktni obrazec: ime in priimek, e-naslov, vsebino sporočila (na vašo pobudo).\n– Uporabniški račun: e-naslov in ime, ki ju prejmemo od ponudnika prijave (npr. Google) ob prijavi.\n– Poslovni podatki v aplikaciji: ponudbe, pogodbe, računi, stranke, projekti, stroški in naloge, ki jih vnesete med uporabo (shranjeni na vaš račun).\n– Komunikacije: vsebina projektnega klepeta in projektne pošte, če te funkcije uporabljate.\n– Sef avtorstva: ime datoteke, kriptografski odtis (SHA-256), datum in podatki o delu; ob plačljivem trezorju tudi sama datoteka.\n– Podatki o uporabi (prijavljeni): število obiskov in dni aktivnosti vašega računa ter čas zadnjega vpisa — za spremljanje in izboljševanje storitve. To ni anonimno (vezano na vaš račun); ni v povezavi z anonimno cenovno statistiko.\n– Anonimna statistika cen: brez osebnih podatkov in je ni mogoče povezati z vami (glejte spodaj).`,
    },
    {
      heading: '3. Namen in pravna podlaga obdelave',
      text: `Podatke obdelujemo za: (a) odgovor na povpraševanje in poslovno komunikacijo; (b) zagotavljanje in delovanje platforme (račun, shranjevanje dokumentov, komunikacije, sef); (c) obračun naročnine; (d) izboljševanje storitve.\n\nPravne podlage: izvajanje pogodbe oz. ukrepi pred sklenitvijo (člen 6(1)(b) GDPR) za delovanje platforme in naročnino; vaše soglasje (člen 6(1)(a) GDPR) npr. za obveščanje; zakoniti interes (člen 6(1)(f) GDPR) za varnost in izboljšave.`,
    },
    {
      heading: '4. Hramba podatkov',
      text: `Podatke hranimo le toliko časa, kot je potrebno za namen obdelave, oz. dokler traja vaš račun. Po izbrisu računa ali na vašo zahtevo podatke izbrišemo, razen kadar jih moramo hraniti po zakonu (npr. računovodski predpisi za izdane račune).`,
    },
    {
      heading: '5. Kje se podatki hranijo',
      text: `Poslovni podatki prijavljenih uporabnikov se hranijo v oblačni bazi in shrambi (Supabase, strežniki v Evropski uniji). Podatki so vezani na vaš račun in zaščiteni s pravili dostopa na ravni baze, tako da do njih dostopate le vi in osebe, s katerimi vsebino izrecno delite.`,
    },
    {
      heading: '5a. Podobdelovalci',
      text: `Vaših podatkov ne prodajamo in ne dajemo v najem. Za delovanje storitve jih obdelujejo naslednji podobdelovalci, izključno po naših navodilih:\n\n– Supabase — oblačna baza in shramba (EU)\n– Vercel — gostovanje in dostava aplikacije\n– Resend — pošiljanje e-pošte\n– Google — prijava z Google računom (OAuth) in preglednica Google Sheets, v katero se zapišejo povpraševanja s kontaktnega obrazca in prijave iz kalkulatorja (ime, e-naslov, sporočilo)\n– Cloudflare — sprejem in posredovanje dohodne e-pošte na naslovih @pinartflow.com\n– Anthropic — AI asistentka Pupa (samo ob uporabi; glejte točko 9)\n– FreeTSA (freetsa.org) — neodvisni overitelj časovnega žiga sefa po standardu RFC 3161 (prejme samo 32-bajtni odtis, nikoli datoteke, njenega imena ali opisa dela)\n– pooblaščeni ponudnik plačil (Merchant of Record) — obdelava plačil naročnine\n\nPodatke posredujemo tretjim tudi, kadar to zahteva zakon. Aktualni seznam podobdelovalcev je na voljo na zahtevo na tina@pinart.si.`,
    },
    {
      heading: '5b. Sef avtorstva',
      text: `Sef avtorstva shrani kriptografski odtis (SHA-256) vašega dela, datum in podatke o delu (npr. ime datoteke, orodje). Odtis je enolični »prstni odtis«; iz njega ni mogoče rekonstruirati vsebine. Za neodvisen časovni žig uporabljamo storitev FreeTSA (freetsa.org) po standardu RFC 3161: overitelju se pošlje izključno 32-bajtni odtis, ta pa vrne časovni žeton, podpisan s svojim certifikatom. Vaša datoteka, njeno ime in opis dela overitelja nikoli ne dosežejo — ta ne izve, kaj ste žigosali, potrdi le, da je bil ta odtis znan ob določenem času. Žeton lahko preveri kdorkoli, tudi brez Pinart Flowa. Overitelja lahko zamenjamo (na primer za kvalificirano storitev po uredbi eIDAS); aktualnega sporočimo na zahtevo.\n\nČe izberete plačljivi oblačni trezor, se izvirna datoteka (in morebitne izvorne datoteke) shrani v zasebni oblačni shrambi (Supabase, EU), dostopni le vam. Sef dokazuje obstoj in prioriteto dela na določen dan, ne pa absolutnega avtorstva, in ni nadomestilo za uradno registracijo pravic.`,
    },
    {
      heading: '5c. Varnost',
      text: `Podatke varujemo s tehničnimi in organizacijskimi ukrepi: šifriran prenos (TLS), šifrirana hramba pri ponudniku baze, dostop na ravni baze (vsak uporabnik vidi le svoje podatke), prijava prek zaupanja vrednega ponudnika (Google OAuth) in samodejne dnevne varnostne kopije baze, ki omogočajo povrnitev podatkov ob incidentu (člen 32(1)(c) GDPR). Noben sistem ni popolnoma neprebojen; za varovanje dostopa do svojega računa (npr. naprave in prijave) odgovarjate tudi sami.`,
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
      heading: '9. Umetna inteligenca (Pupa) in varnost podatkov',
      text: `Pupa je izbirna pomočnica, ki deluje prek Anthropic Claude API. Obdelava poteka strežniško, zato API ključ ni izpostavljen v uporabnikovem brskalniku. Anthropic prejme samo vsebino, ki jo uporabnik vnese v Pupo, in minimalen kontekst odprtega orodja ali ponudbe, potreben za odgovor; nič drugega. Anthropic nima dostopa do baze Pinart Flow — vidi le besedilo posamezne zahteve in baze ne more brati ali izvoziti.

V Pupo ne vnašajte zaupnih podatkov, poslovnih skrivnosti ali osebnih podatkov strank. Če Pupe ne uporabljate, se podatki ne pošiljajo družbi Anthropic ali kateremu koli drugemu zunanjemu ponudniku AI. Orodja Pinart Flow delujejo brez AI, cene pa se izračunajo s formulami in pravili lokalno oziroma na zaledju Pinart Flow.

Anthropic je predviden kot podobdelovalec. Po njegovih aktualnih pogojih se vhodi in izhodi komercialnega API privzeto ne uporabljajo za učenje modelov. Obdobje hrambe velja po aktualnih pogojih Anthropic. Ker se podatki lahko obdelujejo v ZDA, mora biti prenos urejen z DPA z družbo Anthropic in ustreznimi standardnimi pogodbenimi klavzulami (SCC).

Aktualni seznam podobdelovalcev je na voljo na zahtevo na tina@pinart.si. Več: https://privacy.anthropic.com/en/collections/10663361-commercial-customers.`,
    },
    {
      heading: '10. Spremembe politike',
      text: `Politiko zasebnosti lahko kadar koli posodobimo. Datum zadnje posodobitve je naveden na vrhu te strani.`,
    },
  ],
};

const en = {
  title: 'Privacy Policy',
  updated: `Version ${POGOJI_RAZLICICA} · Last updated: 23 August 2026`,
  sections: [
    {
      heading: '1. Data Controller',
      text: `Pinart d.o.o., Mladinska ulica 63, 1000 Ljubljana, Slovenia\nEmail: tina@pinart.si`,
    },
    {
      heading: '2. Data We Collect',
      text: `Depending on how you use the service, we process:\n\n– Contact form: first and last name, email, message content (at your initiative).\n– User account: email and name received from your sign-in provider (e.g. Google) when you log in.\n– Business data in the app: proposals, contracts, invoices, clients, projects, expenses and tasks you enter while using the service (stored to your account).\n– Communications: the content of project chat and project mail, if you use those features.\n– Authorship vault: file name, cryptographic fingerprint (SHA-256), date and work details; and, with the paid vault, the file itself.\n– Usage data (logged in): the number of visits and active days of your account and the time of your last sign-in — to monitor and improve the service. This is not anonymous (tied to your account) and is unrelated to the anonymous pricing statistics.\n– Anonymous pricing statistics: no personal data, cannot be linked to you (see below).`,
    },
    {
      heading: '3. Purpose and Legal Basis',
      text: `We process your data to: (a) respond to inquiries and conduct business communication; (b) provide and operate the platform (account, document storage, communications, vault); (c) bill subscriptions; (d) improve the service.\n\nLegal bases: performance of a contract or pre-contractual steps (Art. 6(1)(b) GDPR) for platform operation and subscriptions; your consent (Art. 6(1)(a) GDPR) e.g. for updates; legitimate interest (Art. 6(1)(f) GDPR) for security and improvements.`,
    },
    {
      heading: '4. Data Retention',
      text: `We retain your data only for as long as necessary for the purpose of processing, or for as long as your account exists. After account deletion or on your request we delete your data, except where we must retain it by law (e.g. accounting rules for issued invoices).`,
    },
    {
      heading: '5. Where Your Data Is Stored',
      text: `Business data of logged-in users is stored in a cloud database and storage (Supabase, servers in the European Union). Data is tied to your account and protected by database-level access rules, so only you and the people you explicitly share content with can access it.`,
    },
    {
      heading: '5a. Subprocessors',
      text: `We do not sell or rent your data. To operate the service it is processed by the following subprocessors, strictly on our instructions:\n\n– Supabase — cloud database and storage (EU)\n– Vercel — hosting and application delivery\n– Resend — sending email\n– Google — sign-in with a Google account (OAuth) and a Google Sheets spreadsheet that records contact-form inquiries and calculator sign-ups (name, email, message)\n– Cloudflare — receiving and forwarding inbound email on @pinartflow.com addresses\n– Anthropic — the AI assistant Pupa (only when used; see section 9)\n– FreeTSA (freetsa.org) — independent time-stamping authority for the vault under RFC 3161 (receives only the 32-byte fingerprint, never the file, its name or the work description)\n– an authorised payment provider (Merchant of Record) — subscription payment processing\n\nWe also share data with third parties where required by law. The current list of subprocessors is available on request at tina@pinart.si.`,
    },
    {
      heading: '5b. Authorship Vault',
      text: `The Authorship vault stores a cryptographic fingerprint (SHA-256) of your work, a date and work details (e.g. file name, tool). The fingerprint is a unique "fingerprint"; the content cannot be reconstructed from it. For an independent timestamp we use FreeTSA (freetsa.org) under the RFC 3161 standard: only the 32-byte fingerprint is sent to the time-stamping authority, which returns a time-stamp token signed with its own certificate. Your file, its name and the work description never reach the authority — it does not learn what you time-stamped, only that this fingerprint was already known at that time. Anyone can verify the token, including without Pinart Flow. We may change the authority (for example to a qualified service under the eIDAS Regulation); the current one is disclosed on request.\n\nIf you choose the paid cloud vault, the original file (and any source files) is stored in private cloud storage (Supabase, EU) accessible only to you. The vault proves the existence and priority of a work on a given date, not absolute authorship, and is not a substitute for formal rights registration.`,
    },
    {
      heading: '5c. Security',
      text: `We protect your data with technical and organisational measures: encrypted transport (TLS), encryption at rest at our database provider, database-level access control (each user sees only their own data), sign-in through a trusted provider (Google OAuth), and automated daily database backups that allow data to be restored after an incident (Article 32(1)(c) GDPR). No system is completely impenetrable; you are also responsible for protecting access to your account (e.g. your device and login).`,
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
      heading: '9. Artificial Intelligence (Pupa) and Data Security',
      text: `Pupa is an optional assistant powered by the Anthropic Claude API. Processing takes place server-side, so the API key is not exposed in the user's browser. Anthropic receives the content entered into Pupa and the limited open-tool or offer context required to provide a response. Anthropic has no direct access to the Pinart Flow database.

Do not enter confidential information, trade secrets, or clients' personal data into Pupa. If you do not use Pupa, data is not sent to Anthropic or another external AI provider; the core Pinart Flow tools operate without AI.

Anthropic is intended to act as a subprocessor. Under its current terms, commercial API inputs and outputs are not used for model training by default. Retention follows Anthropic's then-current terms. Because data may be processed in the United States, transfers must be governed by a DPA and appropriate Standard Contractual Clauses (SCCs).

The current list of subprocessors is available on request at tina@pinart.si. More: https://privacy.anthropic.com/en/collections/10663361-commercial-customers.`,
    },
    {
      heading: '10. Changes to This Policy',
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
    <>
    <main
      style={{
        background: 'var(--paper)',
        minHeight: '100vh',
        paddingTop: 'clamp(2.25rem, 6vw, 5rem)',
        paddingBottom: 'clamp(4rem, 8vw, 7rem)',
        paddingInline: 'clamp(1.5rem, 8vw, 12rem)',
      }}
    >
      <div style={{ maxWidth: '720px', marginInline: 'auto' }}>
        <NazajLink rezerva="/" label={locale === 'en' ? 'Back' : 'Nazaj'} />

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
    <Footer />
    </>
  );
}
