/* OPOMNIK ZA RAZGIBAVANJE — nastavitve in štetje dejavnega časa.
 *
 * Zakaj ni vezan na štoparico: štoparica je podatek o PROJEKTU (koliko je delo
 * stalo), razgibavanje pa zadeva OSEBO. Kdor štoparice ne uporablja, sedi prav
 * toliko. In obratno — na strani Štoparice nihče ne sedi: vklopiš merjenje in
 * greš delat drugam, zato bi opomnik na tisti strani viden nikoli (Tina,
 * 30. 8. 2026).
 *
 * Zakaj tudi ni vezan na odprt zavihek: odprt Flow ni delo. Šteje se sekunda,
 * ko je zavihek VIDEN in se je v zadnji minuti kaj zgodilo — premik miške,
 * tipka, dotik. Ko odideš, se štetje ustavi samo od sebe. To je najbližje
 * resnici »sedim pred zaslonom«, kar se da izmeriti brez vohljanja: nič se ne
 * pošlje na strežnik, vse ostane v brskalniku.
 */

export type RazgibavanjeNastavitve = {
  vklopljeno: boolean;
  /** Minute dejavnega dela med dvema opomnikoma. */
  interval: number;
  /** Minute razgibavanja. */
  trajanje: number;
  /** Glasba med vajo (jingle + podlaga). Privzeto ugasnjena — to je tisto, kar
      lahko moti soseda v pisarni. Kratek pok ob PRIHODU opomnika ni pod tem
      stikalom: brez njega opomnika ne opaziš (Tina, 30. 8. 2026). */
  zvok: boolean;
};

export const PRIVZETE: RazgibavanjeNastavitve = {
  vklopljeno: true,
  interval: 60,
  trajanje: 3,
  /* Vklopljen: kdor prvič vidi vajo, pričakuje glasbo — ugasne jo z ikono
     na kartici (Tina, 5. 9. 2026: »zakaj Pupa nima muske«). */
  zvok: true,
};

export const INTERVALI = [30, 45, 60, 90] as const;
/* Poljuben interval je dovoljen (nekdo dela po pomodoru), a v mejah: pod pet
   minut je opomnik nadloga, nad štiri ure ga ni (Tina, 30. 8. 2026). */
export const INTERVAL_MIN = 5;
export const INTERVAL_MAX = 240;

export function veljavenInterval(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return PRIVZETE.interval;
  return Math.min(INTERVAL_MAX, Math.max(INTERVAL_MIN, n));
}
export const TRAJANJA = [1.5, 3] as const;
/* Trajanje je prav tako lahko svoje: pol minute je najmanj, kar se splača
   vstati, četrt ure pa je že odmor in ne razgibavanje (Tina, 30. 8. 2026). */
export const TRAJANJE_MIN = 0.5;
export const TRAJANJE_MAX = 15;

export function veljavnoTrajanje(v: unknown): number {
  const n = Math.round(Number(v) * 2) / 2;   // na pol minute natančno
  if (!Number.isFinite(n)) return PRIVZETE.trajanje;
  return Math.min(TRAJANJE_MAX, Math.max(TRAJANJE_MIN, n));
}

const KLJUC = 'pinflow_razgibavanje';
const KLJUC_STANJE = 'pinflow_razgibavanje_stanje';

/* Sekunda šteje le, če je bila zadnja dejavnost znotraj tega okna. Minuta je
   dovolj ohlapna, da branje dolgega besedila ne prekine štetja, in dovolj
   stroga, da odhod od računalnika ustavi uro. */
export const OKNO_DEJAVNOSTI_MS = 60_000;

export function preberiNastavitve(): RazgibavanjeNastavitve {
  if (typeof window === 'undefined') return PRIVZETE;
  try {
    const surovo = localStorage.getItem(KLJUC);
    if (!surovo) return PRIVZETE;
    const shranjeno = JSON.parse(surovo) as Partial<RazgibavanjeNastavitve>;
    return {
      vklopljeno: shranjeno.vklopljeno ?? PRIVZETE.vklopljeno,
      interval: veljavenInterval(shranjeno.interval),
      trajanje: veljavnoTrajanje(shranjeno.trajanje),
      zvok: shranjeno.zvok ?? PRIVZETE.zvok,
    };
  } catch {
    return PRIVZETE;
  }
}

export function shraniNastavitve(n: RazgibavanjeNastavitve): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KLJUC, JSON.stringify(n));
    /* Nastavitev in opomnik sta na različnih straneh, a v istem oknu — brez
       tega bi opomnik novo nastavitev opazil šele ob osvežitvi. */
    window.dispatchEvent(new CustomEvent('pinflow-razgibavanje'));
  } catch { /* zaseben način */ }
}

/* Nabrane dejavne sekunde in dan, ko je bil opomnik odložen. Shranjeno, ker
   se ob osvežitvi strani komponenta postavi na novo — brez tega bi vsaka
   osvežitev vrnila števec na nič in opomnik nikoli ne bi prišel. */
export type Stanje = {
  sekunde: number;
  neDanes: string | null;
  /** Dnevi (YYYY-MM-DD), ko je bilo razgibavanje res opravljeno do konca. */
  opravljeno: string[];
};

const PRAZNO: Stanje = { sekunde: 0, neDanes: null, opravljeno: [] };

export function preberiStanje(): Stanje {
  if (typeof window === 'undefined') return PRAZNO;
  try {
    const surovo = localStorage.getItem(KLJUC_STANJE);
    if (!surovo) return PRAZNO;
    const s = JSON.parse(surovo) as Partial<Stanje>;
    return {
      sekunde: Number.isFinite(s.sekunde) ? Math.max(0, Number(s.sekunde)) : 0,
      neDanes: typeof s.neDanes === 'string' ? s.neDanes : null,
      /* Le zadnji teden: evidenca je spodbuda, ne arhiv, in localStorage ni
         kraj za zgodovino, ki je nihče ne bo pogledal. */
      opravljeno: Array.isArray(s.opravljeno) ? s.opravljeno.filter(d => typeof d === 'string').slice(-14) : [],
    };
  } catch {
    return PRAZNO;
  }
}

export function shraniStanje(s: Stanje): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KLJUC_STANJE, JSON.stringify(s)); } catch { /* zaseben način */ }
}

/** Zabeleži, da je bilo razgibavanje danes opravljeno. Vrne novo stanje. */
export function zabeleziOpravljeno(): Stanje {
  const stanje = preberiStanje();
  const danes = danesKljuc();
  /* Enkrat na dan: kljukica pove, DA si vstala, ne kolikokrat. */
  const novo: Stanje = stanje.opravljeno.includes(danes)
    ? stanje
    : { ...stanje, opravljeno: [...stanje.opravljeno, danes].slice(-14) };
  shraniStanje(novo);
  window.dispatchEvent(new CustomEvent('pinflow-razgibavanje'));
  return novo;
}

/* DOGODKI med nastavitvijo in opomnikom — sta v isti strani, a v različnih
   komponentah, zato se pogovarjata prek okna, ne prek skupnega stanja. */
export const DOGODEK_SPREMEMBA = 'pinflow-razgibavanje';
export const DOGODEK_ZACNI = 'pinflow-razgibavanje-zacni';
export const DOGODEK_USTAVI = 'pinflow-razgibavanje-ustavi';
export const DOGODEK_PAVZA = 'pinflow-razgibavanje-pavza';
export const DOGODEK_EKIPA = 'pinflow-razgibavanje-ekipa';
export const DOGODEK_TIK = 'pinflow-razgibavanje-tik';

/** Podatek, ki ga opomnik vsako sekundo pošlje štoparici na strani Čas. */
export type Tik = { doNaslednjega: number | null; telovadba: number | null; pavza: boolean };

/** Sedem dni tekočega tedna (ponedeljek prvi) z oznako, ali je bilo opravljeno. */
export function tedenskiPregled(stanje: Stanje, zdaj: Date = new Date()) {
  const zacetek = new Date(zdaj);
  /* getDay(): nedelja je 0. Pri nas se teden začne v ponedeljek. */
  zacetek.setDate(zdaj.getDate() - ((zdaj.getDay() + 6) % 7));
  const danes = danesKljuc(zdaj);
  return Array.from({ length: 7 }, (_, i) => {
    const dan = new Date(zacetek);
    dan.setDate(zacetek.getDate() + i);
    const kljuc = danesKljuc(dan);
    return {
      kljuc,
      crka: ['P', 'T', 'S', 'Č', 'P', 'S', 'N'][i],
      crkaEn: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
      opravljeno: stanje.opravljeno.includes(kljuc),
      danes: kljuc === danes,
      prihodnost: kljuc > danes,
    };
  });
}

/** Današnji dan kot YYYY-MM-DD po lokalnem času — za »Ne danes«. */
export function danesKljuc(zdaj: Date = new Date()): string {
  return `${zdaj.getFullYear()}-${String(zdaj.getMonth() + 1).padStart(2, '0')}-${String(zdaj.getDate()).padStart(2, '0')}`;
}

/* DVE VAJI, ki se menjata po urah (Tina, 30. 8. 2026): eno uro poskoki, drugo
   počepi. Ura je merilo namesto števca, ker je edino, kar je enako v vseh
   zavihkih in po osvežitvi strani — števec bi bilo treba shranjevati in
   usklajevati, tu pa se izračuna sam. */
export type Vaja = 'skoki' | 'pocepi' | 'pretegovanje' | 'razkorak';

/* Štiri vaje, ki pokrijejo štiri različne stvari: kri in noge, noge in zadnjica,
   hrbet in ramena, hrbtenica. Vse so takšne, da jih narediš v pisarni v svojih
   oblačilih in tiho (Tina, 30. 8. 2026). */
export const VAJE: Record<Vaja, { slika: string; ime: string; imeEn: string }> = {
  skoki:        { slika: '/flow-pupa-skok-2.webp',  ime: 'poskoki',        imeEn: 'jumping jacks' },
  pocepi:       { slika: '/flow-pupa-pocep-2.webp', ime: 'počepi',         imeEn: 'squats' },
  pretegovanje: { slika: '/flow-pupa-preteg-2.webp', ime: 'pretegovanje',  imeEn: 'stretching' },
  /* Razkorak namesto zvijanja trupa: zvijanje je bilo pri 190 px komaj opazno,
     tu pa gresta noge in roke naprej-nazaj — velik gib, ki se od poskokov loči
     na prvi pogled (Tina, 30. 8. 2026). */
  razkorak:     { slika: '/flow-pupa-razkorak-2.webp', ime: 'razkorak', imeEn: 'scissor jumps' },
};

const KROG: Vaja[] = ['skoki', 'pocepi', 'pretegovanje', 'razkorak'];

/* ZVOK med vajo: najprej kratek jingle, pod njim se nato vrti podlaga. Oboje
   je pod istim stikalom »zvok« — ena odločitev, ne tri (Tina, 30. 8. 2026). */
export const JINGLE = '/flow-jingle-2.mp3';
export const GLASBA = '/flow-razgibavanje-2.mp3';

/** Mirujoča Pupa — dokler ne telovadiš, stoji na miru. */
export const PUPA_MIRUJE = '/flow-pupa-stoji-2.png';

/* KROG: v enem premoru gredo vse štiri vaje druga za drugo (Tina, 30. 8. 2026).
 * Pri treh minutah je to 45 sekund na vajo, pri poldrugi 22. Boljše kot ena
 * vaja na uro: nič ne izpade zato, ker te ob tisti uri ni bilo za mizo. */
export function vajaVKrogu(preostanekSekund: number, trajanjeMinut: number): Vaja {
  const skupaj = Math.max(1, Math.round(trajanjeMinut * 60));
  const preteceno = Math.min(skupaj - 1, Math.max(0, skupaj - preostanekSekund));
  const i = Math.floor((preteceno / skupaj) * KROG.length);
  return KROG[Math.min(KROG.length - 1, i)];
}

export const STEVILO_VAJ = KROG.length;

/* STANJE OKNA — da opomnik preživi prehod med stranmi in osvežitev.
 *
 * Konec vaje hranimo kot ČASOVNO ZNAMKO, ne kot preostale sekunde: če se stran
 * med vajo znova naloži, mora ura teči naprej po pravem času in ne od začetka
 * (Tina, 30. 8. 2026: »šla sem na Domov in je popup izginil«).
 */
export type Okno = { odprt: boolean; konec: number | null; pavzaOstanek: number | null };

const KLJUC_OKNO = 'pinflow_razgibavanje_okno';
const OKNO_PRAZNO: Okno = { odprt: false, konec: null, pavzaOstanek: null };

export function preberiOkno(): Okno {
  if (typeof window === 'undefined') return OKNO_PRAZNO;
  try {
    const surovo = localStorage.getItem(KLJUC_OKNO);
    if (!surovo) return OKNO_PRAZNO;
    const o = JSON.parse(surovo) as Partial<Okno>;
    return {
      odprt: !!o.odprt,
      konec: Number.isFinite(o.konec) ? Number(o.konec) : null,
      pavzaOstanek: Number.isFinite(o.pavzaOstanek) ? Number(o.pavzaOstanek) : null,
    };
  } catch {
    return OKNO_PRAZNO;
  }
}

export function shraniOkno(o: Okno): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KLJUC_OKNO, JSON.stringify(o)); } catch { /* zaseben način */ }
}
