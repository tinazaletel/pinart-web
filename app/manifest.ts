import type { MetadataRoute } from 'next';

/* PWA manifest — s tem brskalnik Flow ponudi za namestitev.
 *
 * Borjan po testiranju (2. 9. 2026): "to ni spletna stran, ampak orodje, in
 * pricakoval bi, da si ga lahko nalozim na komp." Namescen Flow dobi ikono v
 * Docku, svoje okno brez naslovne vrstice in mesto v preklopniku programov.
 * Koda in naslov ostaneta ista; spremeni se samo, kako ga brskalnik postreze.
 *
 * start_url je nadzorna plosca, ne landing: kdor Flow namesti, ga ne odpira
 * zato, da bi bral predstavitev. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pinart Flow',
    short_name: 'Flow',
    description: 'Ponudbe, pogodbe, računi in projekti na enem mestu.',
    start_url: '/kalkulator/pregled',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#F7F4EE',
    theme_color: '#F7F4EE',
    lang: 'sl',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/ikona-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/ikona-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/ikona-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Nova ponudba', url: '/kalkulator/orodje' },
      { name: 'Projekti', url: '/kalkulator/projekti' },
      { name: 'Komunikacija', url: '/kalkulator/komunikacija' },
    ],
  };
}
