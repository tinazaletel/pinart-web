import { defineConfig } from 'vitest/config';
import path from 'node:path';

/* Vitest — enotni (unit) testi čiste logike (cenovni katalog, pomožne funkcije).
   Testi so v tests/unit/*.test.ts, ločeni od Playwright *.spec.ts (vizualni).
   Zaženeš:  npm run test:unit */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
