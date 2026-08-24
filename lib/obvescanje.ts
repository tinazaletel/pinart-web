/* Prijava na obvescanje — cista logika, brez baze in brez omreznja.
 *
 * Loceno od API poti, da se da preizkusiti: prav pri privolitvah se napake
 * poznajo sele cez mesece, ko je seznam ze zgrajen na napacni podlagi. */

/** Koliko dni cakamo na potrditev; potem prijava ni vec veljavna. */
export const POTRDITEV_VELJA_DNI = 14;

/** Ena oseba = en zapis. Velike crke in presledki ne smejo delati dvojnikov. */
export function normalizirajEmail(surov: string): string {
  return surov.trim().toLowerCase();
}

/** Zeton za povezavo v mailu: dovolj dolg, da ga ni mogoce uganiti. */
export function ustvariZeton(nakljucni: () => string): string {
  return `${nakljucni()}${nakljucni()}`.replace(/-/g, '').slice(0, 40);
}

/** Je nepotrjena prijava ze prestara? Zanjo privolitve NIMAMO. */
export function jePotekla(ustvarjeno: string, zdaj: Date): boolean {
  const nastanek = new Date(ustvarjeno).getTime();
  if (Number.isNaN(nastanek)) return false;
  return zdaj.getTime() - nastanek > POTRDITEV_VELJA_DNI * 86_400_000;
}

/** Naslov strani z izidom — potrditev in odjava pristaneta na isti strani. */
export function potIzida(jezik: string, stanje: 'potrjeno' | 'odjavljeno' | 'poteklo' | 'napaka'): string {
  const predpona = jezik === 'en' ? '/en' : '';
  return `${predpona}/obvescanje?stanje=${stanje}`;
}

/** Vsebina potrditvenega pisemca. Brez okrasja: en stavek in ena povezava. */
export function potrditvenoPisemce(povezava: string, jezik: string): { zadeva: string; html: string } {
  if (jezik === 'en') {
    return {
      zadeva: 'Confirm your subscription',
      html: `<p>You asked to hear from Pinart Flow about the tool and tips for creatives.</p>
<p><a href="${povezava}">Confirm subscription</a></p>
<p>If this wasn't you, ignore this message — without a confirmation we send nothing and your address is deleted within ${POTRDITEV_VELJA_DNI} days.</p>`,
    };
  }
  return {
    zadeva: 'Potrdi prijavo na obvescanje',
    html: `<p>Prijavil/-a si se na obvescanje Pinart Flow o orodju in nasvetih za kreativce.</p>
<p><a href="${povezava}">Potrdi prijavo</a></p>
<p>Ce to nisi bil/-a ti, tega pisemca ne rabis odpirati — brez potrditve ne posljemo nicesar, tvoj naslov pa se izbrise v ${POTRDITEV_VELJA_DNI} dneh.</p>`,
  };
}
