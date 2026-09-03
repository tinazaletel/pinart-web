import type { Metadata } from 'next';

/* KARTICA ZA DELJENJE POVEZAVE NA VPRAŠALNIK
 *
 * Brez lastne kartice strani vprašalnika podedujejo openGraph od
 * [locale]/layout — to je kartica STUDIA (pinart.si, og-image.jpg). V iMessage
 * se je ob povezavi na vprašalnik pokazal portret Pinart namesto Flowa, isti
 * hrošč kot pri Flow landingu 27. 8. (Tina, 3. 9. 2026). Slika je ista kot pri
 * Flowu; naslov in opis sta kratka, ker ju aplikacije odrežejo. */
export function karticaVprasalnika(jeEn: boolean, naslov: string, pot: string): Metadata {
  const opis = jeEn
    ? 'Fifteen minutes, works on your phone. I will not publish your prices.'
    : 'Petnajst minut, gre tudi na telefonu. Tvojih cen ne objavim.';
  const url = `https://pinartflow.com${jeEn ? '/en' : ''}${pot}`;
  const slika = 'https://pinartflow.com/flow-og.jpg';
  return {
    title: naslov,
    description: opis,
    /* Vprašalnik je za ljudi, ki jim Tina pošlje povezavo, ne za iskalnike;
       odgovori so občutljivi (prave cene). Kartica za deljenje dela ne glede
       na noindex. */
    robots: { index: false, follow: false },
    openGraph: {
      title: naslov,
      description: opis,
      url,
      siteName: 'Pinart Flow',
      locale: jeEn ? 'en_US' : 'sl_SI',
      type: 'website',
      images: [{ url: slika, width: 1200, height: 630, alt: jeEn ? 'Pinart Flow — every project, from quote to payment' : 'Pinart Flow — vsak projekt, od ponudbe do plačila' }],
    },
    twitter: { card: 'summary_large_image', title: naslov, description: opis, images: [slika] },
  };
}
