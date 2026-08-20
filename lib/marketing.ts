export type MarketingVrsta = 'email' | 'vprasalnik' | 'social';
export type MarketingStatus = 'osnutek' | 'nacrtovano' | 'aktivno' | 'zakljuceno';

export type MarketingKampanja = {
  id: string;
  naslov: string;
  vrsta: MarketingVrsta;
  status: MarketingStatus;
  datumOd?: string;
  datumDo?: string;
  /** Stare kampanje pred uvedbo datumskega razpona. */
  datum?: string;
  opis?: string;
  ustvarjeno: string;
  updatedAt?: string;
  deletedAt?: string;
};

export type MarketingPredloga = {
  id: string;
  naslov: string;
  opis: string;
  vrsta: MarketingVrsta;
  oznaka?: string;
};

export const MARKETING_PREDLOGE: MarketingPredloga[] = [
  {
    id: 'onboarding',
    naslov: 'Dobrodošlica novi stranki',
    opis: 'Tri premišljena sporočila po potrjeni ponudbi ali podpisu pogodbe.',
    vrsta: 'email',
    oznaka: 'Priljubljeno',
  },
  {
    id: 'povprasevanje',
    naslov: 'Povpraševanje za projekt',
    opis: 'Kratek vprašalnik, ki pred prvim klicem zbere obseg, rok in okvirni proračun.',
    vrsta: 'vprasalnik',
  },
  {
    id: 'lansiranje',
    naslov: 'Lansiranje nove storitve',
    opis: 'Načrt objav z jasnim zaporedjem in roki za pripravo vsebin.',
    vrsta: 'social',
  },
];

const KLJUC = 'pinart-flow-marketing-v1';

export function preberiMarketingKampanjeVse(): MarketingKampanja[] {
  if (typeof window === 'undefined') return [];
  try {
    const vrednost = window.localStorage.getItem(KLJUC);
    if (!vrednost) return [];
    const podatki = JSON.parse(vrednost);
    return Array.isArray(podatki) ? podatki : [];
  } catch {
    return [];
  }
}

export const preberiMarketingKampanje = (): MarketingKampanja[] =>
  preberiMarketingKampanjeVse().filter(k => !k.deletedAt);

export function shraniMarketingKampanje(kampanje: MarketingKampanja[]) {
  if (typeof window === 'undefined') return;
  const zdaj = new Date().toISOString();
  const prejsnje = new Map(preberiMarketingKampanjeVse().map(k => [k.id, k]));
  const zive = kampanje.map(k => {
    const prej = prejsnje.get(k.id);
    prejsnje.delete(k.id);
    const jedro = (v: MarketingKampanja) => JSON.stringify({ ...v, updatedAt: undefined, deletedAt: undefined });
    return { ...k, deletedAt: undefined, updatedAt: prej && jedro(prej) === jedro(k) ? (prej.updatedAt || prej.ustvarjeno) : zdaj };
  });
  const nagrobniki = [...prejsnje.values()].map(k => k.deletedAt ? k : { ...k, updatedAt: zdaj, deletedAt: zdaj });
  zapisiMarketingKampanjeVse([...zive, ...nagrobniki]);
}

export function zapisiMarketingKampanjeVse(kampanje: MarketingKampanja[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KLJUC, JSON.stringify(kampanje));
  window.dispatchEvent(new Event('pinart-marketing-change'));
}

export function novaMarketingKampanja(
  vrednosti: Pick<MarketingKampanja, 'naslov' | 'vrsta' | 'status' | 'datumOd' | 'datumDo' | 'opis'>,
): MarketingKampanja {
  return {
    ...vrednosti,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `mk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ustvarjeno: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
