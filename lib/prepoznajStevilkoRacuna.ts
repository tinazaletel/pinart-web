export type PrepoznanaStevilkaRacuna = {
  zadnja: number;
  leto: number;
  sirina: number;
  oblika: string;
  naslednja: string;
};

/** Iz že izdane številke izpelje položaj leta in zaporedne številke. */
export function prepoznajStevilkoRacuna(vnos: string, pricakovanoLeto: number): PrepoznanaStevilkaRacuna | null {
  const cist = vnos.trim();
  const leto = String(pricakovanoLeto);
  if (!cist || cist.split(leto).length !== 2) return null;

  const ujemanja = [...cist.matchAll(/\d+/g)];
  const letoUjemanje = ujemanja.find(u => u[0] === leto);
  const zaporednaUjemanja = ujemanja.filter(u => u !== letoUjemanje);
  if (!letoUjemanje || zaporednaUjemanja.length !== 1) return null;

  const zaporednaUjemanje = zaporednaUjemanja[0];
  const zadnja = Number(zaporednaUjemanje[0]);
  if (!Number.isSafeInteger(zadnja) || zadnja < 0 || zadnja >= Number.MAX_SAFE_INTEGER) return null;

  const indeks = zaporednaUjemanje.index ?? -1;
  if (indeks < 0) return null;
  const pred = cist.slice(0, indeks);
  const za = cist.slice(indeks + zaporednaUjemanje[0].length);
  const oblika = `${pred}{zaporedna}${za}`.replace(leto, '{leto}');
  const naslednjaZaporedna = String(zadnja + 1).padStart(zaporednaUjemanje[0].length, '0');
  const naslednja = `${pred}${naslednjaZaporedna}${za}`;

  return { zadnja, leto: pricakovanoLeto, sirina: zaporednaUjemanje[0].length, oblika, naslednja };
}

/** Strežniško dodeljeno zaporedje prikaže v obliki, ki jo uporabnica že uporablja. */
export function uporabiOblikoStevilke(dodeljena: string, oblika: Pick<PrepoznanaStevilkaRacuna, 'leto' | 'sirina' | 'oblika'>): string {
  const zaporedna = [...dodeljena.matchAll(/\d+/g)]
    .filter(u => u[0] !== String(oblika.leto))
    .map(u => Number(u[0]))
    .find(v => Number.isSafeInteger(v));
  if (zaporedna === undefined) return dodeljena;
  return oblika.oblika
    .replaceAll('{leto}', String(oblika.leto))
    .replaceAll('{zaporedna}', String(zaporedna).padStart(oblika.sirina, '0'));
}
