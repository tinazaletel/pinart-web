import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { PANOGE } from '@/lib/vprasalnikPanoge';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ locale: 'sl' }, { locale: 'en' }];
}

export const metadata: Metadata = {
  title: 'Vprašalnik o cenah | Pinart Flow',
  robots: { index: false, follow: false },
};

/* Razdelilnik. Testerju v vabilu ne moremo vedeti panoge, zato dobi to pot in
   izbere sam. Kdor panogo pozna, dobi neposredno povezavo. */
export default async function VprasalnikIzbira({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const jeEn = locale === 'en';
  const base = jeEn ? '/en' : '';
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  return <main className="vi">
    <Image src="/flow-pupa-stoji-2.png" alt="" width={72} height={72} priority />
    <h1>{L('Kaj delaš?', 'What do you do?')}</h1>
    <p>{L('Zbiram prave cene, da bo kalkulator znal oceniti obseg dela, ne le izkušenj in trga. Petnajst minut. Tvojih cen ne objavim in jih ne delim naprej.',
          'I am collecting real prices so the calculator can account for scope of work, not just experience and market. Fifteen minutes. I will not publish your prices or share them further.')}</p>
    <nav>
      {PANOGE.map(p => (
        <Link key={p.id} href={`${base}/vprasalnik/${p.id}`}>
          <span>{jeEn ? p.imeEn : p.ime}</span>
        </Link>
      ))}
    </nav>
    <style>{`
      .vi { max-width: 34rem; margin: 0 auto; padding: 3rem 1.2rem 4rem; color: var(--ink, #1c1518); }
      .vi img { width: 72px; height: auto; }
      .vi h1 { margin: 1rem 0 .6rem; font-family: var(--font-serif-flow), Georgia, serif;
               font-size: clamp(1.7rem, 5vw, 2.3rem); font-weight: 500; line-height: 1.15; }
      .vi p { margin: 0 0 2rem; font-size: .95rem; line-height: 1.65;
              color: color-mix(in oklch, var(--ink, #1c1518) 75%, transparent); }
      .vi nav { display: flex; flex-direction: column; gap: .5rem; }
      .vi nav a { display: block; padding: 1rem 1.1rem; border-radius: .9rem;
                  border: 1px solid color-mix(in oklch, var(--ink, #1c1518) 12%, transparent);
                  background: #fff; color: var(--ink, #1c1518); text-decoration: none;
                  font-size: 1rem; font-weight: 500; transition: border-color .15s, background .15s; }
      .vi nav a:hover { border-color: var(--purple, #7C3AED);
                        background: color-mix(in oklch, var(--purple, #7C3AED) 6%, #fff); }
    `}</style>
  </main>;
}
