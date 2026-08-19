/* CAS ZADNJE SPREMEMBE KATALOGOV (sodelavci, oddelki, podrocja, postavke, produkti)
   ------------------------------------------------------------------------------
   Teh pet shramb hrani GOL SEZNAM (JSON polje), zato v samem zapisu ni prostora
   za cas spremembe — brez njega pa se ob sinhronizaciji ne da ugotoviti, katera
   stran je novejsa. Cas zato zivi v LOCENEM kljucu localStorage, da oblika
   obstojecih zapisov ostane nespremenjena in stare shrambe delajo naprej.

   Ta modul je namenoma BREZ uvozov (ne Supabase, ne pet izvornih datotek):
   uvazajo ga tako lib/sodelavci.ts ipd. kot lib/katalogiOblak.ts, in ce bi
   nosil odvisnosti, bi nastal krog (katalogiOblak -> sodelavci -> katalogiOblak). */

export type KatalogKljuc = 'sodelavci' | 'oddelki' | 'podrocja' | 'postavke' | 'produkti';

/* Dogodek za FlowCloudBridge — enak vzorec kot 'pinart-projekti-change'.
   Shramba javi spremembo, most jo z zamikom posije v oblak; neposrednega klica
   tu ne moremo narediti, ker bi naredil krog uvozov. */
export const DOGODEK_KATALOGI = 'pinart-katalogi-change';

const CAS_PREDPONA = 'pinart-katalog-cas-';

const casKljuc = (kljuc: KatalogKljuc) => `${CAS_PREDPONA}${kljuc}`;

/* Cas zadnje LOKALNE spremembe v milisekundah; 0 = neznano (zapis je nastal
   pred to migracijo ali ga sploh ni). */
export function preberiCasKataloga(kljuc: KatalogKljuc): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(casKljuc(kljuc));
    if (!raw) return 0;
    const t = Date.parse(raw);
    return Number.isNaN(t) ? 0 : t;
  } catch { return 0; }
}

/* Zapise cas BREZ dogodka — uporabi se, ko lokalno sliko prepise OBLAK.
   Cas se postavi na oblacnega, da naslednji push vidi enako vrednost in
   spremembe ne posilja nazaj v neskoncnem krogu. */
export function nastaviCasKataloga(kljuc: KatalogKljuc, iso: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(casKljuc(kljuc), iso); } catch { /* zasebni nacin */ }
}

/* Ozanci lokalno spremembo (zdaj) in javi dogodek za prenos v oblak.
   Klicejo jo shrani* funkcije petih katalogov. */
export function oznaciKatalogSpremenjen(kljuc: KatalogKljuc): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(casKljuc(kljuc), new Date().toISOString()); } catch { /* zasebni nacin */ }
  window.dispatchEvent(new CustomEvent(DOGODEK_KATALOGI, { detail: { kljuc } }));
}
