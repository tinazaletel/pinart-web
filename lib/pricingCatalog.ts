/* imeEn = angleško ime storitve (za /en). SL `ime` OSTANE privzeto in se
   uporablja za shranjevanje/ujemanje (podrocjeZaIme matcha po SL imenu). */
export type PricingService = { id: string; ime: string; imeEn?: string; osnova: number };

export const PRICING_SERVICES: PricingService[] = [
  { id: 'logo', ime: 'Logotip + osnovna identiteta', imeEn: 'Logo + basic identity', osnova: 650 },
  { id: 'cgp', ime: 'Celostna grafična podoba', imeEn: 'Full visual identity', osnova: 1350 },
  { id: 'web', ime: 'Spletna stran', imeEn: 'Website', osnova: 1400 },
  { id: 'kampanja', ime: 'Kampanja / oglasni vizuali', imeEn: 'Campaign / ad visuals', osnova: 900 },
  { id: 'publikacija', ime: 'Publikacija / tiskovina', imeEn: 'Publication / print', osnova: 700 },
  { id: 'embalaza', ime: 'Embalaža / produkt', imeEn: 'Packaging / product', osnova: 900 },
  { id: 'ilustracija', ime: 'Ilustracija / vizualni svet', imeEn: 'Illustration / visual world', osnova: 550 },
  { id: 'direkcija', ime: 'Kreativna direkcija', imeEn: 'Creative direction', osnova: 900 },
  { id: 'fotografija', ime: 'Fotografiranje', imeEn: 'Photography', osnova: 450 },
  { id: 'copy', ime: 'Besedila / copywriting', imeEn: 'Copy / copywriting', osnova: 450 },
  { id: 'interier', ime: 'Interier dizajn', imeEn: 'Interior design', osnova: 1200 },
  { id: 'arhitektura', ime: 'Arhitekturno oblikovanje', imeEn: 'Architectural design', osnova: 2200 },
  { id: 'razstava', ime: 'Razstavni / scenski dizajn', imeEn: 'Exhibition / set design', osnova: 1300 },
  { id: 'produktni', ime: 'Produktni / pohištveni dizajn', imeEn: 'Product / furniture design', osnova: 1600 },
  { id: 'uxui', ime: 'UX/UI dizajn', imeEn: 'UX/UI design', osnova: 1100 },
  { id: 'aplikacija', ime: 'Mobilna aplikacija', imeEn: 'Mobile app', osnova: 2400 },
  { id: 'dizajnsistem', ime: 'Dizajn sistem', imeEn: 'Design system', osnova: 1600 },
  { id: 'smm', ime: 'Social media vodenje', imeEn: 'Social media management', osnova: 650 },
  { id: 'seo', ime: 'SEO', imeEn: 'SEO', osnova: 550 },
  { id: 'email', ime: 'Email marketing', imeEn: 'Email marketing', osnova: 350 },
  { id: 'pr', ime: 'PR / odnosi z javnostmi', imeEn: 'PR / public relations', osnova: 750 },
  { id: 'video', ime: 'Video produkcija', imeEn: 'Video production', osnova: 1300 },
  { id: 'motion', ime: 'Motion / animacija', imeEn: 'Motion / animation', osnova: 750 },
  { id: 'render3d', ime: '3D vizualizacije', imeEn: '3D visualizations', osnova: 650 },
  { id: 'strategija', ime: 'Brand strategija', imeEn: 'Brand strategy', osnova: 1100 },
];

/* Podrocja dela. Ista razdelitev se uporablja v kalkulatorju (izbira ob
   onboardingu) in v adminu (skupine v tabeli cen) — zato zivi tukaj, ne v
   komponenti. "dizajnsistem" je bil prej brez podrocja. */
export type PricingPodrocje = { id: string; ime: string; imeEn?: string; opis: string; opisEn?: string; storitve: string[] };

export const PODROCJA: PricingPodrocje[] = [
  { id: 'graficno',  ime: 'Grafika in branding',       imeEn: 'Graphics and branding',            opis: 'logotip, CGP, tiskovine, embalaža, ilustracija',   opisEn: 'logo, visual identity, print, packaging, illustration',   storitve: ['logo', 'cgp', 'publikacija', 'embalaza', 'ilustracija'] },
  { id: 'splet',     ime: 'Splet in produkti',         imeEn: 'Web and products',                 opis: 'spletne strani, UX/UI, aplikacije',                opisEn: 'websites, UX/UI, apps',                                   storitve: ['web', 'uxui', 'aplikacija', 'dizajnsistem'] },
  { id: 'marketing', ime: 'Marketing in oglasi',       imeEn: 'Marketing and ads',                opis: 'kampanje, social media, SEO, PR, besedila',        opisEn: 'campaigns, social media, SEO, PR, copy',                  storitve: ['kampanja', 'smm', 'seo', 'email', 'pr', 'copy'] },
  { id: 'foto',      ime: 'Foto, video, motion',       imeEn: 'Photo, video, motion',             opis: 'fotografiranje, video, motion, 3D',                opisEn: 'photography, video, motion, 3D',                          storitve: ['fotografija', 'video', 'motion', 'render3d'] },
  { id: 'direkcija', ime: 'Kreativna direkcija in strategija', imeEn: 'Creative direction and strategy', opis: 'vodenje, koncept, strategija',             opisEn: 'management, concept, strategy',                            storitve: ['direkcija', 'strategija'] },
  { id: 'prostor',   ime: 'Prostor in arhitektura',    imeEn: 'Space and architecture',           opis: 'interier, arhitektura, razstavni in produktni dizajn', opisEn: 'interior, architecture, exhibition and product design',   storitve: ['interier', 'arhitektura', 'razstava', 'produktni'] },
];

/* V bazo se shrani IME storitve, ne id — zato iskanje po imenu. */
export function podrocjeZaIme(ime: string): PricingPodrocje | undefined {
  const s = PRICING_SERVICES.find(x => x.ime === ime);
  if (!s) return undefined;
  return PODROCJA.find(p => p.storitve.includes(s.id));
}
