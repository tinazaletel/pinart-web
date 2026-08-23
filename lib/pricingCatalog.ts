/* imeEn = angleško ime storitve (za /en). SL `ime` OSTANE privzeto in se
   uporablja za shranjevanje/ujemanje (podrocjeZaIme matcha po SL imenu). */
/* `obseg` pove, KAJ osnovna cena dejansko pokriva. Nastavljen je samo pri
   storitvah, kjer trg racuna po enoti (m2) ali po fazi (IDZ/IDP/PZI) in bi
   gola pavsalna cena zavajala. Vir: docs/CENE-TRZNA-RAZISKAVA-2026.md.
   Ime storitve se NE spreminja — po njem se shranjene ponudbe iscejo nazaj
   (glej podrocjeZaIme spodaj). */
export type PricingService = { id: string; ime: string; imeEn?: string; osnova: number; obseg?: string; obsegEn?: string };

export const PRICING_SERVICES: PricingService[] = [
  { id: 'logo', ime: 'Logotip + osnovna identiteta', imeEn: 'Logo + basic identity', osnova: 650 },
  { id: 'cgp', ime: 'Celostna grafična podoba', imeEn: 'Full visual identity', osnova: 1350 },
  { id: 'web', ime: 'Spletna stran', imeEn: 'Website', osnova: 1400 },
  { id: 'kampanja', ime: 'Kampanja / oglasni vizuali', imeEn: 'Campaign / ad visuals', osnova: 900 },
  { id: 'publikacija', ime: 'Publikacija / tiskovina', imeEn: 'Publication / print', osnova: 700, obseg: 'do 30 strani; trg racuna 20–30 €/stran', obsegEn: 'up to 30 pages; market rate is €20–30 per page' },
  { id: 'embalaza', ime: 'Embalaža / produkt', imeEn: 'Packaging / product', osnova: 900 },
  { id: 'ilustracija', ime: 'Ilustracija / vizualni svet', imeEn: 'Illustration / visual world', osnova: 550 },
  { id: 'direkcija', ime: 'Kreativna direkcija', imeEn: 'Creative direction', osnova: 900 },
  { id: 'fotografija', ime: 'Fotografiranje', imeEn: 'Photography', osnova: 450 },
  { id: 'copy', ime: 'Besedila / copywriting', imeEn: 'Copy / copywriting', osnova: 450 },
  { id: 'interier', ime: 'Interier dizajn', imeEn: 'Interior design', osnova: 1200, obseg: 'idejna zasnova, prostor do 50 m²; trg racuna okoli 24 €/m²', obsegEn: 'concept design, space up to 50 m²; market rate is around €24 per m²' },
  { id: 'arhitektura', ime: 'Arhitekturno oblikovanje', imeEn: 'Architectural design', osnova: 2200, obseg: 'idejni projekt (IDP); DGD, PZI in nadzor niso vkljuceni', obsegEn: 'concept design stage (IDP); permit documentation and site supervision not included' },
  { id: 'razstava', ime: 'Razstavni / scenski dizajn', imeEn: 'Exhibition / set design', osnova: 1300, obseg: 'oblikovanje; izdelava konstrukcije ni vkljucena', obsegEn: 'design only; build and construction not included' },
  { id: 'produktni', ime: 'Produktni / pohištveni dizajn', imeEn: 'Product / furniture design', osnova: 1600, obseg: 'koncept in 3D/CAD; prototip in nadzor proizvodnje nista vkljucena', obsegEn: 'concept and 3D/CAD; prototype and production supervision not included' },
  { id: 'uxui', ime: 'UX/UI dizajn', imeEn: 'UX/UI design', osnova: 1100 },
  { id: 'aplikacija', ime: 'Razvoj aplikacije', imeEn: 'App development', osnova: 2400 },
  { id: 'dizajnsistem', ime: 'Dizajn sistem', imeEn: 'Design system', osnova: 1600 },
  { id: 'smm', ime: 'Social media vodenje', imeEn: 'Social media management', osnova: 650 },
  { id: 'seo', ime: 'SEO', imeEn: 'SEO', osnova: 550, obseg: 'zacetni audit in nastavitev; mesecno vodenje se obracuna posebej', obsegEn: 'initial audit and setup; monthly retainer billed separately' },
  { id: 'email', ime: 'Email marketing', imeEn: 'Email marketing', osnova: 350 },
  { id: 'pr', ime: 'PR / odnosi z javnostmi', imeEn: 'PR / public relations', osnova: 750 },
  { id: 'video', ime: 'Video produkcija', imeEn: 'Video production', osnova: 1300 },
  { id: 'motion', ime: 'Motion / animacija', imeEn: 'Motion / animation', osnova: 750 },
  { id: 'render3d', ime: '3D vizualizacije', imeEn: '3D visualizations', osnova: 650, obseg: 'staticni render; 3D animacija se obracuna posebej', obsegEn: 'still render; 3D animation billed separately' },
  { id: 'strategija', ime: 'Brand strategija', imeEn: 'Brand strategy', osnova: 1100 },
  { id: 'drugo', ime: 'Drugo / po dogovoru', imeEn: 'Other / custom', osnova: 0 },
];

/* Podrocja dela. Ista razdelitev se uporablja v kalkulatorju (izbira ob
   onboardingu) in v adminu (skupine v tabeli cen) — zato zivi tukaj, ne v
   komponenti. "dizajnsistem" je bil prej brez podrocja. */
export type PricingPodrocje = { id: string; ime: string; imeEn?: string; opis: string; opisEn?: string; storitve: string[] };

export const PODROCJA: PricingPodrocje[] = [
  { id: 'graficno',  ime: 'Grafika in branding',       imeEn: 'Graphics and branding',            opis: 'logotip, CGP, tiskovine, embalaža, ilustracija',   opisEn: 'logo, visual identity, print, packaging, illustration',   storitve: ['logo', 'cgp', 'publikacija', 'embalaza', 'ilustracija'] },
  { id: 'splet',     ime: 'Splet in produkti',         imeEn: 'Web and products',                 opis: 'spletne strani, UX/UI, aplikacije',                opisEn: 'websites, UX/UI, apps',                                   storitve: ['web', 'uxui', 'aplikacija', 'dizajnsistem'] },
  { id: 'marketing', ime: 'Marketing in oglasi',       imeEn: 'Marketing and ads',                opis: 'kampanje, social media, SEO, besedila',            opisEn: 'campaigns, social media, SEO, copy',                      storitve: ['kampanja', 'smm', 'seo', 'email', 'copy'] },
  { id: 'foto',      ime: 'Foto, video, motion',       imeEn: 'Photo, video, motion',             opis: 'fotografiranje, video, motion, 3D',                opisEn: 'photography, video, motion, 3D',                          storitve: ['fotografija', 'video', 'motion', 'render3d'] },
  { id: 'direkcija', ime: 'Kreativna direkcija in strategija', imeEn: 'Creative direction and strategy', opis: 'vodenje, koncept, strategija',             opisEn: 'management, concept, strategy',                            storitve: ['direkcija', 'strategija'] },
  { id: 'prostor',   ime: 'Prostor in arhitektura',    imeEn: 'Space and architecture',           opis: 'interier, arhitektura, razstavni in produktni dizajn', opisEn: 'interior, architecture, exhibition and product design',   storitve: ['interier', 'arhitektura', 'razstava', 'produktni'] },
  { id: 'pr',        ime: 'PR in odnosi z javnostmi',  imeEn: 'PR / public relations',            opis: 'sporočila za javnost, medijski odnosi, dogodki',   opisEn: 'press releases, media relations, events',                 storitve: ['pr'] },
  { id: 'drugo',     ime: 'Drugo',                     imeEn: 'Other',                            opis: 'karkoli drugega — ceno določiš sam',               opisEn: 'anything else — you set the price',                       storitve: ['drugo'] },
];

/* V bazo se shrani IME storitve, ne id — zato iskanje po imenu. */
export function podrocjeZaIme(ime: string): PricingPodrocje | undefined {
  const s = PRICING_SERVICES.find(x => x.ime === ime);
  if (!s) return undefined;
  return PODROCJA.find(p => p.storitve.includes(s.id));
}
