'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

/* Zaslon zaprte bete: prijavljen uporabnik, ki NI na seznamu testerjev, pristane
   tukaj (preusmeri ga middleware). Landing in kalkulator ostaneta javna. */
export default function BetaZaklep() {
  const locale = useLocale();
  const jeEn = locale === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [odjavljam, setOdjavljam] = useState(false);

  async function odjava() {
    setOdjavljam(true);
    try {
      await createClient().auth.signOut();
    } catch {}
    window.location.href = jeEn ? '/en/kalkulator' : '/kalkulator';
  }

  const domov = jeEn ? '/en/kalkulator' : '/kalkulator';

  return (
    <main className="beta-oder">
      <style dangerouslySetInnerHTML={{ __html: `
        .beta-oder { min-height: 100svh; display: grid; place-items: center; padding: 2rem 1.25rem;
          background: radial-gradient(120% 90% at 50% -10%, oklch(97.5% .02 300 / .9), oklch(97% .012 90)); }
        .beta-kar { width: 100%; max-width: 30rem; text-align: center;
          background: oklch(99.4% .004 300); border: 1px solid oklch(22% .015 300 / .1);
          border-radius: 22px; padding: 2.6rem 2rem 2.2rem; box-shadow: 0 24px 60px -34px oklch(30% .06 300 / .4); }
        .beta-znak { display: inline-flex; align-items: center; gap: .5rem; font-size: .72rem; font-weight: 800;
          letter-spacing: .11em; text-transform: uppercase; color: oklch(50% .16 300);
          background: oklch(95% .045 300); border-radius: 999px; padding: .3rem .75rem; margin-bottom: 1.3rem; }
        .beta-znak i { width: 7px; height: 7px; border-radius: 50%; background: oklch(62% .19 300); display: inline-block; }
        .beta-h { font-family: 'Didot','Playfair Display',Georgia,serif; font-size: clamp(1.7rem, 5vw, 2.3rem);
          line-height: 1.1; font-weight: 500; color: oklch(22% .02 300); margin: 0 0 .7rem; }
        .beta-p { font-size: .98rem; line-height: 1.6; color: oklch(40% .015 300); margin: 0 auto 1.7rem; max-width: 24rem; }
        .beta-p b { color: oklch(28% .02 300); font-weight: 700; }
        .beta-gumbi { display: flex; flex-direction: column; gap: .6rem; }
        .beta-cta { display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
          height: 3rem; border-radius: 999px; font-size: .95rem; font-weight: 700; text-decoration: none; cursor: pointer;
          border: 0; transition: transform .12s ease, background .12s ease; }
        .beta-cta.prim { background: oklch(24% .016 285); color: #fff; }
        .beta-cta.prim:hover { transform: translateY(-1px); background: oklch(30% .03 285); }
        .beta-cta.sek { background: transparent; color: oklch(38% .02 300); border: 1px solid oklch(22% .015 300 / .16); }
        .beta-cta.sek:hover { background: oklch(96% .01 300); }
        .beta-cta:disabled { opacity: .55; cursor: default; }
        .beta-noga { margin-top: 1.6rem; font-size: .82rem; color: oklch(52% .012 300); }
        .beta-noga a { color: oklch(50% .16 300); font-weight: 600; text-decoration: none; }
        .beta-noga a:hover { text-decoration: underline; }
      ` }} />
      <div className="beta-kar">
        <span className="beta-znak"><i />{L('Zaprta beta', 'Closed beta')}</span>
        <h1 className="beta-h">{L('Flow je še v zaprti beti', 'Flow is in closed beta')}</h1>
        <p className="beta-p">
          {L(
            'Dostop do aplikacije je trenutno na povabilo. Tvoj račun še ni na seznamu testerjev — ko te dodamo, se boš s to isto prijavo prijavil naravnost v Flow.',
            'Access is currently by invitation. Your account is not on the tester list yet — once we add you, this same login will take you straight into Flow.'
          )}
        </p>
        <div className="beta-gumbi">
          <Link className="beta-cta prim" href={domov}>{L('Odpri brezplačni kalkulator', 'Open the free calculator')}</Link>
          <button type="button" className="beta-cta sek" onClick={odjava} disabled={odjavljam}>
            {odjavljam ? L('Odjavljam…', 'Signing out…') : L('Odjavi se / prijavi z drugim računom', 'Sign out / use another account')}
          </button>
        </div>
        <p className="beta-noga">
          {L('Želiš zraven? Piši nam na ', 'Want in? Email us at ')}
          <a href="mailto:tina@pinart.si">tina@pinart.si</a>
        </p>
      </div>
    </main>
  );
}
