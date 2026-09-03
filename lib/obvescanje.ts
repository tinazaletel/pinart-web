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

/** Vsebina potrditvenega pisemca.
 *
 * Yahoo ga je poslal v spam in v njem onemogocil povezave (Tina, 3. 9. 2026).
 * Trije razlogi so bili v samem pisemcu in so tu odpravljeni:
 *   - samo HTML brez besedilne razlicice je za filtre znak masovne poste,
 *   - manjkal je naslov posiljatelja in razlog, zakaj clovek to prejema,
 *   - besedilo je bilo brez sumnikov ("obvescanje", "posljemo"), kar je
 *     izgledalo kot strojno generirana posta.
 * Cetrti razlog je glava List-Unsubscribe, ki jo doda posiljatelj.
 */
export function potrditvenoPisemce(povezava: string, jezik: string): { zadeva: string; html: string; text: string } {
  const noga = jezik === 'en'
    ? 'Pinart d.o.o., Mladinska ulica 63, 1000 Ljubljana, Slovenia'
    : 'Pinart d.o.o., Mladinska ulica 63, 1000 Ljubljana';

  if (jezik === 'en') {
    const vrstice = [
      'You asked to hear from Pinart Flow about the tool and tips for creatives.',
      '',
      `Confirm your subscription: ${povezava}`,
      '',
      `If this wasn't you, ignore this message — without a confirmation we send nothing and your address is deleted within ${POTRDITEV_VELJA_DNI} days.`,
      '',
      noga,
    ];
    return {
      zadeva: 'Confirm your subscription',
      text: vrstice.join('\n'),
      html: `<p>You asked to hear from Pinart Flow about the tool and tips for creatives.</p>
<p><a href="${povezava}">Confirm subscription</a></p>
<p>If this wasn't you, ignore this message — without a confirmation we send nothing and your address is deleted within ${POTRDITEV_VELJA_DNI} days.</p>
<p style="color:#666;font-size:12px">${noga}</p>`,
    };
  }

  const vrstice = [
    'Prijavil/-a si se na obveščanje Pinart Flow o orodju in nasvetih za kreativce.',
    '',
    `Potrdi prijavo: ${povezava}`,
    '',
    `Če to nisi bil/-a ti, tega pisemca ni treba odpirati — brez potrditve ne pošljemo ničesar, tvoj naslov pa se izbriše v ${POTRDITEV_VELJA_DNI} dneh.`,
    '',
    noga,
  ];
  return {
    zadeva: 'Potrdi prijavo na obveščanje',
    text: vrstice.join('\n'),
    html: `<p>Prijavil/-a si se na obveščanje Pinart Flow o orodju in nasvetih za kreativce.</p>
<p><a href="${povezava}">Potrdi prijavo</a></p>
<p>Če to nisi bil/-a ti, tega pisemca ni treba odpirati — brez potrditve ne pošljemo ničesar, tvoj naslov pa se izbriše v ${POTRDITEV_VELJA_DNI} dneh.</p>
<p style="color:#666;font-size:12px">${noga}</p>`,
  };
}
