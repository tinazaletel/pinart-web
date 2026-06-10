import { MetadataRoute } from 'next';

const BASE = 'https://pinart.si';

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['sl', 'en'];
  const routes = ['', '/zasebnost'];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of routes) {
      entries.push({
        url: `${BASE}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'monthly' : 'yearly',
        priority: route === '' ? 1 : 0.3,
      });
    }
  }

  // Case studies
  const cases = ['petrol-pay', 'mbills', 'lucky-7', 'molly-lolly'];
  for (const locale of locales) {
    for (const slug of cases) {
      entries.push({
        url: `${BASE}/${locale}/work/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
