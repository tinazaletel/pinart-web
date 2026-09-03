import type { Metadata } from 'next';
import Link from 'next/link';
import PupaObraz from '@/components/PupaObraz';
import { setRequestLocale } from 'next-intl/server';
import { PANOGE } from '@/lib/vprasalnikPanoge';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [{ locale: 'sl' }, { locale: 'en' }];
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'en' ? 'Pricing questionnaire | Pinart Flow' : 'Vprašalnik o cenah | Pinart Flow',
    robots: { index: false, follow: false },
  };
}

/* Razdelilnik. Testerju v vabilu ne moremo vedeti panoge, zato dobi to pot in
   izbere sam. Kdor panogo pozna, dobi neposredno povezavo. */
export default async function VprasalnikIzbira({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const jeEn = locale === 'en';
  const base = jeEn ? '/en' : '';
  const L = (sl: string, en: string) => (jeEn ? en : sl);

  return <main className="vi">
    {/* Jezik doloca povezava; stikalo, da clovek ni ujet v jeziku, v katerem
        je povezavo dobil (Tina, 3. 9. 2026). */}
    <nav className="vi-jezik" aria-label={L('Jezik', 'Language')}>
      <Link href="/vprasalnik" aria-current={jeEn ? undefined : 'page'}>SL</Link>
      <span>·</span>
      <Link href="/en/vprasalnik" aria-current={jeEn ? 'page' : undefined}>EN</Link>
    </nav>
    <PupaObraz px={64} />
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
      .vi span { display: inline-flex; }
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
      .vi .vi-jezik { flex-direction: row; justify-content: flex-end; align-items: center; gap: .4rem;
                      margin-bottom: 1rem; font-size: .72rem; font-weight: 600; letter-spacing: .12em;
                      color: color-mix(in oklch, var(--ink, #1c1518) 45%, transparent); }
      .vi .vi-jezik a { display: inline; padding: .2rem .1rem; border: 0; border-radius: 0; background: none;
                        color: inherit; font-size: inherit; font-weight: inherit; }
      .vi .vi-jezik a:hover { background: none; }
      .vi .vi-jezik a[aria-current] { color: var(--ink, #1c1518); border-bottom: 2px solid var(--purple, #7C3AED); }
    `}</style>
  </main>;
}
