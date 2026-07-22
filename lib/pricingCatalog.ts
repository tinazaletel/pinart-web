export type PricingService = { id: string; ime: string; osnova: number };

export const PRICING_SERVICES: PricingService[] = [
  { id: 'logo', ime: 'Logotip + osnovna identiteta', osnova: 650 },
  { id: 'cgp', ime: 'Celostna grafična podoba', osnova: 1350 },
  { id: 'web', ime: 'Spletna stran', osnova: 1400 },
  { id: 'kampanja', ime: 'Kampanja / oglasni vizuali', osnova: 900 },
  { id: 'publikacija', ime: 'Publikacija / tiskovina', osnova: 700 },
  { id: 'embalaza', ime: 'Embalaža / produkt', osnova: 900 },
  { id: 'ilustracija', ime: 'Ilustracija / vizualni svet', osnova: 550 },
  { id: 'direkcija', ime: 'Kreativna direkcija', osnova: 900 },
  { id: 'fotografija', ime: 'Fotografiranje', osnova: 450 },
  { id: 'copy', ime: 'Besedila / copywriting', osnova: 450 },
  { id: 'interier', ime: 'Interier dizajn', osnova: 1200 },
  { id: 'arhitektura', ime: 'Arhitekturno oblikovanje', osnova: 2200 },
  { id: 'razstava', ime: 'Razstavni / scenski dizajn', osnova: 1300 },
  { id: 'produktni', ime: 'Produktni / pohištveni dizajn', osnova: 1600 },
  { id: 'uxui', ime: 'UX/UI dizajn', osnova: 1100 },
  { id: 'aplikacija', ime: 'Mobilna aplikacija', osnova: 2400 },
  { id: 'dizajnsistem', ime: 'Dizajn sistem', osnova: 1600 },
  { id: 'smm', ime: 'Social media vodenje', osnova: 650 },
  { id: 'seo', ime: 'SEO', osnova: 550 },
  { id: 'email', ime: 'Email marketing', osnova: 350 },
  { id: 'pr', ime: 'PR / odnosi z javnostmi', osnova: 750 },
  { id: 'video', ime: 'Video produkcija', osnova: 1300 },
  { id: 'motion', ime: 'Motion / animacija', osnova: 750 },
  { id: 'render3d', ime: '3D vizualizacije', osnova: 650 },
  { id: 'strategija', ime: 'Brand strategija', osnova: 1100 },
];

/* Podrocja dela. Ista razdelitev se uporablja v kalkulatorju (izbira ob
   onboardingu) in v adminu (skupine v tabeli cen) — zato zivi tukaj, ne v
   komponenti. "dizajnsistem" je bil prej brez podrocja. */
export type PricingPodrocje = { id: string; ime: string; opis: string; storitve: string[] };

export const PODROCJA: PricingPodrocje[] = [
  { id: 'graficno',  ime: 'Grafika in branding',       opis: 'logotip, CGP, tiskovine, embalaža, ilustracija',   storitve: ['logo', 'cgp', 'publikacija', 'embalaza', 'ilustracija'] },
  { id: 'splet',     ime: 'Splet in produkti',         opis: 'spletne strani, UX/UI, aplikacije',                storitve: ['web', 'uxui', 'aplikacija', 'dizajnsistem'] },
  { id: 'marketing', ime: 'Marketing in oglasi',       opis: 'kampanje, social media, SEO, PR, besedila',        storitve: ['kampanja', 'smm', 'seo', 'email', 'pr', 'copy'] },
  { id: 'foto',      ime: 'Foto, video, motion',       opis: 'fotografiranje, video, motion, 3D',                storitve: ['fotografija', 'video', 'motion', 'render3d'] },
  { id: 'direkcija', ime: 'Kreativna direkcija in strategija', opis: 'vodenje, koncept, strategija',             storitve: ['direkcija', 'strategija'] },
  { id: 'prostor',   ime: 'Prostor in arhitektura',    opis: 'interier, arhitektura, razstavni in produktni dizajn', storitve: ['interier', 'arhitektura', 'razstava', 'produktni'] },
];

/* V bazo se shrani IME storitve, ne id — zato iskanje po imenu. */
export function podrocjeZaIme(ime: string): PricingPodrocje | undefined {
  const s = PRICING_SERVICES.find(x => x.ime === ime);
  if (!s) return undefined;
  return PODROCJA.find(p => p.storitve.includes(s.id));
}
