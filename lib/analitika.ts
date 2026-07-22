/**
 * Anonimno beleženje uporabe. Kliče se iz brskalnika, pošlje na /api/dogodek.
 *
 * Nikoli ne pošilja imena, e-pošte, vsebine ponudb ali ur iz zasebnega
 * dnevnika. `lastnosti` naj vsebujejo samo števila in kratke oznake
 * (npr. { storitev: 'logo', korak: 3 }) — strežnik jih tako ali tako skrči.
 *
 * Id seje je naključen niz v sessionStorage: pove le, da gre za isti obisk,
 * ne pove, kdo je. Ob zaprtju zavihka izgine.
 */

const KLJUC = 'pinart_seja';

function idSeje(): string {
  if (typeof window === 'undefined') return '';
  try {
    let s = sessionStorage.getItem(KLJUC);
    if (!s) { s = crypto.randomUUID(); sessionStorage.setItem(KLJUC, s); }
    return s;
  } catch { return ''; }
}

export type Paket = 'anon' | 'free' | 'pro';

/* Ali je obiskovalka vpisana in kateri paket ima. Rabimo za vprašanje
   "koliko je nevpisanih". Bere se enkrat na sejo; ce Supabase ni na voljo
   (brezplacno orodje brez prijave), ostane 'anon'. */
let paketVSeji: Paket | null = null;
export async function ugotoviPaket(): Promise<Paket> {
  if (paketVSeji) return paketVSeji;
  paketVSeji = 'anon';
  try {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return paketVSeji;
    const { data } = await supabase.rpc('current_organization_entitlements');
    const vrsta = Array.isArray(data) ? data[0]?.tier : undefined;
    paketVSeji = vrsta === 'pro' ? 'pro' : 'free';
  } catch { /* ostane 'anon' */ }
  return paketVSeji;
}

/* Kot zabelezi(), a sam ugotovi paket — uporabi to, kadar te zanima delitev
   vpisani/nevpisani. */
export async function zabeleziSPaketom(
  ime: string,
  lastnosti: Record<string, string | number | boolean> = {},
): Promise<void> {
  zabelezi(ime, lastnosti, await ugotoviPaket());
}

export function zabelezi(
  ime: string,
  lastnosti: Record<string, string | number | boolean> = {},
  paket: Paket = 'anon',
): void {
  if (typeof window === 'undefined') return;
  const telo = JSON.stringify({
    ime, lastnosti, paket,
    pot: window.location.pathname,
    seja: idSeje(),
    naprava: window.matchMedia('(max-width: 820px)').matches ? 'mobile' : 'desktop',
    jezik: navigator.language?.slice(0, 5) || '',
  });

  /* sendBeacon prezivi tudi zapiranje zavihka; fetch je rezerva. Napake
     namenoma pozremo — beleženje ne sme nikoli pokvariti uporabe orodja. */
  try {
    if (navigator.sendBeacon?.(  '/api/dogodek', new Blob([telo], { type: 'application/json' }))) return;
  } catch { /* pade na fetch spodaj */ }
  void fetch('/api/dogodek', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: telo, keepalive: true,
  }).catch(() => undefined);
}
