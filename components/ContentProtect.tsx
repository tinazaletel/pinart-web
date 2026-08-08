'use client';

import { useEffect } from 'react';

/**
 * Nezni deterrent proti kraji slik (site-wide, tudi pinart.si):
 *  - blokira desni klik ("Shrani sliko") NA SLIKAH (drugod desni klik dela normalno)
 *  - blokira dragstart na slikah (vlecenje na namizje)
 * Vizualni del (izbor/user-drag) nosi CSS pravilo v globals.css.
 *
 * Le ODVRACILO — screenshot in ogled izvorne kode ostaneta mozna. Prava obramba
 * avtorstva = Sef (dokaz datuma) + noai/TDM signal + pravni pogoji.
 * Slike z razredom .dovoli-sliko so izvzete (npr. urejevalnik z vlecenjem).
 */
export default function ContentProtect() {
  useEffect(() => {
    const jeVarovanaSlika = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;
      return !!el && el.tagName === 'IMG' && !el.classList.contains('dovoli-sliko');
    };
    const naSliki = (e: Event) => { if (jeVarovanaSlika(e.target)) e.preventDefault(); };
    document.addEventListener('contextmenu', naSliki);
    document.addEventListener('dragstart', naSliki);
    return () => {
      document.removeEventListener('contextmenu', naSliki);
      document.removeEventListener('dragstart', naSliki);
    };
  }, []);
  return null;
}
