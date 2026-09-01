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
  /** Kampanja je lahko vezana na projekt; takrat se vidi tudi pri projektu. */
  projekt?: string;
  /* Zaporedje sporocil z roki. Prej je bilo to zbasano v opis in neberljivo
     (Tina, 31. 8. 2026: »nepregledno do amena«), zato je zdaj svoja struktura
     in se ureja v desnem panelu. */
  koraki?: KampanjaKorak[];
  ustvarjeno: string;
  updatedAt?: string;
  deletedAt?: string;
};

/** En korak predloge: kaj naredis in koliko dni po zacetku. */
export type PredlogaKorak = { zamikDni: number; naslov: string; besedilo: string };

/* Korak v ZIVI kampanji: poleg besedila nosi tudi svoj izhod — nalogo z rokom
   in podatek, kdaj je bilo sporocilo poslano. Brez tega je zaporedje samo
   zapisek (Tina, 31. 8. 2026: »kaj ima tole dodano vrednost«). */
export type KampanjaKorak = PredlogaKorak & { nalogaId?: string; poslano?: string };

export type MarketingPredloga = {
  id: string;
  naslov: string;
  opis: string;
  vrsta: MarketingVrsta;
  oznaka?: string;
  /* Kam predloga vodi: kampanja z zapisanim zaporedjem, nacrtovane objave ali
     vprasalnik. Brez tega je predloga samo naslov — in prav to je Tina
     opazila 31. 8. 2026: »te predloge niso predloge«. */
  cilj: 'kampanja' | 'objave';
  koraki?: PredlogaKorak[];
};

export const MARKETING_PREDLOGE: MarketingPredloga[] = [
  {
    id: 'onboarding',
    naslov: 'Dobrodošlica novi stranki',
    opis: 'Tri premišljena sporočila po potrjeni ponudbi ali podpisu pogodbe.',
    vrsta: 'email',
    oznaka: 'Priljubljeno',
    cilj: 'kampanja',
    koraki: [
      { zamikDni: 0, naslov: 'Dobrodošlica in kaj sledi',
        besedilo: 'Zahvala za zaupanje, kratek povzetek dogovorjenega in en stavek o tem, kdaj se spet oglasiš.' },
      { zamikDni: 3, naslov: 'Kako poteka delo',
        besedilo: 'Koraki, kaj potrebuješ od stranke in do kdaj. Zaključi z eno stvarjo, ki jo mora narediti.' },
      { zamikDni: 14, naslov: 'Kako gre',
        besedilo: 'Vprašaj, ali je vse jasno, in ponudi naslednji korak. Tu se odloči, ali bo stranka ponovila naročilo.' },
    ],
  },
  {
    id: 'ponudba-tisina',
    naslov: 'Ponudba brez odgovora',
    opis: 'Trije vljudni koraki, ko stranka po prejeti ponudbi utihne.',
    vrsta: 'email',
    cilj: 'kampanja',
    koraki: [
      { zamikDni: 3, naslov: 'Kratko preverjanje',
        besedilo: 'Preveri, ali je ponudba prišla in ali je kaj nejasnega. Brez pritiska, dve povedi.' },
      { zamikDni: 7, naslov: 'Ponudi pogovor',
        besedilo: 'Predlagaj kratek klic ali prilagoditev obsega — večina tišine je zaradi cene ali obsega, ne nezanimanja.' },
      { zamikDni: 14, naslov: 'Zapri vljudno',
        besedilo: 'Povej, da ponudbo zapiraš, in pusti vrata odprta za kasneje. Tako veš, pri čem si.' },
    ],
  },
  {
    id: 'zakljucek',
    naslov: 'Zaključek projekta',
    opis: 'Predaja, prošnja za mnenje in vrnitev čez mesec dni.',
    vrsta: 'email',
    cilj: 'kampanja',
    koraki: [
      { zamikDni: 0, naslov: 'Predaja in zahvala',
        besedilo: 'Zahvala, kaj je predano in kje so datoteke. Dodaj eno poved o tem, kaj lahko naredi sama naprej.' },
      { zamikDni: 7, naslov: 'Prošnja za mnenje',
        besedilo: 'Prosi za kratko mnenje ali priporočilo. Povej, kam ga bo uporabila, in olajšaj odgovor z enim vprašanjem.' },
      { zamikDni: 30, naslov: 'Kako deluje',
        besedilo: 'Vprašaj, kako se je stvar obnesla, in ponudi naslednji smiselni korak.' },
    ],
  },
  {
    id: 'reaktivacija',
    naslov: 'Stara stranka nazaj',
    opis: 'Dve sporočili za nekoga, s komer nisi delala že nekaj časa.',
    vrsta: 'email',
    cilj: 'kampanja',
    koraki: [
      { zamikDni: 0, naslov: 'Osebno, brez ponudbe',
        besedilo: 'Napiši osebno: kaj si opazila pri njihovem poslu in zakaj si pomislila nanje. Brez cenika.' },
      { zamikDni: 7, naslov: 'Konkreten predlog',
        besedilo: 'Predlagaj eno konkretno stvar z okvirno ceno in rokom. Ena možnost, ne tri.' },
    ],
  },
  {
    id: 'voscilo',
    naslov: 'Voščilo in načrt za novo leto',
    opis: 'Voščilo brez prodaje in povabilo k pogovoru o naslednjem letu.',
    vrsta: 'email',
    cilj: 'kampanja',
    koraki: [
      { zamikDni: 0, naslov: 'Voščilo',
        besedilo: 'Kratko, toplo, brez ponudbe. Omeni eno stvar, ki ste jo letos naredili skupaj.' },
      { zamikDni: 14, naslov: 'Načrt za naprej',
        besedilo: 'Povabi na kratek pogovor o načrtih za novo leto in predlagaj dva termina.' },
    ],
  },
  {
    id: 'lansiranje',
    naslov: 'Lansiranje nove storitve',
    opis: 'Načrt objav z jasnim zaporedjem in roki za pripravo vsebin.',
    vrsta: 'social',
    cilj: 'objave',
    koraki: [
      { zamikDni: 7, naslov: 'Napoved',
        besedilo: 'Povej, da nekaj prihaja, in datum. Brez podrobnosti — ena slika ali kratek posnetek.' },
      { zamikDni: 14, naslov: 'Objava lansiranja',
        besedilo: 'Storitev je na voljo. Za koga je, kaj reši in kaj naj človek naredi zdaj.' },
      { zamikDni: 21, naslov: 'Odziv in dokaz',
        besedilo: 'Pokaži prvi odziv ali primer uporabe in ponovi poziv za tiste, ki so prvo objavo zamudili.' },
    ],
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


/* ── NAČRTOVANE OBJAVE ────────────────────────────────────────────────────
   Doslej so zivele samo v localStorage te naprave in niso bile vezane na nic.
   Zdaj imajo isto obliko kot kampanje (updatedAt/deletedAt), zato jih zna
   preostaleShrambeOblak sinhronizirati, in polje projekt (Tina, 31. 8. 2026). */

export type MarketingObjava = {
  id: string;
  kanal: string;
  kanalIme?: string;
  kanalUrl?: string;
  naslov?: string;
  besedilo: string;
  datum: string;
  projekt?: string;
  nalogaId?: string;
  ustvarjeno: string;
  updatedAt?: string;
  deletedAt?: string;
};

const KLJUC_OBJAVE = 'pinart-flow-marketing-objave-v1';

export function preberiObjaveVse(): MarketingObjava[] {
  if (typeof window === 'undefined') return [];
  try {
    const vrednost = window.localStorage.getItem(KLJUC_OBJAVE);
    if (!vrednost) return [];
    const podatki = JSON.parse(vrednost);
    return Array.isArray(podatki) ? podatki : [];
  } catch {
    return [];
  }
}

export const preberiObjave = (): MarketingObjava[] => preberiObjaveVse().filter(o => !o.deletedAt);

export function zapisiObjaveVse(objave: MarketingObjava[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KLJUC_OBJAVE, JSON.stringify(objave));
  window.dispatchEvent(new Event('pinart-marketing-change'));
}

/** Zapise ZIVI seznam; kar manjka, dobi nagrobnik, da izbris potuje v oblak. */
export function shraniObjave(objave: MarketingObjava[]) {
  if (typeof window === 'undefined') return;
  const zdaj = new Date().toISOString();
  const prejsnje = new Map(preberiObjaveVse().map(o => [o.id, o]));
  const jedro = (v: MarketingObjava) => JSON.stringify({ ...v, updatedAt: undefined, deletedAt: undefined });
  const zive = objave.map(o => {
    const prej = prejsnje.get(o.id);
    prejsnje.delete(o.id);
    return { ...o, deletedAt: undefined, updatedAt: prej && jedro(prej) === jedro(o) ? (prej.updatedAt || prej.ustvarjeno) : zdaj };
  });
  const nagrobniki = [...prejsnje.values()].map(o => o.deletedAt ? o : { ...o, updatedAt: zdaj, deletedAt: zdaj });
  zapisiObjaveVse([...zive, ...nagrobniki]);
}

export function novaObjava(v: Omit<MarketingObjava, 'id' | 'ustvarjeno' | 'updatedAt' | 'deletedAt'>): MarketingObjava {
  const zdaj = new Date().toISOString();
  return {
    ...v,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `mo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ustvarjeno: zdaj,
    updatedAt: zdaj,
  };
}
