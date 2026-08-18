import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['framer-motion', 'gsap'],
    /* @sparticuz/chromium + puppeteer-core morata OSTATI eksterna (ne zapakirana v
       serverless bundle), sicer se brotli-stisnjeni Chrome binarni pokvari na Vercelu
       in ponudba-pdf (predogled = A4 strani) pade v fallback. Zato live != local. */
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    /* PRISILI, da so v ponudba-pdf funkcijo zapakirane VSE datoteke @sparticuz/chromium
       (vkljucno z .br knjiznicami libnss3 ipd., ki se berejo prek fs ob zagonu — Next
       jih sicer ne sledi, ker niso require-ane -> 'libnss3.so cannot open' na Vercelu). */
    outputFileTracingIncludes: {
      '/api/ponudba-pdf': ['./node_modules/@sparticuz/chromium/**/*']
    }
  }
};

export default withNextIntl(nextConfig);
