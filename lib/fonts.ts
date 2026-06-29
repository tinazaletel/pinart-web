import { Bodoni_Moda, Archivo, Archivo_Narrow, Caveat } from 'next/font/google';

/**
 * Bodoni Moda — variable Didone for elegant editorial display.
 */
export const bodoni = Bodoni_Moda({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-serif',
  axes: ['opsz'],
  style: ['normal', 'italic'],
  display: 'swap'
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

export const fontVariables = `${bodoni.variable} ${archivo.variable} ${archivoNarrow.variable} ${caveat.variable}`;
