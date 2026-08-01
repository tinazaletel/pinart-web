import { test } from '@playwright/test';

/* Odpre Flow landing (/flow) in shrani screenshote za vsako napravo/orientacijo.
   Slike: tests/screenshots/<naprava>-*.png — odpri jih in vidiš, kako izgleda
   povsod hkrati (hero, pupa, kepa, carusel), brez ročnega preklapljanja naprav. */
test('landing screenshoti', async ({ page }, testInfo) => {
  const ime = testInfo.project.name;

  await page.goto('/flow', { waitUntil: 'domcontentloaded' });

  /* piškotni pas zapremo (Zavrni = brez sledenja), da ne prekriva heroja */
  await page.getByRole('button', { name: 'Zavrni' }).click({ timeout: 3000 }).catch(() => {});

  /* pusti mehurčke/animacije, da se ustalijo */
  await page.waitForTimeout(1500);

  /* 1) hero (vrh zaslona) */
  await page.screenshot({ path: `tests/screenshots/${ime}-1-hero.png` });

  /* 2) cela stran (dolga) — pupa, carusel orodij, kepa na poti */
  await page.screenshot({ path: `tests/screenshots/${ime}-2-cela.png`, fullPage: true });
});
