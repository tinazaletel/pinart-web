/* Skupni videz dokumentov (ponudba, racun, pogodba, retainer) — barva poudarka
   in pisava naslovov. Nastavi se enkrat v profilu, velja cez celotno dokumentacijo.
   Shranjeno v K_NAST (pinart-kalkulator-v2) kot polji dokBarva / dokFont. */

export const DOK_BARVA_PRIVZETA = '#6E4FA6';
/* Privzeta pisava dokumentov = DM Serif Display (ISTA serif kot naslovi v Flow
   aplikaciji) — ne Bodoni Moda. Bodoni ostane na voljo v izbirniku. */
export const DOK_FONT_PRIVZETI = 'DM Serif Display';

/* Vsaka pisava: stack (CSS font-family) + google (kljuc za Google Fonts nalaganje). */
export const DOK_FONTI: Record<string, { stack: string; google: string | null }> = {
  'DM Serif Display': { stack: "'DM Serif Display',Georgia,serif", google: 'DM+Serif+Display:ital@0;1' },
  'Fraunces': { stack: "'Fraunces',Georgia,serif", google: 'Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700' },
  'Bodoni Moda': { stack: "'Bodoni Moda',Didot,Georgia,serif", google: 'Bodoni+Moda:opsz,wght@6..96,400;6..96,600;6..96,700' },
  'Playfair Display': { stack: "'Playfair Display',Georgia,serif", google: 'Playfair+Display:wght@400;500;600;700' },
  'Cormorant': { stack: "'Cormorant',Georgia,serif", google: 'Cormorant:wght@400;500;600;700' },
  'EB Garamond': { stack: "'EB Garamond',Georgia,serif", google: 'EB+Garamond:wght@400;500;600;700' },
  'Montserrat': { stack: "'Montserrat','Helvetica Neue',Arial,sans-serif", google: 'Montserrat:wght@400;600;700' },
};

export const DOK_FONT_IMENA = Object.keys(DOK_FONTI);

/* Sentinel: uporabnik je naložil SVOJO pisavo (brand/CGP). Prava pisava (dataUri)
   je shranjena na AKTIVNI predlogi (customFont). V dokumentih se vgradi kot
   @font-face z data: URI — brez zunanjega fetcha -> deluje tudi v PDF renderju. */
export const DOK_CUSTOM_FONT = 'Moja pisava';
const DOK_CUSTOM_FAMILY = 'DokLastna';

export function dokFontStack(ime?: string): string {
  if (ime === DOK_CUSTOM_FONT) return `'${DOK_CUSTOM_FAMILY}',Georgia,serif`;
  return (ime && DOK_FONTI[ime]?.stack) || DOK_FONTI[DOK_FONT_PRIVZETI].stack;
}

/* @font-face pravilo za naloženo pisavo aktivne predloge (ali '' če je ni). */
export function dokLastnaPisavaCss(): string {
  try {
    const cf = aktivnaPredloga().customFont;
    if (cf?.dataUri) return `<style>@font-face{font-family:'${DOK_CUSTOM_FAMILY}';font-display:swap;src:url('${cf.dataUri}')}</style>`;
  } catch { /* SSR/prazno */ }
  return '';
}

/* Google Fonts <link> za izbrano pisavo (za vgradnjo v <head> dokumenta).
   Za naloženo pisavo vrne vgrajen @font-face (data URI) namesto Google linka. */
export function dokFontLink(ime?: string): string {
  if (ime === DOK_CUSTOM_FONT) {
    const css = dokLastnaPisavaCss();
    if (css) return css;
    ime = DOK_FONT_PRIVZETI; /* naložene pisave ni -> privzeta */
  }
  const g = (ime && DOK_FONTI[ime]?.google) || DOK_FONTI[DOK_FONT_PRIVZETI].google;
  const pre = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
  return g ? `${pre}<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${g}&display=swap">` : pre;
}

/* Inline style za <body>: nastavi CSS spremenljivki --akcent in --dok-font,
   ki ju dokumentni CSS uporablja (var(--akcent), var(--dok-font)). */
export function dokVars(barva?: string, font?: string): string {
  let kartica = '';
  let ozadje = '';
  try {
    const predloga = aktivnaPredloga();
    kartica = predloga.kartica || '';
    const vir = predloga.ozadje || '';
    if (vir) {
      const url = vir.startsWith('data:') || typeof window === 'undefined'
        ? vir
        : `${window.location.origin}${vir}`;
      /* Vključeno v body inline slog, zato isti niz velja v iframe predogledu,
         HTML izvozu in strežniškem PDF renderju vseh dokumentov. */
      ozadje = `;background-image:url('${url.replace(/'/g, '%27')}');background-size:210mm auto;background-repeat:repeat-y;background-position:top center`;
    }
  } catch { /* SSR/prazno */ }
  return `--akcent:${barva || DOK_BARVA_PRIVZETA};--dok-font:${dokFontStack(font)}`
    + (kartica ? `;--dok-kartica:${kartica}` : '') + ozadje;
}

/* Dokumentni CSS -> zamenja fiksno barvo poudarka (#B25476) in pisavo naslovov
   (Bodoni Moda ...) s CSS spremenljivkama, ki ju <body> nastavi iz profila.
   Fallback ostane privzeti Bodoni/pink, ce spremenljivka ni nastavljena. */
export function dokCss(css: string): string {
  return css
    .split("'Bodoni Moda',Didot,'Bodoni MT',Georgia,serif").join("var(--dok-font,'DM Serif Display',Georgia,serif)")
    .split("'Bodoni Moda',Didot,Georgia,serif").join("var(--dok-font,'DM Serif Display',Georgia,serif)")
    .split('#B25476').join('var(--akcent,#B25476)');
}

/* ── VEC PREDLOG (uporabnica ima vec podjetij) ──────────────────────────────
   Prej je bil videz (barva/pisava/logo) ENA nastavitev za vso dokumentacijo.
   Zdaj lahko uporabnica shrani vec "predlog" (npr. eno na podjetje) in izbere,
   katera je AKTIVNA. Aktivna predloga se ob vsaki spremembi zrcali v STARA
   plosca polja K_NAST.dokBarva/dokFont (in logo v K_LOGO) — tako obstojeci
   doc builderji (ponudba/racun/pogodba/retainer) berejo isto kot prej in jih
   NI TREBA spreminjati za barvo/pisavo/logo. Glava/noga sta nova, neobvezna
   polja predloge — builderji ju berejo dodatno, prek aktivnaPredloga(). */

export interface DokPredloga {
  id: string;
  ime: string;
  barva: string;
  font: string;
  logo?: string;
  glava?: string;
  noga?: string;
  /* Podlogi (ozadji) dokumenta — neobvezni. Vrednost je bodisi pot do prednastavljene
     podloge (npr. '/flow/2a_a4.jpg') bodisi data: URI (uporabnica uvozi svojo).
     `platnica` = ozadje naslovnice, `ozadje` = ozadje notranjih (vsebinskih) strani. */
  platnica?: string;
  ozadje?: string;
  /* Naložena pisava (brand/CGP) — ime datoteke + data: URI (woff2/ttf/otf).
     Ko je nastavljena in je font === DOK_CUSTOM_FONT, se vgradi v dokumente. */
  customFont?: { ime: string; dataUri: string };
  /* Barva kartic paketov v ponudbi (privzeto kremna #f8f5ee). Stranke s svojim
     CGP pogosto hocejo drugacno — zato nastavljivo na predlogi. */
  kartica?: string;
}

/* Prednastavljene podloge iz public/flow. A4 (pokončne) za ponudbe/dokumente,
   PPT (vodoravne) za poslovni načrt / predstavitve. Uporabnica lahko uvozi svojo. */
export const DOK_PODLOGE_A4: string[] = [
  '/flow/1a_a4.jpg', '/flow/2_a4.jpg', '/flow/2a_a4.jpg',
  '/flow/it_predloga.jpg', '/flow/it_predloga_1.jpg', '/flow/4_a4.jpg',
  '/flow/predloga_ponudbe_Page_1.jpg',
];

/* Temne podloge: cez njih mora iti BELO besedilo, sicer se crno besedilo
   izgubi v fotografiji. Seznam je rocni, ker svetlosti slike ne merimo. */
export const DOK_PODLOGE_TEMNE: string[] = [
  '/flow/predloga_ponudbe_Page_1.jpg',
];

/** Ali izbrana podloga zahteva belo besedilo. */
export function podlogaJeTemna(vir?: string): boolean {
  return !!vir && DOK_PODLOGE_TEMNE.includes(vir);
}
export const DOK_PODLOGE_PPT: string[] = [
  '/flow/1_ptt.jpg', '/flow/2_ptt.jpg', '/flow/3_ptt.jpg', '/flow/4_ptt.jpg',
];

const K_NAST = 'pinart-kalkulator-v2';
const K_LOGO = 'pinart-kalkulator-logo';
/* Cas zadnje ZAVESTNE spremembe videza. Brez njega se ne da ugotoviti, katera
   stran (naprava ali oblak) je novejsa — glej lib/dokVidezOblak.ts. Zapise ga
   SAMO shranitePredloge (uporabnica je nekaj spremenila) oz. prenos iz oblaka
   (tam ohranimo oblakov cas). Samodejna migracija ob prvem branju ga NE
   nastavi — sicer bi svez brskalnik s privzeto predlogo izgledal "novejsi"
   od oblaka in bi povozil pravi videz. */
const K_CAS = 'dokVidezUpdatedAt';
const DOGODEK = 'pinart-dokvidez-change';

/* Javi spremembo, da jo lahko most (FlowCloudBridge) posije v oblak in da se
   odprti vmesnik osvezi. Dogodek namesto neposrednega klica, ker bi uvoz
   lib/dokVidezOblak tu naredil krog (dokVidezOblak uvaza to datoteko). */
function objaviSpremembo(): void {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent(DOGODEK)); } catch { /* SSR/nedostopno */ }
}

/* Prebere celoten K_NAST zapis (varno — prazen objekt ob napaki/manjkajocem zapisu). */
function beriNast(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(K_NAST) || '{}'); } catch { return {}; }
}

/* Zdruzi (merge) delni zapis nazaj v K_NAST — NIKOLI ne prepise celotnega
   zapisa, da ne izgubimo polj, ki jih ta funkcija ne pozna (cene, profili ...). */
function pisiNastDelno(delno: Record<string, unknown>): void {
  try {
    const s = beriNast();
    localStorage.setItem(K_NAST, JSON.stringify({ ...s, ...delno }));
  } catch { /* shramba polna ali nedostopna — ignoriramo */ }
}

export function noviIdPredloge(): string {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* Prebere seznam predlog iz K_NAST. Ce se ne obstajajo (star zapis, pred
   uvedbo vec predlog), MIGRIRA eno predlogo "Privzeta" iz obstojecih
   dokBarva/dokFont/logo (K_LOGO), jo shrani nazaj in vrne — tako nihce ne
   izgubi trenutne nastavitve. Ce aktivna predloga (id) ne obstaja vec
   (izbrisana), vrne prvo v seznamu. */
/* Enkratna migracija: star privzeti font dokumentov je bil 'Bodoni Moda', zdaj je
   'DM Serif Display'. Obstojeci racuni imajo 'Bodoni Moda' zapisan v K_NAST.dokFont
   in v predlogi 'Privzeta' — CEPRAV ga niso zavestno izbrali (bil je le privzetek).
   Enkrat ga zamenjamo na nov privzetek. Flag dokFontMigriran2 zagotovi, da se zgodi
   LE ENKRAT in ne povozi kasnejse zavestne izbire Bodonija. */
export function migrirajStariFont(): void {
  try {
    const s = beriNast();
    if (s.dokFontMigriran3) return;
    const delno: Record<string, unknown> = { dokFontMigriran3: true };
    if (s.dokFont === 'Bodoni Moda') delno.dokFont = DOK_FONT_PRIVZETI;
    if (Array.isArray(s.dokPredloge)) {
      delno.dokPredloge = (s.dokPredloge as DokPredloga[]).map(p =>
        p.font === 'Bodoni Moda' ? { ...p, font: DOK_FONT_PRIVZETI } : p
      );
    }
    pisiNastDelno(delno);
  } catch { /* shramba nedostopna — preskoci */ }
}

export function nalozitePredloge(): { predloge: DokPredloga[]; aktivnaId: string } {
  migrirajStariFont();
  const s = beriNast();
  let predloge: DokPredloga[] = Array.isArray(s.dokPredloge) ? (s.dokPredloge as DokPredloga[]) : [];
  let aktivnaId = typeof s.dokAktivnaPredloga === 'string' ? s.dokAktivnaPredloga : '';

  if (predloge.length === 0) {
    let logo = '';
    try { logo = localStorage.getItem(K_LOGO) || ''; } catch { /* zasebni nacin ali nedostopno */ }
    const privzeta: DokPredloga = {
      id: noviIdPredloge(),
      ime: 'Privzeta',
      barva: (typeof s.dokBarva === 'string' && s.dokBarva) || DOK_BARVA_PRIVZETA,
      font: (typeof s.dokFont === 'string' && s.dokFont) || DOK_FONT_PRIVZETI,
      logo: logo || undefined,
    };
    predloge = [privzeta];
    aktivnaId = privzeta.id;
    pisiNastDelno({ dokPredloge: predloge, dokAktivnaPredloga: aktivnaId });
  } else if (!predloge.some(p => p.id === aktivnaId)) {
    aktivnaId = predloge[0].id;
  }

  return { predloge, aktivnaId };
}

/* Shrani seznam predlog + aktivno izbiro. Aktivno predlogo ZRCALI v stara
   plosca polja (dokBarva/dokFont v K_NAST, logo v K_LOGO), da obstojeci doc
   builderji, ki berejo samo ta polja, samodejno dobijo pravi videz. */
export function shranitePredloge(predloge: DokPredloga[], aktivnaId: string): void {
  zapisiDokVidez({ predloge, aktivnaId, updatedAt: new Date().toISOString() });
}

/* ── SLIKA VIDEZA (za sinhronizacijo z oblakom) ─────────────────────────────
   Videz dokumentov je ENA nastavitev organizacije (znamka podjetja), ne zbirka
   zapisov. Zato ga v oblak potuje kot cela slika: seznam predlog + aktivna +
   cas zadnje spremembe. Glej lib/dokVidezOblak.ts. */

export interface DokVidezSlika {
  predloge: DokPredloga[];
  aktivnaId: string;
  /* ISO cas zadnje zavestne spremembe; manjka pri racunih od prej */
  updatedAt?: string;
}

/* Prebere trenutno lokalno sliko (z vso obstojeco migracijsko logiko). */
export function preberiDokVidez(): DokVidezSlika {
  const { predloge, aktivnaId } = nalozitePredloge();
  const s = beriNast();
  const cas = s[K_CAS];
  return { predloge, aktivnaId, updatedAt: typeof cas === 'string' ? cas : undefined };
}

/* Zapise celo sliko. Aktivno predlogo ZRCALI v stara plosca polja
   (dokBarva/dokFont v K_NAST, logo v K_LOGO), da obstojeci doc builderji,
   ki berejo samo ta polja, samodejno dobijo pravi videz.
   updatedAt se ohrani kakrsen je (pri prenosu iz oblaka je to oblakov cas) —
   ce ga ni, se postavi zdajsnji. */
export function zapisiDokVidez(slika: DokVidezSlika): void {
  const aktivna = slika.predloge.find(p => p.id === slika.aktivnaId) || slika.predloge[0];
  pisiNastDelno({
    dokPredloge: slika.predloge,
    dokAktivnaPredloga: aktivna?.id || slika.aktivnaId || '',
    dokBarva: aktivna?.barva || DOK_BARVA_PRIVZETA,
    dokFont: aktivna?.font || DOK_FONT_PRIVZETI,
    [K_CAS]: slika.updatedAt || new Date().toISOString(),
  });
  try {
    if (aktivna?.logo) localStorage.setItem(K_LOGO, aktivna.logo);
    else localStorage.removeItem(K_LOGO);
  } catch { /* ignoriraj */ }
  objaviSpremembo();
}

/* Vrne AKTIVNO predlogo (ali privzeto, ce se ni bilo nastavljeno nic). */
export function aktivnaPredloga(): DokPredloga {
  const { predloge, aktivnaId } = nalozitePredloge();
  return predloge.find(p => p.id === aktivnaId) || predloge[0] || {
    id: noviIdPredloge(), ime: 'Privzeta', barva: DOK_BARVA_PRIVZETA, font: DOK_FONT_PRIVZETI,
  };
}

/* Logo se se vedno naloži prek obstojecih mest (SettingsWorkspace, kalkulator
   profil), ki neposredno pisejo K_LOGO. Ta helper poklicemo poleg tega, da se
   nalozeni/odstranjeni logo zapise tudi na AKTIVNO predlogo — sicer bi se ob
   preklopu na drugo predlogo in nazaj "izgubil". */
export function nastaviLogoAktivne(logoUrl: string): void {
  const { predloge, aktivnaId } = nalozitePredloge();
  if (!predloge.length) return;
  const posodobljene = predloge.map(p => p.id === aktivnaId ? { ...p, logo: logoUrl || undefined } : p);
  shranitePredloge(posodobljene, aktivnaId);
}

/* Enotni vir logotipa za VSE dokumente (pogodba/racun/ponudba): najprej aktivna
   predloga, sicer stari flat K_LOGO (kamor logo pise SettingsWorkspace/profil).
   Prej sta pogodba in racun brala SAMO aktivnaPredloga().logo -> ce je bil logo
   nalozen le prek K_LOGO (kot pri ponudbi), se pri njiju NI videl. */
export function aktivniLogo(): string {
  const p = aktivnaPredloga().logo?.trim();
  if (p) return p;
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(K_LOGO) || ''; } catch { return ''; }
}
