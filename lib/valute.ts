/* Skupni seznam valut za dokumente (račun, retainer, ponudba). Znesek se vpiše
   NEPOSREDNO v izbrani valuti — brez preračuna tečaja. Privzeto EUR, tako da
   Slovenija ostane nespremenjena; ostali svet izbere valuto in vpiše svoj davek
   (VAT / GST / Sales tax …), enako kot Xero / QuickBooks / FreshBooks. */
export type ValutaRacun = { id: string; znak: string; ime: string };

export const VALUTE_RACUN: ValutaRacun[] = [
  { id: 'eur', znak: '€',   ime: 'EUR — €' },
  { id: 'usd', znak: '$',   ime: 'USD — $' },
  { id: 'gbp', znak: '£',   ime: 'GBP — £' },
  { id: 'chf', znak: 'CHF', ime: 'CHF — Fr' },
  { id: 'aud', znak: 'A$',  ime: 'AUD — A$' },
  { id: 'cad', znak: 'C$',  ime: 'CAD — C$' },
  { id: 'sek', znak: 'kr',  ime: 'SEK — kr' },
  { id: 'nok', znak: 'kr',  ime: 'NOK — kr' },
  { id: 'dkk', znak: 'kr',  ime: 'DKK — kr' },
  { id: 'pln', znak: 'zł',  ime: 'PLN — zł' },
  { id: 'czk', znak: 'Kč',  ime: 'CZK — Kč' },
  { id: 'jpy', znak: '¥',   ime: 'JPY — ¥' },
  { id: 'cny', znak: '¥',   ime: 'CNY — ¥' },
  { id: 'inr', znak: '₹',   ime: 'INR — ₹' },
  { id: 'aed', znak: 'AED', ime: 'AED — د.إ' },
];

export const valutaZnak = (id: string): string =>
  VALUTE_RACUN.find(v => v.id === id)?.znak ?? '€';
