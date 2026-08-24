/* Priponke v pošti — ČISTA pravila. Brez omrežja, brez new Date(), brez
   Math.random(): ista datoteka teče v brskalniku IN na zaledju, zato sta
   preverbi res isti. Šteje pa ZALEDJE — brskalnik je le vljudnost, vratar sta
   app/api/posta/route.ts (poslano) in app/api/posta/prejeto/route.ts (prejeto).

   Čas in naključje sta vedno PARAMETER, nikoli klic znotraj funkcije
   (DESIGN.md §10: new Date() med renderjem razbije hidracijo). */

export const NAJVEC_PRIPONK = 5;
export const NAJVEC_BAJTOV_DATOTEKA = 10 * 1024 * 1024; /* 10 MB na datoteko */
export const NAJVEC_BAJTOV_SKUPAJ = 20 * 1024 * 1024;   /* 20 MB na sporočilo */

/* Izvršljive končnice. Blokiramo jih NE GLEDE na MIME: MIME pove odjemalec in
   se mu ne da verjeti, končnica je tisto, kar sistem dejansko zažene. */
export const PREPOVEDANE_KONCNICE: readonly string[] = ['exe', 'bat', 'cmd', 'sh', 'js', 'msi'];

export type Priponka = {
  ime: string;
  velikost: number;
  mime?: string;
  /* Pot v Supabase Storage (vedro business-documents, sekcija mail).
     Brez nje priponka OBSTAJA, a ni shranjena — prikaz to pove naglas,
     namesto da bi tiho izginila. */
  pot?: string;
};

export type Izid = { veljavno: boolean; napaka?: string };

/* Končnica malih črk, brez pike. Odreže zaključne pike in presledke
   ("virus.exe." se na Windows zažene kot .exe) in vrne '' za datoteke brez nje. */
export function koncnicaDatoteke(ime: string): string {
  const cisto = String(ime ?? '').trim().replace(/[.\s]+$/, '').toLowerCase();
  const zadnja = cisto.lastIndexOf('.');
  if (zadnja <= 0 || zadnja === cisto.length - 1) return '';
  return cisto.slice(zadnja + 1);
}

/* Je datoteka izvršljiva (in s tem prepovedana)? Gleda ZADNJO končnico, zato
   »pogodba.pdf.exe« pade, »moj.js.pdf« pa je navaden PDF in gre skozi. */
export function jePrepovedanaDatoteka(ime: string): boolean {
  return PREPOVEDANE_KONCNICE.includes(koncnicaDatoteke(ime));
}

/* Človeško berljiva velikost. Brez toLocaleString, da je izid enak povsod;
   ločilo decimalke je parameter (slovensko privzeto vejica). */
export function berljivaVelikost(bajti: number, decimalno = ','): string {
  const n = Number(bajti);
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${Math.round(n)} B`;
  const enote = ['kB', 'MB', 'GB'];
  let vrednost = n / 1024;
  let i = 0;
  while (vrednost >= 1024 && i < enote.length - 1) { vrednost /= 1024; i += 1; }
  const zaokrozeno = vrednost < 10 ? Math.round(vrednost * 10) / 10 : Math.round(vrednost);
  const zapis = Number.isInteger(zaokrozeno) ? String(zaokrozeno) : String(zaokrozeno).replace('.', decimalno);
  return `${zapis} ${enote[i]}`;
}

/* Ime, ki je varno za pot v Storage in za glavo maila: brez ločil poti, brez
   krmilnih znakov, brez »..«. Vrne '', če od imena ne ostane nič uporabnega. */
export function varnoImePriponke(ime: string): string {
  const osnova = String(ime ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[\\/]/).pop() || '';
  const cisto = osnova.trim().replace(/\.{2,}/g, '.').replace(/^\.+/, '').slice(0, 180).trim();
  return cisto.includes('..') ? '' : cisto;
}

/* Skupna velikost seznama (neveljavne vrednosti štejejo kot 0). */
export function skupnaVelikost(priponke: readonly { velikost: number }[]): number {
  return (priponke || []).reduce((vsota, p) => {
    const n = Number(p?.velikost);
    return vsota + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

/* Ena priponka: ime, velikost, končnica. */
export function preveriPriponko(priponka: { ime: string; velikost: number }): Izid {
  const ime = varnoImePriponke(priponka?.ime ?? '');
  if (!ime) return { veljavno: false, napaka: 'Ime datoteke ni veljavno.' };
  if (String(priponka.ime ?? '').length > 180) {
    return { veljavno: false, napaka: `Ime datoteke je predolgo: ${ime.slice(0, 40)} …` };
  }
  const velikost = Number(priponka?.velikost);
  if (!Number.isFinite(velikost) || velikost <= 0) {
    return { veljavno: false, napaka: `Datoteka »${ime}« je prazna.` };
  }
  if (velikost > NAJVEC_BAJTOV_DATOTEKA) {
    return { veljavno: false, napaka: `Datoteka »${ime}« meri ${berljivaVelikost(velikost)} — največ je ${berljivaVelikost(NAJVEC_BAJTOV_DATOTEKA)}.` };
  }
  if (jePrepovedanaDatoteka(ime)) {
    return { veljavno: false, napaka: `Datoteke .${koncnicaDatoteke(ime)} ni mogoče pripeti (izvršljiva datoteka).` };
  }
  return { veljavno: true };
}

/* Cel seznam: število, vsaka posebej, skupna velikost. Vrne tudi seštevek, da
   ga vmesnik pokaže (»3,4 MB od 20 MB«) brez ponovnega računanja. */
export function preveriPriponke(
  priponke: readonly { ime: string; velikost: number }[],
): Izid & { skupaj: number } {
  const seznam = priponke || [];
  const skupaj = skupnaVelikost(seznam);
  if (seznam.length > NAJVEC_PRIPONK) {
    return { veljavno: false, napaka: `Največ ${NAJVEC_PRIPONK} priponk na sporočilo.`, skupaj };
  }
  for (const p of seznam) {
    const izid = preveriPriponko(p);
    if (!izid.veljavno) return { ...izid, skupaj };
  }
  if (skupaj > NAJVEC_BAJTOV_SKUPAJ) {
    return {
      veljavno: false,
      napaka: `Priponke skupaj merijo ${berljivaVelikost(skupaj)} — največ je ${berljivaVelikost(NAJVEC_BAJTOV_SKUPAJ)}.`,
      skupaj,
    };
  }
  return { veljavno: true, skupaj };
}

/* Je priponka slika (za majhen predogled)? Samo rastrski formati, ki jih Storage
   sprejme — SVG namenoma NI med njimi, ker lahko nosi skripte. */
export function jeSlika(priponka: { ime?: string; mime?: string }): boolean {
  const mime = String(priponka?.mime || '').toLowerCase();
  if (mime === 'image/svg+xml') return false;
  if (mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(String(priponka?.ime || ''));
}

/* Je še prostor za novo datoteko? (Vmesnik s tem onemogoči gumb »Pripni«.) */
export function jeSeProstor(
  obstojece: readonly { ime: string; velikost: number }[],
  novaVelikost = 0,
): boolean {
  const seznam = obstojece || [];
  if (seznam.length >= NAJVEC_PRIPONK) return false;
  return skupnaVelikost(seznam) + Math.max(0, Number(novaVelikost) || 0) <= NAJVEC_BAJTOV_SKUPAJ;
}
