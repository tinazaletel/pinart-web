import { defineConfig, devices } from '@playwright/test';

/* Playwright — vizualna preverba landinga pri VEČ velikostih in orientacijah,
   vključno z WebKit (Safari pogon), ki je pri Tini ključen. Uporablja OBSTOJEČI
   dev strežnik na :3456 (reuseExistingServer), sicer ga zažene sam.
   Zaženeš:  npx playwright test          (naredi screenshote v tests/screenshots/)
             npx playwright show-report   (odpre HTML poročilo) */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3456',
  },
  webServer: {
    command: 'npx next dev -p 3456',
    url: 'http://localhost:3456',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  /* iPhone/iPad naprave privzeto uporabljajo WebKit (Safari); namizje = Chromium. */
  projects: [
    { name: 'telefon-pokoncno', use: { ...devices['iPhone 13'] } },
    { name: 'telefon-lezece',   use: { ...devices['iPhone 13 landscape'] } },
    { name: 'ipad-pokoncno',    use: { ...devices['iPad Mini'] } },
    { name: 'ipad-lezece',      use: { ...devices['iPad Mini landscape'] } },
    { name: 'namizje',          use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
});
