'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';

export default function GoogleAnalytics() {
  const pot = usePathname() || '';
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pinart_cookie_consent');
    if (stored === 'accepted') setHasConsent(true);

    const onConsent = (e: Event) => {
      if ((e as CustomEvent).detail === 'accepted') setHasConsent(true);
    };
    window.addEventListener('pinart-cookie-consent', onConsent);
    return () => window.removeEventListener('pinart-cookie-consent', onConsent);
  }, []);

  /* Zasebne povezave in vprašalnik so izvzeti. GA ne snema vsebine, zapiše pa
     NASLOV — pri /p/ in /v/ je žeton v naslovu sam ključ do dokumenta stranke,
     zato bi ga s tem izročili tretjemu (Tina, 3. 9. 2026). */
  const jeZasebno = /(^|\/)(p|v)\//.test(pot) || /(^|\/)vprasalnik(\/|$)/.test(pot);
  if (!hasConsent || !GA_ID || jeZasebno) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
