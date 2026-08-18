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
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core']
  }
};

export default withNextIntl(nextConfig);
