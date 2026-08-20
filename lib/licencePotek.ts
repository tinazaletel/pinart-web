export type PravicaZaPotek = {
  prenos?: 'izkljucni' | 'neizkljucni' | 'licenca';
  trajanje?: string;
  trajLeta?: number;
};

const datumPoTrajanju = (datum: string, pravica: PravicaZaPotek): string | undefined => {
  if (!pravica.trajanje || pravica.trajanje === 'neomejeno' || pravica.prenos === 'izkljucni') return undefined;
  const zacetek = new Date(datum);
  if (Number.isNaN(zacetek.getTime())) return undefined;
  const meseci = pravica.trajanje === 'custom' ? Math.round((pravica.trajLeta || 0) * 12)
    : pravica.trajanje.endsWith('m') ? Number.parseInt(pravica.trajanje, 10)
      : Number.parseInt(pravica.trajanje, 10) * 12;
  if (!Number.isFinite(meseci) || meseci <= 0) return undefined;
  zacetek.setUTCMonth(zacetek.getUTCMonth() + meseci);
  return zacetek.toISOString().slice(0, 10);
};

/** Najzgodnejši rok med časovno omejenimi, neizključnimi pravicami. */
export const izracunajLicencoDo = (datum: string, pravice: PravicaZaPotek[]): string | undefined =>
  pravice.map(pravica => datumPoTrajanju(datum, pravica)).filter((rok): rok is string => Boolean(rok)).sort()[0];

export const jeLicencaPotekla = (licencaDo?: string, danes = new Date().toISOString().slice(0, 10)) => Boolean(licencaDo && licencaDo < danes);

export const jeLicencaKmalu = (licencaDo?: string, danes = new Date().toISOString().slice(0, 10), dni = 60) => {
  if (!licencaDo || licencaDo < danes) return false;
  const meja = new Date(`${danes}T00:00:00Z`);
  meja.setUTCDate(meja.getUTCDate() + dni);
  return licencaDo <= meja.toISOString().slice(0, 10);
};
