/* Zaprta beta: dostop do Flow aplikacije (in zastonj poln paket) imajo samo
   povabljeni testerji. Isti seznam poganja OBOJE — zaklep v middleware in
   dodelitev "pro" paketa v pinartFlowEntitlements.

   Emaile dodajaš prek Vercel env spremenljivke NEXT_PUBLIC_BETA_TESTERJI
   (z vejico loceni), brez ponovnega deploya kode. Osnovni seznam spodaj je
   varnostna mreza (Tina se ne more zakleniti ven). Gesel NI — prijava je Google. */

const OSNOVNI_TESTERJI = [
  'tina@pinart.si',
];

function normaliziraj(e: string | null | undefined): string {
  return (e || '').trim().toLowerCase();
}

const izEnv = (process.env.NEXT_PUBLIC_BETA_TESTERJI || '')
  .split(',')
  .map(normaliziraj)
  .filter(Boolean);

export const BETA_TESTERJI: ReadonlySet<string> = new Set([
  ...OSNOVNI_TESTERJI.map(normaliziraj),
  ...izEnv,
]);

/* Ali je ta e-mail povabljen v zaprto beto? */
export function jeTester(email: string | null | undefined): boolean {
  return BETA_TESTERJI.has(normaliziraj(email));
}
