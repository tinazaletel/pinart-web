import { MetadataRoute } from 'next';

/**
 * Stran ostane POPOLNOMA najdljiva (iskalniki + AI-iskalni/citatni boti) — za nov
 * brand je doseg vrednejsi od drobne zascite. Pravni opt-out proti UCENJU AI
 * ("ne uci se na tem") nosita meta 'noai' + 'tdm-reservation' v app/[locale]/layout.tsx
 * (EU TDM pridrzek) — ta nic ne blokira, le razglasi pridrzek pravice.
 * Prava obramba avtorskih del = Sef (dokaz) + pravni pogoji, ne robots.txt.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://pinart.si/sitemap.xml',
  };
}
