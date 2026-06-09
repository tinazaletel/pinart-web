import { Bodoni_Moda, Archivo, Archivo_Narrow } from 'next/font/google';

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
 * Archivo Narrow — condensed variant za naslove storitev
 */
export const archivoNarrow = Archivo_Narrow({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-condensed',
  weight: ['400', '500', '600', '700'],
  display: 'swap'
});

export const fontVariables = `${bodoni.variable} ${archivo.variable} ${archivoNarrow.variable}`;
