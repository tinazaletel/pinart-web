/* PRAVI (ustvarljivi) projekti — locena, lahka shramba (localStorage), NI del
   FlowData/cloud sinhronizacije (glej lib/pinartFlowStore). Do zdaj so bili
   "projekti" na zavihku PROJEKTI izpeljani IZKLJUCNO iz ponudb (FlowOffer) —
   ProjectsWorkspace je vsako ponudbo prikazal kot svoj projekt. Ta datoteka
   doda pravo entiteto Projekt, ki jo je mogoce ustvariti brez predhodne
   ponudbe (onboarding "+ Nov projekt"), z zeljami stranke in cilji — ju
   ponudba/pogodba/racun ne nosita. ProjectsWorkspace jih zdruzi s projekti,
   izpeljanimi iz ponudb, v en seznam. */

export interface ProjektCilj {
  id: string;
  besedilo: string;
  metrika?: string;
  tarca?: string;
}

export type ProjektStatus = 'aktiven' | 'pavza' | 'koncan';

/* PIPELINE POSLOV (kanban na zavihku Projekti/Pipeline) — faza, skozi katero
   projekt potuje od prve najave do zaključka (ali izgube posla). Neobvezno
   polje: ce ga uporabnica se ni rocno nastavila (vlecenje kartice med stolpci),
   ga fazaProjekta spodaj izpelje iz obstojecega ProjektStatus, da noben star
   zapis ne "izgine" iz pipelina brez migracije podatkov. */
export type ProjektFaza = 'lead' | 'ponudba' | 'pogodba' | 'delo' | 'racun' | 'zakljuceno' | 'izgubljeno';

/* dodatno vprasanje, ki ga uporabnica sama doda med onboarding chatom (glej
   ProjectsWorkspace pw-nov-panel) — prosto vprasanje + prost odgovor, brez
   vnaprej dolocene sheme (npr. "Ima stranka ze CGP?" -> "Ne, delamo od nule") */
export interface ProjektVprasanje {
  id: string;
  vprasanje: string;
  odgovor: string;
}

/* zunanja povezava (Figma/Miro/Drive ipd.), zajeta ze med onboarding chatom —
   ob ustvarjanju projekta se zrcali tudi v lib/pinartFlowStore (loadProjectLinks/
   saveProjectLinks, kljuc "real-<id>"), da jo obstojeca kartica "05 · Dokumentacija"
   na vozliscu prikaze brez dodatne logike. Ta polja ostanejo na Projektu kot
   izvorni zapis (uporabno tudi zunaj te kartice, npr. bodoc CRM). */
export interface ProjektPovezava {
  id: string;
  naslov: string;
  url: string;
}

export interface Projekt {
  id: string;
  stevilka?: string;
  naslov: string;
  /* neobvezna povezava na FlowClient.id (lib/pinartFlowStore) — ob izboru se
     napolni tudi strankaIme, da seznam/vozlisce delujeta tudi brez ponovnega
     iskanja po imenikih strank */
  strankaId?: string;
  strankaIme?: string;
  opis?: string;
  /* prosto besedilo — brief/zelje stranke ob zacetku projekta. STAR enotni
     povzetek, nadomescen z locenimi polji spodaj (razsirjen brief); polje
     ostane v tipu zgolj zaradi nazaj-zdruzljivosti s ze shranjenimi projekti,
     onboarding chat (NovProjektWorkspace) ga vec ne izpolnjuje. */
  zelje?: string;
  /* razsirjen brief — locena vprasanja namesto ene "zelje" textarea (dogovor
     2026-07-26): vsako polje je svoj korak v onboarding chatu, vsa neobvezna */
  opisStranke?: string;
  /* panoga stranke (sirsi kontekst) — takoj za opisStranke v onboarding chatu */
  panoga?: string;
  ciljnaSkupina?: string;
  dizajnZelje?: string;
  voice?: string;
  konkurenca?: string;
  cilji?: ProjektCilj[];
  zacetek?: string;
  rok?: string;
  status: ProjektStatus;
  created: string;
  /* lastna vprasanja, dodana med onboarding chatom (glej ProjectsWorkspace) */
  dodatnaVprasanja?: ProjektVprasanje[];
  /* zunanje povezave, dodane med onboarding chatom */
  povezave?: ProjektPovezava[];
  /* dodeljeni sodelavci — seznam Sodelavec.id (lib/sodelavci); lokalni mock,
     pravo deljenje/vidljivost pride z vec-uporabniskim zaledjem kasneje */
  dodeljeni?: string[];
  /* pipeline faza (glej ProjektFaza zgoraj) — nastavi jo drag&drop na kanbanu
     (ProjectsWorkspace pw-pipeline); ce se ni nastavljena, jo fazaProjekta
     spodaj izpelje iz status */
  faza?: ProjektFaza;
  /* poslovni pitch, ki ga napise Pupa (components/PitchAgent) — zivi na
     projektu, ker je vezan nanj; v bazi gre v data jsonb, zato ni migracije */
  pitch?: {
    naslov?: string; problem?: string; resitev?: string; zakajMi?: string;
    obseg?: string; okvirnaCena?: string; naslednjiKorak?: string;
    createdAt?: string;
  };
  /* SWOT je poslovni dokument projekta; v oblak gre z ostalim data jsonb. */
  swot?: {
    prednosti: string;
    slabosti: string;
    priloznosti: string;
    nevarnosti: string;
    createdAt?: string;
  };
  /* Priprava pred sestankom in pregled trga sta dokumenta projekta. Ker se
     Projekt že shranjuje v data jsonb, zanju ni potrebna nova tabela. */
  raziskavaStranke?: {
    kajDela: string;
    njihoveStranke: string;
    predstavitev: string;
    kajPonuditi: string;
    vprasanja: string[];
    createdAt?: string;
  };
  pregledKonkurence?: {
    panoga: string;
    konkurenti: Array<{ ime: string; pozicioniranje: string; poudarki: string }>;
    vrzel: string;
    createdAt?: string;
  };
  /* cas zadnje spremembe (ISO) — nujen za sinhronizacijo z oblakom
     (lib/projektiOblak): ob srecanju lokalne in oblacne razlicice zmaga
     novejsa. Stari zapisi ga nimajo; takrat velja created. */
  updatedAt?: string;
  /* nagrobnik: izbrisan projekt se NE odstrani takoj, ampak se oznaci, da
     brisanje potuje v oblak in ga druga naprava ne obudi nazaj. preberiProjekti
     take zapise odfiltrira, zato tega ni treba upostevati nikjer v vmesniku. */
  deletedAt?: string;
}

const STORAGE_KEY = 'pinflow_projekti';

/* vsi zapisi VKLJUCNO z nagrobniki — samo za sinhronizacijo */
export const preberiProjektiVsi = (): Projekt[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Napaka pri branju projektov iz localStorage:', e);
    return [];
  }
};

export const preberiProjekti = (): Projekt[] => preberiProjektiVsi().filter(p => !p.deletedAt);

const shraniProjekte = (projekti: Projekt[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projekti));
    /* Javi spremembo, da jo FlowCloudBridge pošlje v oblak. Dogodek namesto
       neposrednega klica, ker bi uvoz lib/projektiOblak tu naredil krog
       (projektiOblak uvaza to datoteko). */
    window.dispatchEvent(new CustomEvent('pinart-projekti-change'));
  } catch (e) {
    console.error('Napaka pri shranjevanju projektov v localStorage:', e);
  }
};

/* upsert: ce projekt s tem id ze obstaja, ga zamenja; sicer ga doda na zacetek */
export const shraniProjekt = (projekt: Projekt): Projekt[] => {
  const obstojeci = preberiProjektiVsi();
  const zigosan: Projekt = { ...projekt, updatedAt: new Date().toISOString() };
  const obstaja = obstojeci.some(p => p.id === zigosan.id);
  const naslednji = obstaja ? obstojeci.map(p => (p.id === zigosan.id ? zigosan : p)) : [zigosan, ...obstojeci];
  shraniProjekte(naslednji);
  return naslednji.filter(p => !p.deletedAt);
};

/* mehko brisanje — glej Projekt.deletedAt */
export const izbrisiProjekt = (id: string): Projekt[] => {
  const cas = new Date().toISOString();
  const naslednji = preberiProjektiVsi().map(p =>
    p.id === id ? { ...p, deletedAt: cas, updatedAt: cas } : p);
  shraniProjekte(naslednji);
  return naslednji.filter(p => !p.deletedAt);
};

/* zapise celoten seznam (vkljucno z nagrobniki) — uporablja ga sinhronizacija */
export const zapisiProjekteVsi = (projekti: Projekt[]): void => shraniProjekte(projekti);

export const najdiProjekt = (id: string): Projekt | undefined => preberiProjekti().find(p => p.id === id);

/* pipeline faza projekta — p.faza, ce je bila ze rocno nastavljena (vlecenje
   kartice na kanbanu), sicer preslikava iz obstojecega ProjektStatus, da stari
   zapisi (brez faza) takoj pristanejo v smiselnem stolpcu. */
export const fazaProjekta = (p: Projekt): ProjektFaza => {
  if (p.faza) return p.faza;
  if (p.status === 'aktiven') return 'delo';
  if (p.status === 'koncan') return 'zakljuceno';
  return 'lead';
};

/* preprosta leto-zaporedna stevilka (npr. "2026-3") — na voljo za onboarding,
   ni obvezna (Projekt.stevilka je neobvezno polje) */
export const naslednjaStevilka = (projekti: Projekt[]): string => {
  const leto = new Date().getFullYear();
  const letosnji = projekti.filter(p => (p.stevilka || '').startsWith(`${leto}-`));
  return `${leto}-${letosnji.length + 1}`;
};
