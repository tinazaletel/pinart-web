/* KLIC STRIPOVEGA API — brez knjižnice, namenoma.
 *
 * Uradni paket `stripe` je odličen, a njegovi tipi poznajo samo parametre, ki
 * so obstajali ob izidu različice. Managed Payments je nov in bi ga TypeScript
 * zavrnil kot neznano polje — obšli bi ga z `as any`, kar je slabše od
 * poštenega klica. Stripov API je navaden obrazec prek HTTPS; tu ga pošljemo
 * takega, kot je dokumentiran, in se izognemo tretji odvisnosti na plačilni
 * poti, kjer je vsaka odvisnost tudi tveganje.
 */

const OSNOVA = 'https://api.stripe.com/v1';

export class StripeNapaka extends Error {
  koda?: string;
  constructor(sporocilo: string, koda?: string) { super(sporocilo); this.name = 'StripeNapaka'; this.koda = koda; }
}

export function stripeKljuc(): string | null {
  return process.env.STRIPE_SECRET_KEY || null;
}

/* Gnezdena polja gredo v obliki a[b][c]=vrednost — tako jih Stripe pričakuje. */
export function splosciPolja(objekt: Record<string, unknown>, predpona = ''): [string, string][] {
  const pari: [string, string][] = [];
  for (const [k, v] of Object.entries(objekt)) {
    if (v === undefined || v === null) continue;
    const ime = predpona ? `${predpona}[${k}]` : k;
    if (typeof v === 'object' && !Array.isArray(v)) pari.push(...splosciPolja(v as Record<string, unknown>, ime));
    else if (Array.isArray(v)) v.forEach((el, i) => {
      if (typeof el === 'object' && el !== null) pari.push(...splosciPolja(el as Record<string, unknown>, `${ime}[${i}]`));
      else pari.push([`${ime}[${i}]`, String(el)]);
    });
    else pari.push([ime, String(v)]);
  }
  return pari;
}

export async function stripeZahtevek<T = any>(
  pot: string,
  moznosti: { metoda?: 'GET' | 'POST'; polja?: Record<string, unknown> } = {},
): Promise<T> {
  const kljuc = stripeKljuc();
  if (!kljuc) throw new StripeNapaka('STRIPE_SECRET_KEY ni nastavljen');

  const { metoda = 'GET', polja } = moznosti;
  const pari = polja ? splosciPolja(polja) : [];
  const telo = new URLSearchParams(pari).toString();
  const naslov = metoda === 'GET' && telo ? `${OSNOVA}${pot}?${telo}` : `${OSNOVA}${pot}`;

  const odgovor = await fetch(naslov, {
    method: metoda,
    headers: {
      Authorization: `Bearer ${kljuc}`,
      ...(metoda === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: metoda === 'POST' ? telo : undefined,
    cache: 'no-store',
  });

  const json = await odgovor.json().catch(() => null);
  if (!odgovor.ok || json?.error) {
    /* Sporočilo Stripa povemo naprej — brez njega je razhroščevanje ugibanje.
       Ključa v njem ni, ker ga Stripe nikoli ne vrača. */
    throw new StripeNapaka(json?.error?.message || `Stripe je vrnil ${odgovor.status}`, json?.error?.code);
  }
  return json as T;
}

/** ID lestvice za dani lookup key; null, če je v Stripu ni. */
export async function idLestvice(lookupKey: string): Promise<string | null> {
  const j = await stripeZahtevek<{ data: { id: string; active: boolean }[] }>('/prices', {
    polja: { 'lookup_keys[0]': lookupKey, active: 'true', limit: 1 },
  });
  return j.data?.[0]?.id || null;
}
