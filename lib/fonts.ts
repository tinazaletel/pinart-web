import { Bodoni_Moda, DM_Serif_Display, Archivo, Archivo_Narrow, Caveat } from 'next/font/google';

/* Bodoni Moda = pisava naslovov za PORTFOLIO (pinart.si) — privzeti --font-serif.
   Ker je tanka, je rahlo odebeljena prek -webkit-text-stroke v globals.css (outline).

   NADOMESTNA PISAVA (Tina, 3. 9. 2026 — dva obiskovalca, dva dneva, oba z
   napacno pisavo v posnetkih sej). Nextov samodejni mehanizem, ki nadomestni
   pisavi prilagodi sirine crk, za Bodoni Moda ODPOVE: v njegovi tabeli metrik
   je zapisan pod kljucem "bodoniModa11pt", iskanje pa sestavi "bodoniModa" in
   ne najde nicesar. Zato je bil adjustFontFallback izklopljen — a to je
   pomenilo, da se je do prihoda Bodonija risal Times z drugacnimi sirinami,
   in naslovi, ki se animirajo po posameznih crkah, so se stisnili drug v
   drugega ("Withtrantoyes").

   Resitev: metrike iz iste tabele (bodoniModa11pt) so prepisane v rocno
   nadomestno pisavo "Bodoni Moda Fallback" v globals.css (size-adjust,
   ascent/descent-override), tocno tako, kot bi jih izracunal Next. Ta face
   je tu v fallback stacku, da jo brskalnik uporabi, dokler Bodoni ne prispe. */
export const bodoni = Bodoni_Moda({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-serif',
  axes: ['opsz'],
  style: ['normal', 'italic'],
  display: 'swap',
  /* Samodejno ne dela (kljuc "bodoniModa" vs "bodoniModa11pt" — glej zgoraj);
     brez tega bi ob vsaki gradnji javljal napako in vseeno nic naredil. */
  adjustFontFallback: false,
  /* Rocno umerjena nadomestna pisava, deklarirana v globals.css. */
  fallback: ['Bodoni Moda Fallback', 'Times New Roman', 'serif'],
});

/* DM Serif Display = pisava naslovov za FLOW (pinartflow / /flow / /kalkulator) —
   --font-serif-flow. Ni tanka, zato NE rabi -webkit-text-stroke. Flow vsebniki
   (.fl, .cw, .shell) preglasijo --font-serif na to spremenljivko (globals.css);
   portfolio ostane Bodoni (z outline). */
export const dmSerif = DM_Serif_Display({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-serif-flow',
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  /* NE vnaprej. Na pinart.si (portfolio) se ta pisava nikoli ne izrise, a je
     bila vseeno med desetimi datotekami, ki se prenasajo ze pred prvim
     izrisom - stiri zahteve (48 kB) v napoto Bodoniju, ki ga hero rabi takoj
     (Tina, 3. 9. 2026; izmerjeno na zivi strani). Na Flowu se nalozi ob prvi
     rabi; zanjo Nextova prilagoditev nadomestne pisave deluje, zato menjava
     tam crk ne premakne. */
  preload: false,
});

/**
 * Archivo — Helvetica Neue closest free alternative, UI / body / labels
 */
export const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap'
});

/**
 * Archivo Narrow — condensed variant za naslove storitev.
 * Below the hero (Services section), so it isn't preloaded — it loads when its
 * section is reached, keeping it out of the blocking first-paint font set.
 */
export const archivoNarrow = Archivo_Narrow({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-condensed',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false
});

/**
 * Caveat — hand-written script used only by the rotating laptop SVG's on-screen
 * quote, deep below the fold. Not preloaded; loads when that section is reached.
 */
export const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['600', '700'],
  display: 'swap',
  preload: false
});

export const fontVariables = `${bodoni.variable} ${dmSerif.variable} ${archivo.variable} ${archivoNarrow.variable} ${caveat.variable}`;
