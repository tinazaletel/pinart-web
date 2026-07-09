import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['sl', 'en'],
  defaultLocale: 'sl',
  /* Slovenscina zivi na pinart.si/ BREZ /sl predpone — odpravi ~1s
     preusmeritev / -> /sl ob vsakem prvem obisku (zadnja velika
     PageSpeed postavka). Stari /sl/... URL-ji se samodejno
     preusmerijo na razlicico brez predpone; /en ostane kot je. */
  localePrefix: 'as-needed',
  /* Brez samodejnega ugibanja jezika po brskalniku: pinart.si/ VEDNO
     streze slovensko, brez preusmeritve — tudi za Lighthouse/Google,
     ki posiljata Accept-Language: en (sicer bi meritev spet zadela
     preusmeritev / -> /en). Anglescina je dosegljiva na /en in prek
     stikala v meniju (ki nastavi piskotek). */
  localeDetection: false
});

/* Za rocno grajene href-e (navadni <a> in next/link) — next-intl <Link>
   predpono ureja sam, tile pa morajo vedeti, da sl nima predpone. */
export function localePath(locale: string, path: string) {
  if (locale === routing.defaultLocale) return path === '' ? '/' : path;
  return path === '/' || path === '' ? `/${locale}` : `/${locale}${path}`;
}

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
