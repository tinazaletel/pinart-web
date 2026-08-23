export type NalogaStolpec = 'todo' | 'in_progress' | 'waiting' | 'done';

export type NalogaPrioriteta = 'nizka' | 'srednja' | 'visoka';

/* vloga avtorja opisa/komentarja — da se na nalogi vidi, KDO je nekaj napisal:
   sef = vodja projekta, sodelavec = clan ekipe, stranka = narocnik (prek portala/maila),
   jaz = trenutni uporabnik. Uporabljeno za znacko ob opisu in ob vsakem komentarju. */
export type NalogaAvtorVloga = 'sef' | 'sodelavec' | 'stranka' | 'jaz';

/* En komentar na nalogi — zametek chata/niti pogovora vezanega na konkretno nalogo. */
export interface NalogaKomentar {
  id: string;
  avtorIme: string;
  besedilo: string;
  cas: string; // ISO datum/cas
  /* kdo je komentar napisal (sef/sodelavec/stranka/jaz) — za barvno znacko in oblacek na kartici */
  vloga?: NalogaAvtorVloga;
}

/* En podopravilo (checklist item) na nalogi — prikazano v detajlnem panelu naloge (klik na
   ikono komentarjev na kartici). Loceno dodeljevanje od cele naloge (dodeljenoOsebaId zgoraj). */
export interface NalogaPodopravilo {
  id: string;
  besedilo: string;
  done: boolean;
  dodeljenoOsebaId?: string;
  dodeljenoOsebaIme?: string;
}

export interface Naloga {
  id: string;
  naslov: string;
  opis?: string;
  /* kdo je napisal opis naloge (kaj je treba narediti) — prikazano kot podpis pod opisom */
  opisAvtorIme?: string;
  opisAvtorVloga?: NalogaAvtorVloga;
  stolpec: NalogaStolpec;
  /* prost tekstovni naziv projekta (ni loceno shranjen entiteta) — po zelji se ujema
     z imenom v TedenskaDodelitev.projektIme, da se todo naloge navezejo na sefov razpored */
  projectId?: string;
  /* povezava s stranko iz lib/pinartFlowStore (FlowClient.id) */
  clientId?: string;
  dodeljenoOseba?: string;
  /* dodeljevanje sodelavcu iz seznama (glej Sodelavec spodaj) */
  dodeljenoOsebaId?: string;
  dodeljenoOsebaIme?: string;
  rok?: string;
  created: string;
  /* povezava s stoparico Task Managerja (glej TaskManagerWorkspace) */
  ocenjeniCasUre?: number;      // predvideni cas (ure)
  porabljeniCasMinute?: number; // skupni porabljeni cas (minute)
  isTimerRunning?: boolean;     // ali stoparica trenutno tece za to nalogo
  timerStartTime?: string;      // ISO timestamp zacetka zadnjega merjenja
  /* ISO cas, ko je stoparica na tej nalogi NAZADNJE tekla (ob zagonu in ob
     ustavitvi). Brez tega po ustavitvi ni sledu, kdaj si na cem delala, in
     nadzorna plosca ne more ponuditi "Nadaljuj". */
  zadnjeMerjenje?: string;
  prioriteta?: NalogaPrioriteta;
  komentarji?: NalogaKomentar[];
  /* prosti tagi na nalogi (npr. "funkcionalnost", "dizajn", "CRM", "zaledje", "ideja" + prosto
     besedilo) — za dogfooding: filtriranje razvojnih nalog Flow-a po vrsti dela */
  oznake?: string[];
  /* checklist podopravil znotraj naloge (detajlni panel) — vsako z lastnim done statusom
     in neobvezno dodeljeno osebo, loceno od dodeljenoOsebaId cele naloge */
  podopravila?: NalogaPodopravilo[];
  /* cas zadnje spremembe (ISO) — nujen za sinhronizacijo z oblakom
     (lib/nalogeOblak): ob srecanju lokalne in oblacne razlicice zmaga novejsa.
     Stari zapisi ga nimajo; takrat velja created. Zig postavi shraniNaloge sam,
     zato ga vmesniku ni treba nastavljati. */
  updatedAt?: string;
  /* nagrobnik: izbrisana naloga se NE odstrani takoj, ampak se oznaci, da
     brisanje potuje v oblak in ga druga naprava ne obudi nazaj. preberiNaloge
     take zapise odfiltrira, zato tega ni treba upostevati nikjer v vmesniku. */
  deletedAt?: string;
}

/* --- Uporabniki / vloge / zgodovina (za vec-uporabniski Task Manager) --- */

export type UporabniskaVloga = 'admin' | 'vodja' | 'clan';

export interface Sodelavec {
  id: string;
  ime: string;
  email: string;
  vloga: UporabniskaVloga;
  aktiven: boolean;
  /* neobvezna povezava na Oddelek.id (lib/oddelki) — v kateri oddelek spada oseba */
  oddelekId?: string;
}

export interface ZgodovinaAktivnosti {
  id: string;
  nalogaId: string;
  uporabnik: string;
  opis: string;
  datum: string; // ISO datum
}

export const ZACETNI_SODELAVCI: Sodelavec[] = [
  { id: 'sod_1', ime: 'Matej Novak', email: 'matej.novak@domena.si', vloga: 'clan', aktiven: true },
  { id: 'sod_2', ime: 'Maja Zupan', email: 'maja.zupan@domena.si', vloga: 'vodja', aktiven: true },
  { id: 'sod_3', ime: 'Admin Uporabnik', email: 'admin@domena.si', vloga: 'admin', aktiven: true },
];

const STORAGE_KEY = 'pinflow_naloge_data';
const ZGODOVINA_KEY = 'pinflow_naloge_zgodovina';

/* Cas zadnje spremembe NASTAVITEV nalog (zgodovina + dodelitve + cikel). Te tri
   zbirke potujejo v oblak kot ena vrstica na organizacijo (public.naloge_nastavitve),
   zato rabijo skupen zig, da se ob srecanju z oblakom ve, katera stran je novejsa. */
const NASTAVITVE_CAS_KEY = 'pinflow_naloge_nastavitve_cas';

/* Ena sama tocka, kjer shramba javi spremembo — FlowCloudBridge to poslusa in
   poslje spremembo v oblak. Dogodek namesto neposrednega klica, ker bi uvoz
   lib/nalogeOblak tu naredil krog (nalogeOblak uvaza to datoteko). */
const javiSpremembo = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('pinart-naloge-change'));
};

/* Zig nastavitev — postavi ga vsak zapis zgodovine/dodelitev/cikla. */
const zigosajNastavitve = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NASTAVITVE_CAS_KEY, new Date().toISOString());
  } catch {
    /* zaseben nacin brskanja — tiho ignoriraj */
  }
};

/* Kdaj so bile nastavitve nazadnje spremenjene lokalno (0, ce nikoli). */
export const nastavitveCas = (): number => {
  if (typeof window === 'undefined') return 0;
  const t = Date.parse(localStorage.getItem(NASTAVITVE_CAS_KEY) || '');
  return Number.isNaN(t) ? 0 : t;
};

/* Zapise zig nastavitev na doloceno vrednost — uporablja ga sinhronizacija,
   ko lokalno stanje prevzame cas oblacne vrstice. */
export const nastaviNastavitveCas = (iso: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NASTAVITVE_CAS_KEY, iso);
  } catch {
    /* zaseben nacin brskanja — tiho ignoriraj */
  }
};

/* Prebere zgodovino aktivnosti (ustvarjanje/premik/brisanje nalog) iz localStorage. */
export const preberiZgodovino = (): ZgodovinaAktivnosti[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(ZGODOVINA_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Napaka pri branju zgodovine iz localStorage:', e);
    return [];
  }
};

const shraniZgodovino = (zgodovina: ZgodovinaAktivnosti[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ZGODOVINA_KEY, JSON.stringify(zgodovina));
    zigosajNastavitve();
    javiSpremembo();
  } catch (e) {
    console.error('Napaka pri shranjevanju zgodovine v localStorage:', e);
  }
};


/* Doda nov vnos v zgodovino aktivnosti (npr. "ustvaril nalogo", "premaknil v V teku" ...). */
export const zabeleziAktivnost = (nalogaId: string, uporabnik: string, opis: string): void => {
  const nov: ZgodovinaAktivnosti = {
    id: 'zgod_' + Date.now(),
    nalogaId,
    uporabnik,
    opis,
    datum: new Date().toISOString(),
  };
  shraniZgodovino([...preberiZgodovino(), nov]);
};

/* vsi zapisi VKLJUCNO z nagrobniki — samo za sinhronizacijo */
export const preberiNalogeVsi = (): Naloga[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const seznam = data ? JSON.parse(data) : [];
    return Array.isArray(seznam) ? seznam : [];
  } catch (e) {
    console.error('Napaka pri branju nalog iz localStorage:', e);
    return [];
  }
};

export const preberiNaloge = (): Naloga[] => preberiNalogeVsi().filter((n) => !n.deletedAt);

const zapisiSurovo = (naloge: Naloga[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(naloge));
    javiSpremembo();
  } catch (e) {
    console.error('Napaka pri shranjevanju nalog v localStorage:', e);
  }
};

/* primerjava vsebine brez sinhronizacijskih polj — da se updatedAt postavi
   samo takrat, ko se je naloga RES spremenila (sicer bi vsak zapis seznama
   naredil vse naloge "novejse" in po nepotrebnem prepisal oblak) */
const podpisNaloge = (n: Naloga): string => {
  const jedro: Record<string, unknown> = { ...n };
  delete jedro.updatedAt;
  delete jedro.deletedAt;
  return JSON.stringify(jedro);
};

/* Predogled »Prazno« beremo NEPOSREDNO iz shrambe (in ne prek lib/predogled),
   da med lib/naloge in lib/predogled ne nastane krog uvozov.
   Zakaj sploh: v nacinu 'empty' TaskManagerWorkspace namenoma pokaze PRAZNO
   tablo, ceprav so prave naloge se vedno v shrambi. Ce bi v tem nacinu kdo kaj
   dodal, bi se ob zapisu vse prave naloge znasle "manjkajoce" in bi dobile
   nagrobnik — in ta bi ob vrnitvi v 'mine' izbrisal naloge tudi v oblaku. */
const jePrazenPredogled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('pinart-predogled') === 'empty';
  } catch {
    return false;
  }
};

/* Zapise seznam ZIVIH nalog (tak, kot ga vidi vmesnik) in poskrbi za oblak:
   - nova ali spremenjena naloga dobi svez updatedAt,
   - naloga, ki je v seznamu NI vec, postane nagrobnik (mehko brisanje), da
     brisanje potuje v oblak in ga druga naprava ne obudi nazaj,
   - obstojeci nagrobniki se ohranijo.
   Vmesnik zato ostane nespremenjen: se naprej poslje samo zive naloge. */
export const shraniNaloge = (naloge: Naloga[]): void => {
  if (typeof window === 'undefined') return;
  const cas = new Date().toISOString();
  const prejsnje = new Map(preberiNalogeVsi().map((n) => [n.id, n]));

  const zive: Naloga[] = naloge.map((n) => {
    const prej = prejsnje.get(n.id);
    prejsnje.delete(n.id);
    /* ce se je vrnila naloga, ki je bila nagrobnik (npr. razveljavitev brisanja),
       nagrobnik odstranimo */
    const brezNagrobnika: Naloga = n.deletedAt ? { ...n, deletedAt: undefined } : n;
    const nespremenjena = prej && !prej.deletedAt && podpisNaloge(prej) === podpisNaloge(brezNagrobnika);
    if (nespremenjena) return { ...brezNagrobnika, updatedAt: prej?.updatedAt || brezNagrobnika.updatedAt };
    return { ...brezNagrobnika, updatedAt: cas };
  });

  /* kar je ostalo v prejsnje = manjka v novem seznamu -> nagrobnik
     (v predogledu 'empty' ne brisemo nicesar — glej jePrazenPredogled) */
  const prazen = jePrazenPredogled();
  const nagrobniki: Naloga[] = Array.from(prejsnje.values()).map((n) =>
    n.deletedAt || prazen ? n : { ...n, deletedAt: cas, updatedAt: cas });

  zapisiSurovo([...zive, ...nagrobniki]);
};

/* zapise celoten seznam (vkljucno z nagrobniki) — uporablja ga sinhronizacija */
export const zapisiNalogeVsi = (naloge: Naloga[]): void => zapisiSurovo(naloge);

/* --- Tedenski plan / "sefov razpored dodelitev" ---
   Vodja/admin dodeli OSEBO na PROJEKT + PODROCJE za dolocen teden (grobo, tedensko);
   delavec si pod tem sam vodi svoje TODO naloge (Naloga zgoraj). Locena entiteta od
   Naloga, ker gre za tedenski "kdo dela kaj" pregled, ne za posamezno opravilo. */

export type DodelitevStatus = 'nacrtovano' | 'opravljeno' | 'delno' | 'preneseno';

export interface TedenskaDodelitev {
  id: string;
  osebaId: string;
  osebaIme: string;
  /* neobvezna povezava na stranko iz lib/pinartFlowStore (FlowClient.id) */
  projektId?: string;
  projektIme: string;
  podrocje?: string;
  /* neobvezna povezava na Oddelek.id (lib/oddelki) — kateri oddelek dela to dodelitev;
     privzeto oseba.oddelekId, a se lahko override-a (isti clovek dela za vec oddelkov) */
  oddelekId?: string;
  tedenZacetek: string; // YYYY-MM-DD, zacetek obdobja (tedna/meseca/kvartala), na katerega se dodelitev nanasa
  opomba?: string;
  /* ritual "napovem -> pregledam": kaj bo oseba ta teden delala + status ob pregledu */
  nacrt?: string;
  status?: DodelitevStatus;
}

const DODELITVE_KEY = 'pinflow_tedenske_dodelitve';

export const preberiDodelitve = (): TedenskaDodelitev[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(DODELITVE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Napaka pri branju tedenskih dodelitev iz localStorage:', e);
    return [];
  }
};

const shraniDodelitveSeznam = (seznam: TedenskaDodelitev[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DODELITVE_KEY, JSON.stringify(seznam));
    zigosajNastavitve();
    javiSpremembo();
  } catch (e) {
    console.error('Napaka pri shranjevanju tedenskih dodelitev v localStorage:', e);
  }
};

/* Doda novo ali (po ujemanju id) posodobi obstojeco tedensko dodelitev. */
export const shraniDodelitev = (dodelitev: TedenskaDodelitev): void => {
  const obstojece = preberiDodelitve();
  const obstaja = obstojece.some((d) => d.id === dodelitev.id);
  shraniDodelitveSeznam(obstaja ? obstojece.map((d) => (d.id === dodelitev.id ? dodelitev : d)) : [...obstojece, dodelitev]);
};

export const izbrisiDodelitev = (id: string): void => {
  shraniDodelitveSeznam(preberiDodelitve().filter((d) => d.id !== id));
};

/* Dolzina cikla v tednih (1-4) za tedenski plan — privzeto 1 (klasicen teden). */
const CIKEL_KEY = 'pinflow_cikel_tednov';

export const preberiCikelTednov = (): number => {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = parseInt(localStorage.getItem(CIKEL_KEY) || '1', 10);
    return Number.isFinite(raw) && raw >= 1 && raw <= 4 ? raw : 1;
  } catch {
    return 1;
  }
};

export const shraniCikelTednov = (tedni: number): void => {
  if (typeof window === 'undefined') return;
  const varno = Math.min(4, Math.max(1, Math.round(tedni) || 1));
  try {
    localStorage.setItem(CIKEL_KEY, String(varno));
    zigosajNastavitve();
    javiSpremembo();
  } catch {
    /* zaseben nacin brskanja — tiho ignoriraj */
  }
};

/* --- Nastavitve nalog kot celota (za sinhronizacijo z oblakom) ---
   Zgodovina, dodelitve in cikel potujejo v oblak kot ENA vrstica na organizacijo
   (public.naloge_nastavitve), zato imajo skupen bralec/pisalec in skupen zig. */

export interface NalogeNastavitve {
  zgodovina: ZgodovinaAktivnosti[];
  dodelitve: TedenskaDodelitev[];
  cikelTednov: number;
}

export const preberiNalogeNastavitve = (): NalogeNastavitve => ({
  zgodovina: preberiZgodovino(),
  dodelitve: preberiDodelitve(),
  cikelTednov: preberiCikelTednov(),
});

/* Zapise vse tri nastavitve naenkrat BREZ svezega ziga — uporablja jo
   sinhronizacija, ko prevzame stanje iz oblaka. Zig se postavi na cas oblacne
   vrstice, sicer bi tak zapis takoj izgledal kot nova lokalna sprememba in bi
   se v nedogled vracal v oblak. */
export const zapisiNalogeNastavitve = (n: NalogeNastavitve, casIso: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ZGODOVINA_KEY, JSON.stringify(n.zgodovina));
    localStorage.setItem(DODELITVE_KEY, JSON.stringify(n.dodelitve));
    localStorage.setItem(CIKEL_KEY, String(Math.min(4, Math.max(1, Math.round(n.cikelTednov) || 1))));
    nastaviNastavitveCas(casIso);
  } catch (e) {
    console.error('Napaka pri shranjevanju nastavitev nalog v localStorage:', e);
  }
};


/* ── stoparica ───────────────────────────────────────────────────────────── */

export type StoparicaIzid = {
  naloge: Naloga[];
  /* naloga, ki se je ustavila, in koliko minut je prispevala */
  ustavljena?: { id: string; naslov: string; minute: number };
  /* naloga, na kateri je stoparica stekla */
  zagnana?: { id: string; naslov: string };
};

/* Cista funkcija: tece lahko iz Nalog ali z nadzorne plosce, izid je isti.
   Pravilo je eno samo merjenje naenkrat — tekoca naloga se vedno ustavi,
   ciljna pa stece samo, ce ni bila prav ona tekoca (klik na tekoco = ustavi).
   `zdaj` je parameter, da funkcija ostane testljiva in ne klice new Date(). */
export function preklopiStoparico(naloge: Naloga[], id: string, zdaj: Date): StoparicaIzid {
  const zdajIso = zdaj.toISOString();
  const zdajMs = zdaj.getTime();
  let ustavljena: StoparicaIzid['ustavljena'];
  let zagnana: StoparicaIzid['zagnana'];
  const posodobljene = naloge.map((n) => {
    if (n.isTimerRunning) {
      const zacetek = new Date(n.timerStartTime || zdajIso).getTime();
      const minute = Math.max(0, Math.round((zdajMs - zacetek) / 60000));
      ustavljena = { id: n.id, naslov: n.naslov, minute };
      return {
        ...n,
        isTimerRunning: false,
        timerStartTime: undefined,
        porabljeniCasMinute: (n.porabljeniCasMinute || 0) + minute,
        zadnjeMerjenje: zdajIso,
      };
    }
    if (n.id === id) {
      zagnana = { id: n.id, naslov: n.naslov };
      return { ...n, isTimerRunning: true, timerStartTime: zdajIso, zadnjeMerjenje: zdajIso };
    }
    return n;
  });
  return { naloge: posodobljene, ustavljena, zagnana };
}

/* Naloga, na kateri stoparica trenutno tece (ce sploh). */
export const tekocaNaloga = (naloge: Naloga[]): Naloga | undefined =>
  naloge.find((n) => n.isTimerRunning);

/* Nedokoncane naloge, na katerih je stoparica nazadnje tekla — najnovejsa prva.
   Iz tega nadzorna plosca sestavi "Nadaljuj". */
export const zadnjeMerjene = (naloge: Naloga[], najvec = 3): Naloga[] =>
  naloge
    .filter((n) => n.stolpec !== 'done' && !!n.zadnjeMerjenje)
    .sort((a, b) => (b.zadnjeMerjenje || '').localeCompare(a.zadnjeMerjenje || ''))
    .slice(0, najvec);
