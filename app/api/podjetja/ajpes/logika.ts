import { PROFIPO_PRODUKCIJA, PROFIPO_TEST } from '@/lib/ajpesProfipo';

export type AjpesTelo = {
  metoda?: unknown;
  maticna?: unknown;
  nabor?: unknown;
  leto?: unknown;
  vrstaLp?: unknown;
  potrjenoPorabiTocko?: unknown;
};

const NABORI = new Set(['OS', 'SS']);
const VRSTE_LP = new Set(['JOLP', 'LP', 'RLP', 'KLP', 'LPN']);

/** Produkcija je namerna in izrecna izbira; vse druge vrednosti ostanejo na testu. */
export function izberiAjpesNaslov(produkcija: string | undefined): string {
  return produkcija === '1' ? PROFIPO_PRODUKCIJA : PROFIPO_TEST;
}

export function manjkajoAjpesPoverilnice(uporabnik: string | undefined, geslo: string | undefined): boolean {
  return !uporabnik?.trim() || !geslo;
}

/** Vrne mirno sporočilo za neveljaven zahtevek, sicer null. */
export function preveriAjpesZahtevo(telo: AjpesTelo): string | null {
  if (telo.metoda !== 'seznam' && telo.metoda !== 'podatki') return 'Neveljavna metoda.';
  if (telo.metoda === 'seznam') return null;
  if (telo.potrjenoPorabiTocko !== true) return 'Prevzem podatkov porabi eno točko. Porabo moraš izrecno potrditi.';

  const maticna = typeof telo.maticna === 'string' ? telo.maticna.trim() : '';
  const leto = String(telo.leto ?? '').trim();
  if (!maticna || maticna.length > 32) return 'Matična številka manjka ali ni veljavna.';
  if (!NABORI.has(String(telo.nabor ?? ''))) return 'Nabor ni veljaven.';
  if (!/^\d{4}$/.test(leto)) return 'Leto ni veljavno.';
  if (!VRSTE_LP.has(String(telo.vrstaLp ?? ''))) return 'Vrsta letnega poročila ni veljavna.';
  return null;
}

/** SOAPAction je imenski prostor operacije iz dejanske ovojnice + njeno ime. */
export function soapActionIzOvojnice(ovojnica: string, metoda: 'GetCompanyList' | 'GetData'): string {
  const zacetek = ovojnica.match(new RegExp(`<${metoda}\\s+xmlns="([^"]+)"`));
  if (!zacetek?.[1]) throw new Error('SOAPAction ni mogoče izpeljati iz ovojnice.');
  return `${zacetek[1]}${metoda}`;
}
