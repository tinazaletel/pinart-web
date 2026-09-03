import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import { routing, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/routing';

/* Izid potrditve ali odjave. Ena stran za oboje — clovek pride sem iz maila,
 * zato mora v enem pogledu videti, kaj se je zgodilo, in imeti pot naprej. */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Stanje = 'potrjeno' | 'odjavljeno' | 'poteklo' | 'napaka';

const BESEDILA: Record<Locale extends string ? string : never, Record<Stanje, { naslov: string; pod: string }>> = {
  sl: {
    potrjeno:   { naslov: 'Prijava je potrjena.', pod: 'Pisali ti bomo poredko — o orodju in nasvetih za kreativce. V vsakem pisemcu je povezava za odjavo.' },
    odjavljeno: { naslov: 'Odjavljen/-a si.',      pod: 'Tvoj e-naslov smo izbrisali. Ne hranimo ga naprej in ti ne bomo več pisali.' },
    poteklo:    { naslov: 'Povezava je potekla.',  pod: 'Prijave nismo potrdili v roku, zato smo tvoj naslov izbrisali. Če se še želiš prijaviti, to lahko storiš znova.' },
    napaka:     { naslov: 'Povezava ne velja.',    pod: 'Morda je bila že uporabljena ali pa je nepopolna. Poskusi znova iz zadnjega pisemca.' },
  },
  en: {
    potrjeno:   { naslov: 'Subscription confirmed.', pod: 'We write rarely — about the tool and tips for creatives. Every message carries an unsubscribe link.' },
    odjavljeno: { naslov: 'You are unsubscribed.',   pod: 'Your address has been deleted. We do not keep it and will not write again.' },
    poteklo:    { naslov: 'The link has expired.',   pod: 'The subscription was not confirmed in time, so your address was deleted. You are welcome to subscribe again.' },
    napaka:     { naslov: 'This link is not valid.', pod: 'It may have been used already or be incomplete. Try again from the latest message.' },
  },
};

export default async function Obvescanje({
  params, searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ stanje?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { stanje } = await searchParams;
  const kljuc: Stanje = stanje === 'potrjeno' || stanje === 'odjavljeno' || stanje === 'poteklo' ? stanje : 'napaka';
  const t = BESEDILA[locale === 'en' ? 'en' : 'sl'][kljuc];

  /* Pupa je obrezana na doprsje: v celi sliki drzi papirje IN denar s kovanci,
     kar pri potrditvi novic ni pravo sporocilo. Zgornji del pusti obraz in
     dvignjeno roko s papirji (Tina, 3. 9. 2026). */
  return (
    <main className="obv-stran">
      <div className="obv-karta">
        <div className="obv-pupa" aria-hidden>
          <Image src="/flow-pupa-racuni.png" alt="" width={320} height={336} priority />
        </div>
        <h1>{t.naslov}</h1>
        <p>{t.pod}</p>
        <Link href="/">{locale === 'en' ? 'Back to Pinart Flow' : 'Nazaj na Pinart Flow'}</Link>
      </div>
    </main>
  );
}
