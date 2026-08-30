import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Gradnjo je mogoce poslati v drugo mapo (NEXT_DIST_DIR=.next-build), da
     preverjanje pred pushom ne povozi .next tekocega dev streznika — prej je
     build med razvojem podrl streznik in stran je stregla iz izbrisane mape
     (Tina, 30. 8. 2026). Brez spremenljivke je vse kot prej. */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  /* 'output: standalone' odstranjen: na Vercelu ni potreben in je izpuscal
     @sparticuz/chromium runtime knjiznice (libnss3) iz funkcije. Vercel zgradi
     sam z lastnim tracingom. */
  experimental: {
    optimizePackageImports: ['framer-motion', 'gsap'],
    /* @sparticuz/chromium + puppeteer-core morata OSTATI eksterna (ne zapakirana v
       serverless bundle), sicer se brotli-stisnjeni Chrome binarni pokvari na Vercelu
       in ponudba-pdf (predogled = A4 strani) pade v fallback. Zato live != local. */
    serverComponentsExternalPackages: ['@sparticuz/chromium', '@sparticuz/chromium-min', 'puppeteer-core']
  },
  /* Modni portfelj: povezavo daje Tina sama (prijava na razpis), zato datoteka
     ne sodi v Google — noindex velja tudi za PDF, ki ga iskalnik sicer prebere
     in indeksira kot vsako stran (Tina, 31. 8. 2026). */
  async headers() {
    return [
      {
        source: '/portfolio/:pot*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  }
};

export default withNextIntl(nextConfig);
