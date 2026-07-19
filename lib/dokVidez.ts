/* Skupni videz dokumentov (ponudba, racun, pogodba, retainer) — barva poudarka
   in pisava naslovov. Nastavi se enkrat v profilu, velja cez celotno dokumentacijo.
   Shranjeno v K_NAST (pinart-kalkulator-v2) kot polji dokBarva / dokFont. */

export const DOK_BARVA_PRIVZETA = '#6E4FA6';
export const DOK_FONT_PRIVZETI = 'Bodoni Moda';

/* Vsaka pisava: stack (CSS font-family) + google (kljuc za Google Fonts nalaganje). */
export const DOK_FONTI: Record<string, { stack: string; google: string | null }> = {
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
