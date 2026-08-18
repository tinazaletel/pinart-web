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

export function dokFontStack(ime?: string): string {
  return (ime && DOK_FONTI[ime]?.stack) || DOK_FONTI[DOK_FONT_PRIVZETI].stack;
}

/* Google Fonts <link> za izbrano pisavo (za vgradnjo v <head> dokumenta). */
export function dokFontLink(ime?: string): string {
  const g = (ime && DOK_FONTI[ime]?.google) || DOK_FONTI[DOK_FONT_PRIVZETI].google;
  const pre = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
  return g ? `${pre}<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${g}&display=swap">` : pre;
}

/* Inline style za <body>: nastavi CSS spremenljivki --akcent in --dok-font,
   ki ju dokumentni CSS uporablja (var(--akcent), var(--dok-font)). */
export function dokVars(barva?: string, font?: string): string {
  return `--akcent:${barva || DOK_BARVA_PRIVZETA};--dok-font:${dokFontStack(font)}`;
}

/* Dokumentni CSS -> zamenja fiksno barvo poudarka (#B25476) in pisavo naslovov
   (Bodoni Moda ...) s CSS spremenljivkama, ki ju <body> nastavi iz profila.
   Fallback ostane privzeti Bodoni/pink, ce spremenljivka ni nastavljena. */
export function dokCss(css: string): string {
  return css
    .split("'Bodoni Moda',Didot,'Bodoni MT',Georgia,serif").join("var(--dok-font,'Bodoni Moda',Didot,'Bodoni MT',Georgia,serif)")
    .split("'Bodoni Moda',Didot,Georgia,serif").join("var(--dok-font,'Bodoni Moda',Didot,Georgia,serif)")
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
}

/* Prednastavljene podloge iz public/flow. A4 (pokončne) za ponudbe/dokumente,
   PPT (vodoravne) za poslovni načrt / predstavitve. Uporabnica lahko uvozi svojo. */
export const DOK_PODLOGE_A4: string[] = [
  '/flow/1a_a4.jpg', '/flow/2_a4.jpg', '/flow/2a_a4.jpg',
  '/flow/it_predloga.jpg', '/flow/it_predloga_1.jpg', '/flow/4_a4.jpg',
];
export const DOK_PODLOGE_PPT: string[] = [
  '/flow/1_ptt.jpg', '/flow/2_ptt.jpg', '/flow/3_ptt.jpg', '/flow/4_ptt.jpg',
];

const K_NAST = 'pinart-kalkulator-v2';
const K_LOGO = 'pinart-kalkulator-logo';

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
export function nalozitePredloge(): { predloge: DokPredloga[]; aktivnaId: string } {
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
  const aktivna = predloge.find(p => p.id === aktivnaId) || predloge[0];
  pisiNastDelno({
    dokPredloge: predloge,
    dokAktivnaPredloga: aktivnaId,
    dokBarva: aktivna?.barva || DOK_BARVA_PRIVZETA,
    dokFont: aktivna?.font || DOK_FONT_PRIVZETI,
  });
  try {
    if (aktivna?.logo) localStorage.setItem(K_LOGO, aktivna.logo);
    else localStorage.removeItem(K_LOGO);
  } catch { /* ignoriraj */ }
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
